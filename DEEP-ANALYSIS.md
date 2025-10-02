# VIB34D Music Video Choreographer - Deep System Analysis

**Analysis Date:** October 1, 2025
**File Analyzed:** index.html (MASTER version, 695 lines)
**Related Systems:** CanvasManager, 3 Engine Systems, Video Export

---

## 🔍 CRITICAL ISSUES IDENTIFIED

### **Issue #1: Sequencer Only Uses Faceted System** ❌

**Problem Location:** Lines 377-378, 443

**Root Cause:**
```javascript
// Line 377: System switch happens BUT...
if (ac.sys && ac.sys !== sys && !ac.sysSwitch) window.switchSys(ac.sys);

// Line 443: Sequence click handler ALSO tries to switch
if (s.sys) window.switchSys(s.sys);
```

**Why It Fails:**
1. **AI generates sequences with `sys` property** (e.g., `"sys": "quantum"`)
2. **switchSys() IS being called** - but something breaks after
3. **Likely cause:** Parameters don't transfer properly to new system
4. **CanvasManager destroys everything** and creates fresh canvases
5. **Fresh engines start with default parameters**, not sequence parameters

**Evidence:**
- CanvasManager.js line 16-24: Destroys old engine completely
- CanvasManager.js line 29-30: Destroys ALL canvases
- CanvasManager.js line 164-213: Creates fresh engine with NO parameters

**The Fix Requires:**
- Store sequence parameters BEFORE switching systems
- Apply parameters AFTER new engine is created
- Ensure `apply()` function works on all 3 engine types

---

### **Issue #2: Video Export Doesn't Work** ❌

**Problem Location:** Lines 565-691

**Root Causes:**

#### **2a. Audio Context Conflict**
```javascript
// Line 588-606: Creates SECOND AudioContext for export
const exportCtx = new AudioContext();
const exportAudioSource = exportCtx.createMediaElementSource(exportAudio);

// BUT Line 299-301: Audio element ALREADY connected to main context!
src = ctx.createMediaElementSource(aud);
```

**Error:** Cannot create TWO MediaElementAudioSourceNodes from same audio element!

#### **2b. Complex Audio Routing**
```javascript
// Lines 592-606: Tries to use BOTH original audio AND clone
const exportAudio = new Audio(aud.src);  // Clone
const exportAudioSource = exportCtx.createMediaElementSource(exportAudio);  // Clone source

// Lines 667-672: Plays BOTH audios simultaneously
Promise.all([aud.play(), exportAudio.play()])
```

**Problem:** Two audio streams playing, only one being recorded

#### **2c. No Canvas Visibility Check**
```javascript
// Line 571: Gets first canvas
const canvas = document.querySelector('canvas');
```

**Problem:** If switched to Quantum/Holographic, Faceted canvas exists but is HIDDEN
**Result:** Records blank/wrong canvas

---

## 🏗️ SYSTEM ARCHITECTURE

### **Current Flow:**

```
User loads audio
    ↓
Audio → AudioContext → AnalyserNode → Destination
    ↓
loop() runs 60fps
    ↓
Analyzes audio (bass/mid/high)
    ↓
Detects beats → beatFlash animation
    ↓
Applies audio reactivity to parameters
    ↓
Checks for active sequence
    ↓
If sequence:
  - Switches system (destroys everything!)
  - Applies sequence parameters
  - Applies beat mods (colorPulse, densityMod, etc.)
  - Applies patterns
    ↓
Renders to canvas
```

### **CanvasManager Flow:**

```
switchToSystem(systemName) called
    ↓
1. Destroy current engine
    ↓
2. Destroy ALL WebGL contexts (loseContext())
    ↓
3. REMOVE all canvases from DOM
    ↓
4. Create 5 fresh canvases with system-specific IDs
    ↓
5. Create fresh engine (NO parameters!)
    ↓
6. Return engine
```

**Problem:** Fresh engine = default parameters, sequence params never applied!

---

## 📊 ENGINE PARAMETER INTERFACES

### **Faceted (VIB34DIntegratedEngine)**
```javascript
// Has: parameterManager.setParameter(param, value)
if (eng.parameterManager) eng.parameterManager.setParameter(p, v);
```

### **Quantum (QuantumEngine)**
```javascript
// Has: updateParameter(param, value)
else if (eng.updateParameter) eng.updateParameter(p, v);
```

### **Holographic (RealHolographicSystem)**
```javascript
// Has: updateParameters({param: value})
else if (eng.updateParameters) eng.updateParameters({ [p]: v });
```

**Critical:** All 3 engines have DIFFERENT parameter interfaces!

---

## 🔧 ROOT PROBLEMS

### **1. System Switching Destroys State**

