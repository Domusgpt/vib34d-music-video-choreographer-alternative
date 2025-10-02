/**
 * AdaptiveChoreographyDirector
 * ---------------------------------------------
 * Generates AI-driven choreography timelines based on
 * lightweight audio analysis and creative heuristics.
 */

export class AdaptiveChoreographyDirector {
    constructor() {
        this.parameterDefs = [
            { name: 'cameraOrbit', min: -Math.PI, max: Math.PI, step: 0.001, type: 'float', defaultValue: 0.2, allowOverflow: true },
            { name: 'bloomStrength', min: 0, max: 3, step: 0.01, type: 'float', defaultValue: 0.35, allowOverflow: false },
            { name: 'glitchFactor', min: 0, max: 1, step: 0.01, type: 'float', defaultValue: 0.05, allowOverflow: false },
            { name: 'particleFlow', min: 0, max: 2, step: 0.01, type: 'float', defaultValue: 0.2, allowOverflow: false },
            { name: 'dimensionWarp', min: -2, max: 2, step: 0.01, type: 'float', defaultValue: 0.0, allowOverflow: true },
            { name: 'chromaticShift', min: -3, max: 3, step: 0.01, type: 'float', defaultValue: 0.0, allowOverflow: true }
        ];
    }

    getParameterDefinitions() {
        return [...this.parameterDefs];
    }

    analyzeAudioBuffer(audioBuffer) {
        if (!audioBuffer) {
            return null;
        }

        const channelData = audioBuffer.getChannelData(0);
        const sampleRate = audioBuffer.sampleRate;
        const totalSamples = channelData.length;
        const windowSize = Math.max(1, Math.floor(sampleRate * 0.5));

        let peak = 0;
        let sumSquares = 0;
        const rmsWindows = [];

        for (let i = 0; i < totalSamples; i++) {
            const value = channelData[i];
            peak = Math.max(peak, Math.abs(value));
            sumSquares += value * value;

            if ((i + 1) % windowSize === 0) {
                rmsWindows.push(Math.sqrt(sumSquares / windowSize));
                sumSquares = 0;
            }
        }

        if (sumSquares > 0 && rmsWindows.length === 0) {
            rmsWindows.push(Math.sqrt(sumSquares / totalSamples));
        }

        const averageRMS = rmsWindows.length
            ? rmsWindows.reduce((acc, rms) => acc + rms, 0) / rmsWindows.length
            : 0;

        const sectionProfile = this._createSectionProfile(rmsWindows);

        return {
            duration: audioBuffer.duration,
            sampleRate,
            peak,
            averageRMS,
            sections: rmsWindows,
            sectionProfile
        };
    }

    generatePlan(duration, analysis = {}) {
        const totalDuration = Math.max(duration || analysis?.duration || 90, 45);
        const intensityBias = this._clamp(this._mapRange(analysis.averageRMS ?? 0.25, 0.05, 0.5, 0.65, 1.5), 0.5, 1.6);
        const peakBias = this._clamp(this._mapRange(analysis.peak ?? 0.7, 0.2, 1.0, 0.6, 1.4), 0.5, 1.5);
        const sectionProfile = analysis.sectionProfile || {
            intro: 0.35,
            build: 0.55,
            drop: 0.85,
            breakdown: 0.4,
            finale: 0.9
        };

        const phaseTemplates = [
            { key: 'intro', ratio: 0.18, min: 8, max: 22 },
            { key: 'build', ratio: 0.22, min: 10, max: 26 },
            { key: 'drop', ratio: 0.26, min: 14, max: 38 },
            { key: 'breakdown', ratio: 0.16, min: 8, max: 22 },
            { key: 'finale', ratio: 0.18, min: 10, max: 30 }
        ];

        const sequences = [];
        let accumulatedTime = 0;

        phaseTemplates.forEach((phase, index) => {
            let phaseDuration = totalDuration * phase.ratio;
            phaseDuration = this._clamp(phaseDuration, phase.min, phase.max);

            if (index === phaseTemplates.length - 1) {
                phaseDuration = Math.max(totalDuration - accumulatedTime, phase.min);
            }

            const energyWeight = sectionProfile[phase.key] ?? intensityBias;
            const context = {
                intensityBias,
                peakBias,
                energyWeight,
                previous: sequences[sequences.length - 1] || null
            };

            const sequence = this._buildPhaseSequence(phase.key, phaseDuration, accumulatedTime, context);
            sequences.push(sequence);
            accumulatedTime += phaseDuration;
        });

        return sequences;
    }

