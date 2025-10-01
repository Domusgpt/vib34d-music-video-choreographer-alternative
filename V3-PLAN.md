# V3 System - Complete Rebuild Plan

## 🔍 What I Found (Deep Analysis)

### **Rotation Parameters - ALL WORKING**
Checked all 3 systems:
- ✅ **Faceted**: rot4dXW/YW/ZW with correct 4D rotation matrices
- ✅ **Quantum**: rot4dXW/YW/ZW with correct 4D rotation matrices
- ⚠️ **Holographic**: rot4dXW/YW/ZW BUT adds `+ time * 0.2` automatically

**Issue**: Holographic system auto-rotates, making manual control harder to perceive

### **What's Actually Broken**
1. **Audio reactivity is TOO SIMPLE** - just 3 frequency bands (bass/mid/high)
2. **No temporal smoothing** - values jump instantly, can't see rhythm
3. **No ADSR envelopes** - parameters don't have attack/decay/release
4. **No onset detection** - can't detect kicks/snares/transients
5. **No spectral features** - missing brightness, flux, rolloff
6. **Limited parameter mapping** - only additive, no curves/thresholds

---

## 🎯 V3 System Architecture

### **1. Advanced Audio Analysis Engine**

```javascript
class AudioAnalyzer {
    constructor(audioContext) {
        this.ctx = audioContext;
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 4096; // Higher resolution

        // Multi-band analysis
        this.bands = {
            subBass: { low: 20, high: 60 },
            bass: { low: 60, high: 250 },
            lowMid: { low: 250, high: 500 },
            mid: { low: 500, high: 2000 },
            highMid: { low: 2000, high: 4000 },
            high: { low: 4000, high: 8000 },
            air: { low: 8000, high: 20000 }
        };

        // Feature extraction
        this.features = {
            spectralCentroid: 0,
            spectralRolloff: 0,
            spectralFlux: 0,
            rms: 0,
            zcr: 0
        };

        // Onset detection
        this.onsetThreshold = 1.5;
        this.lastOnsetTime = 0;
        this.onsetHistory = [];

        // Beat tracking
        this.bpm = 120;
        this.beatPhase = 0;
        this.beatConfidence = 0;
    }

    analyze() {
        const freqData = new Uint8Array(this.analyser.frequencyBinCount);
        const timeData = new Uint8Array(this.analyser.fftSize);

        this.analyser.getByteFrequencyData(freqData);
        this.analyser.getByteTimeDomainData(timeData);

        return {
            bands: this.analyzeBands(freqData),
            spectralCentroid: this.calcSpectralCentroid(freqData),
            spectralFlux: this.calcSpectralFlux(freqData),
            onset: this.detectOnset(freqData),
            beat: this.detectBeat(),
            rms: this.calcRMS(timeData)
        };
    }

    calcSpectralCentroid(freqData) {
        let weightedSum = 0;
        let sum = 0;

        for (let i = 0; i < freqData.length; i++) {
            weightedSum += i * freqData[i];
            sum += freqData[i];
        }

        return sum > 0 ? weightedSum / sum : 0;
    }

    detectOnset(freqData) {
        const flux = this.calcSpectralFlux(freqData);
        const now = Date.now();

        if (flux > this.onsetThreshold && now - this.lastOnsetTime > 100) {
            this.lastOnsetTime = now;
            this.onsetHistory.push(now);
            return { detected: true, strength: flux };
        }

        return { detected: false, strength: flux };
    }
}
```

### **2. ADSR Envelope System**

