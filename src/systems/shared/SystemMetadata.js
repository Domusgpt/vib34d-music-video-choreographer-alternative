/**
 * Shared system metadata definitions for VIB34D engines.
 * Provides descriptive text, accent colors, and adaptive control groups
 * so UI layers can render consistent panels across registry-managed systems.
 */

const DEFAULT_TIMELINE_HINTS = Object.freeze([
    'Timeline sequences establish base values that the audio engine continues to modulate in real-time.',
    'Use presets as a launch pad, then fine-tune durations, geometry, and parameter envelopes inside the editor.'
]);

const DEFAULT_TIMELINE_PRESETS = Object.freeze([
    {
        id: 'cinematic-switch-up',
        icon: '🎬',
        label: 'Cinematic Switch-Up',
        description: 'Auto-builds a multi-engine storyline with smooth hand-offs between systems.',
        action: { type: 'choreographer', method: 'generateDefaultChoreography' }
    },
    {
        id: 'blank-timeline',
        icon: '🧼',
        label: 'Blank Slate',
        description: 'Clear all sequences and start composing choreography from scratch.',
        action: { type: 'choreographer', method: 'clearTimeline' }
    }
]);

const DEFAULT_TIMELINE_ACTIONS = Object.freeze([
    {
        id: 'add-sequence',
        icon: '➕',
        label: 'Add Sequence',
        description: 'Insert a new sequence block using the current defaults.',
        action: { type: 'global', name: 'addSequence' }
    },
    {
        id: 'save-choreography',
        icon: '💾',
        label: 'Save Choreography',
        description: 'Download the current timeline as a JSON choreography file.',
        action: { type: 'global', name: 'saveChoreography' }
    },
    {
        id: 'load-choreography',
        icon: '📂',
        label: 'Load Choreography',
        description: 'Import a saved choreography JSON and merge it into the editor.',
        action: { type: 'global', name: 'loadChoreography' }
    },
    {
        id: 'toggle-editor',
        icon: '📝',
        label: 'Toggle Editor',
        description: 'Show or hide the detailed sequence editor panel.',
        action: { type: 'toggle', method: 'toggleTimelineEditor' }
    }
]);

const DEFAULT_TIMELINE_DESCRIPTOR = Object.freeze({
    presets: DEFAULT_TIMELINE_PRESETS,
    actions: DEFAULT_TIMELINE_ACTIONS,
    hints: DEFAULT_TIMELINE_HINTS
});

const DEFAULT_QUICK_ACTIONS = Object.freeze([
    {
        id: 'randomize-parameters',
        icon: '🎲',
        label: 'Randomize Parameters',
        description: 'Shuffle the active system controls for quick inspiration.',
        action: { type: 'global', name: 'randomizeAll' }
    },
    {
        id: 'randomize-everything',
        icon: '🌀',
        label: 'Randomize Everything',
        description: 'Randomize parameters and geometry in one tap.',
        action: { type: 'global', name: 'randomizeEverything' }
    },
    {
        id: 'reset-defaults',
        icon: '♻️',
        label: 'Reset to Defaults',
        description: 'Restore the system to its baseline parameter values.',
        action: { type: 'global', name: 'resetAll' }
    }
]);

