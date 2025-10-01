/**
 * Advanced Audio Analysis Engine
 * Multi-band frequency analysis, spectral features, onset detection
 */

export class AudioAnalyzer {
    constructor(analyserNode) {
        this.analyser = analyserNode;
        this.sampleRate = analyserNode.context.sampleRate;
        this.fftSize = analyserNode.fftSize;
        this.binCount = analyserNode.frequencyBinCount;

        // Frequency data buffers
        this.freqData = new Uint8Array(this.binCount);
        this.timeData = new Uint8Array(this.fftSize);
        this.prevFreqData = new Uint8Array(this.binCount);

        // Multi-band definitions (7 bands)
        this.bands = {
            subBass: { low: 20, high: 60, value: 0 },
            bass: { low: 60, high: 250, value: 0 },
            lowMid: { low: 250, high: 500, value: 0 },
            mid: { low: 500, high: 2000, value: 0 },
            highMid: { low: 2000, high: 4000, value: 0 },
            high: { low: 4000, high: 8000, value: 0 },
            air: { low: 8000, high: 20000, value: 0 }
        };

        // Spectral features
        this.spectralCentroid = 0;
        this.spectralRolloff = 0;
        this.spectralFlux = 0;
        this.rms = 0;

        // Onset detection
        this.onsetThreshold = 2.0;
        this.lastOnsetTime = 0;
        this.onsetHistory = [];
        this.maxOnsetHistory = 100;

        // Smoothing
        this.smoothing = 0.7;
        this.smoothedBands = {};
        Object.keys(this.bands).forEach(key => {
            this.smoothedBands[key] = 0;
        });
    }

    /**
     * Main analysis function - call every frame
     */
    analyze() {
        // Get frequency and time domain data
        this.analyser.getByteFrequencyData(this.freqData);
        this.analyser.getByteTimeDomainData(this.timeData);

        // Analyze all frequency bands
        this.analyzeBands();

        // Calculate spectral features
        this.calcSpectralCentroid();
        this.calcSpectralRolloff();
        this.calcSpectralFlux();
        this.calcRMS();

        // Detect onsets
        const onset = this.detectOnset();

        // Store current for next frame
        this.prevFreqData.set(this.freqData);

        return {
            bands: this.smoothedBands,
            spectralCentroid: this.spectralCentroid,
            spectralRolloff: this.spectralRolloff,
            spectralFlux: this.spectralFlux,
            rms: this.rms,
            onset: onset
        };
    }

    /**
     * Analyze all frequency bands
     */
    analyzeBands() {
        for (const [name, band] of Object.entries(this.bands)) {
            const lowBin = this.freqToBin(band.low);
            const highBin = this.freqToBin(band.high);

            let sum = 0;
            let count = 0;

            for (let i = lowBin; i < highBin; i++) {
                sum += this.freqData[i];
                count++;
            }

            const avg = count > 0 ? sum / count : 0;
            const normalized = avg / 255; // 0-1 range

            // Apply smoothing
            this.smoothedBands[name] = this.smoothedBands[name] * this.smoothing +
                                       normalized * (1 - this.smoothing);

            band.value = this.smoothedBands[name];
        }
    }

    /**
     * Calculate spectral centroid (brightness)
     * Higher value = brighter sound
     */
    calcSpectralCentroid() {
        let weightedSum = 0;
        let sum = 0;

        for (let i = 0; i < this.binCount; i++) {
            const magnitude = this.freqData[i];
            const frequency = this.binToFreq(i);
            weightedSum += frequency * magnitude;
            sum += magnitude;
        }

        if (sum > 0) {
            const centroid = weightedSum / sum;
            // Normalize to 0-1 (assuming max ~10kHz)
            this.spectralCentroid = Math.min(1, centroid / 10000);
        } else {
            this.spectralCentroid = 0;
        }
    }