```javascript
class ADSREnvelope {
    constructor(attackMs, decayMs, sustain, releaseMs) {
        this.attack = attackMs;
        this.decay = decayMs;
        this.sustain = sustain;
        this.release = releaseMs;

        this.state = 'idle'; // idle, attack, decay, sustain, release
        this.currentValue = 0;
        this.targetValue = 0;
        this.startTime = 0;
        this.startValue = 0;
    }

    trigger(value) {
        this.targetValue = value;
        this.startValue = this.currentValue;
        this.startTime = Date.now();
        this.state = 'attack';
    }

    release() {
        this.startValue = this.currentValue;
        this.startTime = Date.now();
        this.state = 'release';
    }

    update() {
        const now = Date.now();
        const elapsed = now - this.startTime;

        switch (this.state) {
            case 'attack':
                if (elapsed < this.attack) {
                    const progress = elapsed / this.attack;
                    this.currentValue = this.startValue + (this.targetValue - this.startValue) * progress;
                } else {
                    this.currentValue = this.targetValue;
                    this.state = 'decay';
                    this.startTime = now;
                    this.startValue = this.targetValue;
                }
                break;

            case 'decay':
                if (elapsed < this.decay) {
                    const progress = elapsed / this.decay;
                    this.currentValue = this.targetValue + (this.targetValue * this.sustain - this.targetValue) * progress;
                } else {
                    this.currentValue = this.targetValue * this.sustain;
                    this.state = 'sustain';
                }
                break;

            case 'sustain':
                // Hold at sustain level
                break;

            case 'release':
                if (elapsed < this.release) {
                    const progress = elapsed / this.release;
                    this.currentValue = this.startValue * (1 - progress);
                } else {
                    this.currentValue = 0;
                    this.state = 'idle';
                }
                break;
        }

        return this.currentValue;
    }
}
```

### **3. Parameter Mapping Engine**

```javascript
class ParameterMapper {
    constructor() {
        this.mappings = {
            // Rotation mappings
            rot4dXW: {
                source: 'bass',
                curve: 'exponential',
                range: [-2, 2],
                envelope: new ADSREnvelope(200, 500, 0.6, 1000),
                smoothing: 0.8
            },
            rot4dYW: {
                source: 'mid',
                curve: 'exponential',
                range: [-2, 2],
                envelope: new ADSREnvelope(150, 400, 0.7, 800),
                smoothing: 0.7
            },
            rot4dZW: {
                source: 'high',
                curve: 'logarithmic',
                range: [-2, 2],
                envelope: new ADSREnvelope(100, 300, 0.8, 600),
                smoothing: 0.6
            },

            // Density mapping
            gridDensity: {
                source: 'spectralCentroid',
                curve: 's-curve',
                range: [10, 100],
                envelope: new ADSREnvelope(300, 600, 0.5, 1200),
                threshold: 0.2
            },

            // Hue mapping
            hue: {
                source: 'spectralRolloff',
                curve: 'linear',
                range: [0, 360],
                smoothing: 0.9 // Very smooth color changes
            },

            // Chaos mapping (onsets)
            chaos: {
                source: 'onset',
                curve: 'threshold',
                range: [0.2, 0.9],
                envelope: new ADSREnvelope(50, 200, 0.3, 500),
                threshold: 0.5
            }
        };

        this.smoothedValues = {};
    }

    map(paramName, audioFeatures) {
        const mapping = this.mappings[paramName];
        if (!mapping) return null;

        // Get source value
        let value = audioFeatures[mapping.source] || 0;

        // Apply threshold
        if (mapping.threshold && value < mapping.threshold) {
            value = 0;
        }

        // Apply curve
        value = this.applyCurve(value, mapping.curve);

        // Apply envelope
        if (mapping.envelope) {
            if (value > (this.smoothedValues[paramName] || 0)) {
                mapping.envelope.trigger(value);
            } else if (value < 0.1) {
                mapping.envelope.release();
            }
            value = mapping.envelope.update();
        }

        // Apply smoothing
        if (mapping.smoothing) {
            const prev = this.smoothedValues[paramName] || value;
            value = prev * mapping.smoothing + value * (1 - mapping.smoothing);
            this.smoothedValues[paramName] = value;
        }

        // Map to range
        const [min, max] = mapping.range;
        value = min + value * (max - min);

        return value;
    }

    applyCurve(value, curve) {
        switch (curve) {
            case 'linear':
                return value;
            case 'exponential':
                return Math.pow(value, 2);
            case 'logarithmic':
                return Math.log(1 + value * 9) / Math.log(10);
            case 's-curve':
                return 1 / (1 + Math.exp(-10 * (value - 0.5)));
            case 'threshold':
                return value > 0.5 ? 1 : 0;
            default:
                return value;
        }
    }
}
```

