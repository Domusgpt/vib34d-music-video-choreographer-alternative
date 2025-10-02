# 4D Rotation Choreography Guide

## 🌀 Understanding 4D Rotations

The VIB34D system uses **true 4D mathematics** to create impossible geometry. This isn't fake - it's actual 4D rotation projected to 3D space.

---

## 📐 The Three Rotation Planes

In 4D space, there are **6 possible rotation planes**, but we expose the 3 most visually interesting:

### **rot4dXW** - X-W Plane Rotation
- Rotates the **horizontal axis** through the **4th dimension**
- Visual effect: Shapes spin left/right while morphing through impossible forms
- Range: `-2` to `2` (radians)
- Musical use: **Verse foundations**, steady left-right morphing

### **rot4dYW** - Y-W Plane Rotation
- Rotates the **vertical axis** through the **4th dimension**
- Visual effect: Shapes spin up/down while transforming
- Range: `-2` to `2` (radians)
- Musical use: **Builds**, adding vertical energy

### **rot4dZW** - Z-W Plane Rotation
- Rotates the **depth axis** through the **4th dimension**
- Visual effect: Shapes spin forward/backward through hyperdimensional space
- Range: `-2` to `2` (radians)
- Musical use: **Drops**, adding the third dimension of rotation

---

## 🎵 Musical Choreography with 4D Rotations

### **Intro/Breakdown (Minimal)**
```json
{
  "rot4dXW": 0.2,
  "rot4dYW": 0,
  "rot4dZW": 0,
  "gridDensity": 10,
  "speed": 0.4
}
```
**Effect**: Slow, single-plane rotation. Clean and minimal.

---

### **Verse (Steady Foundation)**
```json
{
  "rot4dXW": 0.4,
  "rot4dYW": 0.2,
  "rot4dZW": 0,
  "gridDensity": 25,
  "speed": 0.5
}
```
**Effect**: Two-plane rotation creates steady morphing. Foundation for the song.

---

### **Build (Progressive Energy)**
```json
{
  "sweeps": {
    "rot4dXW": [0.4, 1.0],
    "rot4dYW": [0.2, 0.7],
    "rot4dZW": [0, 0.4],
    "gridDensity": [25, 60],
    "chaos": [0.2, 0.6]
  },
  "speed": 0.6
}
```
**Effect**: All three rotation planes engage progressively. Tension builds.

---

### **Drop (Full 4D Showcase)**
```json
{
  "rot4dXW": 1.2,
  "rot4dYW": 0.9,
  "rot4dZW": 0.7,
  "gridDensity": 95,
  "morphFactor": 1.8,
  "chaos": 0.8,
  "speed": 0.4,
  "geometry": 5  // Fractal
}
```
**Effect**: **ALL THREE PLANES** rotating at high speeds creates impossible 4D morphing. High density creates fractal detail. SLOW speed lets you SEE the complexity.

---

### **Counter-Rotation (Breakdown)**
```json
{
  "rot4dXW": -0.2,
  "rot4dYW": 0.3,
  "rot4dZW": -0.1,
  "gridDensity": 12,
  "speed": 0.25
}
```
**Effect**: Negative rotations = reverse spin. Creates otherworldly counter-motion.

---

## 🔁 Rotation Dynamics - Polyrhythmic Motion

Instead of **static rotation**, use **oscillating rotation**:

```json
{
  "rotDynamics": {
    "xw": {
      "base": 0.5,    // Center value
      "freq": 0.5,    // Oscillation frequency (Hz)
      "amp": 0.8      // Oscillation amplitude
    },
    "yw": {
      "base": 0.3,
      "freq": 0.33,   // 3:2 polyrhythm with xw
      "amp": 0.5
    },
    "zw": {
      "base": -0.2,
      "freq": 0.25,   // 2:1 polyrhythm
      "amp": 0.6
    }
  }
}
```

**What happens**:
- `xw` oscillates: `0.5 + sin(t * 0.5 * 2π) * 0.8`
- Range: `-0.3` to `1.3` (0.5 ± 0.8)
- Each plane oscillates at different rates = **polyrhythmic 4D motion**
- Visual effect: Complex, never-repeating 4D choreography

