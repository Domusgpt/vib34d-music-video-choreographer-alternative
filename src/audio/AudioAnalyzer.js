const DEFAULT_BANDS = [
    { key: 'subBass', low: 20, high: 60 },
    { key: 'bass', low: 60, high: 250 },
    { key: 'lowMid', low: 250, high: 500 },
    { key: 'mid', low: 500, high: 2000 },
    { key: 'highMid', low: 2000, high: 4000 },
    { key: 'high', low: 4000, high: 8000 },
    { key: 'air', low: 8000, high: 20000 }
];

const DB_FLOOR = -100;

export class AudioAnalyzer {
    constructor(analyserNode, options = {}) {
        if (!analyserNode) {
            throw new Error('AudioAnalyzer requires an AnalyserNode instance.');
        }

        this.analyser = analyserNode;
        this.context = analyserNode.context || null;

        this.fftSize = options.fftSize || 2048;
        this.minDecibels = options.minDecibels ?? -100;
        this.maxDecibels = options.maxDecibels ?? -20;
        this.smoothingConstant = options.frequencySmoothing ?? 0.7;
        this.energySmoothing = options.energySmoothing ?? 0.8;
        this.onsetThreshold = options.onsetThreshold ?? 0.15;
        this.minimumOnsetInterval = options.minimumOnsetInterval ?? 120;
        this.bandDefinitions = options.bands || DEFAULT_BANDS;

        this.analyser.fftSize = this.fftSize;
        this.analyser.minDecibels = this.minDecibels;
        this.analyser.maxDecibels = this.maxDecibels;
        this.analyser.smoothingTimeConstant = this.smoothingConstant;

        this.frequencyData = new Float32Array(this.analyser.frequencyBinCount);
        this.timeDomainData = new Float32Array(this.analyser.fftSize);
        this.previousSpectrum = new Float32Array(this.analyser.frequencyBinCount);

        this.sampleRate = options.sampleRate || this.context?.sampleRate || 44100;

        this.bandValues = this.bandDefinitions.reduce((acc, band) => {
            acc[band.key] = 0;
            return acc;
        }, {});
        this.smoothedBands = { ...this.bandValues };

        this.spectralCentroid = 0;
        this.spectralRolloff = 0;
        this.spectralFlux = 0;
        this.rms = 0;
        this.estimatedBPM = options.initialBPM || 120;

        this.onsetHistory = [];
        this.lastOnsetTime = 0;
    }

    analyze() {
        this.#captureFrequencyData();
        this.#captureTimeDomainData();

        this.#analyzeBands();
        this.#calculateSpectralCentroid();
        this.#calculateSpectralRolloff();
        this.#calculateSpectralFlux();
        this.#calculateRMS();

        const now = this.#now();
        const onset = this.#detectOnset(now);
        if (onset) {
            this.#recordOnset(now);
            this.#estimateBPM();
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

    #captureFrequencyData() {
        if (typeof this.analyser.getFloatFrequencyData === 'function') {
            this.analyser.getFloatFrequencyData(this.frequencyData);
        } else {
            const byteData = new Uint8Array(this.analyser.frequencyBinCount);
            this.analyser.getByteFrequencyData(byteData);
            for (let i = 0; i < byteData.length; i += 1) {
                this.frequencyData[i] = (byteData[i] / 255) * (this.maxDecibels - this.minDecibels) + this.minDecibels;
            }
        }
    }

    #captureTimeDomainData() {
        if (typeof this.analyser.getFloatTimeDomainData === 'function') {
            this.analyser.getFloatTimeDomainData(this.timeDomainData);
        } else {
            const byteData = new Uint8Array(this.analyser.fftSize);
            this.analyser.getByteTimeDomainData(byteData);
            for (let i = 0; i < byteData.length; i += 1) {
                this.timeDomainData[i] = (byteData[i] - 128) / 128;
            }
        }
    }

    #analyzeBands() {
        const binSize = this.sampleRate / this.analyser.fftSize;
        const smoothing = this.energySmoothing;

