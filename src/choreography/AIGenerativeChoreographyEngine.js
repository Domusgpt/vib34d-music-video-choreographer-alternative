/**
 * AI Generative Choreography Engine
 *
 * Generates rich choreography blueprints that are not constrained by the original
 * parameter ranges.  The engine can invent new parameter channels and extended
 * effects and exposes helpers for evaluating those blueprints at runtime.
 */

const DEFAULT_PARAMETER_KEYS = [
    'chaos',
    'speed',
    'morphFactor',
    'gridDensity',
    'hue',
    'saturation',
    'intensity',
    'rot4dXW',
    'rot4dYW',
    'rot4dZW',
    'dimension'
];

export class AIGenerativeChoreographyEngine {
    constructor(options = {}) {
        this.options = {
            seed: options.seed ?? Date.now(),
            allowSystemExpansion: options.allowSystemExpansion ?? true
        };

        this.random = this.createRandom(this.options.seed);
    }

    /**
     * Generate a default timeline with multi-system choreography
     */
    generateInitialTimeline(context = {}) {
        const duration = context.duration ?? 90;
        const systems = context.systems ?? ['faceted', 'quantum', 'holographic'];
        const energyProfile = context.energyProfile ?? [0.35, 0.55, 0.9, 0.65, 0.25, 1.0];
        const segmentCount = energyProfile.length;
        const baseSegmentLength = duration / segmentCount;
        const geometryPalettes = this.buildGeometryPalettes();

        const sequences = [];
        let currentTime = 0;

        for (let i = 0; i < segmentCount; i++) {
            const energy = energyProfile[i];
            const segDuration = context.segmentLengths?.[i] ?? this.clamp(baseSegmentLength * (0.8 + this.random() * 0.4), 12, 24);
            const systemIndex = i % systems.length;
            const system = systems[systemIndex];
            const palette = geometryPalettes[system] ?? geometryPalettes.generic;
            const anchorHue = 180 + i * 45 + energy * 120;

            sequences.push(this.buildSegment({
                start: currentTime,
                duration: segDuration,
                system,
                energy,
                palette,
                anchorHue
            }));

            currentTime += segDuration;
        }

        // Ensure coverage of the requested duration by extending the last segment if needed
        if (currentTime < duration && sequences.length) {
            sequences[sequences.length - 1].duration += duration - currentTime;
        }

        return sequences;
    }

    /**
     * Determine whether the incoming sequence uses the new AI schema
     */
    isAISchema(sequence) {
        const effects = sequence?.effects;
        if (!effects) return false;
        if (effects.baseParameters || effects.extended || effects.customParameters) {
            return true;
        }
        if (effects.geometry && typeof effects.geometry === 'object') {
            return true;
        }
        return false;
    }