const DEFAULT_CONTROL_GROUPS = Object.freeze({
    faceted: [
        {
            id: 'geometry',
            icon: '🔷',
            title: 'Geometry Sculpting',
            description: 'Shape prism density and morphing before layering extra energy.',
            parameters: [
                { parameter: 'gridDensity', label: 'Grid Density', displayId: 'densityValue', decimals: 1 },
                { parameter: 'morphFactor', label: 'Morph Factor', displayId: 'morphValue', decimals: 2 },
                { parameter: 'chaos', label: 'Chaos', displayId: 'chaosValue', decimals: 2 }
            ]
        },
        {
            id: 'motion',
            icon: '⚡',
            title: 'Motion & Energy',
            description: 'Tune pacing and overall energy before audio boosts amplify the scene.',
            parameters: [
                { parameter: 'speed', label: 'Playback Speed', displayId: 'speedValue', decimals: 2 },
                { parameter: 'intensity', label: 'Intensity', displayId: 'intensityValue', decimals: 2 }
            ]
        },
        {
            id: 'color',
            icon: '🌈',
            title: 'Color Weave',
            description: 'Control the base hue and saturation that palettes blend around.',
            parameters: [
                { parameter: 'hue', label: 'Hue', displayId: 'hueValue', format: 'degrees' },
                { parameter: 'saturation', label: 'Saturation', displayId: 'saturationValue', decimals: 2 }
            ]
        },
        {
            id: 'rotation',
            icon: '🌀',
            title: '4D Rotation',
            description: 'Subtle 4D pivots that audio envelopes can stretch for dramatic reveals.',
            parameters: [
                { parameter: 'rot4dXW', label: 'X↔W Axis', displayId: 'xwValue', decimals: 2 },
                { parameter: 'rot4dYW', label: 'Y↔W Axis', displayId: 'ywValue', decimals: 2 },
                { parameter: 'rot4dZW', label: 'Z↔W Axis', displayId: 'zwValue', decimals: 2 }
            ]
        }
    ],
    quantum: [
        {
            id: 'lattice',
            icon: '🌌',
            title: 'Lattice Sculpting',
            description: 'Dial how dense and fluid the lattice field feels on each beat.',
            parameters: [
                { parameter: 'gridDensity', label: 'Node Density', displayId: 'densityValue', decimals: 1 },
                { parameter: 'morphFactor', label: 'Morph Factor', displayId: 'morphValue', decimals: 2 },
                { parameter: 'chaos', label: 'Chaos Scatter', displayId: 'chaosValue', decimals: 2 }
            ]
        },
        {
            id: 'motion',
            icon: '🎛️',
            title: 'Orbital Motion',
            description: 'Balance sweeping arcs with the perceived velocity of volumetric layers.',
            parameters: [
                { parameter: 'speed', label: 'Orbit Speed', displayId: 'speedValue', decimals: 2 },
                { parameter: 'intensity', label: 'Lattice Intensity', displayId: 'intensityValue', decimals: 2 }
            ]
        },
        {
            id: 'color',
            icon: '✨',
            title: 'Spectral Bloom',
            description: 'Anchor the hue center before spectral centroid sweeps add movement.',
            parameters: [
                { parameter: 'hue', label: 'Hue Center', displayId: 'hueValue', format: 'degrees' },
                { parameter: 'saturation', label: 'Saturation', displayId: 'saturationValue', decimals: 2 }
            ]
        },
        {
            id: 'rotation',
            icon: '🧭',
            title: 'Hyper Rotation',
            description: 'Use gentle 4D drifts to expose parallax and stereo depth.',
            parameters: [
                { parameter: 'rot4dXW', label: 'X↔W Axis', displayId: 'xwValue', decimals: 2 },
                { parameter: 'rot4dYW', label: 'Y↔W Axis', displayId: 'ywValue', decimals: 2 },
                { parameter: 'rot4dZW', label: 'Z↔W Axis', displayId: 'zwValue', decimals: 2 }
            ]
        }
    ],
    holographic: [
        {
            id: 'layers',
            icon: '✨',
            title: 'Layer Density',
            description: 'Balance holographic sheet counts with morphing shimmer.',
            parameters: [
                { parameter: 'gridDensity', label: 'Layer Count', displayId: 'densityValue', decimals: 1 },
                { parameter: 'morphFactor', label: 'Morph Flow', displayId: 'morphValue', decimals: 2 },
                { parameter: 'chaos', label: 'Chaos Flicker', displayId: 'chaosValue', decimals: 2 }
            ]
        },
        {
            id: 'motion',
            icon: '💫',
            title: 'Ripple Motion',
            description: 'Control ripple cadence and brightness before reactivity takes over.',
            parameters: [
                { parameter: 'speed', label: 'Ripple Speed', displayId: 'speedValue', decimals: 2 },
                { parameter: 'intensity', label: 'Glow Intensity', displayId: 'intensityValue', decimals: 2 }
            ]
        },
        {
            id: 'color',
            icon: '🌈',
            title: 'Diffraction Color',
            description: 'Dial the hologram tint and saturation baseline.',
            parameters: [
                { parameter: 'hue', label: 'Hue', displayId: 'hueValue', format: 'degrees' },
                { parameter: 'saturation', label: 'Saturation', displayId: 'saturationValue', decimals: 2 }
            ]
        },
        {
            id: 'rotation',
            icon: '🌀',
            title: 'Multi-plane Twist',
            description: 'Fine tune cross-plane twists that emphasise parallax streaks.',
            parameters: [
                { parameter: 'rot4dXW', label: 'X↔W Axis', displayId: 'xwValue', decimals: 2 },
                { parameter: 'rot4dYW', label: 'Y↔W Axis', displayId: 'ywValue', decimals: 2 },
                { parameter: 'rot4dZW', label: 'Z↔W Axis', displayId: 'zwValue', decimals: 2 }
            ]
        }
    ],
    polychora: [
        {
            id: 'dimension',
            icon: '🔮',
            title: 'Dimensional Shift',
            description: 'Blend between projected 3D facets and deeper 4D tessellations.',
            parameters: [
                { parameter: 'dimension', label: 'Dimension Level', displayId: 'dimensionValue', decimals: 2 },
                { parameter: 'gridDensity', label: 'Facet Density', displayId: 'densityValue', decimals: 1 }
            ]
        },
        {
            id: 'rotation',
            icon: '🧭',
            title: '4D Rotation',
            description: 'Core rotational axes that audio envelopes will emphasise.',
            parameters: [
                { parameter: 'rot4dXW', label: 'X↔W Axis', displayId: 'xwValue', decimals: 2 },
                { parameter: 'rot4dYW', label: 'Y↔W Axis', displayId: 'ywValue', decimals: 2 },
                { parameter: 'rot4dZW', label: 'Z↔W Axis', displayId: 'zwValue', decimals: 2 }
            ]
        },
        {
            id: 'color',
            icon: '🌌',
            title: 'Hyper Color',
            description: 'Tune baseline color before spectra refract through higher dimensions.',
            parameters: [
                { parameter: 'hue', label: 'Hue', displayId: 'hueValue', format: 'degrees' },
                { parameter: 'saturation', label: 'Saturation', displayId: 'saturationValue', decimals: 2 },
                { parameter: 'intensity', label: 'Intensity', displayId: 'intensityValue', decimals: 2 }
            ]
        }
    ]
});

