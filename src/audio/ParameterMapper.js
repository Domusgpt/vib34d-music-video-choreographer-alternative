/**
 * Parameter Mapping Engine
 * Advanced audio-to-visual parameter mapping with curves, envelopes, and smoothing
 *
 * A Paul Phillips Manifestation - Paul@clearseassolutions.com
 * "The Revolution Will Not be in a Structured Format" © 2025
 */

import { ADSREnvelope } from './ADSREnvelope.js';

export class ParameterMapper {
    constructor() {
        this.mappings = {};
        this.smoothedValues = {};
        this.envelopes = {};
    }

    /**
     * Register a parameter mapping
     *
     * @param {string} paramName - Parameter name (e.g., 'rot4dXW')
     * @param {object} config - Mapping configuration
     * @param {string} config.source - Audio source ('bass', 'mid', 'high', 'spectralCentroid', etc.)
     * @param {string} config.curve - Mapping curve ('linear', 'exponential', 'logarithmic', 's-curve', 'threshold')
     * @param {array} config.range - Output range [min, max]
     * @param {number} config.smoothing - Smoothing factor (0-1, higher = smoother)
     * @param {number} config.threshold - Minimum value to react to (0-1)
     * @param {object} config.envelope - ADSR envelope params {attack, decay, sustain, release}
     */
    registerMapping(paramName, config) {
        this.mappings[paramName] = {
            source: config.source || 'bass',
            curve: config.curve || 'linear',
            range: config.range || [0, 1],
            smoothing: config.smoothing !== undefined ? config.smoothing : 0,
            threshold: config.threshold !== undefined ? config.threshold : 0,
            envelope: config.envelope || null
        };

        // Create ADSR envelope if specified
        if (config.envelope) {
            this.envelopes[paramName] = new ADSREnvelope(
                config.envelope.attack || 200,
                config.envelope.decay || 500,
                config.envelope.sustain !== undefined ? config.envelope.sustain : 0.6,
                config.envelope.release || 1000
            );
        }

        // Initialize smoothed value
        this.smoothedValues[paramName] = config.range[0];
    }

    /**
     * Map audio features to parameter value
     *
     * @param {string} paramName - Parameter to map
     * @param {object} audioFeatures - Audio analysis results
     * @returns {number} Mapped parameter value
     */
    map(paramName, audioFeatures) {
        const mapping = this.mappings[paramName];
        if (!mapping) return null;

        // Get source value from audio features
        let value = this.getSourceValue(audioFeatures, mapping.source);

        // Apply threshold
        if (value < mapping.threshold) {
            value = 0;
        }

        // Apply curve transformation
        value = this.applyCurve(value, mapping.curve);

        // Apply ADSR envelope if configured
        if (this.envelopes[paramName]) {
            const envelope = this.envelopes[paramName];
            const prevValue = this.smoothedValues[paramName] || 0;

            // Trigger on rising edge
            if (value > prevValue + 0.1) {
                envelope.trigger(value);
            } else if (value < 0.05) {
                envelope.release();
            }

            value = envelope.update();
        }

        // Apply smoothing
        if (mapping.smoothing > 0) {
            const prev = this.smoothedValues[paramName];
            value = prev * mapping.smoothing + value * (1 - mapping.smoothing);
        }

        this.smoothedValues[paramName] = value;

        // Map to output range
        const [min, max] = mapping.range;
        return min + value * (max - min);
    }

    /**
     * Map all registered parameters
     *
     * @param {object} audioFeatures - Audio analysis results
     * @returns {object} Mapped parameters
     */
    mapAll(audioFeatures) {
        const result = {};
        for (const paramName of Object.keys(this.mappings)) {
            result[paramName] = this.map(paramName, audioFeatures);
        }
        return result;
    }

