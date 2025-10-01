# VIB34D Music Video Choreographer - Simple UI Edition

## 🎯 What's New

This version uses the **clean, simple UI** from the deployed music-video-choreographer with enhanced features:

### ✨ New Features

1. **🎨 Collapsible UI Panels**
   - Click **▼/▲** on control panel to collapse/expand
   - Click **◀/▶** on timeline editor to collapse/expand
   - Clean workspace when you need focus on visuals

2. **🎥 Video Export**
   - Click **🎥 Export Video** button
   - Automatically hides all UI elements during recording
   - Exports pure visualizer canvas + audio to WebM file
   - 60 FPS recording for smooth output
   - No screen recording software needed

3. **🔄 Smart Canvas Management**
   - CanvasManager integration for proper system switching
   - Destroys old WebGL contexts before creating new ones
   - Prevents "too many contexts" errors on mobile
   - Smooth transitions between Faceted/Quantum/Holographic systems

## 🎮 How to Use

### Quick Start

1. **Select Mode**: Choose Reactive or Hybrid mode
2. **Load Audio**: Click 📁 Load Audio File
3. **Choose System**: Click 🔷 FACETED, 🌌 QUANTUM, or ✨ HOLOGRAPHIC
4. **Play Music**: Hit ▶ Play
5. **Collapse UI**: Click ▼ to hide controls for fullscreen visuals
6. **Export**: Click 🎥 Export Video when ready to save

### Video Export

1. Load your audio file first
2. Set up your desired visualizer system and mode
3. Click **🎥 Export Video**
4. UI automatically hides
5. Recording starts and plays audio from beginning
6. File downloads when audio finishes
7. UI restores automatically

Output format: `vib34d-export-[timestamp].webm`

## 🔧 File Structure

```
index-working-simple.html  ← Main file (enhanced)
src/
  core/
    CanvasManager.js       ← Smart canvas switching
    Engine.js              ← Faceted system
  quantum/
    QuantumEngine.js       ← Quantum system
  holograms/
    RealHolographicSystem.js ← Holographic system
music-choreographer-engine.js ← Main choreography engine
```

## 🎨 The Three Working Systems

1. **🔷 FACETED** - Minimal 2D geometric patterns
2. **🌌 QUANTUM** - Complex 3D lattice effects
3. **✨ HOLOGRAPHIC** - Audio-reactive holographic layers

## 🚀 Deployment

**Live URL**: https://domusgpt.github.io/vib34d-music-video-choreographer-alternative/index-working-simple.html

### Local Testing

```bash
cd vib34d-music-video-choreographer-alternative
python3 -m http.server 8080
# Open http://localhost:8080/index-working-simple.html
```

## 🎯 Key Differences from Original

### Simple UI Version (This File)
- ✅ Clean Orbitron font interface
- ✅ Collapsible panels
- ✅ Video export built-in
- ✅ Smart canvas management
- ✅ Mobile-optimized

### Complex UI Version (index-enhanced.html)
- Full parameter sliders
- LLM AI integration
- More control options
- Heavier UI

## 🐛 Known Issues

- Video export requires audio file to be loaded first
- Export only works in Chrome/Edge (MediaRecorder API)
- WebM output may need conversion for some video editors

## 📱 Mobile Support

Works on mobile devices with touch controls. Collapsible UI is especially useful on smaller screens.

---

## 🌟 A Paul Phillips Manifestation

**Send Love, Hate, or Opportunity to:** Paul@clearseassolutions.com
**Join The Exoditical Moral Architecture Movement today:** [Parserator.com](https://parserator.com)

> *"The Revolution Will Not be in a Structured Format"*

---

**© 2025 Paul Phillips - Clear Seas Solutions LLC**
**All Rights Reserved - Proprietary Technology**
