# 🎯 VIB34D MUSIC CHOREOGRAPHER - UNIFIED REFACTORING PLAN

**Date**: October 5, 2025
**Objective**: Refactor multiple systems together, make elegant, expand colors and audio reactivity

---

## 📊 REPOSITORY ANALYSIS COMPLETE

### **Branch Structure:**
```
* html-versions-catalog (current)
  - Contains comprehensive HTML versions catalog at versions-index.html
  - Latest commit: "🌟 Add comprehensive HTML versions catalog"

* main / origin/main
  - Primary development branch
  - Latest: "🎥 PROPER FIX: Composite canvas for export with smart system switching"

* v3-professional
  - Advanced audio-visual system experimentation
  - NOT YET MERGED

* music-video-choreographer-refactor (remote)
  - Previous refactoring attempt
  - Useful learnings in branch history
```

### **Key Files Count:**
- **14 index-*.html variants** (514-3526 lines each)
- **57 JavaScript modules** in src/
- **3 visualization engines**: Faceted, Quantum, Holographic
- **1 specialized system**: Polychora (4D mathematics)

---

## 🔍 CURRENT SYSTEM INVENTORY

### **INDEX.HTML VARIANTS ANALYSIS:**

| File | Lines | Purpose | Status |
|------|-------|---------|--------|
| **index-MASTER.html** | 678 | Beat-synced choreography + manual sequences + video export | ✅ WORKING |
| **index-ULTIMATE-V2.html** | 645 | Musical timing with 4D rotation focus | ✅ WORKING |
| **index-ULTIMATE.html** | 514 | Original AI choreography system | ✅ WORKING |
| **index-WORKING-GOLD.html** | 3526 | Full features + reactivity (original backup) | ✅ ARCHIVE |
| **index-enhanced.html** | 2225 | Enhanced UI + features | ⚠️ LEGACY |
| **index-working-simple.html** | 1070 | Hybrid mode + timeline | ✅ USEFUL |
| **index-FINAL.html** | 812 | Simplified choreographer | ✅ CLEAN |
| **index-ULTRA.html** | 813 | Ultra version (experimental) | ⚠️ EXPERIMENTAL |

**BEST VERSIONS IDENTIFIED:**
1. **index-MASTER.html** - Most complete, working export, beat sync
2. **index-ULTIMATE-V2.html** - Best 4D rotation usage, musical timing
3. **index-working-simple.html** - Clean hybrid mode implementation

---

## 🎨 SOURCE ARCHITECTURE ANALYSIS

### **Current Module Structure:**
```
src/
├── core/ (14 files)
│   ├── Engine.js                    // Faceted system
│   ├── Visualizer.js                // Faceted visualizer (GLSL shaders)
│   ├── ParameterMapper.js           // V3 advanced mapping (INCOMPLETE)
│   ├── Parameters.js                // Parameter definitions + validation
│   ├── CanvasManager.js             // Canvas lifecycle management
│   ├── ReactivityManager.js         // Mouse/touch/scroll interactions
│   └── UnifiedEngine.js             // Attempted unification (partial)
│
├── quantum/ (2 files)
│   ├── QuantumEngine.js             // Complex 3D system
│   └── QuantumVisualizer.js         // Advanced GLSL with volumetric lighting
│
├── holograms/ (6 files)
│   ├── RealHolographicSystem.js     // Audio-reactive system
│   ├── HolographicVisualizer.js     // Core holographic rendering
│   ├── ActiveHolographicSystem.js   // Enhanced version
│   └── HolographicSystem.js         // Legacy version
│
├── core/PolychoraSystem.js          // 4D polytope mathematics
│
├── export/ (15 files)
│   └── Trading card + video export systems (per-engine variants)
│
├── audio/
│   ├── AudioAnalyzer.js           // ✅ Implemented: 7-band + spectral analysis
│   ├── ADSREnvelope.js            // ✅ Implemented: ADSR smoothing utilities
│   └── ParameterMapper.js         // ✅ Implemented: audio-to-parameter routing
│
├── color/
│   └── ColorSystem.js             // ✅ Implemented: palettes, gradients, reactive blending
│
└── geometry/
    └── GeometryLibrary.js           // 8 geometry types shared
```

Supporting modules:
- `js/audio/audio-engine.js` // ✅ AdvancedAudioEngine wiring analyzer → global state + color pipeline bridge
- `window.colorState` // ✅ Shared color palette + gradient state exposed for visualizers/UI

