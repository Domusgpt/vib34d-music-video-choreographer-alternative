# Professional Audio-Reactive Visualizer Research

## 🎯 What's Actually Needed

Based on research of professional audio visualizers and Web Audio API best practices:

---

## 1. FFT Analysis & Frequency Binning

### **Current Problem:**
- Using simple 0-100Hz, 100-400Hz, 400-1024Hz bands
- No proper frequency-to-bin conversion
- Ignoring sample rate and FFT size relationship

### **Professional Approach:**

```javascript
// FFT bin = frequency * (fftSize / sampleRate)
// With fftSize=2048, sampleRate=44100:
// Each bin = 44100 / 2048 = ~21.5 Hz apart

const frequencyToBin = (freq) => Math.round(freq / (sampleRate / fftSize));

const bands = {
    subBass: { min: frequencyToBin(20), max: frequencyToBin(60) },     // 20-60Hz
    bass: { min: frequencyToBin(60), max: frequencyToBin(250) },       // 60-250Hz (kick drum)
    lowMid: { min: frequencyToBin(250), max: frequencyToBin(500) },    // 250-500Hz
    mid: { min: frequencyToBin(500), max: frequencyToBin(2000) },      // 500-2kHz
    highMid: { min: frequencyToBin(2000), max: frequencyToBin(4000) }, // 2-4kHz
    presence: { min: frequencyToBin(4000), max: frequencyToBin(6000) },// 4-6kHz (vocals)
    brilliance: { min: frequencyToBin(6000), max: frequencyToBin(20000) } // 6-20kHz
};
```

### **Key Improvement:**
- **Kick drum detection:** 60-130Hz range (first 3-6 bins with fftSize=2048)
- **Snare detection:** 300-750Hz range (bins 14-35)
- **Use `getByteFrequencyData()` for magnitude**, `getByteTimeDomainData()` for waveform

---

## 2. Beat Detection & Onset Detection

### **Current Problem:**
- No beat detection at all
- Parameters jump instantly with volume

### **Professional Approach - Energy-Based:**

```javascript
class BeatDetector {
    constructor() {
        this.energyHistory = [];
        this.historySize = 43; // ~1 second at 43 frames/sec
        this.threshold = 1.5;  // Beat must be 1.5x average energy
        this.lastBeatTime = 0;
        this.minTimeBetweenBeats = 100; // ms (600 BPM max)
    }

    detectBeat(frequencyData) {
        // Calculate instant energy (sum of squares in bass range)
        let instantEnergy = 0;
        for (let i = 0; i < 10; i++) { // First 10 bins (~bass)
            instantEnergy += frequencyData[i] * frequencyData[i];
        }

        // Add to history
        this.energyHistory.push(instantEnergy);
        if (this.energyHistory.length > this.historySize) {
            this.energyHistory.shift();
        }

        // Calculate average energy
        const avgEnergy = this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length;

        // Detect beat if instant energy >> average energy
        const now = Date.now();
        if (instantEnergy > avgEnergy * this.threshold &&
            now - this.lastBeatTime > this.minTimeBetweenBeats) {
            this.lastBeatTime = now;
            return {
                detected: true,
                strength: instantEnergy / avgEnergy,
                time: now
            };
        }

        return { detected: false, strength: 0 };
    }
}
```

### **Professional Approach - Spectral Flux:**

```javascript
class OnsetDetector {
    constructor(fftSize) {
        this.prevSpectrum = new Uint8Array(fftSize / 2);
        this.threshold = 2.0;
    }

    detectOnset(frequencyData) {
        let flux = 0;

        // Calculate positive spectral flux (increase in energy)
        for (let i = 0; i < frequencyData.length; i++) {
            const diff = frequencyData[i] - this.prevSpectrum[i];
            if (diff > 0) flux += diff; // Only positive changes
        }

        // Store current for next frame
        this.prevSpectrum.set(frequencyData);

        return flux / frequencyData.length; // Normalized flux
    }
}
```

---

## 3. Temporal Smoothing & Filtering

### **Current Problem:**
- Parameters jump instantly
- No attack/decay/release

### **Professional Approach - Exponential Smoothing:**

```javascript
class SmoothedValue {
    constructor(smoothingFactor = 0.8) {
        this.smoothing = smoothingFactor; // 0-1 (higher = smoother)
        this.current = 0;
    }

    update(newValue) {
        this.current = this.current * this.smoothing + newValue * (1 - this.smoothing);
        return this.current;
    }
}
```

### **Professional Approach - Attack/Release Filter:**

