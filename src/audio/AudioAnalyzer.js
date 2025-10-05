/**
 * AudioAnalyzer delivers a musically aware analysis layer on top of a Web Audio API
 * AnalyserNode. It exposes seven frequency bands, spectral descriptors, RMS loudness,
 * onset detection, and BPM estimation that can be consumed by any visualization system.
 */
export class AudioAnalyzer {
    constructor(analyserNode, options = {}) {
        if (!analyserNode) {
            throw new Error('AudioAnalyzer requires a valid AnalyserNode instance');
        }

        this.analyser = analyserNode;
        this.fftSize = options.fftSize || 2048;
        this.smoothingTimeConstant = options.smoothingTimeConstant ?? 0.8;
        this.sampleRate = options.sampleRate || analyserNode.context?.sampleRate || 44100;

        this.analyser.fftSize = this.fftSize;
        this.analyser.smoothingTimeConstant = this.smoothingTimeConstant;

        this.frequencyBinCount = this.analyser.frequencyBinCount;
        this.byteFrequencyData = new Uint8Array(this.frequencyBinCount);
        this.byteTimeDomainData = new Uint8Array(this.analyser.fftSize);
        this.prevSpectrum = new Float32Array(this.frequencyBinCount);

        this.nyquist = this.sampleRate / 2;

        this.bandDefinitions = [
            { name: 'subBass', low: 20, high: 60 },
            { name: 'bass', low: 60, high: 250 },
            { name: 'lowMid', low: 250, high: 500 },
            { name: 'mid', low: 500, high: 2000 },
            { name: 'highMid', low: 2000, high: 4000 },
            { name: 'high', low: 4000, high: 8000 },
            { name: 'air', low: 8000, high: 20000 }
        ];

        this.bandState = {};
        this.bandDefinitions.forEach(({ name }) => {
            this.bandState[name] = 0;
        });

        this.smoothingFactor = options.bandSmoothing ?? 0.8;
        this.smoothedBands = { ...this.bandState };

        this.spectralCentroid = 0;
        this.spectralRolloff = 0;
        this.spectralFlux = 0;
        this.rms = 0;

        this.onsetThreshold = options.onsetThreshold ?? 0.18;
        this.minOnsetInterval = options.minOnsetInterval ?? 120; // ms
        this.lastOnsetTime = 0;
        this.onsetHistory = [];
        this.maxOnsetHistory = options.maxOnsetHistory ?? 32;
        this.estimatedBPM = options.initialBPM || 120;

    }

    analyze() {
        this.captureFrequencyData();
        this.captureTimeDomainData();
        this.analyzeBands();
        this.calculateSpectralCentroid();
        this.calculateSpectralRolloff();
        this.calculateSpectralFlux();
        this.calculateRMS();
        const onset = this.detectOnset();
        if (this.onsetHistory.length > 1) {
            this.estimateBPM();
        }

        return {
            bands: { ...this.smoothedBands },
            spectralCentroid: this.spectralCentroid,
            spectralRolloff: this.spectralRolloff,
            spectralFlux: this.spectralFlux,
            rms: this.rms,
            onset,
            bpm: this.estimatedBPM
        };
    }

    captureFrequencyData() {
        this.analyser.getByteFrequencyData(this.byteFrequencyData);
    }

    captureTimeDomainData() {
        this.analyser.getByteTimeDomainData(this.byteTimeDomainData);
    }

    analyzeBands() {
        this.bandDefinitions.forEach(({ name, low, high }) => {
            const lowIndex = this.frequencyToIndex(low);
            const highIndex = this.frequencyToIndex(high);
            let sum = 0;
            let count = 0;

            for (let i = lowIndex; i <= highIndex; i += 1) {
                const magnitude = this.byteFrequencyData[i] / 255;
                sum += magnitude;
                count += 1;
            }

            const average = count > 0 ? sum / count : 0;
            this.bandState[name] = average;
            this.smoothedBands[name] = this.smoothedBands[name] * this.smoothingFactor + average * (1 - this.smoothingFactor);
        });
    }

    calculateSpectralCentroid() {
        let numerator = 0;
        let denominator = 0;

        for (let i = 0; i < this.frequencyBinCount; i += 1) {
            const amplitude = this.byteFrequencyData[i] / 255;
            numerator += this.binToFrequency(i) * amplitude;
            denominator += amplitude;
        }

        const centroid = denominator > 0 ? numerator / denominator : 0;
        this.spectralCentroid = centroid / this.nyquist;
    }

    calculateSpectralRolloff() {
        const totalEnergy = this.byteFrequencyData.reduce((acc, value) => acc + value, 0);
        const threshold = totalEnergy * 0.85;
        let cumulative = 0;
        let rolloffFrequency = 0;

        for (let i = 0; i < this.frequencyBinCount; i += 1) {
            cumulative += this.byteFrequencyData[i];
            if (cumulative >= threshold) {
                rolloffFrequency = this.binToFrequency(i);
                break;
            }
        }

        this.spectralRolloff = rolloffFrequency / this.nyquist;
    }

    calculateSpectralFlux() {
        let flux = 0;
        for (let i = 0; i < this.frequencyBinCount; i += 1) {
            const current = this.byteFrequencyData[i] / 255;
            const previous = this.prevSpectrum[i];
            const delta = current - previous;
            if (delta > 0) {
                flux += delta;
            }
            this.prevSpectrum[i] = current;
        }

        this.spectralFlux = flux / this.frequencyBinCount;
    }

    calculateRMS() {
        let sumSquares = 0;
        for (let i = 0; i < this.byteTimeDomainData.length; i += 1) {
            const centered = (this.byteTimeDomainData[i] - 128) / 128;
            sumSquares += centered * centered;
        }
        this.rms = Math.sqrt(sumSquares / this.byteTimeDomainData.length);
    }

    detectOnset() {
        const now = AudioAnalyzer.now();
        const isOnset = this.spectralFlux > this.onsetThreshold && (now - this.lastOnsetTime) >= this.minOnsetInterval;

        if (isOnset) {
            this.lastOnsetTime = now;
            this.onsetHistory.push(now);
            if (this.onsetHistory.length > this.maxOnsetHistory) {
                this.onsetHistory.shift();
            }
        }

        return isOnset;
    }

    estimateBPM() {
        if (this.onsetHistory.length < 2) {
            return;
        }

        const intervals = [];
        for (let i = 1; i < this.onsetHistory.length; i += 1) {
            intervals.push((this.onsetHistory[i] - this.onsetHistory[i - 1]) / 1000);
        }

        if (intervals.length === 0) {
            return;
        }

        const averageInterval = intervals.reduce((acc, val) => acc + val, 0) / intervals.length;
        if (averageInterval > 0) {
            this.estimatedBPM = Math.round(60 / averageInterval);
        }
    }

    frequencyToIndex(frequency) {
        const clamped = Math.min(this.nyquist, Math.max(0, frequency));
        const index = Math.round((clamped / this.nyquist) * (this.frequencyBinCount - 1));
        return Math.min(this.frequencyBinCount - 1, Math.max(0, index));
    }

    binToFrequency(index) {
        return (index / (this.frequencyBinCount - 1)) * this.nyquist;
    }

    static now() {
        if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
            return performance.now();
        }
        return Date.now();
    }
}