### **🚨 CRITICAL ARCHITECTURE PROBLEMS:**
1. **INCONSISTENT INTERFACES**: Each system has different initialization patterns
2. **NO UNIFIED PARAMETER SYSTEM**: 3 different parameter management approaches
3. **DUPLICATE VISUALIZERS**: Multiple versions of Holographic system
4. **LEGACY V3 GAPS**: Systems still need to adopt the new AudioAnalyzer + ParameterMapper pipeline
5. **COLOR SYSTEM INTEGRATION**: New ColorSystem drives palettes + gradients, but shaders/UI still need full adoption
6. **AUDIO INTEGRATION DRIFT**: Advanced analyzer now powers the global engine, but each visualization still needs bespoke mappings

---

## 🎯 UNIFIED REFACTORING GOALS

### **1. ELEGANT SYSTEM ARCHITECTURE**

Create **BaseSystem** interface that all engines implement:
```javascript
class BaseSystem {
    constructor(config) {
        this.name = config.name;
        this.type = config.type; // 'faceted'|'quantum'|'holographic'|'polychora'
        this.canvas = null;
        this.visualizer = null;
        this.parameters = new UnifiedParameters();
        this.interactions = new UnifiedInteractions();
    }

    async initialize() {
        // Standard init sequence
        await this.createCanvas();
        await this.createVisualizer();
        await this.setupInteractions();
        await this.setupAudio();
    }

    updateParameter(name, value) {
        // Unified parameter update
    }

    render() {
        // Unified render loop
    }

    destroy() {
        // Proper cleanup
    }
}
```

**Benefits:**
- ✅ Switch between systems with identical API
- ✅ Predictable behavior across all engines
- ✅ Easy to add new visualization systems
- ✅ Clean separation of concerns

---

### **2. ADVANCED COLOR SYSTEM**

**Current Limitation**: Single hue parameter (0-360)

**New Color Architecture:**
```javascript
class ColorSystem {
    constructor() {
        // Multiple color modes
        this.modes = {
            single: this.singleHue,
            dual: this.dualHue,
            triad: this.triadHue,
            complementary: this.complementaryHue,
            analogous: this.analogousHue,
            palette: this.paletteMode,
            gradient: this.gradientMode,
            reactive: this.audioReactiveMode
        };

        // Color palettes
        this.palettes = {
            vaporwave: ['#ff71ce', '#01cdfe', '#05ffa1', '#b967ff'],
            cyberpunk: ['#ff006e', '#fb5607', '#ffbe0b', '#8338ec'],
            synthwave: ['#f72585', '#7209b7', '#3a0ca3', '#4361ee'],
            holographic: ['#ff00ff', '#00ffff', '#ff00aa', '#00aaff'],
            neon: ['#fe00fe', '#00fefe', '#fefe00', '#00fe00'],
            fire: ['#ff0000', '#ff4400', '#ff8800', '#ffcc00'],
            ocean: ['#001eff', '#0088ff', '#00ccff', '#00ffee'],
            forest: ['#004d00', '#008800', '#00cc00', '#88ff00']
        };

        // Gradient definitions
        this.gradients = {
            horizontal: (time, pos) => this.horizontalGradient(time, pos),
            vertical: (time, pos) => this.verticalGradient(time, pos),
            radial: (time, pos) => this.radialGradient(time, pos),
            spiral: (time, pos) => this.spiralGradient(time, pos),
            wave: (time, pos) => this.waveGradient(time, pos)
        };
    }

    // Audio-reactive color
    audioReactiveColor(audioData) {
        const { bass, mid, high, spectralCentroid, spectralFlux } = audioData;

        // Brightness from loudness
        const brightness = audioData.rms;

        // Hue from spectral centroid (brightness of sound)
        const hue = spectralCentroid * 360;

        // Saturation from spectral flux (energy change)
        const saturation = 0.5 + (spectralFlux * 0.5);

        return { h: hue, s: saturation, v: brightness };
    }

    // Multi-hue systems
    triadHue(baseHue) {
        return [
            baseHue,
            (baseHue + 120) % 360,
            (baseHue + 240) % 360
        ];
    }

    complementaryHue(baseHue) {
        return [
            baseHue,
            (baseHue + 180) % 360
        ];
    }
}
```