    /**
     * Calculate spectral rolloff
     * Frequency below which 85% of energy exists
     */
    calcSpectralRolloff() {
        let totalEnergy = 0;
        for (let i = 0; i < this.binCount; i++) {
            totalEnergy += this.freqData[i];
        }

        const threshold = totalEnergy * 0.85;
        let cumulativeEnergy = 0;

        for (let i = 0; i < this.binCount; i++) {
            cumulativeEnergy += this.freqData[i];
            if (cumulativeEnergy >= threshold) {
                const frequency = this.binToFreq(i);
                // Normalize to 0-1 (assuming max ~10kHz)
                this.spectralRolloff = Math.min(1, frequency / 10000);
                return;
            }
        }

        this.spectralRolloff = 1;
    }

    /**
     * Calculate spectral flux (rate of change)
     * Used for onset detection
     */
    calcSpectralFlux() {
        let flux = 0;

        for (let i = 0; i < this.binCount; i++) {
            const diff = this.freqData[i] - this.prevFreqData[i];
            // Only positive changes (new energy)
            if (diff > 0) {
                flux += diff;
            }
        }

        // Normalize
        this.spectralFlux = flux / (this.binCount * 255);
    }

    /**
     * Calculate RMS (overall loudness)
     */
    calcRMS() {
        let sum = 0;

        for (let i = 0; i < this.timeData.length; i++) {
            const normalized = (this.timeData[i] - 128) / 128;
            sum += normalized * normalized;
        }

        this.rms = Math.sqrt(sum / this.timeData.length);
    }

    /**
     * Detect onsets (sudden energy increases)
     */
    detectOnset() {
        const now = Date.now();
        const minInterval = 100; // Minimum 100ms between onsets

        if (this.spectralFlux > this.onsetThreshold &&
            now - this.lastOnsetTime > minInterval) {

            this.lastOnsetTime = now;
            this.onsetHistory.push(now);

            // Keep history limited
            if (this.onsetHistory.length > this.maxOnsetHistory) {
                this.onsetHistory.shift();
            }

            return {
                detected: true,
                strength: this.spectralFlux,
                time: now
            };
        }

        return {
            detected: false,
            strength: this.spectralFlux,
            time: now
        };
    }

    /**
     * Estimate BPM from onset history
     */
    estimateBPM() {
        if (this.onsetHistory.length < 4) return 120; // Default

        // Calculate intervals between onsets
        const intervals = [];
        for (let i = 1; i < this.onsetHistory.length; i++) {
            intervals.push(this.onsetHistory[i] - this.onsetHistory[i - 1]);
        }

        // Find median interval (more robust than mean)
        intervals.sort((a, b) => a - b);
        const medianInterval = intervals[Math.floor(intervals.length / 2)];

        // Convert to BPM
        const bpm = 60000 / medianInterval;

        // Clamp to reasonable range
        return Math.max(60, Math.min(200, bpm));
    }

    /**
     * Helper: Convert frequency to FFT bin
     */
    freqToBin(freq) {
        return Math.round(freq / (this.sampleRate / this.fftSize));
    }

    /**
     * Helper: Convert FFT bin to frequency
     */
    binToFreq(bin) {
        return bin * (this.sampleRate / this.fftSize);
    }

    /**
     * Get all analysis results
     */
    getResults() {
        return {
            // Frequency bands (0-1)
            subBass: this.smoothedBands.subBass,
            bass: this.smoothedBands.bass,
            lowMid: this.smoothedBands.lowMid,
            mid: this.smoothedBands.mid,
            highMid: this.smoothedBands.highMid,
            high: this.smoothedBands.high,
            air: this.smoothedBands.air,

            // Spectral features (0-1)
            spectralCentroid: this.spectralCentroid,
            spectralRolloff: this.spectralRolloff,
            spectralFlux: this.spectralFlux,

            // Overall
            rms: this.rms,
            bpm: this.estimateBPM()
        };
    }
}