**Frequency guide**:
- `0.5 Hz` = 2 seconds per cycle = 120 BPM half-notes
- `0.33 Hz` = 3 seconds per cycle = 120 BPM dotted half-notes (3:2 polyrhythm)
- `0.25 Hz` = 4 seconds per cycle = 120 BPM whole notes
- `0.66 Hz` = 1.5 seconds per cycle = 120 BPM quarter-notes (double-time)

---

## 📊 Grid Density - Fractal Detail Control

The shader does this:
```glsl
vec4 pos = fract(p * u_gridDensity * 0.08);
```

**Higher density = more repetitions = fractal detail!**

### **Density Guide**

| Density | Visual Effect | Musical Use |
|---------|---------------|-------------|
| 4-8 | Minimal, wide spacing | Silent intros |
| 10-15 | Clean patterns | Breakdowns, ambient |
| 20-30 | Moderate detail | Verses, foundations |
| 40-60 | Dense fractals | Choruses, pre-drops |
| 70-85 | Intense detail | Build climaxes |
| 90-100 | **FRACTAL EXPLOSION** | **DROPS** |

---

## 🎨 Geometry Types & 4D Rotation

Different geometries react to 4D rotation differently:

| Geometry | ID | Best For | 4D Rotation Visibility |
|----------|-----|----------|------------------------|
| Tetrahedron | 0 | Intros, minimal | Low (simple) |
| **Hypercube** | **1** | **Drops** | **⭐ BEST** (cubic lattice shows 4D clearly) |
| Sphere | 2 | Breakdowns | Medium (concentric) |
| Torus | 3 | Builds | High (donut warping) |
| Klein Bottle | 4 | Experimental | Very High (impossible topology) |
| **Fractal** | **5** | **Drops** | **⭐ MAXIMUM** (recursive patterns) |
| Wave | 6 | Rhythmic sections | Medium (interference) |
| Crystal | 7 | Sharp drops | High (prismatic) |

**For drops**: Use **Fractal (5)** or **Hypercube (1)** with high rotation values.

---

## 💡 Example: Complete Drop Sequence

```json
{
  "name": "DROP 1 - 4D Fractal Explosion",
  "time": 60,
  "dur": 16,
  "sys": "faceted",
  "par": {
    "geometry": 5,           // FRACTAL
    "rot4dXW": 1.2,          // High X-W rotation
    "rot4dYW": 0.9,          // High Y-W rotation
    "rot4dZW": 0.7,          // High Z-W rotation
    "gridDensity": 95,       // MAXIMUM fractal detail
    "morphFactor": 1.8,      // Heavy shape morphing
    "chaos": 0.8,            // Controlled chaos
    "speed": 0.4,            // SLOW to see rotation
    "hue": 280,              // Purple
    "intensity": 0.7,
    "saturation": 0.9
  },
  "densityReact": 5,         // Small (already at 95)
  "morphReact": 0.2,
  "chaosReact": 0.15,
  "intensityReact": 0.25,
  "rotDynamics": {
    "xw": {"base": 1.2, "freq": 0.5, "amp": 0.4},
    "yw": {"base": 0.9, "freq": 0.33, "amp": 0.5},
    "zw": {"base": 0.7, "freq": 0.4, "amp": 0.3}
  },
  "sweeps": {
    "hue": [280, 320],       // Purple → Pink
    "chaos": [0.7, 0.9]      // Chaos builds
  }
}
```

**What you'll see**:
1. **Fractal geometry** with 95 density = intricate recursive patterns
2. **Three-plane 4D rotation** at 1.2/0.9/0.7 = impossible morphing
3. **Polyrhythmic oscillation** = rotation speeds pulse at different rates
4. **Color sweep** = purple gradually shifts to pink
5. **Chaos builds** = 0.7 → 0.9 over 16 seconds
6. **Slow speed** (0.4) = you can SEE all the complexity

---

## 🎼 Complete Song Structure Example