export const DEFAULT_SYSTEM_METADATA = Object.freeze({
    faceted: {
        key: 'faceted',
        title: 'Faceted Prism Engine',
        description: 'Crystal prisms pulse with bass-driven density while mid-band morphing sculpts razor-sharp silhouettes.',
        audioFocus: 'Bass boosts grid density, mids morph facets, highs add chaos sparkle.',
        bestFor: 'Crisp geometric edits and export-ready sequences.',
        tags: ['Geometric', 'Prismatic', 'Export-ready'],
        accentColor: '#00faff',
        supportsGeometryGrid: true,
        supportsTimeline: true,
        controlGroups: DEFAULT_CONTROL_GROUPS.faceted,
        quickActions: DEFAULT_QUICK_ACTIONS,
        timeline: DEFAULT_TIMELINE_DESCRIPTOR
    },
    quantum: {
        key: 'quantum',
        title: 'Quantum Lattice Engine',
        description: 'Volumetric lattice fields orbit through 3D space, bending with spectral energy and stereo depth.',
        audioFocus: 'Spectral centroid sweeps hue while flux tensions the lattice.',
        bestFor: 'Atmospheric sci-fi moments and cinematic build-ups.',
        tags: ['Volumetric', 'Spatial', 'Spectral'],
        accentColor: '#8b6bff',
        supportsGeometryGrid: true,
        supportsTimeline: true,
        controlGroups: DEFAULT_CONTROL_GROUPS.quantum,
        quickActions: DEFAULT_QUICK_ACTIONS,
        timeline: DEFAULT_TIMELINE_DESCRIPTOR
    },
    holographic: {
        key: 'holographic',
        title: 'Holographic Wave Engine',
        description: 'Layered holograms ripple with diffused color diffraction and multi-plane bloom.',
        audioFocus: 'RMS drives intensity while high-mids shimmer across the layers.',
        bestFor: 'Performance overlays and light-trail choreography.',
        tags: ['Layered', 'Luminous', 'Performance'],
        accentColor: '#ff6bff',
        supportsGeometryGrid: true,
        supportsTimeline: true,
        controlGroups: DEFAULT_CONTROL_GROUPS.holographic,
        quickActions: DEFAULT_QUICK_ACTIONS,
        timeline: DEFAULT_TIMELINE_DESCRIPTOR
    },
    polychora: {
        key: 'polychora',
        title: 'Polychora 4D Engine',
        description: 'High-dimensional polytopes rotate through projected space with evolving tessellation.',
        audioFocus: 'Bass anchors rotation speed as spectral flux fractures the geometry.',
        bestFor: 'Future-forward narratives and math-inspired sequences.',
        tags: ['4D', 'Experimental', 'Immersive'],
        accentColor: '#7cfcc5',
        supportsGeometryGrid: true,
        supportsTimeline: true,
        controlGroups: DEFAULT_CONTROL_GROUPS.polychora,
        quickActions: DEFAULT_QUICK_ACTIONS,
        timeline: DEFAULT_TIMELINE_DESCRIPTOR
    }
});

