import { describe, expect, it } from 'vitest';
import { AdaptiveChoreographyDirector } from '../../src/ai/AdaptiveChoreographyDirector.js';

const createAudioBuffer = (samples, sampleRate = 8) => ({
    duration: samples.length / sampleRate,
    sampleRate,
    getChannelData: () => Float32Array.from(samples)
});

describe('AdaptiveChoreographyDirector', () => {
    it('exposes parameter definitions with expected names', () => {
        const director = new AdaptiveChoreographyDirector();
        const defs = director.getParameterDefinitions();
        const names = defs.map(def => def.name);

        expect(names).toEqual(expect.arrayContaining([
            'cameraOrbit',
            'bloomStrength',
            'glitchFactor',
            'particleFlow',
            'dimensionWarp',
            'chromaticShift'
        ]));
    });

    it('analyzes audio buffers into RMS windows and section profile', () => {
        const samples = [0.2, 0.5, -0.4, 0.1, 0.9, -0.3, 0.2, -0.1];
        const buffer = createAudioBuffer(samples, 4);
        const director = new AdaptiveChoreographyDirector();

        const analysis = director.analyzeAudioBuffer(buffer);

        expect(analysis.duration).toBeCloseTo(2.0);
        expect(analysis.sampleRate).toBe(4);
        expect(analysis.peak).toBeCloseTo(0.9);
        expect(Array.isArray(analysis.sections)).toBe(true);
        expect(analysis.sections.length).toBeGreaterThan(0);
        expect(Object.keys(analysis.sectionProfile)).toEqual(
            expect.arrayContaining(['intro', 'build', 'drop', 'breakdown', 'finale'])
        );
    });

    it('generates a full timeline that covers the supplied duration', () => {
        const director = new AdaptiveChoreographyDirector();
        const duration = 120;
        const analysis = {
            averageRMS: 0.35,
            peak: 0.85,
            sectionProfile: {
                intro: 0.3,
                build: 0.6,
                drop: 1.0,
                breakdown: 0.4,
                finale: 0.9
            }
        };

        const plan = director.generatePlan(duration, analysis);
        expect(plan.length).toBeGreaterThan(0);

        const firstSequence = plan[0];
        const lastSequence = plan[plan.length - 1];
        const totalSpan = lastSequence.time + lastSequence.duration;

        expect(firstSequence.time).toBeGreaterThanOrEqual(0);
        expect(totalSpan).toBeGreaterThanOrEqual(duration - 1);
        expect(plan.every(seq => typeof seq.custom === 'object')).toBe(true);
    });
});