    /**
     * Evaluate a sequence at runtime and produce parameter updates
     */
    evaluate(sequence, context = {}) {
        if (!this.isAISchema(sequence)) {
            return null;
        }

        const effects = sequence.effects ?? {};
        const audio = context.audio ?? { bass: 0, mid: 0, high: 0, energy: 0 };
        const progress = this.clamp(context.progress ?? 0, 0, 1);
        const absoluteTime = context.absoluteTime ?? 0;
        const bpm = context.bpm ?? 120;

        const result = {
            handled: true,
            parameters: {},
            parameterRanges: {},
            customParameters: {},
            extended: effects.extended ? {} : null,
            summary: effects.metaSummary || []
        };

        const resolvedSystem = this.resolveSystem(effects.system, audio, context.currentSystem);
        if (resolvedSystem) {
            result.system = resolvedSystem;
        }

        const geometryValue = this.resolveGeometry(effects.geometry, {
            audio,
            progress,
            absoluteTime,
            bpm
        });
        if (geometryValue !== undefined) {
            result.parameters.geometry = geometryValue;
        }

        const baseParameters = effects.baseParameters || {};
        const automation = effects.automation || {};

        const allKeys = new Set([
            ...DEFAULT_PARAMETER_KEYS,
            ...Object.keys(baseParameters || {}),
            ...Object.keys(effects.customParameters || {})
        ]);

        for (const key of allKeys) {
            if (effects.customParameters && effects.customParameters[key]) {
                const config = effects.customParameters[key];
                const value = this.resolveParameterValue(config, { audio, progress, absoluteTime });
                if (value !== undefined) {
                    result.customParameters[key] = {
                        value,
                        definition: config.definition || {
                            min: config.min ?? null,
                            max: config.max ?? null,
                            step: config.step ?? 0.01,
                            type: config.type ?? 'float'
                        }
                    };
                }
                continue;
            }

            const parameterConfig = baseParameters[key];
            if (!parameterConfig) continue;

            const automationConfig = automation[key];
            const value = this.resolveParameterValue(parameterConfig, {
                audio,
                progress,
                absoluteTime,
                automation: automationConfig
            });

            if (value !== undefined) {
                result.parameters[key] = value;
                const range = parameterConfig.range ?? automationConfig?.range;
                if (range) {
                    result.parameterRanges[key] = { min: range[0], max: range[1] };
                }
            }
        }

        if (effects.rotation) {
            const rotationValues = this.resolveRotation(effects.rotation, { audio, progress, absoluteTime });
            Object.assign(result.parameters, rotationValues.parameters);
            Object.assign(result.customParameters, rotationValues.customParameters);
        }

        if (effects.extended) {
            const extended = {};
            if (effects.extended.cameraOrbit) {
                extended.cameraOrbit = this.resolveCameraOrbit(effects.extended.cameraOrbit, {
                    audio,
                    progress,
                    absoluteTime
                });
            }
            if (effects.extended.layerPulse) {
                extended.layerPulse = this.resolveLayerPulse(effects.extended.layerPulse, {
                    audio,
                    progress
                });
            }
            if (effects.extended.glitch) {
                extended.glitch = this.resolveGlitch(effects.extended.glitch, {
                    audio,
                    progress,
                    absoluteTime
                });
            }
            if (effects.extended.vignette) {
                extended.vignette = this.resolveVignette(effects.extended.vignette, {
                    audio,
                    progress
                });
            }
            if (Object.keys(extended).length) {
                result.extended = extended;
            } else {
                result.extended = null;
            }
        }

        return result;
    }

    /**
     * Build a sophisticated segment blueprint
     */
    buildSegment({ start, duration, system, energy, palette, anchorHue }) {
        const geometry = {
            mode: 'ai-dynamic',
            palette,
            easing: energy > 0.6 ? 'easeOutCubic' : 'easeInOutCubic',
            changeEveryBeats: energy > 0.8 ? 1.5 : 3.5,
            allowEnergyBreaks: true,
            energyGate: 0.72,
            randomizeOnPeaks: true
        };

        const baseParameters = {
            chaos: {
                base: 0.12 + energy * 0.22,
                range: [0.05, 1.6],
                audio: { energy: 0.6, high: 0.3 }
            },
            speed: {
                base: 0.7 + energy * 1.8,
                range: [0.35, 5.2],
                audio: { energy: 1.3 }
            },
            morphFactor: {
                base: 0.8 + energy * 1.1,
                range: [0.4, 2.8],
                audio: { mid: 0.9 }
            },
            gridDensity: {
                base: 18 + energy * 60,
                range: [10, 180],
                audio: { bass: 70 }
            },
            hue: {
                base: anchorHue % 360,
                drift: 90,
                audio: { energy: 140, high: 60 },
                wrap: true
            },
            saturation: {
                base: 0.75 + energy * 0.4,
                range: [0.5, 1.8],
                audio: { bass: 0.35, energy: 0.25 }
            },
            intensity: {
                base: 0.65 + energy * 0.5,
                range: [0.4, 1.9],
                audio: { energy: 0.55 }
            },
            rot4dXW: {
                base: 0.2 + energy * 0.6,
                range: [-3.5, 3.5],
                audio: { bass: Math.PI * 0.9 },
                modulation: 0.5
            },
            rot4dYW: {
                base: 0.15 + energy * 0.45,
                range: [-3.2, 3.2],
                audio: { mid: Math.PI * 0.7 },
                modulation: 0.35
            },
            rot4dZW: {
                base: 0.1 + energy * 0.4,
                range: [-3.8, 3.8],
                audio: { high: Math.PI * 0.9 },
                modulation: 0.45
            },
            dimension: {
                base: 3.5 + energy * 1.3,
                range: [3.2, 5.8],
                audio: { energy: 0.6 }
            }
        };

        const rotation = {
            style: 'orbital',
            intensity: 0.6 + energy * 0.9,
            modulation: 0.45,
            audio: { bass: 1.2, mid: 0.9, high: 0.6 },
            base: { xw: 0.25, yw: 0.18, zw: 0.12 }
        };

        const customParameters = {
            ai_cameraRoll: {
                base: 0,
                range: [-35, 35],
                audio: { energy: 18, high: 10 },
                modulation: 12,
                definition: { min: -90, max: 90, step: 0.1, type: 'float' }
            },
            ai_layerBloom: {
                base: 0.4 + energy * 0.5,
                range: [0, 2.5],
                audio: { energy: 0.8, bass: 0.4 },
                definition: { min: 0, max: 3, step: 0.01, type: 'float' }
            },
            ai_displacementWarp: {
                base: 0.2 + energy * 0.6,
                range: [0, 2],
                audio: { high: 0.9 },
                definition: { min: 0, max: 2.5, step: 0.01, type: 'float' }
            }
        };

        const extended = {
            cameraOrbit: {
                radius: 12 + energy * 18,
                tilt: 6 + energy * 12,
                speed: 0.25 + energy * 0.35,
                roll: energy > 0.7 ? 10 : 4,
                audio: { energy: 10, bass: 6 }
            },
            layerPulse: {
                base: 1 + energy * 0.2,
                accent: 1.25 + energy * 0.65,
                highlight: 1.15 + energy * 0.55,
                background: 0.9,
                blur: 5 + energy * 10,
                audio: { bass: 0.8, energy: 0.5 }
            },
            glitch: {
                base: energy > 0.6 ? 0.12 : 0.05,
                spikes: this.generateGlitchSpikes(duration, energy),
                decay: 0.9,
                audio: { high: 0.6, energy: 0.4 }
            },
            vignette: {
                strength: 0.2 + energy * 0.35,
                focusHue: anchorHue % 360
            }
        };

        const metaSummary = [
            `AI geometry sweep across ${palette.length} archetypes`,
            `Orbital rotations at ${(rotation.intensity).toFixed(2)} intensity`,
            `Extended controls: camera orbit, layer pulse and glitch shielding`
        ];

        return {
            time: start,
            duration,
            effects: {
                system,
                geometry,
                baseParameters,
                rotation,
                customParameters,
                extended,
                metaSummary
            }
        };
    }