**Current:**
```javascript
window.switchSys = async function(s) {
    eng = await mgr.switchToSystem(s, cls);  // ← Destroys everything
    sys = s;
    document.querySelectorAll('.pill').forEach(p => p.classList.toggle('active', p.dataset.sys === s));
    applyAll();  // ← Tries to apply parameters
    stat(`Switched to ${s.toUpperCase()}`);
};
```

**Problem:** `applyAll()` happens AFTER switch, but:
1. Global `par` object exists
2. New engine created
3. `applyAll()` should work...

**BUT:** Timing issue! Engine might not be fully initialized when `applyAll()` runs

---

### **2. Sequence Parameter Application Order**

**Current:**
```javascript
// Lines 377-378
if (ac.sys && ac.sys !== sys && !ac.sysSwitch) window.switchSys(ac.sys);
if (ac.par) Object.entries(ac.par).forEach(([p, v]) => apply(p, v));
```

**Problem:**
1. switchSys() is async
2. Parameter application is sync
3. Parameters applied BEFORE engine fully ready

---

### **3. Video Export Audio Graph Conflict**

**Current:**
```javascript
// Main audio graph:
Audio Element → MediaElementSource → Analyser → Destination

// Export tries to create:
Audio Element Clone → MediaElementSource → Destination2
```

**Problem:** Original audio element ALREADY has MediaElementSource attached!
**Solution:** Must use original source, not create new one

---

## ✅ SOLUTIONS

### **Solution 1: Fix System Switching with Parameter Retention**

```javascript
window.switchSys = async function(s, paramsToApply = null) {
    // Store current parameters if not provided
    const params = paramsToApply || {...par};

    // Switch system
    eng = await mgr.switchToSystem(s, cls);
    sys = s;

    // Update UI
    document.querySelectorAll('.pill').forEach(p => p.classList.toggle('active', p.dataset.sys === s));

    // Wait for engine to be ready (critical!)
    await new Promise(resolve => setTimeout(resolve, 100));

    // Apply parameters
    Object.entries(params).forEach(([p, v]) => {
        par[p] = v;
        apply(p, v);
        // Sync UI sliders
        const slider = document.getElementById(p);
        if (slider) slider.value = v;
    });

    stat(`Switched to ${s.toUpperCase()}`);
    return eng;
};
```

---

### **Solution 2: Fix Sequence System Switching**

```javascript
// In loop() function, around line 377:
const ac = seqs.find(s => t >= s.time && t < s.time + s.dur);
if (ac) {
    // FIRST: Switch system with sequence parameters
    if (ac.sys && ac.sys !== sys && !ac.sysSwitch) {
        await window.switchSys(ac.sys, ac.par);  // ← Pass params!
    }
    // Parameters already applied by switchSys

    // THEN: Apply beat mods, patterns, etc.
    if (ac.colorPulse && beat) { /* ... */ }
    // ... rest of sequence logic
}
```

---

### **Solution 3: Fix Video Export**

**Simplified approach:**