**New Parameters:**
- `colorMode`: 'single'|'dual'|'triad'|'complementary'|'palette'|'gradient'|'reactive'
- `colorPalette`: Selection from predefined palettes
- `gradientType`: 'horizontal'|'vertical'|'radial'|'spiral'|'wave'
- `gradientSpeed`: Animation speed of gradient
- `colorReactivity`: How much audio influences color (0-1)
- `colorSaturation`: Independent from hue (0-1) - ALREADY EXISTS
- `colorIntensity`: Independent brightness (0-1) - ALREADY EXISTS

**Implementation in Shaders:**
```glsl
uniform int u_colorMode;
uniform vec3 u_palette[4];
uniform int u_paletteSize;
uniform float u_gradientPhase;

vec3 getColor(vec2 uv, float audioData) {
    if (u_colorMode == MODE_PALETTE) {
        // Cycle through palette based on position + audio
        int index = int(mod(uv.x * float(u_paletteSize) + audioData, float(u_paletteSize)));
        return u_palette[index];
    } else if (u_colorMode == MODE_GRADIENT) {
        // Gradient between colors
        return mix(u_palette[0], u_palette[1], uv.x + u_gradientPhase);
    }
    // ... other modes
}
```

---

### **3. PROFESSIONAL AUDIO REACTIVITY**

**Current Limitation**: 3 frequency bands (bass, mid, high) with simple addition

**New Audio Architecture** (from V3 plan):
```javascript
class AudioAnalyzer {
    constructor(analyserNode) {
        this.analyser = analyserNode;

        // 7 frequency bands instead of 3
        this.bands = {
            subBass: { low: 20, high: 60, value: 0 },      // Kick drums, sub bass
            bass: { low: 60, high: 250, value: 0 },        // Bass guitar, low toms
            lowMid: { low: 250, high: 500, value: 0 },     // Guitars, keyboards
            mid: { low: 500, high: 2000, value: 0 },       // Vocals, snares
            highMid: { low: 2000, high: 4000, value: 0 },  // Cymbals, guitars
            high: { low: 4000, high: 8000, value: 0 },     // Hi-hats, strings
            air: { low: 8000, high: 20000, value: 0 }      // Airiness, sparkle
        };

        // Spectral features
        this.spectralCentroid = 0;  // Brightness of sound (0-1)
        this.spectralRolloff = 0;   // Frequency where 85% energy below (0-1)
        this.spectralFlux = 0;      // Rate of spectral change (onset detection)
        this.rms = 0;               // Overall loudness (0-1)

        // Onset detection
        this.onsetHistory = [];
        this.lastOnsetTime = 0;
        this.onsetThreshold = 0.15;

        // BPM estimation
        this.estimatedBPM = 120;

        // Smoothing buffers
        this.smoothingFactor = 0.8;
        this.smoothedBands = { ...this.bands };
    }

    analyze() {
        // Multi-band analysis
        this.analyzeBands();

        // Spectral features
        this.calcSpectralCentroid();   // Brightness
        this.calcSpectralRolloff();    // High frequency content
        this.calcSpectralFlux();       // Change detection
        this.calcRMS();                // Loudness

        // Onset detection (kicks, snares, transients)
        const onset = this.detectOnset();

        // BPM estimation from onsets
        if (this.onsetHistory.length > 8) {
            this.estimateBPM();
        }

        return {
            bands: this.smoothedBands,
            spectralCentroid: this.spectralCentroid,
            spectralRolloff: this.spectralRolloff,
            spectralFlux: this.spectralFlux,
            rms: this.rms,
            onset: onset,
            bpm: this.estimatedBPM
        };
    }
}
```