    /** Utility helpers **/

    resolveSystem(systemConfig, audio, currentSystem) {
        if (!systemConfig) return currentSystem;
        if (typeof systemConfig === 'string') return systemConfig;

        const playlist = systemConfig.playlist || ['faceted', 'quantum', 'holographic'];
        const thresholds = systemConfig.thresholds || { quantum: 0.6, holographic: 0.75 };
        const energy = audio.energy ?? 0;

        if (energy >= (thresholds.holographic ?? 0.75) && playlist.includes('holographic')) {
            return 'holographic';
        }
        if (energy >= (thresholds.quantum ?? 0.6) && playlist.includes('quantum')) {
            return 'quantum';
        }
        return playlist[0] || currentSystem;
    }

    resolveGeometry(config, context) {
        if (config === undefined || config === null) return undefined;
        if (typeof config === 'number') return Math.round(config);
        if (typeof config === 'string') return undefined; // legacy handled elsewhere

        const palette = config.palette && config.palette.length ? config.palette : [0, 1, 2, 3, 4, 5, 6, 7];
        const progress = context.progress ?? 0;
        const bpm = context.bpm ?? 120;
        const absoluteTime = context.absoluteTime ?? 0;
        const audio = context.audio ?? { energy: 0 };

        let geometryIndex = palette[0];
        const easing = config.easing ?? 'linear';

        if (config.mode === 'ai-dynamic' || config.mode === 'progressive') {
            const eased = this.applyEasing(progress, easing);
            const pathPosition = eased * (palette.length - 1);
            geometryIndex = this.samplePalette(palette, pathPosition);
        }

        if (config.mode === 'pulse') {
            const pulse = Math.sin(progress * Math.PI * (config.frequency ?? 4));
            const idx = Math.floor((pulse + 1) / 2 * (palette.length - 1));
            geometryIndex = palette[this.clamp(Math.round(idx), 0, palette.length - 1)];
        }

        if (config.changeEveryBeats) {
            const beats = Math.max(config.changeEveryBeats, 0.1);
            const beatProgress = absoluteTime * (bpm / 60);
            const step = Math.floor(beatProgress / beats);
            geometryIndex = palette[step % palette.length];
        }

        if (config.allowEnergyBreaks && audio.energy >= (config.energyGate ?? 0.75)) {
            geometryIndex = palette[Math.floor(this.random() * palette.length)];
        }

        if (config.randomizeOnPeaks && audio.energy > 0.9) {
            geometryIndex = palette[Math.floor(this.random() * palette.length)];
        }

        return Math.max(0, Math.round(geometryIndex));
    }

