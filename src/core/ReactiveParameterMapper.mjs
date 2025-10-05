const ZERO_BANDS = Object.freeze({
    bass: 0,
    mid: 0,
    high: 0,
    energy: 0
});

function coerceNumber(value, fallback = 0) {
    return Number.isFinite(value) ? value : fallback;
}

function clamp(value, min, max) {
    if (min === undefined && max === undefined) {
        return value;
    }

    if (min === undefined) {
        return Math.min(value, max);
    }

    if (max === undefined) {
        return Math.max(value, min);
    }

    return Math.min(Math.max(value, min), max);
}

function wrapHue(value) {
    const wrapped = value % 360;
    return wrapped < 0 ? wrapped + 360 : wrapped;
}

function normalizeReactiveBands(bands) {
    if (!bands || typeof bands !== 'object') {
        return ZERO_BANDS;
    }

    const normalized = {
        bass: Math.max(0, coerceNumber(bands.bass)),
        mid: Math.max(0, coerceNumber(bands.mid)),
        high: Math.max(0, coerceNumber(bands.high)),
        energy: Math.max(0, coerceNumber(bands.energy))
    };

    if (!Number.isFinite(bands.energy)) {
        const average = (normalized.bass + normalized.mid + normalized.high) / 3;
        normalized.energy = average;
    }

    if (
        normalized.bass === 0 &&
        normalized.mid === 0 &&
        normalized.high === 0 &&
        normalized.energy === 0
    ) {
        return ZERO_BANDS;
    }

    return normalized;
}

function hasReactiveEnergy(bands) {
    return bands !== ZERO_BANDS && (
        bands.bass > 0 ||
        bands.mid > 0 ||
        bands.high > 0 ||
        bands.energy > 0
    );
}

function makeReturnPayload(values, deltas, bands, active) {
    return {
        values,
        deltas,
        bands,
        active
    };
}

export function computeBaseVisualizerReactivity(base = {}, reactiveBands) {
    const bands = normalizeReactiveBands(reactiveBands);
    const active = hasReactiveEnergy(bands);

    const gridDensityBase = clamp(coerceNumber(base.gridDensity), 0, 100);
    const hueBase = wrapHue(coerceNumber(base.hue));
    const intensityBase = clamp(coerceNumber(base.intensity, 0.6), 0, 1);

    const deltas = active
        ? {
            gridDensity: bands.bass * 30,
            hue: bands.mid * 60,
            intensity: bands.high * 0.4
        }
        : { gridDensity: 0, hue: 0, intensity: 0 };

    const values = {
        gridDensity: clamp(gridDensityBase + deltas.gridDensity, 0, 100),
        hue: wrapHue(hueBase + deltas.hue),
        intensity: clamp(intensityBase + deltas.intensity, 0, 1)
    };

    return makeReturnPayload(values, deltas, bands, active);
}

export function computePolychoraReactivity(base = {}, reactiveBands) {
    const bands = normalizeReactiveBands(reactiveBands);
    const active = hasReactiveEnergy(bands);

    const rot4dXWBase = coerceNumber(base.rot4dXW);
    const rot4dYWBase = coerceNumber(base.rot4dYW);
    const rot4dZWBase = coerceNumber(base.rot4dZW);
    const dimensionBase = coerceNumber(base.dimension, 3.8);
    const hueBase = wrapHue(coerceNumber(base.hue, 280));

    const deltas = active
        ? {
            rot4dXW: bands.bass * 3.0,
            rot4dYW: bands.mid * 2.5,
            rot4dZW: bands.high * 2.0,
            dimension: bands.energy * 0.5,
            hue: bands.bass * 60
        }
        : { rot4dXW: 0, rot4dYW: 0, rot4dZW: 0, dimension: 0, hue: 0 };

    const values = {
        rot4dXW: rot4dXWBase + deltas.rot4dXW,
        rot4dYW: rot4dYWBase + deltas.rot4dYW,
        rot4dZW: rot4dZWBase + deltas.rot4dZW,
        dimension: clamp(dimensionBase + deltas.dimension, undefined, 4),
        hue: wrapHue(hueBase + deltas.hue)
    };

    return makeReturnPayload(values, deltas, bands, active);
}

export function computePolychoraDNAReactivity(base = {}, reactiveBands) {
    const bands = normalizeReactiveBands(reactiveBands);
    const active = hasReactiveEnergy(bands);

    const rot4dXWBase = coerceNumber(base.rot4dXW);
    const rot4dYWBase = coerceNumber(base.rot4dYW);
    const rot4dZWBase = coerceNumber(base.rot4dZW);
    const morphFactorBase = coerceNumber(base.morphFactor);
    const hueBase = wrapHue(coerceNumber(base.hue));

    const deltas = active
        ? {
            rot4dXW: bands.bass * 2.0,
            rot4dYW: bands.mid * 1.5,
            rot4dZW: bands.high * 1.0,
            morphFactor: bands.bass * 0.5,
            hue: (bands.mid + bands.high) * 30
        }
        : { rot4dXW: 0, rot4dYW: 0, rot4dZW: 0, morphFactor: 0, hue: 0 };

    const values = {
        rot4dXW: rot4dXWBase + deltas.rot4dXW,
        rot4dYW: rot4dYWBase + deltas.rot4dYW,
        rot4dZW: rot4dZWBase + deltas.rot4dZW,
        morphFactor: morphFactorBase + deltas.morphFactor,
        hue: wrapHue(hueBase + deltas.hue)
    };

    return makeReturnPayload(values, deltas, bands, active);
}