**Parameter Mapping with ADSR Envelopes:**
```javascript
class ParameterMapper {
    constructor() {
        this.mappings = {
            // 4D rotations react to different bands
            rot4dXW: {
                source: 'bass',
                curve: 'exponential',  // Exponential response
                range: [-2, 2],
                envelope: new ADSREnvelope(200, 500, 0.6, 1000) // Attack, Decay, Sustain, Release
            },
            rot4dYW: {
                source: 'mid',
                curve: 'exponential',
                range: [-2, 2],
                envelope: new ADSREnvelope(100, 300, 0.7, 800)
            },
            rot4dZW: {
                source: 'high',
                curve: 'exponential',
                range: [-2, 2],
                envelope: new ADSREnvelope(50, 200, 0.8, 600)
            },

            // Grid density reacts to spectral flux (onsets)
            gridDensity: {
                source: 'spectralFlux',
                curve: 'threshold',  // Only responds to strong onsets
                range: [10, 100],
                threshold: 0.15,
                envelope: new ADSREnvelope(50, 1000, 0.3, 2000)
            },

            // Hue follows spectral centroid (brightness of sound)
            hue: {
                source: 'spectralCentroid',
                curve: 'linear',
                range: [0, 360],
                envelope: null  // Instant response for color
            },

            // Intensity follows RMS (loudness)
            intensity: {
                source: 'rms',
                curve: 'logarithmic',
                range: [0.3, 1.0],
                envelope: new ADSREnvelope(10, 50, 0.8, 200)
            }
        };
    }

    applyCurve(value, curve) {
        switch(curve) {
            case 'exponential':
                return Math.pow(value, 2);
            case 'logarithmic':
                return Math.log10(1 + value * 9) / Math.log10(10);
            case 's-curve':
                return 1 / (1 + Math.exp(-10 * (value - 0.5)));
            case 'threshold':
                return value > this.threshold ? 1 : 0;
            default:
                return value; // linear
        }
    }
}
```

**ADSR Envelope for Smooth Parameter Changes:**
```javascript
class ADSREnvelope {
    constructor(attackMs, decayMs, sustain, releaseMs) {
        this.attack = attackMs;
        this.decay = decayMs;
        this.sustain = sustain;  // 0-1
        this.release = releaseMs;

        this.phase = 'idle';
        this.value = 0;
        this.targetValue = 0;
        this.phaseStartTime = 0;
    }

    trigger(value) {
        this.targetValue = value;
        this.phase = 'attack';
        this.phaseStartTime = Date.now();
    }

    update() {
        const now = Date.now();
        const elapsed = now - this.phaseStartTime;

        switch(this.phase) {
            case 'attack':
                this.value = (elapsed / this.attack) * this.targetValue;
                if (elapsed >= this.attack) {
                    this.phase = 'decay';
                    this.phaseStartTime = now;
                }
                break;

            case 'decay':
                const decayProgress = elapsed / this.decay;
                this.value = this.targetValue * (1 - decayProgress * (1 - this.sustain));
                if (elapsed >= this.decay) {
                    this.phase = 'sustain';
                }
                break;

            case 'sustain':
                this.value = this.targetValue * this.sustain;
                break;

            case 'release':
                this.value *= 1 - (elapsed / this.release);
                if (elapsed >= this.release) {
                    this.phase = 'idle';
                    this.value = 0;
                }
                break;
        }

        return this.value;
    }
}
```

---

## 🏗️ REFACTORING IMPLEMENTATION PLAN

### **PHASE 1: FOUNDATION (Week 1)**

**1.1 Create BaseSystem Interface** ✅
- [x] Write `src/systems/shared/BaseSystem.js`
- [x] Define standard lifecycle: init → render → update → destroy
- [x] Standard parameter interface
- [x] Standard canvas management via reusable canvas factory
- [x] Add `BaseVisualizer` + `SystemRegistry` scaffolding for consistent engine wiring
- [x] Wrap faceted/quantum/holographic engines with new BaseSystem adapters

**1.2 Extract Best Features from Each Index Variant**
- [ ] From `index-MASTER.html`: Beat sync + video export
- [ ] From `index-ULTIMATE-V2.html`: 4D rotation focus + musical timing
- [ ] From `index-working-simple.html`: Clean hybrid mode
- [ ] Document which features to preserve from each

**1.3 Consolidate Parameter System**
- [ ] Unify `Parameters.js` to work across all systems
- [x] Add new color parameters
- [ ] Add audio reactivity parameters
- [ ] Validation + ranges for all parameters

> ✅ ParameterManager now defines color mode, palette, and gradient controls with enum-aware validation and default ranges; audio mapping fields remain to be unified.

---

### **PHASE 2: COLOR SYSTEM (Week 1-2)**

**2.1 Implement ColorSystem Class**
- [x] Create `src/color/ColorSystem.js`
- [x] Define 8+ color palettes
- [x] Implement gradient functions
- [x] Audio-reactive color mapping (palettes + gradients respond to analyzer state)

**2.2 Update Shaders**
- [ ] Modify `Visualizer.js` shader for multi-color support
- [ ] Modify `QuantumVisualizer.js` shader
- [ ] Modify `HolographicVisualizer.js` shader
- [ ] Add palette uniforms to GLSL

