/**
 * VIB34D Advanced Color System
 * Provides palette, gradient, and audio-reactive color generation utilities.
 */

const clamp01 = value => Math.min(Math.max(value, 0), 1);
const mod360 = value => {
    const wrapped = value % 360;
    return wrapped < 0 ? wrapped + 360 : wrapped;
};

export const COLOR_MODES = Object.freeze([
    'single',
    'dual',
    'triad',
    'complementary',
    'analogous',
    'palette',
    'gradient',
    'reactive'
]);

export const GRADIENT_TYPES = Object.freeze([
    'horizontal',
    'vertical',
    'radial',
    'spiral',
    'wave'
]);

export const DEFAULT_COLOR_CONFIG = {
    colorMode: 'single',
    baseHue: 210,
    baseSaturation: 0.75,
    baseIntensity: 0.65,
    colorPalette: 'synthwave',
    gradientType: 'horizontal',
    gradientSpeed: 0.25,
    colorReactivity: 0.65,
    dualOffset: 180,
    triadSpacing: 120,
    analogousSpread: 30
};

export const COLOR_PALETTES = Object.freeze({
    vaporwave: ['#ff71ce', '#01cdfe', '#05ffa1', '#b967ff'],
    cyberpunk: ['#ff006e', '#fb5607', '#ffbe0b', '#8338ec'],
    synthwave: ['#f72585', '#7209b7', '#3a0ca3', '#4361ee'],
    holographic: ['#ff00ff', '#00ffff', '#ff00aa', '#00aaff'],
    neon: ['#fe00fe', '#00fefe', '#fefe00', '#00fe00'],
    fire: ['#ff0000', '#ff4400', '#ff8800', '#ffcc00'],
    ocean: ['#001eff', '#0088ff', '#00ccff', '#00ffee'],
    forest: ['#004d00', '#008800', '#00cc00', '#88ff00']
});

function hexToRgb(hex) {
    const clean = hex.replace('#', '');
    const value = parseInt(clean, 16);
    return {
        r: ((value >> 16) & 255) / 255,
        g: ((value >> 8) & 255) / 255,
        b: (value & 255) / 255
    };
}