function mergeUniqueArrays(...arrays) {
    const seen = new Set();
    const result = [];
    arrays.forEach(arr => {
        if (!Array.isArray(arr)) return;
        arr.forEach(value => {
            if (value === undefined || value === null) return;
            const key = String(value).trim();
            if (!key || seen.has(key.toLowerCase())) return;
            seen.add(key.toLowerCase());
            result.push(key);
        });
    });
    return result;
}

function cloneParameterConfig(config = {}) {
    if (!config || typeof config !== 'object') {
        return null;
    }
    const parameter = config.parameter || config.name || config.id;
    if (!parameter) {
        return null;
    }
    return {
        parameter,
        label: config.label || config.title || parameter,
        icon: config.icon || null,
        displayId: config.displayId || `${parameter}Value`,
        min: config.min,
        max: config.max,
        step: config.step,
        decimals: config.decimals,
        format: config.format,
        unit: config.unit,
        hint: config.hint,
        defaultValue: config.defaultValue
    };
}

function cloneControlGroup(group = {}) {
    const parameters = Array.isArray(group.parameters)
        ? group.parameters.map(cloneParameterConfig).filter(Boolean)
        : [];

    return {
        id: group.id || group.key || group.title || '',
        title: group.title || group.name || '',
        icon: group.icon || null,
        description: group.description || '',
        parameters
    };
}

function cloneActionHandler(handler) {
    if (!handler) {
        return null;
    }

    if (typeof handler === 'function' || typeof handler === 'string') {
        return handler;
    }

    if (typeof handler === 'object') {
        return {
            type: handler.type,
            name: handler.name,
            method: handler.method,
            args: Array.isArray(handler.args) ? [...handler.args] : undefined,
            requireMode: handler.requireMode,
            event: handler.event,
            payload: handler.payload,
            toggle: handler.toggle
        };
    }

    return null;
}

function cloneActionDescriptor(action = {}) {
    const handler = cloneActionHandler(action.action ?? action.handler ?? null);
    const label = action.label || action.title || null;

    if (!label || !handler) {
        return null;
    }

    return {
        id: action.id || action.key || '',
        label,
        icon: action.icon || null,
        description: action.description || action.hint || '',
        action: handler,
        kind: action.kind || action.category || null,
        size: action.size || null,
        disabled: action.disabled === true,
        requireMode: action.requireMode
    };
}