```json
[
  {
    "name": "Intro",
    "time": 0,
    "dur": 16,
    "sys": "faceted",
    "par": {
      "geometry": 0,
      "rot4dXW": 0.2, "rot4dYW": 0, "rot4dZW": 0,
      "gridDensity": 10,
      "speed": 0.4,
      "hue": 200
    }
  },
  {
    "name": "Verse 1",
    "time": 16,
    "dur": 32,
    "sys": "faceted",
    "par": {
      "geometry": 1,
      "rot4dXW": 0.4, "rot4dYW": 0.2, "rot4dZW": 0,
      "gridDensity": 25,
      "speed": 0.5,
      "hue": 210
    }
  },
  {
    "name": "Build 1",
    "time": 48,
    "dur": 16,
    "sys": "faceted",
    "par": {
      "geometry": 1,
      "rot4dXW": 0.6, "rot4dYW": 0.4, "rot4dZW": 0.2,
      "gridDensity": 40,
      "speed": 0.7,
      "hue": 240
    },
    "sweeps": {
      "rot4dXW": [0.6, 1.0],
      "rot4dYW": [0.4, 0.7],
      "rot4dZW": [0.2, 0.5],
      "gridDensity": [40, 70],
      "chaos": [0.2, 0.6]
    }
  },
  {
    "name": "DROP 1 - 4D Fractal Explosion",
    "time": 64,
    "dur": 32,
    "sys": "faceted",
    "par": {
      "geometry": 5,
      "rot4dXW": 1.2, "rot4dYW": 0.9, "rot4dZW": 0.7,
      "gridDensity": 95,
      "morphFactor": 1.8,
      "chaos": 0.8,
      "speed": 0.4,
      "hue": 280,
      "intensity": 0.7
    },
    "rotDynamics": {
      "xw": {"base": 1.2, "freq": 0.5, "amp": 0.4},
      "yw": {"base": 0.9, "freq": 0.33, "amp": 0.5},
      "zw": {"base": 0.7, "freq": 0.4, "amp": 0.3}
    }
  },
  {
    "name": "Breakdown",
    "time": 96,
    "dur": 16,
    "sys": "faceted",
    "par": {
      "geometry": 2,
      "rot4dXW": -0.1, "rot4dYW": 0.2, "rot4dZW": -0.05,
      "gridDensity": 12,
      "speed": 0.25,
      "hue": 200
    }
  },
  {
    "name": "Verse 2",
    "time": 112,
    "dur": 32,
    "sys": "faceted",
    "par": {
      "geometry": 1,
      "rot4dXW": 0.45, "rot4dYW": 0.25, "rot4dZW": 0,
      "gridDensity": 28,
      "speed": 0.55,
      "hue": 215
    }
  },
  {
    "name": "Build 2",
    "time": 144,
    "dur": 16,
    "sys": "faceted",
    "par": {
      "geometry": 5,
      "rot4dXW": 0.7, "rot4dYW": 0.5, "rot4dZW": 0.3,
      "gridDensity": 50,
      "speed": 0.8,
      "hue": 260
    },
    "sweeps": {
      "rot4dXW": [0.7, 1.5],
      "rot4dYW": [0.5, 1.2],
      "rot4dZW": [0.3, 1.0],
      "gridDensity": [50, 100],
      "chaos": [0.3, 0.9]
    }
  },
  {
    "name": "FINAL DROP - Maximum 4D",
    "time": 160,
    "dur": 32,
    "sys": "faceted",
    "par": {
      "geometry": 5,
      "rot4dXW": 1.5, "rot4dYW": 1.2, "rot4dZW": 1.0,
      "gridDensity": 100,
      "morphFactor": 2.0,
      "chaos": 0.9,
      "speed": 0.35,
      "hue": 300,
      "intensity": 0.8
    },
    "rotDynamics": {
      "xw": {"base": 1.5, "freq": 0.66, "amp": 0.5},
      "yw": {"base": 1.2, "freq": 0.5, "amp": 0.6},
      "zw": {"base": 1.0, "freq": 0.4, "amp": 0.4}
    }
  }
]
```

---

## 🔑 Key Takeaways

1. **4D rotations are the star** - Use all three planes (XW, YW, ZW) for drops
2. **Slow speed during complex rotation** - speed: 0.3-0.5 lets you SEE the 4D math
3. **High grid density = fractal detail** - 90-100 for drops
4. **Polyrhythmic motion** - rotDynamics with different frequencies per plane
5. **Geometry matters** - Fractal (5) or Hypercube (1) show 4D rotation best
6. **Progressive builds** - Use sweeps to gradually increase rotation
7. **Counter-rotations** - Negative values create otherworldly breakdown effects
8. **Musical repetition** - Verse 1 ≈ Verse 2, but each drop is MORE extreme

---

**The AI now understands all of this and will generate sequences that SHOWCASE the 4D mathematics instead of random parameter chaos!**

Test it with: https://domusgpt.github.io/vib34d-music-video-choreographer-alternative/index-ULTIMATE-V2.html