```javascript
class AttackReleaseFilter {
    constructor(attackTime = 50, releaseTime = 200) {
        this.attack = attackTime;   // ms to rise
        this.release = releaseTime; // ms to fall
        this.current = 0;
        this.target = 0;
        this.lastUpdate = Date.now();
    }

    update(newTarget) {
        const now = Date.now();
        const dt = now - this.lastUpdate;
        this.lastUpdate = now;

        this.target = newTarget;

        if (this.current < this.target) {
            // Attack phase (fast rise)
            const attackRate = 1.0 / this.attack; // per ms
            this.current += attackRate * dt;
            if (this.current > this.target) this.current = this.target;
        } else {
            // Release phase (slow fall)
            const releaseRate = 1.0 / this.release; // per ms
            this.current -= releaseRate * dt;
            if (this.current < this.target) this.current = this.target;
        }

        return this.current;
    }
}
```

---

## 4. BPM Detection

### **Current Problem:**
- No BPM detection

### **Professional Approach - Autocorrelation:**

```javascript
class BPMDetector {
    constructor() {
        this.beatTimes = [];
        this.maxHistory = 100;
    }

    addBeat(timestamp) {
        this.beatTimes.push(timestamp);
        if (this.beatTimes.length > this.maxHistory) {
            this.beatTimes.shift();
        }
    }

    calculateBPM() {
        if (this.beatTimes.length < 4) return 120; // Default

        // Calculate intervals between beats
        const intervals = [];
        for (let i = 1; i < this.beatTimes.length; i++) {
            intervals.push(this.beatTimes[i] - this.beatTimes[i-1]);
        }

        // Find median interval (more robust than mean)
        intervals.sort((a, b) => a - b);
        const median = intervals[Math.floor(intervals.length / 2)];

        // Convert to BPM
        const bpm = 60000 / median;

        // Clamp to reasonable range
        return Math.max(60, Math.min(200, bpm));
    }
}
```

---

## 5. Advanced Spectral Features

### **Spectral Centroid (Brightness):**

```javascript
function calculateSpectralCentroid(frequencyData, sampleRate, fftSize) {
    let weightedSum = 0;
    let sum = 0;

    for (let i = 0; i < frequencyData.length; i++) {
        const magnitude = frequencyData[i];
        const frequency = i * (sampleRate / fftSize);
        weightedSum += frequency * magnitude;
        sum += magnitude;
    }

    return sum > 0 ? weightedSum / sum : 0;
}
```

**Use:** Bright sounds (high centroid) → increase density/detail. Dark sounds → reduce density.

### **Spectral Rolloff:**

```javascript
function calculateSpectralRolloff(frequencyData, threshold = 0.85) {
    let totalEnergy = 0;
    for (let i = 0; i < frequencyData.length; i++) {
        totalEnergy += frequencyData[i];
    }

    const targetEnergy = totalEnergy * threshold;
    let cumulativeEnergy = 0;

    for (let i = 0; i < frequencyData.length; i++) {
        cumulativeEnergy += frequencyData[i];
        if (cumulativeEnergy >= targetEnergy) {
            return i; // Bin number where 85% of energy exists
        }
    }

    return frequencyData.length;
}
```

**Use:** High rolloff = energetic → more chaos. Low rolloff = calm → less chaos.

### **RMS (Loudness):**

```javascript
function calculateRMS(timeDomainData) {
    let sum = 0;
    for (let i = 0; i < timeDomainData.length; i++) {
        const normalized = (timeDomainData[i] - 128) / 128.0;
        sum += normalized * normalized;
    }
    return Math.sqrt(sum / timeDomainData.length);
}
```

**Use:** Overall loudness → intensity parameter.

---

## 6. Shader-Based Visualization Techniques

### **Noise-Based Distortion:**

```glsl
// In vertex shader
vec3 pos = position;
float noise = snoise(vec3(pos * u_noiseScale + u_time * 0.1));
pos += normal * noise * u_audioLevel; // Distort along normal
```

### **Fresnel Glow:**

```glsl
// In fragment shader
float fresnel = pow(1.0 - dot(normalize(vNormal), normalize(vViewDir)), 3.0);
vec3 glowColor = vec3(0.0, 1.0, 1.0) * fresnel * u_audioHigh;
```

### **Curl Noise Particles:**

```glsl
vec3 curlNoise(vec3 p) {
    float eps = 0.1;
    vec3 dx = vec3(eps, 0.0, 0.0);
    vec3 dy = vec3(0.0, eps, 0.0);
    vec3 dz = vec3(0.0, 0.0, eps);

    vec3 curl;
    curl.x = snoise(p + dy) - snoise(p - dy) - (snoise(p + dz) - snoise(p - dz));
    curl.y = snoise(p + dz) - snoise(p - dz) - (snoise(p + dx) - snoise(p - dx));
    curl.z = snoise(p + dx) - snoise(p - dx) - (snoise(p + dy) - snoise(p - dy));

    return curl / (2.0 * eps);
}
```

---

## 7. Parameter Mapping Strategies

### **Direct Mapping:**
- Frequency band → Parameter (1:1)
- Example: Bass → rot4dXW

### **Threshold-Based:**
- Only react above certain level
- Example: Chaos only when bass > 0.3