        this.bandDefinitions.forEach((band) => {
            const startBin = Math.max(0, Math.floor(band.low / binSize));
            const endBin = Math.min(this.frequencyData.length - 1, Math.ceil(band.high / binSize));

            if (endBin <= startBin) {
                this.smoothedBands[band.key] *= smoothing;
                return;
            }

            let sum = 0;
            let count = 0;
            for (let i = startBin; i <= endBin; i += 1) {
                const amplitude = this.#dbToNormalized(this.frequencyData[i]);
                sum += amplitude;
                count += 1;
            }

            const average = count > 0 ? sum / count : 0;
            this.smoothedBands[band.key] = (smoothing * this.smoothedBands[band.key]) + ((1 - smoothing) * average);
        });
    }

    #calculateSpectralCentroid() {
        let weightedSum = 0;
        let total = 0;
        const binSize = this.sampleRate / this.analyser.fftSize;

        for (let i = 0; i < this.frequencyData.length; i += 1) {
            const magnitude = this.#dbToNormalized(this.frequencyData[i]);
            const frequency = i * binSize;
            weightedSum += frequency * magnitude;
            total += magnitude;
        }

        const centroid = total > 0 ? weightedSum / total : 0;
        this.spectralCentroid = centroid / (this.sampleRate / 2);
    }

    #calculateSpectralRolloff() {
        const threshold = 0.85;
        const binSize = this.sampleRate / this.analyser.fftSize;
        let totalEnergy = 0;
        const magnitudes = new Array(this.frequencyData.length);

        for (let i = 0; i < this.frequencyData.length; i += 1) {
            const magnitude = this.#dbToNormalized(this.frequencyData[i]);
            magnitudes[i] = magnitude;
            totalEnergy += magnitude;
        }

        const targetEnergy = totalEnergy * threshold;
        let cumulative = 0;
        let rolloffBin = 0;
        for (let i = 0; i < magnitudes.length; i += 1) {
            cumulative += magnitudes[i];
            if (cumulative >= targetEnergy) {
                rolloffBin = i;
                break;
            }
        }

        const rolloffFrequency = rolloffBin * binSize;
        this.spectralRolloff = Math.min(rolloffFrequency / (this.sampleRate / 2), 1);
    }

    #calculateSpectralFlux() {
        let flux = 0;
        for (let i = 0; i < this.frequencyData.length; i += 1) {
            const current = Math.max(0, this.#dbToNormalized(this.frequencyData[i]));
            const previous = Math.max(0, this.previousSpectrum[i]);
            const diff = current - previous;
            if (diff > 0) {
                flux += diff;
            }
            this.previousSpectrum[i] = current;
        }

        this.spectralFlux = flux / this.frequencyData.length;
    }

    #calculateRMS() {
        let sumSquares = 0;
        for (let i = 0; i < this.timeDomainData.length; i += 1) {
            const sample = this.timeDomainData[i];
            sumSquares += sample * sample;
        }

        const meanSquare = sumSquares / this.timeDomainData.length;
        this.rms = Math.sqrt(meanSquare);
    }

    #detectOnset(now) {
        const flux = this.spectralFlux;
        const timeSinceLast = now - this.lastOnsetTime;

        if (flux > this.onsetThreshold && timeSinceLast > this.minimumOnsetInterval) {
            this.lastOnsetTime = now;
            return true;
        }

        return false;
    }

    #recordOnset(timestamp) {
        this.onsetHistory.push(timestamp);
        const windowMs = 6000;
        const cutoff = timestamp - windowMs;
        this.onsetHistory = this.onsetHistory.filter((time) => time >= cutoff);
    }

    #estimateBPM() {
        if (this.onsetHistory.length < 2) {
            return;
        }

        const intervals = [];
        for (let i = 1; i < this.onsetHistory.length; i += 1) {
            intervals.push(this.onsetHistory[i] - this.onsetHistory[i - 1]);
        }

        if (intervals.length === 0) {
            return;
        }

        const avgInterval = intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
        if (avgInterval === 0) {
            return;
        }

        const bpm = 60000 / avgInterval;
        const clampedBpm = Math.min(Math.max(bpm, 60), 200);
        this.estimatedBPM = (this.estimatedBPM * 0.8) + (clampedBpm * 0.2);
    }

    #dbToNormalized(db) {
        const normalized = (db - (this.minDecibels ?? DB_FLOOR)) / ((this.maxDecibels ?? -30) - (this.minDecibels ?? DB_FLOOR));
        return Math.min(Math.max(normalized, 0), 1);
    }

    #now() {
        if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
            return performance.now();
        }
        return Date.now();
    }
}

export default AudioAnalyzer;
