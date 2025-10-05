import { ADSREnvelope } from './ADSREnvelope.js';

/**
 * AudioParameterMapper translates analysed audio features into visualization parameters.
 * Each mapping can define a source feature, transformation curve, scaling range, envelope,
 * and smoothing behaviour.
 */
export class AudioParameterMapper {
    constructor(mappings) {
        this.mappings = mappings || this.createDefaultMappings();
        this.envelopes = {};
        this.previousValues = {};
        this.previousRaw = {};
    }

    createDefaultMappings() {
        return {
            rot4dXW: {
                source: 'bands.bass',
                curve: 'exponential',
                range: [-2, 2],
                envelope: {
                    attack: 120,
                    decay: 320,
                    sustain: 0.55,
                    release: 500,
                    trigger: 'threshold',
                    triggerThreshold: 0.18
                }
            },
            rot4dYW: {
                source: 'bands.mid',
                curve: 'exponential',
                range: [-2, 2],
                envelope: {
                    attack: 80,
                    decay: 260,
                    sustain: 0.65,
                    release: 420,
                    trigger: 'threshold',
                    triggerThreshold: 0.16
                }
            },
            rot4dZW: {
                source: 'bands.high',
                curve: 'exponential',
                range: [-2, 2],
                envelope: {
                    attack: 50,
                    decay: 200,
                    sustain: 0.72,
                    release: 320,
                    trigger: 'threshold',
                    triggerThreshold: 0.12
                }
            },
            gridDensity: {
                source: 'spectralFlux',
                curve: 'threshold',
                range: [10, 100],
                threshold: 0.15,
                envelope: {
                    attack: 60,
                    decay: 600,
                    sustain: 0.4,
                    release: 900,
                    trigger: 'onset'
                }
            },
            hue: {
                source: 'spectralCentroid',
                curve: 'linear',
                range: [0, 360],
                smoothing: 0.6
            },
            intensity: {
                source: 'rms',
                curve: 'logarithmic',
                range: [0.3, 1.0],
                envelope: {
                    attack: 40,
                    decay: 120,
                    sustain: 0.8,
                    release: 200,
                    trigger: 'rising',
                    triggerThreshold: 0.02
                }
            }
        };
    }

    apply(audioFeatures, initialParams = {}) {
        const now = AudioParameterMapper.now();
        const result = { ...initialParams };

        Object.entries(this.mappings).forEach(([parameter, mapping]) => {
            const rawValue = this.extractSource(audioFeatures, mapping.source);
            if (rawValue === undefined || Number.isNaN(rawValue)) {
                return;
            }

            const curved = this.applyCurve(rawValue, mapping, parameter);
            const ranged = this.applyRange(curved, mapping.range);
            const enveloped = this.applyEnvelope(parameter, ranged, mapping.envelope, audioFeatures, now, rawValue);
            const smoothed = this.applySmoothing(parameter, enveloped, mapping.smoothing);

            result[parameter] = smoothed;
            this.previousRaw[parameter] = rawValue;
        });

        return result;
    }

    extractSource(audioFeatures, source) {
        if (!source) {
            return undefined;
        }

        if (source.startsWith('bands.')) {
            const band = source.split('.')[1];
            return audioFeatures.bands?.[band];
        }

        return audioFeatures[source];
    }

    applyCurve(value, mapping, parameter) {
        const curve = mapping.curve || 'linear';
        switch (curve) {
            case 'exponential':
                return Math.pow(Math.max(0, value), mapping.power || 2);
            case 'logarithmic':
                return Math.log10(1 + Math.max(0, value) * 9) / Math.log10(10);
            case 's-curve':
                return 1 / (1 + Math.exp(-12 * (value - 0.5)));
            case 'threshold': {
                const threshold = mapping.threshold ?? mapping.triggerThreshold ?? 0.2;
                return value > threshold ? 1 : 0;
            }
            default:
                return value;
        }
    }

    applyRange(value, range) {
        if (!range) {
            return value;
        }

        const [min, max] = range;
        const clamped = Math.min(1, Math.max(0, value));
        return min + (max - min) * clamped;
    }

    applyEnvelope(parameter, value, envelopeConfig, audioFeatures, now, rawValue) {
        if (!envelopeConfig) {
            return value;
        }

        const envelope = this.getEnvelope(parameter, envelopeConfig);
        const triggerType = envelopeConfig.trigger || 'threshold';
        const threshold = envelopeConfig.triggerThreshold ?? 0.1;
        let shouldTrigger = false;

        if (triggerType === 'onset') {
            shouldTrigger = Boolean(audioFeatures.onset);
        } else if (triggerType === 'rising') {
            const previous = this.previousRaw[parameter] ?? 0;
            shouldTrigger = rawValue > previous + threshold;
        } else {
            shouldTrigger = rawValue > threshold;
        }

        if (shouldTrigger) {
            envelope.trigger(value, now);
        } else if (envelopeConfig.autoRelease !== false && envelope.phase !== 'idle') {
            envelope.releaseEnvelope(now);
        }

        return envelope.update(now);
    }

    applySmoothing(parameter, value, smoothing) {
        if (typeof smoothing !== 'number') {
            this.previousValues[parameter] = value;
            return value;
        }

        const previous = this.previousValues[parameter] ?? value;
        const result = previous * smoothing + value * (1 - smoothing);
        this.previousValues[parameter] = result;
        return result;
    }

    getEnvelope(parameter, config) {
        if (!this.envelopes[parameter]) {
            this.envelopes[parameter] = new ADSREnvelope({
                attack: config.attack,
                decay: config.decay,
                sustain: config.sustain,
                release: config.release
            });
        }
        return this.envelopes[parameter];
    }

    static now() {
        if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
            return performance.now();
        }
        return Date.now();
    }
}