function mergeActionList(baseActions = [], overrideActions = []) {
    const result = new Map();

    const push = (actions) => {
        actions.forEach(action => {
            const cloned = cloneActionDescriptor(action);
            if (!cloned) {
                return;
            }
            const key = cloned.id || cloned.label;
            result.set(key, cloned);
        });
    };

    if (Array.isArray(baseActions)) {
        push(baseActions);
    }

    if (Array.isArray(overrideActions)) {
        push(overrideActions);
    }

    return Array.from(result.values());
}

function cloneHints(hints, fallback = []) {
    const source = Array.isArray(hints) && hints.length ? hints : fallback;
    return source
        .map(hint => {
            if (typeof hint === 'string') {
                return hint.trim();
            }
            if (hint && typeof hint === 'object' && typeof hint.text === 'string') {
                return hint.text.trim();
            }
            return null;
        })
        .filter(Boolean);
}

function cloneTimelineDescriptor(descriptor = {}) {
    const presets = mergeActionList(DEFAULT_TIMELINE_DESCRIPTOR.presets, descriptor.presets);
    const actions = mergeActionList(DEFAULT_TIMELINE_DESCRIPTOR.actions, descriptor.actions);
    const hints = cloneHints(descriptor.hints, DEFAULT_TIMELINE_DESCRIPTOR.hints);

    return {
        presets,
        actions,
        hints
    };
}

function mergeControlGroups(baseGroups = [], overrideGroups) {
    const source = Array.isArray(overrideGroups) && overrideGroups.length
        ? overrideGroups
        : baseGroups;
    return source.map(cloneControlGroup);
}

/**
 * Resolve a descriptor for a given system key, merging overrides with defaults
 * and cloning nested structures to avoid shared references.
 */
export function resolveSystemDescriptor(key, overrides = {}) {
    const normalizedKey = typeof key === 'string' ? key.toLowerCase() : '';
    const base = DEFAULT_SYSTEM_METADATA[normalizedKey] || {};

    const combinedTimeline = {
        presets: [
            ...(Array.isArray(base.timeline?.presets) ? base.timeline.presets : []),
            ...(Array.isArray(overrides.timeline?.presets) ? overrides.timeline.presets : [])
        ],
        actions: [
            ...(Array.isArray(base.timeline?.actions) ? base.timeline.actions : []),
            ...(Array.isArray(overrides.timeline?.actions) ? overrides.timeline.actions : [])
        ],
        hints: overrides.timeline?.hints ?? base.timeline?.hints
    };

    const quickActions = mergeActionList(
        Array.isArray(base.quickActions) ? base.quickActions : DEFAULT_QUICK_ACTIONS,
        overrides.quickActions
    );

    const descriptor = {
        key: normalizedKey || overrides.key || base.key || '',
        title: overrides.title || base.title || '',
        panelTitle: overrides.panelTitle || base.panelTitle || overrides.title || base.title || '',
        panelSubtitle: overrides.panelSubtitle || base.panelSubtitle || '',
        description: overrides.description || base.description || '',
        audioFocus: overrides.audioFocus || base.audioFocus || '',
        visualFocus: overrides.visualFocus || base.visualFocus || '',
        bestFor: overrides.bestFor || base.bestFor || '',
        accentColor: overrides.accentColor || base.accentColor || '#00faff',
        supportsGeometryGrid: overrides.supportsGeometryGrid ?? base.supportsGeometryGrid ?? true,
        supportsTimeline: overrides.supportsTimeline ?? base.supportsTimeline ?? false,
        tags: mergeUniqueArrays(base.tags, overrides.tags),
        keywords: mergeUniqueArrays(base.keywords, overrides.keywords),
        moods: mergeUniqueArrays(base.moods, overrides.moods),
        capabilities: mergeUniqueArrays(base.capabilities, overrides.capabilities),
        controlGroups: mergeControlGroups(base.controlGroups, overrides.controlGroups),
        quickActions,
        timeline: cloneTimelineDescriptor(combinedTimeline)
    };

    return descriptor;
}
