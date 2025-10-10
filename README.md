# 🎵 VIB34D Music Video Choreographer

**Dual-Mode 4D Visualization System for Audio-Reactive Music Videos**

Create stunning 4D music visualizations with either built-in audio reactivity or custom choreographed sequences!

## 🌟 Two Powerful Modes

### 🎧 REACTIVE MODE
Real-time audio analysis with automatic parameter mapping - perfect for live performances!

### 🎬 CHOREOGRAPHY MODE
Design precise, timeline-based sequences - perfect for music videos!

## 🚀 Quick Start

1. Visit the live demo
2. Choose your mode (Reactive or Choreographed)
3. Load your audio file
4. Press play and enjoy!

## ✅ Testing & Diagnostics

Run the consolidated test harness to execute the inspector diagnostics and attempt the full Playwright regression suite:

```bash
npm test
```

- The script always runs `tests/reactive-inspector.test.mjs`.
- Playwright tests are executed via the official CLI. If system dependencies are missing, the harness reports a non-blocking warning. Pass `--require-playwright` or run with `CI=1` to make Playwright failures fatal.
- Use `npm run test:unit` for just the Node diagnostics or `npm run test:playwright -- --project=chromium` to forward options directly to Playwright.

## 🧭 Reactive Inspector Toolkit

- Toggle the in-app inspector overlay (query string `?inspector=1`) to review live 4D telemetry, continuity warnings, and rolling metrics.
- Calibrate jitter, lag, and gap thresholds with presets or manual values, then press **Save Settings** to persist them in `localStorage` for future sessions.
- Use **Load Settings**, **Export JSON**, and **Import JSON** to round-trip calibration profiles across browsers or team members.
- **Reset Defaults** clears persisted profiles and thresholds, restoring the baseline sensitivity profile and history limits.

## 📱 Features

- Dual-mode operation (Reactive + Choreographed)
- Real-time beat detection and BPM estimation
- 3 rendering systems (Faceted, Quantum, Holographic)
- Timeline editor for custom choreography
- Mobile-optimized for iOS and Android
- Export/import choreography as JSON

## 🎮 Controls

- Play/Pause/Stop audio playback
- Timeline scrubbing
- System switching (live)
- Mode toggle
- Sequence editor (Choreography mode)

## 🌐 Links

- **Contact**: Paul@clearseassolutions.com
- **Movement**: [Parserator.com](https://parserator.com)

---

**🌟 A Paul Phillips Manifestation**
*"The Revolution Will Not be in a Structured Format"*

© 2025 Paul Phillips - Clear Seas Solutions LLC