function rgbToHex({ r, g, b }) {
    const toHex = component => {
        const clamped = Math.round(clamp01(component) * 255);
        return clamped.toString(16).padStart(2, '0');
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hsvToRgb(h, s, v) {
    const hue = (mod360(h) / 60);
    const c = v * s;
    const x = c * (1 - Math.abs((hue % 2) - 1));
    const m = v - c;
    const sector = Math.floor(hue);

    let r = 0;
    let g = 0;
    let b = 0;

    switch (sector) {
        case 0:
            r = c; g = x; b = 0;
            break;
        case 1:
            r = x; g = c; b = 0;
            break;
        case 2:
            r = 0; g = c; b = x;
            break;
        case 3:
            r = 0; g = x; b = c;
            break;
        case 4:
            r = x; g = 0; b = c;
            break;
        default:
            r = c; g = 0; b = x;
    }

    return {
        r: r + m,
        g: g + m,
        b: b + m
    };
}

function rgbToHsl({ r, g, b }) {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (delta !== 0) {
        if (max === r) {
            h = ((g - b) / delta) % 6;
        } else if (max === g) {
            h = (b - r) / delta + 2;
        } else {
            h = (r - g) / delta + 4;
        }

        s = delta / (1 - Math.abs(2 * l - 1));
    }

    h = (h * 60 + 360) % 360;

    return { h, s, l };
}

function makeColorObject(h, s, v) {
    const rgb = hsvToRgb(h, s, v);
    const hsl = rgbToHsl(rgb);

    return {
        h: mod360(h),
        s: clamp01(s),
        v: clamp01(v),
        rgb,
        hex: rgbToHex(rgb),
        hsl,
        css: `hsl(${Math.round(hsl.h)}, ${Math.round(hsl.s * 100)}%, ${Math.round(hsl.l * 100)}%)`
    };
}

function clonePalette(palette) {
    return palette.map(color => ({ ...color, rgb: { ...color.rgb }, hsl: { ...color.hsl } }));
}

export class ColorSystem {
    constructor(config = {}) {
        this.config = { ...DEFAULT_COLOR_CONFIG, ...config };
        this.gradientPhase = 0;
        this.lastUpdateTime = null;

        this.#paletteCache = new Map();

        // Prime initial state so consumers have data immediately
        const initialState = this.#computeColorState({});
        this.lastState = { ...initialState, gradient: this.#buildGradient(initialState.palette) };
    }

    updateConfig(partial = {}) {
        if (!partial || typeof partial !== 'object') {
            return this.getState();
        }

        const nextConfig = { ...this.config, ...partial };

        if (typeof partial.colorMode === 'string') {
            nextConfig.colorMode = COLOR_MODES.includes(partial.colorMode)
                ? partial.colorMode
                : this.config.colorMode;
        }

        if (typeof partial.colorPalette === 'string') {
            nextConfig.colorPalette = COLOR_PALETTES[partial.colorPalette]
                ? partial.colorPalette
                : this.config.colorPalette;
        }

        if (typeof partial.gradientType === 'string') {
            nextConfig.gradientType = GRADIENT_TYPES.includes(partial.gradientType)
                ? partial.gradientType
                : this.config.gradientType;
        }

        if (partial.gradientSpeed !== undefined) {
            const parsed = Number(partial.gradientSpeed);
            nextConfig.gradientSpeed = Number.isFinite(parsed)
                ? Math.min(Math.max(parsed, 0), 5)
                : this.config.gradientSpeed;
        }

        if (partial.colorReactivity !== undefined) {
            const parsed = Number(partial.colorReactivity);
            nextConfig.colorReactivity = Number.isFinite(parsed)
                ? clamp01(parsed)
                : this.config.colorReactivity;
        }

        if (partial.baseHue !== undefined) {
            const parsed = Number(partial.baseHue);
            nextConfig.baseHue = Number.isFinite(parsed)
                ? mod360(parsed)
                : this.config.baseHue;
        }

        if (partial.baseSaturation !== undefined) {
            const parsed = Number(partial.baseSaturation);
            nextConfig.baseSaturation = Number.isFinite(parsed)
                ? clamp01(parsed)
                : this.config.baseSaturation;
        }

        if (partial.baseIntensity !== undefined) {
            const parsed = Number(partial.baseIntensity);
            nextConfig.baseIntensity = Number.isFinite(parsed)
                ? clamp01(parsed)
                : this.config.baseIntensity;
        }

        if (partial.dualOffset !== undefined) {
            const parsed = Number(partial.dualOffset);
            nextConfig.dualOffset = Number.isFinite(parsed) ? parsed : this.config.dualOffset;
        }

        if (partial.triadSpacing !== undefined) {
            const parsed = Number(partial.triadSpacing);
            nextConfig.triadSpacing = Number.isFinite(parsed) ? parsed : this.config.triadSpacing;
        }

        if (partial.analogousSpread !== undefined) {
            const parsed = Number(partial.analogousSpread);
            nextConfig.analogousSpread = Number.isFinite(parsed) ? parsed : this.config.analogousSpread;
        }

        this.config = nextConfig;

        return this.update(Date.now(), {});
    }

    setMode(mode) {
        if (typeof mode === 'string') {
            this.updateConfig({ colorMode: mode });
        }
    }

    setPalette(name) {
        if (typeof name === 'string' && COLOR_PALETTES[name]) {
            this.updateConfig({ colorPalette: name });
        }
    }

    getAvailablePalettes() {
        return Object.keys(COLOR_PALETTES);
    }

    getAvailableModes() {
        return [...COLOR_MODES];
    }

    getAvailableGradients() {
        return [...GRADIENT_TYPES];
    }

    getConfig() {
        return { ...this.config };
    }

    /**
     * Update the color system using the latest audio frame.
     * @param {number} now - timestamp in milliseconds
     * @param {object} audioData - analyzer output
     * @param {object} reactive - mapped audio data
     */
    update(now = Date.now(), audioData = {}, reactive = {}) {
        if (typeof now !== 'number') {
            now = Date.now();
        }

        if (this.lastUpdateTime == null) {
            this.lastUpdateTime = now;
        }

        const delta = Math.max(0, (now - this.lastUpdateTime) / 1000);
        this.lastUpdateTime = now;

        const modulation = (audioData?.spectralFlux ?? reactive.motion ?? 0) * this.config.colorReactivity;
        const speed = this.config.gradientSpeed * (1 + modulation * 1.5);
        this.gradientPhase = (this.gradientPhase + delta * speed) % 1;

        const paletteInfo = this.#computeColorState(audioData, reactive);
        const gradient = this.#buildGradient(paletteInfo.palette);

        this.lastState = {
            ...paletteInfo,
            gradient: {
                ...gradient,
                phase: this.gradientPhase
            }
        };

        return this.lastState;
    }

    reset() {
        this.lastUpdateTime = null;
        this.gradientPhase = 0;
        return this.update(Date.now(), {});
    }

    getState() {
        return this.lastState;
    }

    /**
     * Build a normalized palette given the current configuration.
     */
    #computeColorState(audioData = {}, reactive = {}) {
        const mode = this.config.colorMode;
        const baseHue = this.#computeBaseHue(audioData, reactive);
        const baseSaturation = this.#computeBaseSaturation(audioData, reactive);
        const baseIntensity = this.#computeBaseIntensity(audioData, reactive);

        const palette = this.#generatePalette(mode, baseHue, baseSaturation, baseIntensity, audioData, reactive);
        const primary = palette[0];
        const accent = palette[Math.min(1, palette.length - 1)];

        const uniforms = {
            palette: palette.slice(0, 4).map(color => [color.rgb.r, color.rgb.g, color.rgb.b]),
            size: Math.min(palette.length, 4)
        };

        return {
            mode,
            baseHue,
            palette,
            primary,
            accent,
            uniforms,
            saturation: baseSaturation,
            intensity: baseIntensity,
            paletteName: this.config.colorPalette
        };
    }

    #computeBaseHue(audioData = {}, reactive = {}) {
        const centroid = audioData?.spectralCentroid ?? 0;
        const motion = reactive.motion ?? audioData?.spectralFlux ?? 0;
        const onsetBoost = audioData?.onset ? 25 : 0;

        const reactiveShift = (centroid * 220 + motion * 110 + onsetBoost) * this.config.colorReactivity;
        return mod360(this.config.baseHue + reactiveShift);
    }

    #computeBaseSaturation(audioData = {}, reactive = {}) {
        const sparkle = reactive.sparkle ?? audioData?.bands?.air ?? 0;
        const flux = audioData?.spectralFlux ?? 0;
        const adjustment = (sparkle * 0.35 + flux * 0.4) * this.config.colorReactivity;
        return clamp01(this.config.baseSaturation + adjustment);
    }

    #computeBaseIntensity(audioData = {}, reactive = {}) {
        const rms = audioData?.rms ?? 0;
        const energy = reactive.energy ?? rms;
        const adjustment = (energy * 0.55) * this.config.colorReactivity;
        return clamp01(this.config.baseIntensity + adjustment);
    }

    #generatePalette(mode, baseHue, saturation, intensity, audioData = {}, reactive = {}) {
        switch (mode) {
            case 'dual':
                return this.#buildHueSet([baseHue, baseHue + this.config.dualOffset], saturation, intensity, audioData, reactive);
            case 'triad':
                return this.#buildHueSet([
                    baseHue,
                    baseHue + this.config.triadSpacing,
                    baseHue + this.config.triadSpacing * 2
                ], saturation, intensity, audioData, reactive);
            case 'complementary':
                return this.#buildHueSet([baseHue, baseHue + 180], saturation, intensity, audioData, reactive);
            case 'analogous':
                return this.#buildHueSet([
                    baseHue - this.config.analogousSpread,
                    baseHue,
                    baseHue + this.config.analogousSpread
                ], saturation, intensity, audioData, reactive);
            case 'palette':
                return this.#buildPaletteMode(saturation, intensity, audioData, reactive);
            case 'gradient':
                return this.#buildGradientMode(baseHue, saturation, intensity, audioData, reactive);
            case 'reactive':
                return this.#buildReactivePalette(saturation, intensity, audioData, reactive);
            case 'single':
            default:
                return this.#buildHueSet([baseHue], saturation, intensity, audioData, reactive);
        }
    }

    #buildHueSet(hues, saturation, intensity, audioData, reactive) {
        return hues.map(hue => this.#applyAudioModulation(hue, saturation, intensity, audioData, reactive));
    }

    #applyAudioModulation(h, s, v, audioData = {}, reactive = {}) {
        const centroid = audioData?.spectralCentroid ?? 0;
        const sparkle = reactive.sparkle ?? audioData?.bands?.air ?? 0;
        const energy = reactive.energy ?? audioData?.rms ?? 0;

        const hueShift = centroid * 45 * this.config.colorReactivity;
        const saturationBoost = sparkle * 0.45 * this.config.colorReactivity;
        const intensityBoost = energy * 0.55 * this.config.colorReactivity;

        const hue = mod360(h + hueShift);
        const saturation = clamp01(s + saturationBoost);
        const intensityValue = clamp01(v + intensityBoost);

        return makeColorObject(hue, saturation, intensityValue);
    }

    #buildPaletteMode(saturation, intensity, audioData, reactive) {
        const paletteName = this.config.colorPalette;
        const key = `${paletteName}|${Math.round(saturation * 100)}|${Math.round(intensity * 100)}`;

        if (this.#paletteCache.has(key)) {
            const cached = this.#paletteCache.get(key);
            return clonePalette(cached);
        }

        const source = COLOR_PALETTES[paletteName] || COLOR_PALETTES.synthwave;
        const palette = source.map(hex => {
            const { r, g, b } = hexToRgb(hex);
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const delta = max - min;

            let hue = 0;
            if (delta > 0) {
                if (max === r) {
                    hue = ((g - b) / delta) % 6;
                } else if (max === g) {
                    hue = (b - r) / delta + 2;
                } else {
                    hue = (r - g) / delta + 4;
                }
            }

            hue = (hue * 60 + 360) % 360;
            return makeColorObject(hue, saturation, intensity);
        });

        this.#paletteCache.set(key, palette);
        return clonePalette(palette).map(color => this.#applyAudioModulation(color.h, color.s, color.v, audioData, reactive));
    }

    #buildGradientMode(baseHue, saturation, intensity, audioData, reactive) {
        const hues = [baseHue, baseHue + 60, baseHue + 180];
        return this.#buildHueSet(hues, saturation, intensity, audioData, reactive);
    }

    #buildReactivePalette(saturation, intensity, audioData = {}, reactive = {}) {
        const bass = reactive.bass ?? audioData?.bands?.bass ?? 0;
        const mid = reactive.mid ?? audioData?.bands?.mid ?? 0;
        const high = reactive.high ?? audioData?.bands?.high ?? 0;

        const bassHue = 20 + bass * 60;
        const midHue = 160 + mid * 80;
        const highHue = 260 + high * 80;

        return this.#buildHueSet([bassHue, midHue, highHue], saturation, intensity, audioData, reactive);
    }

    #buildGradient(palette) {
        if (!palette || palette.length === 0) {
            return {
                type: this.config.gradientType,
                css: 'linear-gradient(90deg, #ffffff, #000000)',
                stops: []
            };
        }

        const stops = palette.map((color, index) => ({
            offset: palette.length === 1 ? 0 : index / (palette.length - 1),
            color
        }));

        const stopString = stops
            .map(({ offset, color }) => `${color.css} ${(offset * 100).toFixed(1)}%`)
            .join(', ');

        const angle = Math.round(this.gradientPhase * 360);

        switch (this.config.gradientType) {
            case 'vertical':
                return {
                    type: 'vertical',
                    css: `linear-gradient(180deg, ${stopString})`,
                    stops
                };
            case 'radial':
                return {
                    type: 'radial',
                    css: `radial-gradient(circle, ${stopString})`,
                    stops
                };
            case 'spiral':
                return {
                    type: 'spiral',
                    css: `conic-gradient(from ${angle}deg, ${stopString})`,
                    stops
                };
            case 'wave':
                return {
                    type: 'wave',
                    css: `linear-gradient(${angle}deg, ${stopString})`,
                    stops
                };
            case 'horizontal':
            default:
                return {
                    type: 'horizontal',
                    css: `linear-gradient(90deg, ${stopString})`,
                    stops
                };
        }
    }
}
