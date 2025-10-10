import { GeometryLibrary } from '../geometry/GeometryLibrary.js';

export const DEFAULT_VARIATION_TARGET = 30;

export function resolveVariantCatalog(target = DEFAULT_VARIATION_TARGET, names) {
    const metadata = GeometryLibrary.getGeometryMetadata(names);
    let definitions = GeometryLibrary.buildVariationDefinitions(metadata, target);

    if (!definitions.length) {
        const fallbackNames = GeometryLibrary.baseGeometries.length
            ? [GeometryLibrary.baseGeometries[0]]
            : ['TETRAHEDRON'];
        const fallbackMetadata = GeometryLibrary.getGeometryMetadata(fallbackNames);
        definitions = GeometryLibrary.buildVariationDefinitions(fallbackMetadata, Math.max(1, target));
        return {
            metadata: fallbackMetadata,
            definitions
        };
    }

    return { metadata, definitions };
}

export function normalizeVariantIndex(index, definitions) {
    if (!Array.isArray(definitions) || !definitions.length) {
        return 0;
    }

    if (index < 0) {
        return 0;
    }

    if (index >= definitions.length) {
        return definitions.length - 1;
    }

    return index;
}

export function buildVariantParams(definition) {
    if (!definition) {
        return {
            geometryType: 0,
            name: 'Tetrahedron Lattice 1',
            density: 1.0,
            speed: 0.5,
            hue: 0,
            saturation: 0.8,
            intensity: 0.5,
            chaos: 0.1,
            morph: 0.2,
            rot4dXW: 0.0,
            rot4dYW: 0.0,
            rot4dZW: 0.0
        };
    }

    const geometryIndex = definition.geometryIndex ?? 0;
    const level = definition.level ?? 0;
    const baseParams = GeometryLibrary.getVariationParameters(geometryIndex, level);
    const rotations = computeDefaultRotations(geometryIndex, level);

    const density = Math.max(0.3, baseParams.gridDensity / 10);
    const saturation = Math.min(1, 0.75 + level * 0.06);
    const intensity = Math.min(1, 0.45 + level * 0.12);

    return {
        geometryType: geometryIndex,
        name: definition.displayLabel || `${definition.displayName || 'Geometry'} Level ${level + 1}`,
        density,
        speed: baseParams.speed,
        hue: baseParams.hue,
        saturation,
        intensity,
        chaos: baseParams.chaos,
        morph: baseParams.morphFactor,
        rot4dXW: rotations.rot4dXW,
        rot4dYW: rotations.rot4dYW,
        rot4dZW: rotations.rot4dZW
    };
}

function computeDefaultRotations(geometryIndex, level) {
    const normalizedLevel = typeof level === 'number' ? level : 0;
    const centeredLevel = normalizedLevel - 1.5;

    return {
        rot4dXW: centeredLevel * 0.45,
        rot4dYW: ((geometryIndex % 3) - 1) * 0.35,
        rot4dZW: (((geometryIndex + normalizedLevel) % 4) - 1.5) * 0.28
    };
}