    _buildPhaseSequence(phaseKey, duration, startTime, context) {
        const energy = context.energyWeight;
        const intensity = context.intensityBias;
        const peak = context.peakBias;

        const sequence = {
            time: Math.max(0, startTime),
            duration,
            label: '',
            effects: {
                system: 'faceted',
                geometry: 'cycle',
                rotation: 'smooth',
                chaos: 0.2,
                speed: 1.0,
                colorShift: 'medium',
                densityBoost: 0,
                baseHue: undefined
            },
            custom: {}
        };

        switch (phaseKey) {
            case 'intro':
                sequence.label = 'Intro - Orbital Warmup';
                sequence.effects.system = 'faceted';
                sequence.effects.geometry = 'cycle';
                sequence.effects.rotation = 'smooth';
                sequence.effects.chaos = 0.12 * intensity;
                sequence.effects.speed = 0.65 * intensity;
                sequence.effects.colorShift = 'slow';
                sequence.effects.densityBoost = -4;
                sequence.effects.baseHue = 190;
                sequence.custom = {
                    cameraOrbit: this._customParam(0.18 * intensity, { mid: 0.25, energy: 0.35 }),
                    bloomStrength: this._customParam(0.25, { energy: 0.5 }, { range: [0, 1.2] }),
                    particleFlow: this._customParam(0.12, { high: 0.25 }, { range: [0, 0.8] }),
                    dimensionWarp: this._customParam(0.05 * intensity, { bass: 0.35 }, { allowOverflow: true, range: [-0.8, 0.8] }),
                    glitchFactor: this._customParam(0.015, { high: 0.2 }, { range: [0, 0.3] }),
                    chromaticShift: this._customParam(-0.2, { energy: 0.15 }, { range: [-1, 1] })
                };
                break;
            case 'build':
                sequence.label = 'Build - Fractal Lift';
                sequence.effects.system = 'faceted';
                sequence.effects.geometry = 'morph';
                sequence.effects.rotation = 'accelerate';
                sequence.effects.chaos = 0.28 * intensity;
                sequence.effects.speed = 1.1 * intensity;
                sequence.effects.colorShift = 'medium';
                sequence.effects.densityBoost = 6;
                sequence.effects.baseHue = 220;
                sequence.custom = {
                    cameraOrbit: this._customParam(0.28 * intensity, { mid: 0.35, energy: 0.4 }),
                    bloomStrength: this._customParam(0.45, { energy: 0.6 }, { range: [0.1, 1.6] }),
                    particleFlow: this._customParam(0.24 + energy * 0.2, { high: 0.4 }, { range: [0, 1.2] }),
                    dimensionWarp: this._customParam(0.18 * intensity, { bass: 0.45 }, { allowOverflow: true, range: [-1.2, 1.2] }),
                    glitchFactor: this._customParam(0.05 + energy * 0.1, { high: 0.35 }, { range: [0, 0.45] }),
                    chromaticShift: this._customParam(0.1, { energy: 0.2, mid: 0.25 }, { range: [-1.5, 1.5] })
                };
                break;
            case 'drop':
                sequence.label = 'Drop - Quantum Surge';
                sequence.effects.system = 'quantum';
                sequence.effects.geometry = 'random';
                sequence.effects.rotation = 'chaos';
                sequence.effects.chaos = 0.65 * peak;
                sequence.effects.speed = 2.2 * peak;
                sequence.effects.colorShift = 'rainbow';
                sequence.effects.densityBoost = 18;
                sequence.effects.baseHue = 300;
                sequence.custom = {
                    cameraOrbit: this._customParam(0.42 * peak, { energy: 0.5, high: 0.6 }, { allowOverflow: true, range: [-Math.PI, Math.PI] }),
                    bloomStrength: this._customParam(0.85, { energy: 0.8, high: 0.9 }, { range: [0.3, 2.2] }),
                    particleFlow: this._customParam(0.6 + energy * 0.3, { high: 0.55 }, { range: [0.2, 1.6] }),
                    dimensionWarp: this._customParam(0.45 * peak, { bass: 0.6, energy: 0.4 }, { allowOverflow: true, range: [-1.8, 1.8] }),
                    glitchFactor: this._customParam(0.2 + peak * 0.3, { high: 0.6 }, { range: [0, 0.9] }),
                    chromaticShift: this._customParam(0.4, { energy: 0.35, mid: 0.25 }, { allowOverflow: true, range: [-2.2, 2.2] })
                };
                break;
            case 'breakdown':
                sequence.label = 'Breakdown - Holographic Drift';
                sequence.effects.system = 'holographic';
                sequence.effects.geometry = 'hold';
                sequence.effects.rotation = 'minimal';
                sequence.effects.chaos = 0.08 * intensity;
                sequence.effects.speed = 0.55 * intensity;
                sequence.effects.colorShift = 'slow';
                sequence.effects.densityBoost = -6;
                sequence.effects.baseHue = 160;
                sequence.custom = {
                    cameraOrbit: this._customParam(0.12, { mid: 0.2 }, { range: [-0.6, 0.6] }),
                    bloomStrength: this._customParam(0.3, { energy: 0.4 }, { range: [0, 1.4] }),
                    particleFlow: this._customParam(0.18, { high: 0.2 }, { range: [0, 0.9] }),
                    dimensionWarp: this._customParam(-0.25 * intensity, { bass: 0.25 }, { allowOverflow: true, range: [-1.4, 1.0] }),
                    glitchFactor: this._customParam(0.03, { high: 0.15 }, { range: [0, 0.3] }),
                    chromaticShift: this._customParam(-0.3, { energy: 0.15 }, { range: [-1.6, 1.6] })
                };
                break;
            case 'finale':
            default:
                sequence.label = 'Finale - Hyperdrive Bloom';
                sequence.effects.system = peak > 1.0 ? 'quantum' : 'faceted';
                sequence.effects.geometry = 'explosive';
                sequence.effects.rotation = 'extreme';
                sequence.effects.chaos = 0.5 * peak;
                sequence.effects.speed = 1.6 * intensity;
                sequence.effects.colorShift = 'fast';
                sequence.effects.densityBoost = 12;
                sequence.effects.baseHue = 250;
                sequence.custom = {
                    cameraOrbit: this._customParam(0.36 * intensity, { energy: 0.5, mid: 0.35 }, { allowOverflow: true, range: [-2.5, 2.5] }),
                    bloomStrength: this._customParam(0.7 + peak * 0.2, { energy: 0.6 }, { range: [0.25, 2.0] }),
                    particleFlow: this._customParam(0.45 + energy * 0.25, { high: 0.45 }, { range: [0.2, 1.5] }),
                    dimensionWarp: this._customParam(0.28 * peak, { bass: 0.5, energy: 0.4 }, { allowOverflow: true, range: [-1.8, 1.8] }),
                    glitchFactor: this._customParam(0.12 + peak * 0.15, { high: 0.45 }, { range: [0, 0.7] }),
                    chromaticShift: this._customParam(0.25, { energy: 0.25, mid: 0.3 }, { allowOverflow: true, range: [-2, 2] })
                };
                break;
        }

        return sequence;
    }