    resolveParameterValue(config, context) {
        if (config === undefined || config === null) return undefined;
        const audio = context.audio ?? { bass: 0, mid: 0, high: 0, energy: 0 };
        const progress = context.progress ?? 0;
        const absoluteTime = context.absoluteTime ?? 0;
        const automation = context.automation ?? {};

        let value = 0;

        if (typeof config === 'number') {
            value = config;
        } else {
            value = config.base ?? 0;

            if (config.range) {
                const eased = this.applyEasing(progress, config.easing || automation.easing || 'linear');
                value = config.range[0] + (config.range[1] - config.range[0]) * eased;
            }

            if (Array.isArray(config.path) && config.path.length) {
                const position = progress * (config.path.length - 1);
                value = this.samplePalette(config.path, position);
            }

            if (config.drift) {
                value += config.drift * progress;
            }

            if (config.wrap) {
                value = ((value % 360) + 360) % 360;
            }

            if (config.modulation) {
                value += Math.sin(progress * Math.PI * 2 + absoluteTime) * config.modulation;
            }

            if (automation.range) {
                const eased = this.applyEasing(progress, automation.easing || 'easeInOut');
                value = automation.range[0] + (automation.range[1] - automation.range[0]) * eased;
            }

            if (automation.bump) {
                const envelope = Math.sin(progress * Math.PI);
                value += automation.bump * envelope;
            }
        }

        const audioConfig = config.audio || {};
        value += (audioConfig.energy ?? 0) * audio.energy;
        value += (audioConfig.bass ?? 0) * audio.bass;
        value += (audioConfig.mid ?? 0) * audio.mid;
        value += (audioConfig.high ?? 0) * audio.high;

        if (config.min !== undefined) {
            value = Math.max(config.min, value);
        }
        if (config.max !== undefined) {
            value = Math.min(config.max, value);
        }

        if (config.wrap) {
            value = ((value % 360) + 360) % 360;
        }

        return value;
    }

    resolveRotation(rotationConfig, context) {
        const result = {
            parameters: {},
            customParameters: {}
        };
        if (!rotationConfig) {
            return result;
        }
        if (typeof rotationConfig === 'string') {
            return result;
        }

        const audio = context.audio ?? { bass: 0, mid: 0, high: 0, energy: 0 };
        const progress = context.progress ?? 0;
        const absoluteTime = context.absoluteTime ?? 0;

        const intensity = rotationConfig.intensity ?? 1;
        const base = rotationConfig.base || {};
        const audioInfluence = rotationConfig.audio || {};
        const modulation = rotationConfig.modulation ?? 0;
        const orbitSpeed = rotationConfig.speed ?? 1;

        const phase = absoluteTime * (rotationConfig.frequency ?? 0.6) + progress * Math.PI * 2 * orbitSpeed;

        const xw = (base.xw ?? 0) + Math.sin(phase) * intensity + audio.bass * (audioInfluence.bass ?? 0.6);
        const yw = (base.yw ?? 0) + Math.cos(phase * 0.75) * intensity + audio.mid * (audioInfluence.mid ?? 0.5);
        const zw = (base.zw ?? 0) + Math.sin(phase * 1.2) * (intensity * 0.8) + audio.high * (audioInfluence.high ?? 0.7);

        result.parameters.rot4dXW = xw + Math.sin(progress * Math.PI * 2) * modulation;
        result.parameters.rot4dYW = yw + Math.cos(progress * Math.PI * 2) * (modulation * 0.8);
        result.parameters.rot4dZW = zw + Math.sin(progress * Math.PI * 4) * (modulation * 0.6);

        if (rotationConfig.twist) {
            const twist = rotationConfig.twist;
            const twistValue = Math.sin(progress * Math.PI * 2) * twist.amount;
            result.customParameters.ai_twistIntensity = {
                value: twistValue,
                definition: { min: -twist.max ?? -5, max: twist.max ?? 5, step: 0.01, type: 'float' }
            };
        }

        return result;
    }

