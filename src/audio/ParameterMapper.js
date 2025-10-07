import { ADSREnvelope } from './ADSREnvelope.js';

const clamp01 = (value) => Math.min(Math.max(value, 0), 1);

export class ParameterMapper {
    constructor(mappings = {}) {
        this.mappings = {};
        this.envelopes = new Map();
        this.lastValues = new Map();

        Object.entries(mappings).forEach(([parameter, config]) => {
            this.registerMapping(parameter, config);
        });
    }

    registerMapping(parameter, config) {
        if (!config) {
            return;
        }

        const mapping = {
            source: config.source,
            curve: config.curve || 'linear',
            range: config.range || [0, 1],
            scale: config.scale || 1,
            offset: config.offset || 0,
            threshold: config.threshold ?? 0,
            envelopeTrigger: config.envelopeTrigger ?? config.threshold ?? 0,
            envelopeRelease: config.envelopeRelease ?? config.threshold ?? 0,
            envelope: null
        };

        if (config.envelope instanceof ADSREnvelope) {
            mapping.envelope = config.envelope.clone();
            this.envelopes.set(parameter, mapping.envelope);
        }

        this.mappings[parameter] = mapping;
        this.lastValues.set(parameter, 0);
    }

    removeMapping(parameter) {
        delete this.mappings[parameter];
        this.envelopes.delete(parameter);
        this.lastValues.delete(parameter);
    }

    map(audioData, time = this.#now()) {
        const result = {};
        Object.entries(this.mappings).forEach(([parameter, config]) => {
            const rawValue = clamp01(this.#resolveSource(config.source, audioData));
            const curvedValue = clamp01(this.#applyCurve(rawValue, config));
            let value = this.#applyRange(curvedValue, config);

            const envelope = this.envelopes.get(parameter);
            if (envelope) {
                if (curvedValue >= config.envelopeTrigger) {
                    envelope.trigger(curvedValue, time);
                } else if (curvedValue <= config.envelopeRelease) {
                    envelope.releasePhase(time);
                }
                const envelopeValue = envelope.update(time);
                value = this.#applyRange(envelopeValue, config);
            }

            value = (value * config.scale) + config.offset;
            result[parameter] = value;
            this.lastValues.set(parameter, value);
        });

        return result;
    }

    #resolveSource(source, audioData) {
        if (typeof source === 'function') {
            try {
                const resolved = source(audioData);
                return typeof resolved === 'number' ? resolved : 0;
            } catch (error) {
                console.warn('ParameterMapper source function failed:', error);
                return 0;
            }
        }

        if (typeof source === 'string') {
            const path = source.split('.');
            let value = audioData;
            for (let i = 0; i < path.length; i += 1) {
                if (value == null) {
                    return 0;
                }
                value = value[path[i]];
            }

            if (typeof value === 'number') {
                return value;
            }

            if (value && typeof value.value === 'number') {
                return value.value;
            }
        }

        return 0;
    }

    #applyCurve(value, config) {
        const curve = config.curve;
        switch (curve) {
            case 'exponential':
                return Math.pow(value, config.exponent ?? 2);
            case 'logarithmic':
                return Math.log10(1 + value * 9) / Math.log10(10);
            case 's-curve': {
                const intensity = config.intensity ?? 1;
                const x = (value - 0.5) * (1 + intensity * 4);
                return 1 / (1 + Math.exp(-x * 5));
            }
            case 'threshold':
                return value >= (config.threshold ?? 0.5) ? 1 : 0;
            case 'power':
                return Math.pow(value, config.power ?? 1.5);
            default:
                return value;
        }
    }

    #applyRange(value, config) {
        const [min, max] = config.range;
        return min + (clamp01(value) * (max - min));
    }

    #now() {
        if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
            return performance.now();
        }
        return Date.now();
    }
}

export default ParameterMapper;
