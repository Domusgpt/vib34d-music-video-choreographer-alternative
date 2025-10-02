# Professional Audio-Reactive System - Implementation Plan

## 🔍 Current Visualizer Analysis

### **Faceted Visualizer** (`src/core/Visualizer.js`)

**Current Shader Parameters:**
```glsl
uniform float u_geometry;       // 0-7 (8 geometry types)
uniform float u_gridDensity;    // Multiplier for lattice density
uniform float u_morphFactor;    // Shape distortion factor
uniform float u_chaos;          // Noise/randomization
uniform float u_speed;          // Animation speed
uniform float u_hue;            // Color (0-360)
uniform float u_intensity;      // Brightness
uniform float u_saturation;     // Color saturation
uniform float u_dimension;      // 4D projection dimension
uniform float u_rot4dXW;        // X-W plane rotation
uniform float u_rot4dYW;        // Y-W plane rotation
uniform float u_rot4dZW;        // Z-W plane rotation
uniform float u_mouseIntensity; // Mouse interaction strength
uniform float u_clickIntensity; // Click pulse effect
```

**Geometries Available:**
0. Tetrahedron lattice
1. Hypercube lattice
2. Sphere lattice (concentric)
3. Torus lattice
4. Klein bottle
5. **Fractal lattice** (best for high density)
6. Wave interference
7. Crystal lattice

**Key Finding:** All geometries use `u_gridDensity * 0.08` uniformly - can push density much higher!

---

### **Quantum Visualizer** (`src/quantum/QuantumVisualizer.js`)

**Current Shader Parameters:**
- Same as Faceted + enhanced 3D lattice functions
- `tetrahedronLattice()`, `hypercubeLattice()`, `sphereLattice()`, etc.
- More complex geometry calculations with smoothstep

**Key Finding:** Has superior lattice algorithms with vertex/edge detection

---

### **Holographic Visualizer** (`src/holograms/HolographicVisualizer.js`)

**Current Shader Parameters:**
```glsl
uniform float u_density;           // Grid density
uniform float u_geometryType;      // Geometry selection
uniform float u_morph;             // Morph factor
uniform float u_chaos;             // Chaos amount
uniform float u_chaosIntensity;    // Additional chaos layer
uniform float u_roleDensity;       // Per-layer density multiplier
uniform float u_roleSpeed;         // Per-layer speed multiplier
uniform float u_densityVariation;  // Density modulation
uniform float u_scrollParallax;    // Scroll-based offset
uniform float u_gridDensityShift;  // Scroll density modifier
uniform float u_touchMorph;        // Touch interaction
uniform float u_touchChaos;        // Touch chaos
uniform float u_audioDensityBoost; // ⚠️ AUDIO PARAMETER
uniform float u_audioMorphBoost;   // ⚠️ AUDIO PARAMETER
uniform float u_audioChaosBoost;   // ⚠️ AUDIO PARAMETER
```

**Key Finding:** Already has audio parameters! But they're not properly connected.

---

## 🎯 New Shader Parameters To Add

### **1. Audio-Reactive Uniforms** (Add to ALL visualizers)

```glsl
// Multi-band audio analysis
uniform float u_audioSubBass;      // 20-60Hz (0-1)
uniform float u_audioBass;         // 60-250Hz (0-1)
uniform float u_audioLowMid;       // 250-500Hz (0-1)
uniform float u_audioMid;          // 500-2000Hz (0-1)
uniform float u_audioHighMid;      // 2000-4000Hz (0-1)
uniform float u_audioPresence;     // 4000-6000Hz (0-1)
uniform float u_audioBrilliance;   // 6000-20000Hz (0-1)

// Spectral features
uniform float u_audioSpectralCentroid;  // Brightness (0-1)
uniform float u_audioSpectralRolloff;   // Energy distribution (0-1)
uniform float u_audioSpectralFlux;      // Change detection (0-1)
uniform float u_audioRMS;               // Overall loudness (0-1)

// Beat/rhythm detection
uniform float u_audioBeatDetected;      // 1.0 on beat, 0.0 otherwise
uniform float u_audioBeatStrength;      // Beat intensity (0-1+)
uniform float u_audioOnsetStrength;     // Transient strength (0-1+)
uniform float u_audioBPM;               // Detected BPM (60-200)
uniform float u_audioBeatPhase;         // Position in beat cycle (0-1)

// Smoothed envelope followers
uniform float u_audioBassEnvelope;      // Bass with attack/release
uniform float u_audioMidEnvelope;       // Mid with attack/release
uniform float u_audioHighEnvelope;      // High with attack/release
```