export function computeQuantumReactivity(base = {}, reactiveBands) {
    const bands = normalizeReactiveBands(reactiveBands);
    const active = hasReactiveEnergy(bands);

    const gridDensityBase = clamp(coerceNumber(base.gridDensity), 0, 100);
    const morphFactorBase = coerceNumber(base.morphFactor);
    const hueBase = wrapHue(coerceNumber(base.hue));
    const chaosBase = coerceNumber(base.chaos);

    const deltas = active
        ? {
            gridDensity: bands.bass * 40,
            morphFactor: bands.mid * 1.2,
            hue: bands.high * 120,
            chaos: bands.energy * 0.6
        }
        : { gridDensity: 0, morphFactor: 0, hue: 0, chaos: 0 };

    const values = {
        gridDensity: clamp(gridDensityBase + deltas.gridDensity, 0, 100),
        morphFactor: clamp(morphFactorBase + deltas.morphFactor, undefined, 2),
        hue: wrapHue(hueBase + deltas.hue),
        chaos: clamp(chaosBase + deltas.chaos, undefined, 1)
    };

    return makeReturnPayload(values, deltas, bands, active);
}

export function computeHolographicReactivity(reactiveBands) {
    const bands = normalizeReactiveBands(reactiveBands);
    const active = hasReactiveEnergy(bands);

    const deltas = active
        ? {
            audioDensity: bands.bass * 1.5,
            audioMorph: bands.mid * 1.2,
            audioSpeed: bands.high * 0.8,
            audioChaos: bands.energy * 0.6,
            audioColor: bands.bass * 45
        }
        : { audioDensity: 0, audioMorph: 0, audioSpeed: 0, audioChaos: 0, audioColor: 0 };

    return makeReturnPayload({ ...deltas }, deltas, bands, active);
}

export const REACTIVE_EFFECT_SUMMARY = Object.freeze({
    baseVisualizer: Object.freeze({
        gridDensity: 'Bass increases geometric grid density by up to +30 (clamped to 0-100).',
        hue: 'Mid frequencies swing the hue wheel by ±60° per unit to reveal new palettes.',
        intensity: 'High frequencies brighten highlights by up to +0.4 (clamped to 1.0).'
    }),
    polychora: Object.freeze({
        rot4dXW: 'Bass rotates the polychoron through the XW plane (+3.0 per unit).',
        rot4dYW: 'Mid frequencies unlock rotation through the YW plane (+2.5 per unit).',
        rot4dZW: 'High frequencies accelerate rotation through the ZW plane (+2.0 per unit).',
        dimension: 'Overall audio energy deepens the 4D cross-section up to +0.5 (capped at dimension 4).',
        hue: 'Bass shifts spectral highlights by +60° per unit while respecting 0-360 wrapping.'
    }),
    polychoraDNA: Object.freeze({
        rot4dXW: 'Bass gently drives DNA XW rotation (+2.0 per unit) for smoother morphs.',
        rot4dYW: 'Mid tones animate DNA YW rotation (+1.5 per unit).',
        rot4dZW: 'High tones contribute to ZW shimmer (+1.0 per unit).',
        morphFactor: 'Bass widens the DNA morph channel by +0.5 per unit for breathing surfaces.',
        hue: 'Combined mid and high bands infuse color mutations (+30° per unit total).'
    }),
    quantum: Object.freeze({
        gridDensity: 'Bass condenses the quantum lattice by +40 (clamped to 100).',
        morphFactor: 'Mid frequencies bend the lattice through +1.2 morph gain (capped at 2).',
        hue: 'High frequencies rotate the energy spectrum by +120° per unit.',
        chaos: 'Overall energy injects chaos intensity up to +0.6 (capped at 1).'
    }),
    holographic: Object.freeze({
        audioDensity: 'Bass thickens volumetric layers (+1.5 per unit).',
        audioMorph: 'Mid content morphs the hologram geometry (+1.2 per unit).',
        audioSpeed: 'High frequencies accelerate scroll speed (+0.8 per unit).',
        audioChaos: 'Energy adds turbulence (+0.6 per unit).',
        audioColor: 'Bass pushes holographic hue shifts (+45° per unit).'
    })
});

export function getReactiveEffectSummary(systemKey) {
    if (!systemKey) {
        return null;
    }

    const normalized = String(systemKey).toLowerCase();

    if (normalized.includes('dna')) {
        return REACTIVE_EFFECT_SUMMARY.polychoraDNA;
    }

    if (normalized.includes('polychora')) {
        return REACTIVE_EFFECT_SUMMARY.polychora;
    }

    if (normalized.includes('quantum')) {
        return REACTIVE_EFFECT_SUMMARY.quantum;
    }

    if (normalized.includes('holographic')) {
        return REACTIVE_EFFECT_SUMMARY.holographic;
    }

    if (normalized.includes('visualizer')) {
        return REACTIVE_EFFECT_SUMMARY.baseVisualizer;
    }

    return null;
}