```javascript
window.exportVid = async function() {
    if (!aud.src) return alert('Load audio first');

    stat('Preparing export...');

    // Get currently VISIBLE canvas
    const visibleCanvas = Array.from(document.querySelectorAll('canvas'))
        .find(c => c.offsetParent !== null && c.offsetWidth > 0);

    if (!visibleCanvas) return alert('No visible canvas found');

    // Capture canvas stream
    const videoStream = visibleCanvas.captureStream(60);

    // Get audio stream from EXISTING audio context
    // Create destination to tap audio without disrupting playback
    const exportDest = ctx.createMediaStreamDestination();

    // Connect analyser to export destination (tap the audio)
    anl.connect(exportDest);

    // Combine video + audio
    const combinedStream = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...exportDest.stream.getAudioTracks()
    ]);

    // Create recorder
    let mimeType = 'video/webm;codecs=vp9';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8';
    }

    const recorder = new MediaRecorder(combinedStream, {
        mimeType: mimeType,
        videoBitsPerSecond: 8000000
    });

    const chunks = [];
    recorder.ondataavailable = e => {
        if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
        anl.disconnect(exportDest);  // Clean up tap

        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vib34d-${Date.now()}.webm`;
        a.click();

        setTimeout(() => URL.revokeObjectURL(url), 1000);
        stat('Export complete!');
    };

    // Start recording
    recorder.start(100);

    // Restart audio from beginning
    aud.currentTime = 0;
    beatCount = 0;
    await aud.play();
    stat('Recording...');

    // Stop when audio ends
    aud.onended = () => {
        if (recorder.state === 'recording') {
            recorder.stop();
        }
    };
};
```

---

## 🚀 IMPROVEMENTS & EXPANSIONS

### **1. Enhanced Sequence Editor**

**Add:**
- Drag-to-resize sequences on timeline
- Right-click to edit sequence properties
- Duplicate sequence button
- Delete sequence button
- Visual preview of system/parameters in sequence block

### **2. Better Beat Detection**

**Current:** Simple threshold (line 320-334)
**Improvement:**
- Multi-band beat detection (bass, snare, hi-hat)
- BPM detection and tempo tracking
- Beat strength visualization
- Configurable sensitivity per frequency band

### **3. Advanced Choreography Features**

**Add:**
- **Easing functions** for parameter sweeps (ease-in, ease-out, cubic, bounce)
- **Multi-parameter automation** (link parameters together)
- **Macro knobs** (one slider controls multiple parameters)
- **Preset system** (save/load parameter sets)
- **Sequence templates** (intro, build, drop, breakdown presets)

### **4. Timeline Enhancements**

**Add:**
- Zoom in/out on timeline
- Waveform visualization
- Beat markers on timeline
- Snap-to-beat for sequence placement
- Multi-track sequences (run multiple sequences simultaneously)

### **5. Export Improvements**

**Add:**
- Resolution selector (720p, 1080p, 4K)
- FPS selector (30, 60, 120)
- Format selector (WebM, MP4 if supported)
- Progress bar during export
- Estimated file size
- Export preview before recording

### **6. AI Choreography Enhancements**

**Current:** Single prompt, generates all sequences
**Improvement:**
- **Section-by-section generation** (generate intro, then build, then drop)
- **Iterative refinement** (regenerate specific sequences)
- **Style presets** (cyberpunk, organic, minimal, maximal)
- **Emotion mapping** (happy=bright colors, sad=low saturation)
- **Musical structure detection** (analyze audio to detect actual builds/drops)

---

## 📈 TECHNICAL DEBT

### **Code Duplication**
- Parameter application logic repeated 3 times (lines 266-273, 275-277, 378)
- Beat mod application could be abstracted into function
- Pattern application could be expanded

### **Global State**
- Too many globals: `eng`, `sys`, `aud`, `ctx`, `anl`, `par`, `seqs`
- Should be encapsulated in a `ChoreographerApp` class

### **Error Handling**
- No try/catch around engine creation
- No fallback if system switch fails
- No validation of sequence parameters

### **Performance**
- `loop()` runs every frame even when paused
- No throttling of parameter updates
- No caching of frequently used values

---

## 🎯 PRIORITY FIXES

### **Priority 1: CRITICAL** 🔴
1. Fix system switching parameter retention
2. Fix video export audio graph
3. Add async/await to sequence system switching

### **Priority 2: HIGH** 🟡
4. Add sequence editing UI (duration, delete)
5. Add visible canvas detection for export
6. Add better error messages

### **Priority 3: MEDIUM** 🟢
7. Add easing functions to sweeps
8. Add timeline zoom
9. Add export progress indicator

---

## 🧪 TEST PLAN

### **Test 1: System Switching**
1. Load audio
2. Set parameters manually (hue=100, density=50, etc.)
3. Switch to Quantum
4. **Expected:** Parameters should persist
5. Switch to Holographic
6. **Expected:** Parameters should persist

### **Test 2: AI Sequence Generation**
1. Load audio
2. Generate AI choreography
3. Play audio
4. **Expected:** Systems should switch as specified in sequences
5. **Expected:** Parameters should match sequence specs

### **Test 3: Manual Sequence Recording**
1. Load audio
2. Set unique parameters (geometry=5, hue=280, density=90)
3. Click ➕ at 10s
4. Change parameters
5. Click ➕ at 20s
6. Play from 0s
7. **Expected:** At 10s, first params should apply
8. **Expected:** At 20s, second params should apply

### **Test 4: Video Export**
1. Load audio
2. Generate sequences with system switches
3. Click Export Video
4. **Expected:** Recording starts
5. **Expected:** Audio + video captured
6. **Expected:** File downloads when audio ends
7. Open file
8. **Expected:** Video plays with audio
9. **Expected:** Visual matches what was on screen

---

## 📝 RECOMMENDED IMMEDIATE ACTIONS

1. **Fix parameter retention in switchSys()** - Add 100ms delay + parameter reapplication
2. **Make sequence system switch async** - `await window.switchSys(ac.sys, ac.par)`
3. **Simplify video export audio** - Use existing audio context, tap analyser
4. **Add visible canvas detection** - Don't record hidden canvases
5. **Test all 3 systems with sequences** - Verify Quantum and Holographic work

---

**This analysis reveals the core issues and provides concrete solutions. Ready to implement fixes?**