### **4. Sequence System with Advanced Mapping**

```json
{
  "name": "DROP 1 - Spectral Explosion",
  "time": 60,
  "dur": 32,
  "sys": "faceted",

  "baseParams": {
    "geometry": 5,
    "speed": 0.4,
    "morphFactor": 1.5
  },

  "audioMappings": {
    "rot4dXW": {
      "source": "bass",
      "curve": "exponential",
      "range": [0.5, 1.8],
      "attack": 100,
      "decay": 300,
      "sustain": 0.7,
      "release": 800
    },
    "rot4dYW": {
      "source": "spectralCentroid",
      "curve": "s-curve",
      "range": [0.3, 1.5],
      "attack": 150,
      "release": 600
    },
    "gridDensity": {
      "source": "spectralFlux",
      "curve": "exponential",
      "range": [60, 100],
      "threshold": 0.3,
      "attack": 200,
      "release": 1000
    },
    "hue": {
      "source": "beat",
      "curve": "step",
      "values": [280, 300, 320, 340],
      "smoothing": 0.9
    },
    "chaos": {
      "source": "onset",
      "curve": "threshold",
      "range": [0.5, 0.9],
      "attack": 50,
      "release": 400
    }
  },

  "sweeps": {
    "morphFactor": [1.5, 2.0],
    "intensity": [0.6, 0.9]
  }
}
```

---

## 🎵 Expected Results

### **Drops**:
- **Bass hits trigger rot4dXW** with 100ms attack, 300ms decay
- **Spectral brightness controls density** (bright = high density)
- **Onsets trigger chaos spikes** that decay over 400ms
- **Beat-synced hue changes** with smooth transitions
- **Everything feels MUSICAL** not random

### **Builds**:
- **Progressive parameter sweeps** over duration
- **Spectral centroid increases** = brighter colors, more density
- **Attack times shorten** = more responsive
- **Multiple layers reacting differently** to different features

### **Breakdowns**:
- **Long release times** (2000ms+) = smooth fadeouts
- **Low spectral centroid** = darker colors, less density
- **Minimal onset detection** = calm, flowing

---

## 📊 Parameter Mappings Table

| Parameter | Audio Source | Curve | Attack | Release | Musical Effect |
|-----------|-------------|-------|--------|---------|----------------|
| rot4dXW | Bass | Exponential | 100ms | 800ms | Punchy rotation on kicks |
| rot4dYW | Spectral Centroid | S-curve | 150ms | 600ms | Brightness = rotation |
| rot4dZW | High | Logarithmic | 100ms | 600ms | Hi-hats add Z rotation |
| gridDensity | Spectral Flux | Exponential | 200ms | 1000ms | Change = more detail |
| hue | Beat Phase | Step | - | - | Color cycles with beat |
| chaos | Onset | Threshold | 50ms | 400ms | Hits = chaos spikes |
| morphFactor | Mid | Linear | 300ms | 1200ms | Smooth shape changes |
| intensity | RMS | Exponential | 100ms | 500ms | Loudness = brightness |

---

## 🚀 Implementation Priority

1. ✅ **Research complete** - Found all issues
2. ✅ **Test page created** - test-parameters.html
3. ✅ **Build AudioAnalyzer** - Multi-band + spectral features
4. ✅ **Build ADSREnvelope** - Temporal smoothing
5. ✅ **Build ParameterMapper** - Advanced mapping engine
6. ✅ **Create V3 HTML** - Full integration
7. 🔄 **Test with real music** - Verify improvements
8. ⏳ **Update AI prompts** - Generate sequences with new mapping format

---

## 📁 Files

- ✅ `test-parameters.html` - Manual testing
- ✅ `V3-PLAN.md` - This document
- ✅ `index-V3-ULTIMATE.html` - Complete V3 system
- ✅ `src/audio/AudioAnalyzer.js` - Advanced analysis (286 lines)
- ✅ `src/audio/ADSREnvelope.js` - Envelope system (140 lines)
- ✅ `src/audio/ParameterMapper.js` - Mapping engine (297 lines)

---

**V3 will have PROFESSIONAL audio-visual dynamics instead of simple additive reactivity!**