### **2. Advanced Visual Parameters**

```glsl
// Noise parameters
uniform float u_noiseScale;         // Perlin noise frequency
uniform float u_noiseAmplitude;     // Noise distortion amount
uniform float u_curlNoiseStrength;  // Curl noise for particles

// Fresnel/glow parameters
uniform float u_fresnelPower;       // Fresnel exponent (1-5)
uniform float u_glowIntensity;      // Edge glow strength
uniform float u_glowColor;          // Glow hue shift

// Color modulation
uniform float u_hueShift;           // Audio-driven hue rotation
uniform float u_saturationBoost;    // Audio-driven saturation
uniform float u_brightnessBoost;    // Audio-driven brightness

// Geometry modulation
uniform float u_warpStrength;       // Vertex displacement amount
uniform float u_scaleModulation;    // Size pulsing
uniform float u_rotationSpeed;      // Auto-rotation speed
```

---

## 🎨 Enhanced Geometry Functions

### **Add to Faceted Shader:**

```glsl
// Perlin-style noise function
float hash(float n) { return fract(sin(n) * 43758.5453123); }

float noise(vec3 x) {
    vec3 p = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);

    float n = p.x + p.y * 57.0 + 113.0 * p.z;
    return mix(mix(mix(hash(n + 0.0), hash(n + 1.0), f.x),
                   mix(hash(n + 57.0), hash(n + 58.0), f.x), f.y),
               mix(mix(hash(n + 113.0), hash(n + 114.0), f.x),
                   mix(hash(n + 170.0), hash(n + 171.0), f.x), f.y), f.z);
}

// Audio-reactive geometry with noise distortion
float audioReactiveGeometry(vec4 p) {
    // Base geometry
    float base = geometryFunction(p);

    // Add bass-driven noise distortion
    float noiseDistortion = noise(p.xyz + u_time * 0.001 * u_speed) * u_audioSubBass * 0.3;
    base += noiseDistortion;

    // Add onset-triggered pulses
    float onsetPulse = u_audioOnsetStrength * exp(-u_time * 0.01) * 0.5;
    base *= (1.0 + onsetPulse);

    // Add spectral centroid-driven morphing
    base *= (1.0 + u_audioSpectralCentroid * 0.2);

    return base;
}

// Fresnel glow effect
float fresnel(vec3 normal, vec3 viewDir, float power) {
    return pow(1.0 - dot(normalize(normal), normalize(viewDir)), power);
}

// Audio-reactive color
vec3 audioReactiveColor(vec3 baseColor, float latticeValue) {
    // Hue shift based on spectral centroid (brightness)
    float hueShift = u_audioSpectralCentroid * 60.0; // 0-60° shift

    // Saturation boost on beats
    float satBoost = u_audioBeatDetected * 0.3;

    // Brightness boost on high frequencies
    float brightnessBoost = u_audioBrilliance * 0.5;

    // Apply modulations
    vec3 color = baseColor;
    color = mix(color, color * (1.0 + brightnessBoost), u_audioHighEnvelope);

    // Add beat flash
    color += vec3(1.0) * u_audioBeatDetected * u_audioBeatStrength * 0.3;

    return color;
}
```

---

## 📊 Parameter Range Expansions

### **Current Ranges (Too Conservative):**
- `gridDensity`: 4-100
- `morphFactor`: 0-2
- `chaos`: 0-1
- `speed`: 0.1-3
- `rot4dXW/YW/ZW`: -2 to 2

### **Professional Ranges (Expanded):**

```javascript
const professionalRanges = {
    // Geometry
    geometry: { min: 0, max: 7, step: 1 },

    // Grid density - EXPANDED for fractal detail
    gridDensity: { min: 1, max: 200, step: 0.5 },

    // Morphing - EXPANDED for extreme distortion
    morphFactor: { min: 0, max: 5, step: 0.01 },

    // Chaos - keep 0-1
    chaos: { min: 0, max: 1, step: 0.01 },

    // Speed - EXPANDED for slowmo and hyperspace
    speed: { min: 0.01, max: 10, step: 0.01 },

    // 4D Rotation - EXPANDED to full 2π range
    rot4dXW: { min: -6.28, max: 6.28, step: 0.01 },
    rot4dYW: { min: -6.28, max: 6.28, step: 0.01 },
    rot4dZW: { min: -6.28, max: 6.28, step: 0.01 },

    // Color
    hue: { min: 0, max: 360, step: 1 },
    intensity: { min: 0, max: 2, step: 0.01 },      // EXPANDED for HDR
    saturation: { min: 0, max: 1.5, step: 0.01 },    // EXPANDED for oversaturation

    // NEW: Noise parameters
    noiseScale: { min: 0.1, max: 10, step: 0.1 },
    noiseAmplitude: { min: 0, max: 2, step: 0.01 },

    // NEW: Fresnel/glow
    fresnelPower: { min: 1, max: 5, step: 0.1 },
    glowIntensity: { min: 0, max: 2, step: 0.01 },

    // NEW: Warp/scale
    warpStrength: { min: 0, max: 3, step: 0.01 },
    scaleModulation: { min: 0.5, max: 2, step: 0.01 }
};
```