    resolveCameraOrbit(config, context) {
        const audio = context.audio ?? { energy: 0, bass: 0 };
        const progress = context.progress ?? 0;
        const absoluteTime = context.absoluteTime ?? 0;

        const radius = config.radius ?? 12;
        const tilt = config.tilt ?? 8;
        const speed = config.speed ?? 0.35;
        const roll = config.roll ?? 0;
        const audioInfluence = config.audio || {};

        const orbit = absoluteTime * speed + progress * Math.PI * 2;
        const x = Math.sin(orbit) * radius + audio.bass * (audioInfluence.bass ?? 5);
        const y = Math.cos(orbit * 0.9) * tilt + audio.energy * (audioInfluence.energy ?? 8);
        const zoom = (config.zoom ?? 1) + audio.energy * (audioInfluence.zoom ?? 0.25);
        const rollValue = roll ? Math.sin(orbit * 0.5) * roll : 0;

        return { x, y, zoom, roll: rollValue };
    }

    resolveLayerPulse(config, context) {
        const audio = context.audio ?? { bass: 0, energy: 0 };
        const progress = context.progress ?? 0;

        const base = config.base ?? 1;
        const accent = config.accent ?? 1.2;
        const highlight = config.highlight ?? 1.1;
        const background = config.background ?? 1;
        const blur = config.blur ?? 6;
        const audioInfluence = config.audio || {};

        const envelope = Math.sin(progress * Math.PI);

        return {
            background: background + envelope * 0.05,
            content: base + audio.energy * (audioInfluence.energy ?? 0.4),
            highlight: highlight + audio.bass * (audioInfluence.bass ?? 0.6),
            accent: accent + Math.pow(audio.energy, 2) * (audioInfluence.energy ?? 0.4),
            blur: blur + audio.energy * 4
        };
    }

    resolveGlitch(config, context) {
        const audio = context.audio ?? { high: 0, energy: 0 };
        const absoluteTime = context.absoluteTime ?? 0;
        const progress = context.progress ?? 0;

        let intensity = config.base ?? 0;
        const audioInfluence = config.audio || {};

        intensity += audio.high * (audioInfluence.high ?? 0.4);
        intensity += audio.energy * (audioInfluence.energy ?? 0.3);

        if (Array.isArray(config.spikes)) {
            for (const spike of config.spikes) {
                if (Math.abs(progress - spike.at) < 0.02) {
                    intensity += spike.intensity ?? 0.5;
                }
            }
        }

        intensity *= config.decay ?? 1;
        intensity += Math.abs(Math.sin(absoluteTime * 5)) * 0.02;

        return { intensity: this.clamp(intensity, 0, 2) };
    }

    resolveVignette(config, context) {
        const audio = context.audio ?? { energy: 0 };
        const strength = (config.strength ?? 0.25) + audio.energy * 0.15;
        const hue = config.focusHue ?? 220;
        return { strength: this.clamp(strength, 0, 0.8), hue };
    }

    generateGlitchSpikes(duration, energy) {
        const spikes = [];
        const spikeCount = Math.round(3 + energy * 4);
        for (let i = 0; i < spikeCount; i++) {
            spikes.push({
                at: this.clamp(this.random(), 0.05, 0.95),
                intensity: 0.3 + this.random() * (energy > 0.6 ? 0.8 : 0.4)
            });
        }
        return spikes;
    }

    buildGeometryPalettes() {
        return {
            faceted: [0, 1, 2, 5, 7, 3],
            quantum: [4, 6, 2, 7, 5, 3],
            holographic: [1, 3, 5, 7, 2, 6],
            generic: [0, 2, 4, 6, 1, 5]
        };
    }

    samplePalette(palette, position) {
        const lower = Math.floor(position);
        const upper = Math.ceil(position);
        if (lower >= palette.length) return palette[palette.length - 1];
        if (upper >= palette.length) return palette[palette.length - 1];
        if (lower === upper) return palette[lower];
        const ratio = position - lower;
        return palette[lower] * (1 - ratio) + palette[upper] * ratio;
    }

    applyEasing(t, type) {
        const x = this.clamp(t, 0, 1);
        switch (type) {
            case 'easeInOutCubic':
                return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
            case 'easeOutCubic':
                return 1 - Math.pow(1 - x, 3);
            case 'easeInCubic':
                return x * x * x;
            case 'easeOutQuad':
                return 1 - (1 - x) * (1 - x);
            case 'easeInOutQuad':
                return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
            default:
                return x;
        }
    }

    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    createRandom(seed) {
        let state = seed >>> 0;
        return () => {
            state |= 0;
            state = state + 0x6D2B79F5 | 0;
            let t = Math.imul(state ^ state >>> 15, 1 | state);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }
}