### **Derivative-Based:**
- React to CHANGE not level
- Example: Spectral flux (rate of change) → chaos spikes

### **Accumulator:**
- Sum over time, decay slowly
- Example: Beat count → hue shift

### **Peak Detection:**
- Track peaks, trigger on local maxima
- Example: Kick drum peak → rotation boost

### **Multi-Band Weighted:**
- Combine multiple bands with weights
- Example: `intensity = 0.5*bass + 0.3*mid + 0.2*high`

---

## 8. Recommended Architecture

```javascript
class AudioReactiveEngine {
    constructor(audioContext) {
        this.ctx = audioContext;
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 2048;
        this.analyser.smoothingTimeConstant = 0.8;

        // Feature extractors
        this.beatDetector = new BeatDetector();
        this.onsetDetector = new OnsetDetector(this.analyser.fftSize);
        this.bpmDetector = new BPMDetector();

        // Smoothing filters
        this.smoothers = {
            bass: new SmoothedValue(0.7),
            mid: new SmoothedValue(0.6),
            high: new SmoothedValue(0.5),
            centroid: new SmoothedValue(0.8),
            rolloff: new SmoothedValue(0.8)
        };

        // Attack/Release filters
        this.envelopes = {
            rot4dXW: new AttackReleaseFilter(100, 800),
            rot4dYW: new AttackReleaseFilter(150, 600),
            rot4dZW: new AttackReleaseFilter(100, 500),
            gridDensity: new AttackReleaseFilter(300, 1200),
            chaos: new AttackReleaseFilter(50, 400)
        };

        // Data buffers
        this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
        this.timeData = new Uint8Array(this.analyser.fftSize);
    }

    analyze() {
        this.analyser.getByteFrequencyData(this.freqData);
        this.analyser.getByteTimeDomainData(this.timeData);

        // Extract features
        const bass = this.smoothers.bass.update(this.getFreqRange(20, 250));
        const mid = this.smoothers.mid.update(this.getFreqRange(250, 2000));
        const high = this.smoothers.high.update(this.getFreqRange(2000, 20000));

        const centroid = this.smoothers.centroid.update(
            this.calculateSpectralCentroid()
        );

        const beat = this.beatDetector.detectBeat(this.freqData);
        if (beat.detected) this.bpmDetector.addBeat(Date.now());

        const onset = this.onsetDetector.detectOnset(this.freqData);
        const rms = this.calculateRMS(this.timeData);

        return {
            // Raw features
            bass, mid, high, centroid, rms,

            // Events
            beat: beat.detected,
            beatStrength: beat.strength,
            onset: onset,
            bpm: this.bpmDetector.calculateBPM(),

            // Smoothed parameters (with attack/release)
            rot4dXW: this.envelopes.rot4dXW.update(bass),
            rot4dYW: this.envelopes.rot4dYW.update(mid),
            rot4dZW: this.envelopes.rot4dZW.update(high),
            gridDensity: this.envelopes.gridDensity.update(centroid),
            chaos: this.envelopes.chaos.update(onset)
        };
    }

    getFreqRange(minFreq, maxFreq) {
        const minBin = this.frequencyToBin(minFreq);
        const maxBin = this.frequencyToBin(maxFreq);
        let sum = 0;
        for (let i = minBin; i < maxBin; i++) {
            sum += this.freqData[i];
        }
        return sum / (maxBin - minBin) / 255; // Normalize to 0-1
    }

    frequencyToBin(freq) {
        return Math.round(freq / (this.ctx.sampleRate / this.analyser.fftSize));
    }

    calculateSpectralCentroid() { /* ... */ }
    calculateRMS() { /* ... */ }
}
```

---

## 9. What's Missing in Current System

❌ **NO proper frequency-to-bin conversion**
❌ **NO beat detection**
❌ **NO onset detection**
❌ **NO BPM tracking**
❌ **NO spectral features (centroid, rolloff)**
❌ **NO attack/release envelopes**
❌ **NO temporal smoothing**
❌ **NO threshold-based triggering**
❌ **NO derivative-based reactivity**
❌ **Hard-coded frequency ranges instead of calculated bins**
❌ **Parameters jump instantly with audio**

---

## 10. What Needs To Be Built

✅ **Complete FFT bin calculation system**
✅ **Beat detector (energy-based + spectral flux)**
✅ **Onset detector for transients**
✅ **BPM detector (autocorrelation of beats)**
✅ **Spectral feature extraction (centroid, rolloff, RMS)**
✅ **Attack/Release envelope filters**
✅ **Exponential smoothing for all features**
✅ **Threshold-based parameter triggering**
✅ **Multi-mode reactivity (direct, derivative, threshold, accumulator)**
✅ **Real-time audio visualization (frequency bars)**
✅ **Parameter curve transformations (exponential, logarithmic, s-curve)**

---

**The V3 plan was actually CORRECT - it just wasn't implemented yet. The current V2 system has NONE of these techniques.**