---

## 🎵 Audio-Reactive Mapping Strategy

### **Bass-Driven Parameters** (60-250Hz)
- `rot4dXW` - Primary rotation on bass kicks
- `gridDensity` - Fractal detail increases with bass
- `scaleModulation` - Size pulsing on bass
- `warpStrength` - Geometry distortion

**Envelope:** Attack 50ms, Decay 200ms, Sustain 0.7, Release 600ms (punchy)

### **Mid-Driven Parameters** (500-2000Hz)
- `rot4dYW` - Secondary rotation on melody
- `morphFactor` - Shape transformation
- `hueShift` - Color changes with melody

**Envelope:** Attack 100ms, Decay 300ms, Sustain 0.6, Release 800ms (musical)

### **High-Driven Parameters** (4000-6000Hz)
- `rot4dZW` - Tertiary rotation on hi-hats
- `chaos` - Sparkle on cymbals
- `glowIntensity` - Edge glow on highs

**Envelope:** Attack 50ms, Decay 150ms, Sustain 0.5, Release 400ms (quick)

### **Spectral Centroid** (Brightness)
- `gridDensity` - Bright = high detail
- `intensity` - Bright = more intense
- `fresnelPower` - Bright = stronger fresnel

**Smoothing:** 0.8 (very smooth)

### **Spectral Flux** (Change Detection)
- `morphFactor` - Changes trigger morphing
- `noiseAmplitude` - Onsets add noise

**Smoothing:** 0.6 (responsive)

### **Onset Detection** (Transients)
- `chaos` - Spikes on kicks/snares
- `clickIntensity` - Flash on transients
- Geometry switches on strong onsets

**Envelope:** Attack 30ms, Decay 100ms, Release 300ms (very fast)

### **Beat Detection**
- `beatPhase` - Cycles 0-1 per beat
- Color shifts synchronized to beat
- Geometry rotation locked to BPM

---

## 🏗️ Implementation Architecture

### **1. Complete AudioReactiveEngine** (`src/audio/AudioReactiveEngine.js`)

```javascript
export class AudioReactiveEngine {
    constructor(audioContext) {
        this.ctx = audioContext;
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 4096;  // High resolution
        this.analyser.smoothingTimeConstant = 0.75;

        this.sampleRate = this.ctx.sampleRate;
        this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
        this.timeData = new Uint8Array(this.analyser.fftSize);
        this.prevFreqData = new Uint8Array(this.analyser.frequencyBinCount);

        // Feature extractors
        this.beatDetector = new BeatDetector();
        this.onsetDetector = new OnsetDetector();
        this.bpmDetector = new BPMDetector();

        // Smoothing filters
        this.smoothers = this.createSmootherSet();

        // Attack/Release envelopes
        this.envelopes = this.createEnvelopeSet();

        // Current state
        this.state = {
            // Raw bands (0-1)
            subBass: 0, bass: 0, lowMid: 0, mid: 0,
            highMid: 0, presence: 0, brilliance: 0,

            // Spectral features (0-1)
            spectralCentroid: 0,
            spectralRolloff: 0,
            spectralFlux: 0,
            rms: 0,

            // Events
            beatDetected: 0,
            beatStrength: 0,
            onsetStrength: 0,
            bpm: 120,
            beatPhase: 0,

            // Enveloped values (smoothed)
            bassEnvelope: 0,
            midEnvelope: 0,
            highEnvelope: 0
        };
    }

    analyze() {
        this.analyser.getByteFrequencyData(this.freqData);
        this.analyser.getByteTimeDomainData(this.timeData);

        // Extract frequency bands
        this.extractFrequencyBands();

        // Calculate spectral features
        this.calculateSpectralFeatures();

        // Detect beats/onsets
        this.detectBeatsAndOnsets();

        // Apply envelopes
        this.applyEnvelopes();

        // Store for next frame
        this.prevFreqData.set(this.freqData);

        return this.state;
    }

    extractFrequencyBands() { /* ... */ }
    calculateSpectralFeatures() { /* ... */ }
    detectBeatsAndOnsets() { /* ... */ }
    applyEnvelopes() { /* ... */ }
}
```

