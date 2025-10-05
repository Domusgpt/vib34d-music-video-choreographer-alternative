import test from 'node:test';
import assert from 'node:assert/strict';
import {
    computeBaseVisualizerReactivity,
    computePolychoraReactivity,
    computePolychoraDNAReactivity,
    computeQuantumReactivity,
    computeHolographicReactivity,
    REACTIVE_EFFECT_SUMMARY,
    getReactiveEffectSummary
} from '../src/core/ReactiveParameterMapper.mjs';

const assertApprox = (actual, expected, message) => {
    const difference = Math.abs(actual - expected);
    assert.ok(
        difference <= 1e-6,
        message || `expected ${actual} to be approximately ${expected} (difference ${difference})`
    );
};

test('base visualizer audio mapping clamps density and wraps hue', () => {
    const result = computeBaseVisualizerReactivity(
        { gridDensity: 95, hue: 350, intensity: 0.9 },
        { bass: 1.2, mid: 0.6, high: 0.75, energy: 0.5 }
    );

    assert.equal(result.active, true);
    assert.equal(result.values.gridDensity, 100);
    assert.equal(result.values.hue, 26);
    assert.equal(result.values.intensity, 1);
    assert.equal(result.deltas.gridDensity, 36);
    assert.equal(result.deltas.hue, 36);
    assertApprox(result.deltas.intensity, 0.3);
});

test('polychora reactivity emphasises each 4D rotation axis', () => {
    const result = computePolychoraReactivity(
        { rot4dXW: 0.2, rot4dYW: -0.1, rot4dZW: 0.3, dimension: 3.6, hue: 340 },
        { bass: 0.8, mid: 0.5, high: 0.4, energy: 0.9 }
    );

    assertApprox(result.values.rot4dXW, 2.6);
    assertApprox(result.values.rot4dYW, 1.15);
    assertApprox(result.values.rot4dZW, 1.1);
    assert.equal(result.values.dimension, 4);
    assert.equal(result.values.hue, 28);
    assertApprox(result.deltas.rot4dXW, 2.4);
    assertApprox(result.deltas.rot4dYW, 1.25);
    assertApprox(result.deltas.rot4dZW, 0.8);
    assertApprox(result.deltas.dimension, 0.45);
});

test('polychora DNA mapping keeps morphing smooth', () => {
    const result = computePolychoraDNAReactivity(
        { rot4dXW: 0, rot4dYW: 0, rot4dZW: 0, morphFactor: 0.25, hue: 300 },
        { bass: 0.6, mid: 0.3, high: 0.4, energy: 0.5 }
    );

    assert.equal(result.values.rot4dXW, 1.2);
    assertApprox(result.values.rot4dYW, 0.45);
    assertApprox(result.values.rot4dZW, 0.4);
    assert.equal(result.values.morphFactor, 0.55);
    assert.equal(result.values.hue, 321);
});

test('quantum mapping clamps morph factor and chaos contributions', () => {
    const result = computeQuantumReactivity(
        { gridDensity: 80, morphFactor: 1.1, hue: 10, chaos: 0.5 },
        { bass: 0.7, mid: 1.0, high: 0.6, energy: 0.8 }
    );

    assert.equal(result.values.gridDensity, 100);
    assert.equal(result.values.morphFactor, 2);
    assert.equal(result.values.hue, 82);
    assert.equal(result.values.chaos, 0.98);
    assert.equal(result.deltas.gridDensity, 28);
    assert.equal(result.deltas.morphFactor, 1.2);
    assert.equal(result.deltas.hue, 72);
    assert.equal(result.deltas.chaos, 0.48);
});

test('holographic mapping reports zero when reactivity disabled', () => {
    const silent = computeHolographicReactivity(null);
    assert.equal(silent.active, false);
    assert.deepEqual(silent.values, {
        audioDensity: 0,
        audioMorph: 0,
        audioSpeed: 0,
        audioChaos: 0,
        audioColor: 0
    });

    const reactive = computeHolographicReactivity({ bass: 0.5, mid: 0.4, high: 0.2, energy: 0.3 });
    assert.equal(reactive.active, true);
    assert.equal(reactive.values.audioDensity, 0.75);
    assert.equal(reactive.values.audioMorph, 0.48);
    assertApprox(reactive.values.audioSpeed, 0.16);
    assertApprox(reactive.values.audioChaos, 0.18);
    assert.equal(reactive.values.audioColor, 22.5);
});

test('effect summary documents 4D axis behaviour for polychora family', () => {
    const summary = getReactiveEffectSummary('Polychora');
    assert.ok(summary.rot4dXW.includes('XW'));
    assert.ok(summary.rot4dYW.includes('YW'));
    assert.ok(summary.rot4dZW.includes('ZW'));
    assert.ok(REACTIVE_EFFECT_SUMMARY.polychoraDNA.morphFactor.includes('morph'));
});