    /**
     * Get source value from audio features
     */
    getSourceValue(audioFeatures, source) {
        // Direct band access
        if (audioFeatures.bands && audioFeatures.bands[source] !== undefined) {
            return audioFeatures.bands[source];
        }

        // Spectral features
        if (audioFeatures[source] !== undefined) {
            return audioFeatures[source];
        }

        // Onset detection
        if (source === 'onset' && audioFeatures.onset) {
            return audioFeatures.onset.detected ? audioFeatures.onset.strength : 0;
        }

        // Beat detection
        if (source === 'beat' && audioFeatures.beat) {
            return audioFeatures.beat ? 1 : 0;
        }

        return 0;
    }

    /**
     * Apply curve transformation to value
     *
     * @param {number} value - Input value (0-1)
     * @param {string} curve - Curve type
     * @returns {number} Transformed value (0-1)
     */
    applyCurve(value, curve) {
        // Clamp input to 0-1
        value = Math.max(0, Math.min(1, value));

        switch (curve) {
            case 'linear':
                return value;

            case 'exponential':
                // Emphasize loud sounds
                return Math.pow(value, 2);

            case 'logarithmic':
                // Emphasize quiet sounds
                return Math.log(1 + value * 9) / Math.log(10);

            case 's-curve':
                // Compress middle, expand edges
                return 1 / (1 + Math.exp(-10 * (value - 0.5)));

            case 'threshold':
                // Binary threshold at 0.5
                return value > 0.5 ? 1 : 0;

            case 'sqrt':
                // Square root (between linear and logarithmic)
                return Math.sqrt(value);

            case 'cubic':
                // Stronger than exponential
                return Math.pow(value, 3);

            default:
                return value;
        }
    }

    /**
     * Create default mappings for VIB34D parameters
     */
    createDefaultMappings() {
        // 4D Rotations
        this.registerMapping('rot4dXW', {
            source: 'bass',
            curve: 'exponential',
            range: [-2, 2],
            envelope: { attack: 100, decay: 300, sustain: 0.7, release: 800 },
            smoothing: 0.7
        });

        this.registerMapping('rot4dYW', {
            source: 'mid',
            curve: 'exponential',
            range: [-2, 2],
            envelope: { attack: 150, decay: 400, sustain: 0.6, release: 600 },
            smoothing: 0.6
        });

        this.registerMapping('rot4dZW', {
            source: 'high',
            curve: 'logarithmic',
            range: [-2, 2],
            envelope: { attack: 100, decay: 300, sustain: 0.8, release: 500 },
            smoothing: 0.5
        });

        // Grid Density
        this.registerMapping('gridDensity', {
            source: 'spectralCentroid',
            curve: 's-curve',
            range: [10, 100],
            envelope: { attack: 300, decay: 600, sustain: 0.5, release: 1200 },
            threshold: 0.2,
            smoothing: 0.8
        });

        // Morph Factor
        this.registerMapping('morphFactor', {
            source: 'spectralFlux',
            curve: 'exponential',
            range: [0, 2],
            envelope: { attack: 200, decay: 500, sustain: 0.4, release: 1000 },
            smoothing: 0.7
        });

        // Chaos
        this.registerMapping('chaos', {
            source: 'onset',
            curve: 'threshold',
            range: [0.2, 0.9],
            envelope: { attack: 50, decay: 200, sustain: 0.3, release: 400 },
            smoothing: 0.6
        });

        // Hue (color)
        this.registerMapping('hue', {
            source: 'spectralRolloff',
            curve: 'linear',
            range: [0, 360],
            smoothing: 0.9 // Very smooth color changes
        });

        // Intensity
        this.registerMapping('intensity', {
            source: 'rms',
            curve: 'exponential',
            range: [0, 1],
            envelope: { attack: 100, decay: 400, sustain: 0.5, release: 600 },
            smoothing: 0.7
        });

        // Saturation
        this.registerMapping('saturation', {
            source: 'spectralCentroid',
            curve: 's-curve',
            range: [0.3, 1],
            smoothing: 0.8
        });
    }

    /**
     * Reset all envelopes
     */
    reset() {
        for (const envelope of Object.values(this.envelopes)) {
            envelope.reset();
        }
        this.smoothedValues = {};
    }

    /**
     * Get current smoothed values
     */
    getSmoothedValues() {
        return { ...this.smoothedValues };
    }
}