### **2. Visualizer Integration**

Each visualizer gets:

```javascript
class EnhancedVisualizer {
    setAudioState(audioState) {
        this.audioState = audioState;

        // Update all audio uniforms
        this.gl.uniform1f(this.uniforms.audioSubBass, audioState.subBass);
        this.gl.uniform1f(this.uniforms.audioBass, audioState.bass);
        // ... (all 20+ audio uniforms)
    }

    render() {
        // Apply audio-reactive parameter modulation
        const modulated = this.modulateParameters(this.params, this.audioState);

        // Set uniforms with modulated values
        this.setUniforms(modulated);

        // Draw
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    }

    modulateParameters(baseParams, audioState) {
        return {
            geometry: baseParams.geometry,
            gridDensity: baseParams.gridDensity + audioState.bassEnvelope * 50,
            morphFactor: baseParams.morphFactor + audioState.midEnvelope * 1.5,
            chaos: Math.min(1, baseParams.chaos + audioState.onsetStrength * 0.5),
            rot4dXW: baseParams.rot4dXW + audioState.bassEnvelope * 1.0,
            rot4dYW: baseParams.rot4dYW + audioState.midEnvelope * 0.8,
            rot4dZW: baseParams.rot4dZW + audioState.highEnvelope * 0.6,
            // ... etc
        };
    }
}
```

---

## 🎯 Implementation Steps

### **Phase 1: Audio Engine** (Priority 1)
1. ✅ Build `BeatDetector` class (energy-based)
2. ✅ Build `OnsetDetector` class (spectral flux)
3. ✅ Build `BPMDetector` class (autocorrelation)
4. ✅ Build `SmoothedValue` class (exponential smoothing)
5. ✅ Build `AttackReleaseFilter` class (envelope follower)
6. ✅ Build `AudioReactiveEngine` class (complete system)

### **Phase 2: Visualizer Enhancement** (Priority 2)
1. Add all audio uniforms to each visualizer's shader
2. Implement `setAudioState()` method
3. Implement `modulateParameters()` with mapping strategy
4. Add noise functions to shaders
5. Add fresnel/glow functions to shaders
6. Expand parameter ranges

### **Phase 3: Integration** (Priority 3)
1. Connect `AudioReactiveEngine` to HTML audio element
2. Real-time audio visualization display (7 bars + features)
3. Parameter mapping controls (enable/disable per parameter)
4. Preset system for mapping modes (drops, builds, breakdowns)
5. AI choreography with new audio features

### **Phase 4: Advanced Features** (Priority 4)
1. Geometry switching on strong onsets
2. BPM-synchronized effects
3. Multi-layer audio reactivity (background vs foreground)
4. Recording with audio sync
5. MIDI input support

---

## 📈 Expected Results

### **Before (Current V2):**
- Simple bass/mid/high detection
- Instant parameter jumps
- No beat detection
- Parameters feel random
- Boring

### **After (Pro System):**
- 7-band frequency analysis
- Beat/onset/BPM detection
- Spectral features (brightness, flux)
- Attack/release envelopes
- Threshold-based triggering
- Multiple mapping curves
- **MUSICAL and PROFESSIONAL**

---

## 🔑 Key Innovations

1. **7-Band Analysis** - Sub-bass through brilliance
2. **Beat Detection** - Energy-based + spectral flux
3. **BPM Tracking** - Autocorrelation of onsets
4. **Spectral Features** - Centroid, rolloff, flux
5. **Attack/Release Envelopes** - Punchy rises, smooth falls
6. **Expanded Parameter Ranges** - gridDensity to 200, speed to 10x
7. **Shader Audio Uniforms** - 20+ audio parameters in GPU
8. **Noise/Fresnel/Glow** - Advanced shader effects
9. **Multi-Mode Mapping** - Different reactivity per song section
10. **Real-Time Visualization** - See audio analysis live

---

**This will transform the system from a basic audio visualizer into a PROFESSIONAL music visualization engine worthy of VJ performances and music videos.**