**2.3 UI for Color Control** ✅
- [x] Color mode selector
- [x] Palette picker
- [x] Gradient controls
- [x] Preview system with live gradient loop

---

### **PHASE 3: AUDIO SYSTEM (Week 2-3)**

**3.1 Implement AudioAnalyzer**
- [x] Create `src/audio/AudioAnalyzer.js` (complete V3 implementation)
- [x] 7-band frequency analysis
- [x] Spectral features (centroid, rolloff, flux)
- [x] Onset detection
- [x] BPM estimation

**3.2 Implement ADSR Envelopes**
- [x] Create `src/audio/ADSREnvelope.js`
- [x] Attack/Decay/Sustain/Release phases
- [x] Per-parameter envelope configuration
- [x] Smooth parameter transitions

**3.3 Implement ParameterMapper**
- [x] Create `src/audio/ParameterMapper.js`
- [x] Curve functions (exponential, logarithmic, s-curve, threshold)
- [x] Band-to-parameter routing
- [x] Envelope integration

**3.4 Integration**
- [x] Connect AudioAnalyzer to the global audio engine used by all systems (`js/audio/audio-engine.js`)
- [x] Map audio features to parameters intelligently via default ParameterMapper presets
- [ ] Test with various music genres
- [ ] Optimize performance

---

### **PHASE 4: SYSTEM REFACTORING (Week 3-4)**

**4.1 Refactor Faceted System**
- [ ] Migrate `Engine.js` to extend `BaseSystem`
- [ ] Integrate ColorSystem
- [ ] Integrate AudioAnalyzer + ParameterMapper
- [ ] Test all features

**4.2 Refactor Quantum System**
- [ ] Migrate `QuantumEngine.js` to extend `BaseSystem`
- [ ] Integrate advanced color
- [ ] Integrate advanced audio
- [ ] Test volumetric lighting with new audio

**4.3 Refactor Holographic System**
- [ ] Consolidate 3 holographic variants into 1
- [ ] Extend `BaseSystem`
- [ ] Enhance audio reactivity with new system
- [ ] Test multi-layer rendering

**4.4 Refactor Polychora System**
- [ ] Migrate `PolychoraSystem.js` to extend `BaseSystem`
- [ ] 4D rotation optimization
- [ ] Audio-reactive 4D transformations
- [ ] Test polytope rendering

---

### **PHASE 5: UNIFIED INTERFACE (Week 4-5)**

**5.1 Create Single Master Index**
- [ ] New `index.html` using BaseSystem architecture
- [ ] Dynamic system loading
- [ ] Unified UI that adapts per system
- [ ] System switcher with smooth transitions

**5.2 Consolidate CSS**
- [ ] Extract inline CSS to modules
- [ ] Per-system themes
- [ ] Responsive design
- [ ] Animation system

**5.3 Export System**
- [ ] Unify trading card generation across all systems
- [ ] Video export with proper canvas handling
- [ ] JSON save/load for all systems
- [ ] Gallery system integration

---

### **PHASE 6: OPTIMIZATION & POLISH (Week 5-6)**

**6.1 Performance**
- [ ] WebGL optimization
- [ ] Mobile performance testing
- [ ] Memory leak prevention
- [ ] Frame rate monitoring

**6.2 Testing**
- [ ] Unit tests for audio analysis
- [ ] Integration tests for system switching
- [ ] Visual regression tests
- [ ] Mobile device testing

**6.3 Documentation**
- [ ] API documentation
- [ ] User guide
- [ ] Developer guide
- [ ] Example presets

---