    _customParam(base, audioMap = {}, options = {}) {
        return {
            base,
            audioMap,
            range: options.range || null,
            allowOverflow: options.allowOverflow ?? false
        };
    }

    _createSectionProfile(rmsWindows) {
        if (!rmsWindows || rmsWindows.length === 0) {
            return {
                intro: 0.3,
                build: 0.5,
                drop: 0.8,
                breakdown: 0.4,
                finale: 0.7
            };
        }

        const total = rmsWindows.length;
        const quarter = Math.max(1, Math.floor(total / 4));
        const half = Math.max(1, Math.floor(total / 2));

        const intro = this._average(rmsWindows.slice(0, quarter));
        const build = this._average(rmsWindows.slice(quarter, half));
        const drop = this._average(rmsWindows.slice(half, half + quarter));
        const finale = this._average(rmsWindows.slice(total - quarter));
        const breakdown = this._average(rmsWindows.slice(half + quarter, total - quarter));

        const normalizer = (value) => this._clamp(this._mapRange(value, 0.05, 0.6, 0.3, 1.0), 0.2, 1.0);

        return {
            intro: normalizer(intro),
            build: normalizer(build),
            drop: normalizer(drop),
            breakdown: normalizer(breakdown),
            finale: normalizer(finale)
        };
    }

    _average(values) {
        if (!values || values.length === 0) return 0;
        return values.reduce((acc, value) => acc + value, 0) / values.length;
    }

    _mapRange(value, inMin, inMax, outMin, outMax) {
        if (inMax - inMin === 0) return outMin;
        const clamped = Math.max(inMin, Math.min(inMax, value));
        const normalized = (clamped - inMin) / (inMax - inMin);
        return outMin + normalized * (outMax - outMin);
    }

    _clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }
}