## 📁 NEW FILE STRUCTURE
```
vib34d-music-video-choreographer-alternative/
├── index.html                           // NEW: Unified master interface
├── src/
│   ├── systems/
│   │   ├── shared/
│   │   │   ├── BaseSystem.js           // NEW: Base class all systems extend
│   │   │   ├── BaseVisualizer.js       // NEW: Base visualizer interface
│   │   │   └── SystemRegistry.js       // NEW: System management
│   │   ├── faceted/
│   │   │   ├── FacetedSystem.js        // REFACTORED: from Engine.js
│   │   │   └── FacetedVisualizer.js    // REFACTORED: from Visualizer.js
│   │   ├── quantum/
│   │   │   ├── QuantumSystem.js        // REFACTORED: from QuantumEngine.js
│   │   │   └── QuantumVisualizer.js    // REFACTORED
│   │   ├── holographic/
│   │   │   ├── HolographicSystem.js    // CONSOLIDATED: from 3 variants
│   │   │   └── HolographicVisualizer.js
│   │   └── polychora/
│   │       ├── PolychoraSystem.js      // REFACTORED
│   │       └── PolychoraVisualizer.js  // EXTRACTED
│   ├── core/
│   │   ├── Parameters.js               // ENHANCED: unified parameters
│   │   ├── CanvasManager.js            // KEEP: working well
│   │   └── ReactivityManager.js        // KEEP: working well
│   ├── audio/
│   │   ├── AudioAnalyzer.js            // NEW: 7-band + spectral analysis
│   │   ├── ADSREnvelope.js             // NEW: smooth parameter transitions
│   │   └── ParameterMapper.js          // NEW: audio-to-parameter routing
│   ├── color/
│   │   └── ColorSystem.js              // NEW: palettes + gradients + reactive
│   ├── geometry/
│   │   └── GeometryLibrary.js          // KEEP: shared geometries
│   └── export/
│       ├── UnifiedExportManager.js     // NEW: single export system
│       └── [consolidate card generators]
├── styles/
│   ├── base.css                        // NEW: extracted from inline
│   ├── systems/
│   │   ├── faceted.css                 // NEW: system-specific styling
│   │   ├── quantum.css
│   │   ├── holographic.css
│   │   └── polychora.css
│   └── ui/
│       ├── controls.css                // NEW: unified controls
│       └── mobile.css                  // NEW: responsive design
└── archive/
    └── [move all old index-*.html here]
```

---

## 🎯 SUCCESS CRITERIA

### **Elegance:**
- ✅ Single `index.html` under 500 lines
- ✅ All systems extend `BaseSystem` with identical API
- ✅ No code duplication between systems
- ✅ Clean separation: systems / audio / color / export

### **Color Expansion:**
- ✅ 8+ color modes (single, dual, triad, palette, gradient, reactive)
- ✅ 8+ predefined palettes
- ✅ 5+ gradient types
- ✅ Audio-reactive color that responds to spectral features

### **Audio Reactivity:**
- ✅ 7 frequency bands (vs current 3)
- ✅ 4 spectral features (centroid, rolloff, flux, rms)
- ✅ Onset detection for transients
- ✅ BPM estimation
- ✅ ADSR envelopes for smooth parameter changes
- ✅ Multiple mapping curves (exponential, logarithmic, s-curve, threshold)

### **Performance:**
- ✅ 60 FPS on desktop
- ✅ 45+ FPS on mobile
- ✅ Smooth system switching (< 500ms)
- ✅ No memory leaks

---

## 🚀 IMMEDIATE NEXT STEPS

1. **Advanced Audio Pipeline Integration** ✅
   - Faceted, Quantum, and Holographic renderers now consume the analyzer's multi-band + spectral output with smoothing envelopes
   - Audio-driven boosts power grid density, morphing, chaos, color, and 4D rotation without destabilizing base parameters
   - Debug hooks remain for spot-checking live signals while preserving graceful fallbacks when audio is disabled

2. **Color System Integration** ✅
   - ✅ Implemented `ColorSystem.js` with palettes, gradients, and audio-reactive blending
   - ✅ Advanced audio engine now publishes `window.colorState` for every frame
   - ✅ Feed palette uniforms + gradient data into shaders and UI controls (faceted, quantum, holographic) with live UI selectors

3. **Unified System Architecture (in progress)**:
   - ✅ BaseSystem + BaseVisualizer scaffolding created under `src/systems/shared`
   - ✅ SystemRegistry orchestrates switching + lifecycle teardown
   - ✅ Faceted, Quantum, and Holographic engines now run through BaseSystem adapters
   - 🔜 Port remaining consumers (timeline bridge, export tools, gallery) to query registry instead of globals
   - 🔜 Add Polychora adapter + consolidated parameter plumbing (ParameterManager color enums live; audio mappings next)

4. **Finally Consolidation**:
   - New unified `index.html`
   - Move old versions to archive
   - Polish and optimize

---

**TIMELINE**: 6 weeks for complete refactoring
**PRIORITY**: Audio system first (can integrate with current architecture immediately)

**Next Command**: Begin consolidating `ParameterManager` + timeline/export hooks to read from the SystemRegistry adapters.
