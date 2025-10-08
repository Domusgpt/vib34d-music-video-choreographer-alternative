/**
 * VIB34D UI Handlers Module
 * Parameter controls, randomization, reset functions, and interactivity management
 * Extracted from monolithic index.html for clean architecture
 */

import { GeometryLibrary } from '../../src/geometry/GeometryLibrary.js';
import { COLOR_MODES, GRADIENT_TYPES, COLOR_PALETTES } from '../../src/color/ColorSystem.js';
import {
    getActiveEngine,
    getActiveParameterManager,
    getActiveSystemKey,
    onRegistryChange,
    getSystemMetadata,
    listRegisteredSystems
} from '../../src/systems/shared/SystemAccess.js';
import { resolveSystemDescriptor } from '../../src/systems/shared/SystemMetadata.js';

const CONTROL_PANEL_IDS = {
    panel: 'controlPanel',
    title: 'controlPanelTitle',
    groups: 'dynamicControlGroups',
    geometrySection: 'geometrySection',
    timelineSection: 'timelineSection',
    timelineToggle: 'timelineEditorToggle',
    timelinePresets: 'timelinePresetList',
    timelineHints: 'timelineHints',
    timelineEditorActions: 'timelineEditorActions',
    actionsContainer: 'controlActionList'
};

let controlShellElements = {
    panel: null,
    title: null,
    groups: null,
    geometrySection: null,
    timelineSection: null,
    timelineToggle: null,
    timelinePresets: null,
    timelineHints: null,
    timelineEditorActions: null,
    actionsContainer: null
};
let controlShellReady = false;
let controlShellInitialized = false;

let systemInfoElements = {
    container: null,
    title: null,
    description: null,
    tags: null
};
let systemInfoPanelReady = false;
let pendingSystemDescriptor = null;

function ensureControlShellElements() {
    if (controlShellReady) {
        return true;
    }

    if (typeof document === 'undefined') {
        return false;
    }

    const panel = document.getElementById(CONTROL_PANEL_IDS.panel);
    if (!panel) {
        return false;
    }

    controlShellElements = {
        panel,
        title: document.getElementById(CONTROL_PANEL_IDS.title),
        groups: document.getElementById(CONTROL_PANEL_IDS.groups),
        geometrySection: document.getElementById(CONTROL_PANEL_IDS.geometrySection),
        timelineSection: document.getElementById(CONTROL_PANEL_IDS.timelineSection),
        timelineToggle: document.getElementById(CONTROL_PANEL_IDS.timelineToggle),
        timelinePresets: document.getElementById(CONTROL_PANEL_IDS.timelinePresets),
        timelineHints: document.getElementById(CONTROL_PANEL_IDS.timelineHints),
        timelineEditorActions: document.getElementById(CONTROL_PANEL_IDS.timelineEditorActions),
        actionsContainer: document.getElementById(CONTROL_PANEL_IDS.actionsContainer)
    };

    geometryGridElement = document.getElementById('geometryGrid');
    if (geometryGridElement) {
        geometryGridSystem = getSystemKeyFallback();
        if (!geometrySubscriptionCleanup) {
            ensureGeometrySubscription();
        }
        renderGeometryGrid();
    }

    controlShellReady = true;
    return true;
}

function ensureSystemInfoElements() {
    if (systemInfoPanelReady) {
        return true;
    }

    if (typeof document === 'undefined') {
        return false;
    }

    const container = document.getElementById('systemInfo');
    const title = document.getElementById('systemName');
    const description = document.getElementById('systemDescription');
    const tags = document.getElementById('systemTags');

    if (!container || !title || !description || !tags) {
        return false;
    }

    systemInfoElements = { container, title, description, tags };
    systemInfoPanelReady = true;
    return true;
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function applyControlPanelAccent(accentColor) {
    if (!ensureControlShellElements()) {
        return;
    }

    const panel = controlShellElements.panel;
    if (!panel) {
        return;
    }

    const accent = typeof accentColor === 'string' && accentColor.trim()
        ? accentColor.trim()
        : '#00ffff';

    panel.style.setProperty('--control-accent', accent);
    const soft = hexToRgba(accent, 0.25) || 'rgba(0, 255, 255, 0.25)';
    const strong = hexToRgba(accent, 0.6) || 'rgba(0, 255, 255, 0.6)';
    panel.style.setProperty('--control-accent-soft', soft);
    panel.style.setProperty('--control-accent-strong', strong);
}

function toTagList(...sources) {
    const tags = [];
    const seen = new Set();

    const push = (tag) => {
        if (!tag || typeof tag !== 'string') return;
        const normalized = tag.trim();
        if (!normalized) return;
        const key = normalized.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        tags.push(normalized);
    };

    sources.forEach(source => {
        if (!source) return;
        if (Array.isArray(source)) {
            source.forEach(item => push(typeof item === 'string' ? item : String(item)));
        } else if (typeof source === 'string') {
            source.split(/[|,]/).forEach(part => push(part));
        }
    });

    return tags;
}

function hexToRgba(hex, alpha = 1) {
    if (typeof hex !== 'string') {
        return null;
    }

    const normalized = hex.trim();
    const shortMatch = normalized.match(/^#([0-9a-f]{3})$/i);
    const longMatch = normalized.match(/^#([0-9a-f]{6})$/i);

    if (!shortMatch && !longMatch) {
        return null;
    }

    let r;
    let g;
    let b;

    if (longMatch) {
        const value = longMatch[1];
        r = parseInt(value.slice(0, 2), 16);
        g = parseInt(value.slice(2, 4), 16);
        b = parseInt(value.slice(4, 6), 16);
    } else {
        const value = shortMatch[1];
        r = parseInt(value[0] + value[0], 16);
        g = parseInt(value[1] + value[1], 16);
        b = parseInt(value[2] + value[2], 16);
    }

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function applySystemAccent(accentColor) {
    if (!systemInfoPanelReady && !ensureSystemInfoElements()) {
        return;
    }

    const hasAccent = typeof accentColor === 'string' && accentColor.trim().length > 0;
    const container = systemInfoElements.container;
    const title = systemInfoElements.title;
    const tagsContainer = systemInfoElements.tags;

    if (container) {
        if (hasAccent) {
            container.style.setProperty('--system-accent', accentColor);
        } else {
            container.style.removeProperty('--system-accent');
        }
    }

    if (title) {
        if (hasAccent) {
            title.style.color = accentColor;
        } else {
            title.style.removeProperty('color');
        }
    }

    if (tagsContainer) {
        const accentBackground = hasAccent ? (hexToRgba(accentColor, 0.14) || 'rgba(0, 255, 255, 0.12)') : '';
        tagsContainer.querySelectorAll('.system-tag').forEach(tag => {
            if (hasAccent) {
                tag.style.borderColor = accentColor;
                tag.style.color = accentColor;
                tag.style.backgroundColor = accentBackground;
            } else {
                tag.style.removeProperty('border-color');
                tag.style.removeProperty('color');
                tag.style.removeProperty('background-color');
            }
        });
    }
}

function renderSystemInfo(key, metadata) {
    if (!ensureSystemInfoElements()) {
        pendingSystemDescriptor = { key, metadata };
        return;
    }

    const normalizedKey = typeof key === 'string' ? key.toLowerCase() : '';
    const descriptor = resolveSystemDescriptor(normalizedKey, metadata || {});

    const systemTitle = descriptor.title || formatColorLabel(normalizedKey || 'Active System');
    const descriptionSegments = [];

    if (descriptor.description) {
        descriptionSegments.push(descriptor.description.trim());
    }
    if (descriptor.audioFocus) {
        descriptionSegments.push(`Audio focus: ${descriptor.audioFocus.trim()}.`);
    }
    if (descriptor.visualFocus) {
        descriptionSegments.push(`Visual focus: ${descriptor.visualFocus.trim()}.`);
    }
    if (descriptor.bestFor) {
        descriptionSegments.push(`Best for ${descriptor.bestFor.trim()}.`);
    }

    const descriptionText = descriptionSegments.join(' ').replace(/\s+\./g, '.').replace(/\.\./g, '.');

    if (systemInfoElements.title) {
        systemInfoElements.title.textContent = systemTitle;
    }
    if (systemInfoElements.description) {
        systemInfoElements.description.textContent = descriptionText || 'Explore each visualization system to see its strengths.';
    }

    if (systemInfoElements.tags) {
        const tags = toTagList(descriptor.tags, descriptor.keywords, descriptor.moods);
        if (tags.length) {
            systemInfoElements.tags.innerHTML = tags
                .map(tag => `<span class="system-tag">${escapeHtml(tag)}</span>`)
                .join('');
        } else {
            systemInfoElements.tags.innerHTML = '<span class="system-tag">Live Reactive</span>';
        }
    }

    applySystemAccent(descriptor.accentColor || descriptor.highlightColor || null);
    applyControlPanelAccent(descriptor.accentColor || descriptor.highlightColor || null);

    if (systemInfoElements.container) {
        systemInfoElements.container.dataset.systemKey = descriptor.key || normalizedKey || '';
    }

    const statusElement = document.getElementById('status');
    if (statusElement) {
        const currentStatus = statusElement.textContent || '';
        if (!currentStatus.trim() || /select a mode/i.test(currentStatus) || /system ready/i.test(currentStatus)) {
            statusElement.textContent = `System ready: ${systemTitle}`;
        }
    }
}

function refreshSystemInfoPanel() {
    const key = getSystemKeyFallback();
    const metadata = getSystemMetadata(key);
    renderSystemInfo(key, metadata);
    renderAdaptiveControlPanel(key, metadata);
}

function syncSystemButtonTooltips() {
    if (typeof document === 'undefined') {
        return;
    }

    const descriptors = listRegisteredSystems();
    if (!descriptors.length) {
        return;
    }

    const metadataMap = new Map();
    descriptors.forEach(({ key, metadata }) => {
        if (!key) return;
        metadataMap.set(key, resolveSystemDescriptor(key, metadata || {}));
    });

    document.querySelectorAll('.system-btn').forEach(btn => {
        const key = btn.dataset.system;
        if (!key) return;
        const meta = metadataMap.get(key) || resolveSystemDescriptor(key);
        if (!meta) return;

        const tooltipSegments = [];
        if (meta.description) {
            tooltipSegments.push(meta.description);
        }
        if (meta.bestFor) {
            tooltipSegments.push(`Best for ${meta.bestFor}.`);
        }

        if (tooltipSegments.length) {
            btn.title = tooltipSegments.join(' ');
        }
    });
}

function initializeSystemInfoPanel() {
    if (!ensureSystemInfoElements()) {
        return;
    }

    let activeKey = getSystemKeyFallback();
    let activeMetadata = getSystemMetadata(activeKey);

    if (pendingSystemDescriptor) {
        const { key, metadata } = pendingSystemDescriptor;
        pendingSystemDescriptor = null;
        renderSystemInfo(key, metadata);
        activeKey = key || activeKey;
        activeMetadata = metadata || activeMetadata;
    } else {
        renderSystemInfo(activeKey, activeMetadata);
    }

    syncSystemButtonTooltips();
    initializeControlShell();
    renderAdaptiveControlPanel(activeKey, activeMetadata);
}

if (typeof document !== 'undefined') {
    const initSystemPanel = () => initializeSystemInfoPanel();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSystemPanel, { once: true });
    } else {
        setTimeout(initSystemPanel, 0);
    }
}

onRegistryChange(({ key, metadata }) => {
    renderSystemInfo(key, metadata);
    syncSystemButtonTooltips();
    renderAdaptiveControlPanel(key, metadata);
});

// Global state variables
let audioEnabled = window.audioEnabled || false;
let interactivityEnabled = false;

// Geometry state & helpers
const LEGACY_SYSTEM_KEYS = ['faceted', 'quantum', 'holographic', 'polychora'];
let cachedGeometryNames = sanitizeGeometryList(GeometryLibrary.getGeometryNames());
let geometrySubscriptionCleanup = null;
let geometryGridElement = null;
let geometryGridSystem = getActiveSystemKey() || 'faceted';

const COLOR_MODE_OPTIONS = Array.from(COLOR_MODES);
const GRADIENT_TYPE_OPTIONS = Array.from(GRADIENT_TYPES);
const COLOR_PALETTE_OPTIONS = Object.keys(COLOR_PALETTES);
const getSystemKeyFallback = () => getActiveSystemKey() || window.currentSystem || 'faceted';
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

let colorControlsInitialized = false;
let gradientPreviewElement = null;
let gradientPreviewLoopActive = false;
let colorModeSelect = null;
let colorPaletteSelect = null;
let gradientTypeSelect = null;
let gradientSpeedInput = null;
let gradientSpeedValueLabel = null;
let colorReactivityInput = null;
let colorReactivityValueLabel = null;

function sanitizeGeometryList(names = []) {
    const seen = new Set();
    const sanitized = [];

    names.forEach(name => {
        const normalized = GeometryLibrary.normalizeName(name);
        if (!normalized) return;
        const key = normalized.toUpperCase();
        if (seen.has(key)) return;
        seen.add(key);
        sanitized.push(normalized);
    });

    return sanitized;
}

function mergeGeometrySources(primary = [], secondary = []) {
    const merged = [];
    const seen = new Set();

    const pushList = list => {
        list.forEach(name => {
            const normalized = GeometryLibrary.normalizeName(name);
            if (!normalized) return;
            const key = normalized.toUpperCase();
            if (seen.has(key)) return;
            seen.add(key);
            merged.push(normalized);
        });
    };

    pushList(primary);
    pushList(secondary);

    return merged;
}

function createDynamicGeometryList(names) {
    const list = [...names];
    Object.defineProperty(list, '__dynamic', { value: true, enumerable: false, configurable: true });
    return list;
}

function syncLegacyGeometryState(names) {
    window.geometries = window.geometries || {};

    LEGACY_SYSTEM_KEYS.forEach(system => {
        const existing = window.geometries[system];
        if (Array.isArray(existing)) {
            if (existing.__dynamic) {
                existing.splice(0, existing.length, ...names);
            }
        } else {
            window.geometries[system] = createDynamicGeometryList(names);
        }
    });
}

function ensureGeometrySubscription() {
    if (geometrySubscriptionCleanup) return;

    geometrySubscriptionCleanup = GeometryLibrary.subscribe(({ names }) => {
        const sanitized = sanitizeGeometryList(Array.isArray(names) ? names : []);
        cachedGeometryNames = sanitized.length ? sanitized : sanitizeGeometryList(GeometryLibrary.getGeometryNames());
        if (!cachedGeometryNames.length) {
            cachedGeometryNames = sanitizeGeometryList([
                'TETRAHEDRON',
                'HYPERCUBE',
                'SPHERE',
                'TORUS',
                'KLEIN BOTTLE',
                'FRACTAL',
                'WAVE',
                'CRYSTAL'
            ]);
        }

        syncLegacyGeometryState(cachedGeometryNames);

        if (geometryGridElement) {
            renderGeometryGrid();
        }
    });

    window.addEventListener('beforeunload', () => {
        if (geometrySubscriptionCleanup) {
            try {
                geometrySubscriptionCleanup();
            } catch (err) {
                console.warn('[UIHandlers] Failed to dispose geometry subscription', err);
            }
            geometrySubscriptionCleanup = null;
        }
    }, { once: true });
}

function getGeometryNamesForSystem(system = getSystemKeyFallback()) {
    const fallback = cachedGeometryNames.length ? cachedGeometryNames : sanitizeGeometryList(GeometryLibrary.getGeometryNames());
    const manual = window.geometries?.[system];
    if (!Array.isArray(manual) || !manual.length) {
        return fallback;
    }

    const sanitizedManual = sanitizeGeometryList(manual);
    if (!sanitizedManual.length) {
        return fallback;
    }

    return mergeGeometrySources(sanitizedManual, fallback);
}

function renderGeometryGrid() {
    if (!geometryGridElement) return;

    const names = getGeometryNamesForSystem(geometryGridSystem);
    if (!names.length) {
        geometryGridElement.innerHTML = '<div class="geom-empty">No geometries available</div>';
        return;
    }

    const previousActive = geometryGridElement.querySelector('.geom-btn.active');
    let activeIndex = previousActive ? parseInt(previousActive.dataset.index, 10) : 0;
    if (!Number.isFinite(activeIndex) || activeIndex < 0 || activeIndex >= names.length) {
        activeIndex = 0;
    }

    geometryGridElement.innerHTML = names.map((name, index) => `
        <button class="geom-btn ${index === activeIndex ? 'active' : ''}" data-index="${index}" onclick="selectGeometry(${index})">
            ${name}
        </button>
    `).join('');
}

syncLegacyGeometryState(cachedGeometryNames);
ensureGeometrySubscription();

onRegistryChange(({ key }) => {
    if (!key) {
        return;
    }
    if (geometryGridSystem !== key) {
        geometryGridSystem = key;
        if (geometryGridElement) {
            renderGeometryGrid();
        }
    }
});

function formatColorLabel(key) {
    if (!key) {
        return 'Default';
    }
    return key.replace(/[-_]/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}

function normalizeControlGroups(groups) {
    if (!Array.isArray(groups)) {
        return [];
    }

    return groups
        .map(group => {
            if (!group) {
                return null;
            }

            const parameters = Array.isArray(group.parameters)
                ? group.parameters
                    .map(param => {
                        if (!param) {
                            return null;
                        }
                        const parameter = param.parameter || param.name || param.id;
                        if (!parameter) {
                            return null;
                        }
                        return {
                            parameter,
                            label: param.label || param.title || formatColorLabel(parameter),
                            icon: param.icon || null,
                            displayId: param.displayId || `${parameter}Value`,
                            min: typeof param.min === 'number' ? param.min : undefined,
                            max: typeof param.max === 'number' ? param.max : undefined,
                            step: typeof param.step === 'number' ? param.step : undefined,
                            decimals: typeof param.decimals === 'number' ? param.decimals : undefined,
                            format: param.format || null,
                            unit: param.unit || '',
                            hint: param.hint || '',
                            defaultValue: param.defaultValue
                        };
                    })
                    .filter(Boolean)
                : [];

            if (!parameters.length) {
                return null;
            }

            return {
                id: group.id || group.key || group.title || '',
                title: group.title || group.name || '',
                icon: group.icon || null,
                description: group.description || '',
                parameters
            };
        })
        .filter(Boolean);
}

function normalizeActionHandler(action) {
    if (!action) {
        return null;
    }

    if (typeof action === 'function') {
        return action;
    }

    if (typeof action === 'string') {
        return {
            type: 'global',
            name: action,
            args: []
        };
    }

    if (typeof action === 'object') {
        const handlerName = action.method || action.name || action.handler || null;
        const normalizedType = action.type || (action.method ? 'choreographer' : 'global');
        return {
            type: normalizedType,
            name: handlerName,
            method: action.method || handlerName,
            args: Array.isArray(action.args) ? action.args : [],
            requireMode: action.requireMode,
            event: action.event || null,
            payload: action.payload,
            toggle: action.toggle || null
        };
    }

    return null;
}

function normalizeActionList(actions) {
    if (!Array.isArray(actions)) {
        return [];
    }

    return actions
        .map((item, index) => {
            if (!item) {
                return null;
            }

            const label = item.label || item.title || null;
            const handler = normalizeActionHandler(item.action ?? item.handler ?? null);

            if (!label || !handler) {
                return null;
            }

            return {
                id: item.id || item.key || `${handler.type || 'action'}-${index}`,
                label,
                icon: item.icon || null,
                description: item.description || item.hint || '',
                action: handler,
                disabled: Boolean(item.disabled),
                kind: item.kind || item.category || null,
                size: item.size || null
            };
        })
        .filter(Boolean);
}

function normalizeHints(hints) {
    if (!hints) {
        return [];
    }

    if (Array.isArray(hints)) {
        return hints
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

    if (typeof hints === 'string') {
        return hints.split(/\n+/).map(line => line.trim()).filter(Boolean);
    }

    return [];
}

function resolveActionAvailability(descriptor) {
    if (!descriptor || descriptor.disabled) {
        return false;
    }

    const action = descriptor.action;
    if (typeof action === 'function') {
        return true;
    }

    if (!action) {
        return false;
    }

    const type = action.type || 'global';
    const methodName = action.method || action.name || null;

    const requiredMode = action.requireMode || descriptor.requireMode;
    if (requiredMode && typeof window !== 'undefined') {
        const currentMode = window.currentMode || window?.choreographer?.mode || null;
        if (Array.isArray(requiredMode)) {
            if (!requiredMode.includes(currentMode)) {
                return false;
            }
        } else if (requiredMode !== currentMode) {
            return false;
        }
    }

    switch (type) {
        case 'choreographer':
            return typeof window !== 'undefined'
                && window.choreographer
                && methodName
                && typeof window.choreographer[methodName] === 'function';
        case 'toggle': {
            const toggleName = methodName || 'toggleTimelineEditor';
            return typeof window !== 'undefined'
                && typeof window[toggleName] === 'function';
        }
        case 'dispatch':
            return typeof window !== 'undefined';
        case 'global':
        case 'function':
        default:
            if (!methodName) {
                return false;
            }
            return typeof window !== 'undefined'
                && typeof window[methodName] === 'function';
    }
}

function executePanelAction(descriptor, context = {}) {
    if (!descriptor) {
        return false;
    }

    const action = descriptor.action || descriptor;

    try {
        if (typeof action === 'function') {
            const result = action({ descriptor, context });
            if (result && typeof result.then === 'function') {
                result.catch(error => console.error('[UIHandlers] Action promise rejected', error));
            }
            return true;
        }

        if (!action) {
            return false;
        }

        const args = Array.isArray(action.args) ? action.args : [];
        switch (action.type) {
            case 'choreographer': {
                if (typeof window === 'undefined' || !window.choreographer) {
                    return false;
                }
                const methodName = action.method || action.name;
                if (methodName && typeof window.choreographer[methodName] === 'function') {
                    const result = window.choreographer[methodName](...args);
                    if (result && typeof result.then === 'function') {
                        result.catch(error => console.error('[UIHandlers] Choreographer action failed', methodName, error));
                    }
                    return true;
                }
                return false;
            }
            case 'toggle': {
                const toggleName = action.method || action.name || 'toggleTimelineEditor';
                if (typeof window !== 'undefined' && typeof window[toggleName] === 'function') {
                    window[toggleName](...args);
                    return true;
                }
                return false;
            }
            case 'dispatch': {
                if (typeof window !== 'undefined') {
                    const eventName = action.event || descriptor.id || 'vib34d:panel-action';
                    window.dispatchEvent(new CustomEvent(eventName, { detail: { descriptor, context, payload: action.payload } }));
                    return true;
                }
                return false;
            }
            case 'global':
            case 'function':
            default: {
                const methodName = action.method || action.name;
                if (typeof window !== 'undefined' && methodName && typeof window[methodName] === 'function') {
                    const result = window[methodName](...args);
                    if (result && typeof result.then === 'function') {
                        result.catch(error => console.error('[UIHandlers] Global action failed', methodName, error));
                    }
                    return true;
                }
                return false;
            }
        }
    } catch (error) {
        console.error('[UIHandlers] Failed to execute action', descriptor, error);
        return false;
    }
}

function createActionButton(descriptor, { size = 'default', context = 'panel' } = {}) {
    if (!descriptor) {
        return null;
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'panel-btn';
    if (size === 'compact' || descriptor.size === 'compact') {
        button.classList.add('compact');
    }
    if (context === 'timeline-preset') {
        button.classList.add('timeline-preset-btn');
    } else if (context === 'timeline-editor') {
        button.classList.add('timeline-editor-btn');
    }

    button.dataset.actionId = descriptor.id || '';
    if (descriptor.kind) {
        button.dataset.actionKind = descriptor.kind;
    }

    button.textContent = descriptor.icon ? `${descriptor.icon} ${descriptor.label}` : descriptor.label;
    if (descriptor.description) {
        button.title = descriptor.description;
    }

    const available = resolveActionAvailability(descriptor);
    if (!available) {
        button.disabled = true;
    }

    button.addEventListener('click', () => {
        executePanelAction(descriptor, { source: context });
    });

    return button;
}

function renderTimelinePresets(timelineDescriptor) {
    if (!ensureControlShellElements()) {
        return;
    }

    const container = controlShellElements.timelinePresets;
    if (!container) {
        return;
    }

    const presets = normalizeActionList(timelineDescriptor?.presets);
    if (!presets.length) {
        container.innerHTML = '<div class="timeline-empty">Preset templates coming soon.</div>';
        return;
    }

    const fragment = document.createDocumentFragment();
    presets.forEach(preset => {
        const button = createActionButton(preset, { size: 'compact', context: 'timeline-preset' });
        if (button) {
            fragment.appendChild(button);
        }
    });

    container.innerHTML = '';
    container.appendChild(fragment);
}

function renderTimelineActions(timelineDescriptor) {
    if (!ensureControlShellElements()) {
        return;
    }

    const container = controlShellElements.timelineEditorActions;
    if (!container) {
        return;
    }

    const actions = normalizeActionList(timelineDescriptor?.actions);
    if (!actions.length) {
        container.innerHTML = '<div class="timeline-empty">Timeline actions will appear here.</div>';
        return;
    }

    const fragment = document.createDocumentFragment();
    actions.forEach(action => {
        const button = createActionButton(action, { size: 'compact', context: 'timeline-editor' });
        if (button) {
            fragment.appendChild(button);
        }
    });

    container.innerHTML = '';
    container.appendChild(fragment);
}

function renderTimelineHints(timelineDescriptor) {
    if (!ensureControlShellElements()) {
        return;
    }

    const container = controlShellElements.timelineHints;
    if (!container) {
        return;
    }

    const hints = normalizeHints(timelineDescriptor?.hints);
    if (!hints.length) {
        container.innerHTML = '';
        return;
    }

    const fragment = document.createDocumentFragment();
    hints.forEach(text => {
        const hint = document.createElement('div');
        hint.className = 'timeline-hint';
        hint.textContent = text;
        fragment.appendChild(hint);
    });

    container.innerHTML = '';
    container.appendChild(fragment);
}

function renderQuickActions(descriptor) {
    if (!ensureControlShellElements()) {
        return;
    }

    const container = controlShellElements.actionsContainer;
    if (!container) {
        return;
    }

    const actions = normalizeActionList(descriptor?.quickActions || descriptor);
    if (!actions.length) {
        container.innerHTML = '<div class="control-empty">Quick actions coming soon.</div>';
        return;
    }

    const fragment = document.createDocumentFragment();
    actions.forEach(action => {
        const button = createActionButton(action, { size: action.size || 'default', context: 'quick-action' });
        if (button) {
            fragment.appendChild(button);
        }
    });

    container.innerHTML = '';
    container.appendChild(fragment);
}

function renderTimelineDescriptor(descriptor) {
    const timelineDescriptor = descriptor?.timeline || descriptor || {};
    renderTimelinePresets(timelineDescriptor);
    renderTimelineActions(timelineDescriptor);
    renderTimelineHints(timelineDescriptor);
}

function getParameterDefinitionFor(manager, parameter) {
    if (!manager || typeof parameter !== 'string') {
        return null;
    }

    if (typeof manager.getParameterDefinition === 'function') {
        try {
            const definition = manager.getParameterDefinition(parameter);
            if (definition) {
                return definition;
            }
        } catch (error) {
            console.debug('[UIHandlers] Parameter definition lookup failed', parameter, error);
        }
    }

    const defs = manager.parameterDefs || {};
    if (defs && defs[parameter]) {
        return { ...defs[parameter] };
    }

    return null;
}

function resolveParameterValue(manager, parameter, definition, config = {}) {
    if (window.userParameterState && Object.prototype.hasOwnProperty.call(window.userParameterState, parameter)) {
        const userValue = Number(window.userParameterState[parameter]);
        if (Number.isFinite(userValue)) {
            return userValue;
        }
    }

    if (manager?.params && Object.prototype.hasOwnProperty.call(manager.params, parameter)) {
        const value = Number(manager.params[parameter]);
        if (Number.isFinite(value)) {
            return value;
        }
        return manager.params[parameter];
    }

    if (definition && typeof definition.default !== 'undefined') {
        const defaultValue = Number(definition.default);
        if (Number.isFinite(defaultValue)) {
            return defaultValue;
        }
        return definition.default;
    }

    if (typeof config.defaultValue !== 'undefined') {
        const fallback = Number(config.defaultValue);
        if (Number.isFinite(fallback)) {
            return fallback;
        }
        return config.defaultValue;
    }

    if (definition && typeof definition.min === 'number' && typeof definition.max === 'number') {
        return (definition.min + definition.max) / 2;
    }

    return 0;
}

function formatControlValue(value, config = {}) {
    if (!Number.isFinite(value)) {
        return '--';
    }

    const format = config.format || null;
    const unit = typeof config.unit === 'string' ? config.unit : '';
    const decimals = typeof config.decimals === 'number'
        ? config.decimals
        : (Math.abs(value) >= 10 ? 1 : 2);

    if (format === 'degrees') {
        if (typeof config.decimals === 'number') {
            return `${value.toFixed(config.decimals)}${unit || '°'}`;
        }
        return `${Math.round(value)}${unit || '°'}`;
    }

    if (format === 'integer') {
        return `${Math.round(value)}${unit}`;
    }

    const text = value.toFixed(decimals);
    return unit ? `${text}${unit}` : text;
}

function buildControlForParameter(manager, config) {
    if (!config || !config.parameter) {
        return null;
    }

    const parameter = config.parameter;
    const definition = getParameterDefinitionFor(manager, parameter) || {};
    const min = typeof config.min === 'number'
        ? config.min
        : (typeof definition.min === 'number' ? definition.min : 0);
    const max = typeof config.max === 'number'
        ? config.max
        : (typeof definition.max === 'number' ? definition.max : 1);
    const step = typeof config.step === 'number'
        ? config.step
        : (typeof definition.step === 'number' ? definition.step : 0.01);

    let value = resolveParameterValue(manager, parameter, definition, config);
    const numericValue = Number(value);
    if (Number.isFinite(numericValue)) {
        value = numericValue;
    }

    if (Number.isFinite(value)) {
        if (Number.isFinite(min)) {
            value = Math.max(value, min);
        }
        if (Number.isFinite(max)) {
            value = Math.min(value, max);
        }
    } else {
        value = Number.isFinite(min) ? min : 0;
    }

    const container = document.createElement('div');
    container.className = 'control-group';
    container.dataset.parameter = parameter;

    const label = document.createElement('label');
    label.className = 'control-label';
    label.setAttribute('for', parameter);

    const labelText = document.createElement('span');
    labelText.textContent = config.icon ? `${config.icon} ${config.label || formatColorLabel(parameter)}` : (config.label || formatColorLabel(parameter));
    label.appendChild(labelText);

    const valueDisplay = document.createElement('span');
    valueDisplay.className = 'control-value';
    valueDisplay.id = config.displayId || `${parameter}Value`;
    valueDisplay.textContent = formatControlValue(Number(value), config);
    label.appendChild(valueDisplay);

    container.appendChild(label);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'control-slider';
    slider.id = parameter;
    slider.name = parameter;

    if (Number.isFinite(min)) {
        slider.min = String(min);
    }
    if (Number.isFinite(max)) {
        slider.max = String(max);
    }
    if (Number.isFinite(step) && step > 0) {
        slider.step = String(step);
    }
    slider.value = String(Number.isFinite(value) ? value : (Number.isFinite(min) ? min : 0));

    slider.addEventListener('input', () => {
        const numeric = parseFloat(slider.value);
        if (!Number.isFinite(numeric)) {
            return;
        }
        valueDisplay.textContent = formatControlValue(numeric, config);
        if (typeof window.updateParameter === 'function') {
            window.updateParameter(parameter, numeric);
        }
    });

    container.appendChild(slider);

    if (config.hint) {
        const hint = document.createElement('div');
        hint.className = 'control-hint';
        hint.textContent = config.hint;
        container.appendChild(hint);
    }

    return container;
}

function renderAdaptiveControlGroups(descriptor) {
    if (!ensureControlShellElements()) {
        return;
    }

    const container = controlShellElements.groups;
    if (!container) {
        return;
    }

    const manager = getActiveParameterManager();
    const engine = getActiveEngine();
    const groups = normalizeControlGroups(descriptor?.controlGroups);

    if (!groups.length) {
        container.innerHTML = '<div class="control-empty">Control definitions coming soon.</div>';
        return;
    }

    if (!manager && !engine) {
        container.innerHTML = '<div class="control-empty">System initializing… controls will unlock shortly.</div>';
        return;
    }

    const fragment = document.createDocumentFragment();

    groups.forEach(group => {
        const section = document.createElement('div');
        section.className = 'control-collection';
        if (group.id) {
            section.dataset.group = group.id;
        }

        if (group.title || group.icon) {
            const titleEl = document.createElement('div');
            titleEl.className = 'control-group-title';
            if (group.icon) {
                const iconSpan = document.createElement('span');
                iconSpan.className = 'control-group-icon';
                iconSpan.textContent = group.icon;
                titleEl.appendChild(iconSpan);
            }
            if (group.title) {
                const titleSpan = document.createElement('span');
                titleSpan.textContent = group.title;
                titleEl.appendChild(titleSpan);
            }
            section.appendChild(titleEl);
        }

        if (group.description) {
            const descriptionEl = document.createElement('div');
            descriptionEl.className = 'control-group-description';
            descriptionEl.textContent = group.description;
            section.appendChild(descriptionEl);
        }

        group.parameters.forEach(parameterConfig => {
            const control = buildControlForParameter(manager, parameterConfig);
            if (control) {
                section.appendChild(control);
            }
        });

        fragment.appendChild(section);
    });

    container.innerHTML = '';
    container.appendChild(fragment);
}

function renderAdaptiveControlPanel(key, metadata) {
    if (!ensureControlShellElements()) {
        return;
    }

    const descriptor = resolveSystemDescriptor(key, metadata || {});

    if (controlShellElements.panel) {
        controlShellElements.panel.dataset.systemKey = descriptor.key || key || '';
    }

    if (controlShellElements.title) {
        controlShellElements.title.textContent = descriptor.panelTitle
            || descriptor.title
            || formatColorLabel(descriptor.key || key || 'Active System');
    }

    if (controlShellElements.geometrySection) {
        controlShellElements.geometrySection.style.display = descriptor.supportsGeometryGrid === false ? 'none' : '';
    }

    if (controlShellElements.timelineSection) {
        controlShellElements.timelineSection.dataset.supportsTimeline = descriptor.supportsTimeline ? 'true' : 'false';
    }

    if (controlShellElements.timelineToggle) {
        controlShellElements.timelineToggle.dataset.systemSupportsTimeline = descriptor.supportsTimeline ? 'true' : 'false';
    }

    applyControlPanelAccent(descriptor.accentColor || descriptor.highlightColor || null);
    renderAdaptiveControlGroups(descriptor);
    renderTimelineDescriptor(descriptor);
    renderQuickActions(descriptor);
}

function initializeControlShell(force = false) {
    if (!force && controlShellInitialized) {
        return;
    }

    if (!ensureControlShellElements()) {
        return;
    }

    controlShellInitialized = true;

    const key = getSystemKeyFallback();
    const metadata = getSystemMetadata(key);
    renderAdaptiveControlPanel(key, metadata);
}

function ensureSelectOptions(select, options) {
    if (!select || !Array.isArray(options)) {
        return;
    }

    const existing = Array.from(select.options).map(option => option.value);
    const needsUpdate = existing.length !== options.length || existing.some((value, index) => value !== options[index]);

    if (!needsUpdate) {
        return;
    }

    select.innerHTML = options.map(option => `<option value="${option}">${formatColorLabel(option)}</option>`).join('');
}

function startGradientPreviewLoop() {
    if (gradientPreviewLoopActive || !gradientPreviewElement) {
        return;
    }

    gradientPreviewLoopActive = true;

    const update = () => {
        if (!gradientPreviewElement) {
            gradientPreviewLoopActive = false;
            return;
        }

        const gradientState = window.colorState?.gradient;
        if (gradientState?.css && gradientPreviewElement.dataset.currentCss !== gradientState.css) {
            gradientPreviewElement.style.background = gradientState.css;
            gradientPreviewElement.dataset.currentCss = gradientState.css;
        }

        requestAnimationFrame(update);
    };

    requestAnimationFrame(update);
}

function syncColorControls(config, state) {
    if (!colorControlsInitialized) {
        return;
    }

    const audioEngine = window.audioEngine;
    const activeConfig = config || audioEngine?.getColorConfiguration?.() || {};
    const activeState = state || audioEngine?.getColorState?.() || window.colorState || {};

    if (colorModeSelect) {
        const modeValue = activeConfig.colorMode || 'single';
        if (colorModeSelect.value !== modeValue) {
            colorModeSelect.value = modeValue;
        }
    }

    if (colorPaletteSelect) {
        const paletteValue = activeConfig.colorPalette || '';
        if (paletteValue && !Array.from(colorPaletteSelect.options).some(option => option.value === paletteValue)) {
            const option = document.createElement('option');
            option.value = paletteValue;
            option.textContent = formatColorLabel(paletteValue);
            colorPaletteSelect.appendChild(option);
        }
        if (paletteValue && colorPaletteSelect.value !== paletteValue) {
            colorPaletteSelect.value = paletteValue;
        }
    }

    if (gradientTypeSelect) {
        const gradientValue = activeConfig.gradientType || 'horizontal';
        if (gradientTypeSelect.value !== gradientValue) {
            gradientTypeSelect.value = gradientValue;
        }
    }

    if (gradientSpeedInput) {
        const speedValue = typeof activeConfig.gradientSpeed === 'number' ? activeConfig.gradientSpeed : 0.25;
        if (gradientSpeedInput.value !== String(speedValue)) {
            gradientSpeedInput.value = String(speedValue);
        }
        if (gradientSpeedValueLabel) {
            gradientSpeedValueLabel.textContent = `${speedValue.toFixed(2)}x`;
        }
    }

    if (colorReactivityInput) {
        const reactivityValue = typeof activeConfig.colorReactivity === 'number' ? activeConfig.colorReactivity : 0.65;
        if (colorReactivityInput.value !== String(reactivityValue)) {
            colorReactivityInput.value = String(reactivityValue);
        }
        if (colorReactivityValueLabel) {
            colorReactivityValueLabel.textContent = `${Math.round(clamp(reactivityValue, 0, 1) * 100)}%`;
        }
    }

    if (gradientPreviewElement && activeState?.gradient?.css) {
        gradientPreviewElement.style.background = activeState.gradient.css;
        gradientPreviewElement.dataset.currentCss = activeState.gradient.css;
    }
}

function initializeColorControls(force = false) {
    if (typeof document === 'undefined') {
        return;
    }

    if (!force && colorControlsInitialized) {
        syncColorControls();
        return;
    }

    if (!window.audioEngine) {
        setTimeout(() => initializeColorControls(force), 150);
        return;
    }

    colorModeSelect = document.getElementById('colorModeControl');
    colorPaletteSelect = document.getElementById('colorPaletteControl');
    gradientTypeSelect = document.getElementById('gradientTypeControl');
    gradientSpeedInput = document.getElementById('gradientSpeedControl');
    gradientSpeedValueLabel = document.getElementById('gradientSpeedValue');
    colorReactivityInput = document.getElementById('colorReactivityControl');
    colorReactivityValueLabel = document.getElementById('colorReactivityValue');
    gradientPreviewElement = document.getElementById('gradientPreview');

    if (!colorModeSelect || !colorPaletteSelect || !gradientTypeSelect || !gradientSpeedInput || !colorReactivityInput) {
        return;
    }

    const audioEngine = window.audioEngine;
    const availableModes = audioEngine?.getAvailableColorModes?.() ?? COLOR_MODE_OPTIONS;
    const availablePalettes = audioEngine?.getAvailablePalettes?.() ?? COLOR_PALETTE_OPTIONS;
    const availableGradients = audioEngine?.getAvailableGradients?.() ?? GRADIENT_TYPE_OPTIONS;

    ensureSelectOptions(colorModeSelect, availableModes);
    ensureSelectOptions(colorPaletteSelect, availablePalettes.length ? availablePalettes : COLOR_PALETTE_OPTIONS);
    ensureSelectOptions(gradientTypeSelect, availableGradients);

    colorModeSelect.addEventListener('change', event => {
        audioEngine?.setColorMode?.(event.target.value);
    });

    colorPaletteSelect.addEventListener('change', event => {
        audioEngine?.setColorPalette?.(event.target.value);
    });

    gradientTypeSelect.addEventListener('change', event => {
        audioEngine?.setGradientType?.(event.target.value);
    });

    gradientSpeedInput.addEventListener('input', event => {
        const value = parseFloat(event.target.value);
        if (gradientSpeedValueLabel) {
            gradientSpeedValueLabel.textContent = `${(Number.isFinite(value) ? value : 0).toFixed(2)}x`;
        }
        audioEngine?.setGradientSpeed?.(value);
    });

    colorReactivityInput.addEventListener('input', event => {
        const value = parseFloat(event.target.value);
        if (colorReactivityValueLabel) {
            colorReactivityValueLabel.textContent = `${Math.round(clamp(value, 0, 1) * 100)}%`;
        }
        audioEngine?.setColorReactivity?.(value);
    });

    colorControlsInitialized = true;
    syncColorControls();

    if (gradientPreviewElement) {
        startGradientPreviewLoop();
    }
}

if (typeof window !== 'undefined') {
    window.addEventListener('vib34d:system-selected', event => {
        const detail = event?.detail || {};
        renderSystemInfo(detail.key, detail.metadata);
        syncSystemButtonTooltips();
        renderAdaptiveControlPanel(detail.key, detail.metadata);
    });

    window.addEventListener('vib34d:color-state', event => {
        syncColorControls(event.detail?.config, event.detail?.state);
    });

    window.addEventListener('vib34d:timeline-updated', event => {
        const detail = event?.detail || {};
        if (ensureControlShellElements() && controlShellElements.timelineSection) {
            if (typeof detail.count === 'number') {
                controlShellElements.timelineSection.dataset.sequenceCount = String(detail.count);
            }
            if (typeof detail.mode === 'string') {
                controlShellElements.timelineSection.dataset.mode = detail.mode;
            }
        }

        const key = getSystemKeyFallback();
        const metadata = getSystemMetadata(key);
        const descriptor = resolveSystemDescriptor(key, metadata || {});
        renderTimelineDescriptor(descriptor);
        renderQuickActions(descriptor);
    });

    window.refreshColorControls = (force = false) => {
        initializeColorControls(force);
    };

    window.refreshSystemInfoPanel = () => refreshSystemInfoPanel();

    window.refreshControlPanel = () => {
        initializeControlShell();
        const key = getSystemKeyFallback();
        renderAdaptiveControlPanel(key, getSystemMetadata(key));
    };
}

if (typeof document !== 'undefined') {
    const initControls = () => initializeColorControls();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initControls, { once: true });
    } else {
        setTimeout(initControls, 0);
    }
}

if (typeof document !== 'undefined') {
    const initControlShell = () => initializeControlShell();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initControlShell, { once: true });
    } else {
        setTimeout(initControlShell, 0);
    }
}

/**
 * Main parameter update function - CRITICAL for all visualizers
 * Routes parameters to appropriate engine based on current system
 */
window.updateParameter = function(param, value) {
    if (!window.userParameterState) {
        window.userParameterState = {};
    }

    const systemKey = getSystemKeyFallback();
    const manager = getActiveParameterManager();
    const definition = manager?.getParameterDefinition?.(param) || manager?.parameterDefs?.[param] || null;

    let numericValue = Number(value);
    const isNumeric = Number.isFinite(numericValue);
    let processedValue = value;

    if (definition) {
        if (definition.type === 'enum') {
            processedValue = typeof value === 'string' ? value : (value === null || value === undefined ? '' : String(value));
        } else if (definition.type === 'bool' || definition.type === 'boolean') {
            processedValue = Boolean(value);
        } else {
            processedValue = isNumeric ? numericValue : Number(definition.default ?? manager?.params?.[param] ?? value);
            numericValue = Number(processedValue);
        }
    } else if (isNumeric) {
        processedValue = numericValue;
    }

    window.userParameterState[param] = processedValue;

    if (!window.isGalleryPreview) {
        console.log(`💾 User parameter: ${param} = ${processedValue}`);
    }

    if (window.audioEngine && isNumeric) {
        if (param === 'hue') {
            window.audioEngine.setBaseHue?.(numericValue);
        } else if (param === 'saturation') {
            window.audioEngine.setBaseSaturation?.(numericValue);
        } else if (param === 'intensity') {
            window.audioEngine.setBaseIntensity?.(numericValue);
        }
    }

    const displays = {
        rot4dXW: 'xwValue',
        rot4dYW: 'ywValue',
        rot4dZW: 'zwValue',
        gridDensity: 'densityValue',
        morphFactor: 'morphValue',
        chaos: 'chaosValue',
        speed: 'speedValue',
        hue: 'hueValue',
        intensity: 'intensityValue',
        saturation: 'saturationValue',
        dimension: 'dimensionValue'
    };

    const display = document.getElementById(displays[param]);
    if (display) {
        if (definition?.type === 'enum') {
            display.textContent = String(processedValue);
        } else if (param === 'hue' && isNumeric) {
            display.textContent = `${Math.round(numericValue)}°`;
        } else if (param.startsWith('rot4d') && isNumeric) {
            display.textContent = numericValue.toFixed(2);
        } else if (isNumeric) {
            display.textContent = numericValue.toFixed(1);
        }
    }

    try {
        let handled = false;
        if (manager?.setParameter) {
            handled = manager.setParameter(param, processedValue) || handled;
        }

        const engine = getActiveEngine();
        if (!engine) {
            console.warn(`[UIHandlers] No active engine available for ${systemKey}`);
            return;
        }

        if (systemKey === 'faceted') {
            if (!handled && engine.parameterManager && engine.parameterManager !== manager) {
                engine.parameterManager.setParameter?.(param, processedValue);
            }
            engine.updateVisualizers?.();
        } else if (!handled) {
            if (typeof engine.updateParameter === 'function') {
                engine.updateParameter(param, processedValue);
            } else if (typeof engine.updateParameters === 'function') {
                engine.updateParameters({ [param]: processedValue });
            }
        }

        if (!window.isGalleryPreview) {
            console.log(`📊 ${systemKey.toUpperCase()}: ${param} = ${processedValue}`);
        }
    } catch (error) {
        console.error(`❌ Parameter update error in ${systemKey} for ${param}:`, error);
    }
};

/**
 * Randomize all parameters except hue and geometry
 */
window.randomizeAll = function() {
    // Randomize ONLY parameters (NO hue, NO geometry)
    randomizeParameters();
};

/**
 * Full randomization: parameters + geometry + hue
 */
window.randomizeEverything = function() {
    // Full randomization: parameters + geometry + hue
    randomizeParameters();
    setTimeout(() => randomizeGeometryAndHue(), 10);
};

/**
 * Randomize parameters excluding hue
 */
function randomizeParameters() {
    // Randomize all parameters EXCEPT hue and geometry
    const skipParams = ['hue'];
    
    document.querySelectorAll('.control-slider').forEach(slider => {
        const paramName = slider.id;
        if (!skipParams.includes(paramName)) {
            const min = parseFloat(slider.min);
            const max = parseFloat(slider.max);
            const value = Math.random() * (max - min) + min;
            slider.value = value;
            slider.oninput();
        }
    });
    
    console.log('🎲 Parameters randomized (NO hue, NO geometry)');
}

/**
 * Randomize geometry selection and hue value
 */
function randomizeGeometryAndHue() {
    // Randomize geometry selection
    const systemKey = getSystemKeyFallback();
    if (systemKey !== 'holographic') {
        const geometryNames = getGeometryNamesForSystem(systemKey);
        if (geometryNames.length) {
            const randomGeometry = Math.floor(Math.random() * geometryNames.length);
            if (window.selectGeometry) {
                window.selectGeometry(randomGeometry);
            }
        } else {
            console.warn('[UIHandlers] Unable to randomize geometry - no shapes registered');
        }
    }
    
    // Randomize hue
    const hueSlider = document.getElementById('hue');
    if (hueSlider) {
        const randomHue = Math.random() * 360;
        hueSlider.value = randomHue;
        hueSlider.oninput();
    }
    
    console.log('🎲 Stage 2: Randomized geometry and hue');
}

/**
 * Reset all parameters to their default values
 */
window.resetAll = function() {
    // Reset all sliders to defaults
    const defaults = {
        rot4dXW: 0,
        rot4dYW: 0,
        rot4dZW: 0,
        gridDensity: 15,
        morphFactor: 1,
        chaos: 0.2,
        speed: 1,
        hue: 200,
        intensity: 0.5,
        saturation: 0.8
    };
    
    Object.entries(defaults).forEach(([id, value]) => {
        const slider = document.getElementById(id);
        if (slider) {
            slider.value = value;
            slider.oninput();
        }
    });
    console.log('🔄 Reset all parameters');
};

/**
 * Gallery Functions
 */
window.openGallery = function() {
    console.log('🖼️ Navigating to gallery...');
    // MEMORY OPTIMIZATION: Navigate in same tab instead of opening new window
    window.location.href = './gallery.html';
    
    // Listen for gallery window close
    if (window.galleryWindow) {
        const checkClosed = setInterval(() => {
            if (window.galleryWindow.closed) {
                window.galleryWindow = null;
                clearInterval(checkClosed);
                console.log('🖼️ Gallery window closed');
            }
        }, 1000);
    }
};

/**
 * Get current active geometry index
 */
function getCurrentGeometryIndex() {
    const activeBtn = document.querySelector('.geom-btn.active');
    if (activeBtn) {
        return parseInt(activeBtn.dataset.index) || 0;
    }
    return 0;
}

/**
 * Randomize Lite - Only parameters, not geometry or hue
 */
window.randomizeLite = function() {
    console.log('🎲 Randomizing parameters only (not geometry or hue)...');
    
    // Keep current geometry and hue
    const currentGeometry = getCurrentGeometryIndex();
    const currentHue = document.getElementById('hue')?.value || 200;
    
    // Randomize other parameters
    updateParameter('rot4dXW', (Math.random() - 0.5) * 12.56);
    updateParameter('rot4dYW', (Math.random() - 0.5) * 12.56);
    updateParameter('rot4dZW', (Math.random() - 0.5) * 12.56);
    updateParameter('gridDensity', 5 + Math.random() * 95);
    updateParameter('morphFactor', Math.random() * 2);
    updateParameter('chaos', Math.random());
    updateParameter('speed', 0.1 + Math.random() * 2.9);
    updateParameter('intensity', 0.2 + Math.random() * 0.8);
    updateParameter('saturation', 0.3 + Math.random() * 0.7);
    
    // Keep current hue and geometry
    updateParameter('hue', currentHue);
    if (window.selectGeometry) {
        window.selectGeometry(currentGeometry);
    }
    
    console.log('✅ Lite randomization complete - geometry and hue preserved');
};

/**
 * Open Viewer/Display Card - Navigate to viewer interface
 */
window.openViewer = function() {
    console.log('👁️ Navigating to viewer...');
    // Save current parameters for viewer
    const currentState = {
        system: getSystemKeyFallback(),
        parameters: window.userParameterState || {},
        toggleStates: {
            audioEnabled: window.audioEnabled || false,
            interactivityEnabled: window.interactivityEnabled !== false
        }
    };
    localStorage.setItem('vib34d-viewer-state', JSON.stringify(currentState));
    
    // Navigate to viewer
    window.location.href = './viewer.html';
};

/**
 * Interactivity Toggle - Enable/disable mouse and touch interactions
 */
window.toggleInteractivity = function() {
    interactivityEnabled = !interactivityEnabled;
    
    // Update interactivity button visual state
    const interactBtn = document.getElementById('interactivityToggle') || document.querySelector('[onclick="toggleInteractivity()"]');
    if (interactBtn) {
        if (interactivityEnabled) {
            interactBtn.classList.add('active');
        } else {
            interactBtn.classList.remove('active');
        }
        interactBtn.title = `Interactive Control: ${interactivityEnabled ? 'ON' : 'OFF'}`;
    }
    
    console.log(`🎛️ Mouse/Touch Interactions: ${interactivityEnabled ? 'ENABLED' : 'DISABLED'}`);
    console.log('🔷 Faceted: Mouse tracking', interactivityEnabled ? '✅' : '❌');
    console.log('🌌 Quantum: Enhanced interactions', interactivityEnabled ? '✅' : '❌'); 
    console.log('✨ Holographic: Touch interactions', interactivityEnabled ? '✅' : '❌');
    console.log('🔮 Polychora: 4D precision tracking', interactivityEnabled ? '✅' : '❌');
    
    // Show status overlay
    showInteractivityStatus();
};

/**
 * 3×3 Modular Reactivity Grid System (accessible from HTML)
 */
window.toggleSystemReactivity = function(system, interaction, enabled) {
    if (!window.reactivityManager) {
        console.warn('⚠️ ReactivityManager not initialized');
        return;
    }
    
    console.log(`🎛️ ${system.toUpperCase()} ${interaction.toUpperCase()}: ${enabled ? 'ON' : 'OFF'}`);
    
    // Map grid selections to ReactivityManager methods
    const interactionKey = `${system}${interaction.charAt(0).toUpperCase()}${interaction.slice(1)}`;
    
    if (interaction === 'mouse') {
        // Set mouse mode based on system (FIXED: matching actual mode names)
        if (enabled) {
            if (system === 'faceted') {
                window.reactivityManager.setMouseMode('rotations'); // 4D rotations
                console.log('  🔷 Activating Faceted 4D rotation mouse tracking');
            } else if (system === 'quantum') {
                window.reactivityManager.setMouseMode('velocity'); // Velocity tracking
                console.log('  🌌 Activating Quantum velocity mouse tracking');
            } else if (system === 'holographic') {
                window.reactivityManager.setMouseMode('distance'); // Shimmer effects (distance mode)
                console.log('  ✨ Activating Holographic shimmer mouse tracking');
            }
            window.reactivityManager.toggleMouse(true);
        } else {
            // If this system's mouse is being disabled, check if any others are still enabled
            const facetedEnabled = document.getElementById('facetedMouse')?.checked || false;
            const quantumEnabled = document.getElementById('quantumMouse')?.checked || false; 
            const holographicEnabled = document.getElementById('holographicMouse')?.checked || false;
            
            if (!facetedEnabled && !quantumEnabled && !holographicEnabled) {
                window.reactivityManager.toggleMouse(false);
                console.log('  🖱️ All mouse reactivity disabled');
            }
        }
    } else if (interaction === 'click') {
        // Set click mode based on system (FIXED: matching actual mode names)
        if (enabled) {
            if (system === 'faceted') {
                window.reactivityManager.setClickMode('burst'); // FIXED: burst not flash
                console.log('  🔷 Activating Faceted burst clicks');
            } else if (system === 'quantum') {
                window.reactivityManager.setClickMode('blast'); // FIXED: blast not burst
                console.log('  🌌 Activating Quantum blast clicks');
            } else if (system === 'holographic') {
                window.reactivityManager.setClickMode('ripple'); // FIXED: ripple not burst
                console.log('  ✨ Activating Holographic ripple clicks');
            }
            window.reactivityManager.toggleClick(true);
        } else {
            // Check if any other click modes are enabled
            const facetedEnabled = document.getElementById('facetedClick')?.checked || false;
            const quantumEnabled = document.getElementById('quantumClick')?.checked || false;
            const holographicEnabled = document.getElementById('holographicClick')?.checked || false;
            
            if (!facetedEnabled && !quantumEnabled && !holographicEnabled) {
                window.reactivityManager.toggleClick(false);
                console.log('  👆 All click reactivity disabled');
            }
        }
    } else if (interaction === 'scroll') {
        // Set scroll mode based on system (FIXED: matching actual mode names)
        if (enabled) {
            if (system === 'faceted') {
                window.reactivityManager.setScrollMode('cycle'); // FIXED: cycle not density
                console.log('  🔷 Activating Faceted cycle scroll effects');
            } else if (system === 'quantum') {
                window.reactivityManager.setScrollMode('wave'); // FIXED: wave not cycles
                console.log('  🌌 Activating Quantum wave scroll');
            } else if (system === 'holographic') {
                window.reactivityManager.setScrollMode('sweep'); // FIXED: sweep not flow
                console.log('  ✨ Activating Holographic sweep scroll effects');
            }
            window.reactivityManager.toggleScroll(true);
        } else {
            // Check if any other scroll modes are enabled
            const facetedEnabled = document.getElementById('facetedScroll')?.checked || false;
            const quantumEnabled = document.getElementById('quantumScroll')?.checked || false;
            const holographicEnabled = document.getElementById('holographicScroll')?.checked || false;
            
            if (!facetedEnabled && !quantumEnabled && !holographicEnabled) {
                window.reactivityManager.toggleScroll(false);
                console.log('  🌀 All scroll reactivity disabled');
            }
        }
    }
};

/**
 * 3×3 Audio Reactivity Grid System (accessible from HTML)
 */
window.toggleAudioReactivity = function(sensitivity, visualMode, enabled) {
    console.log(`🎵 ${sensitivity.toUpperCase()} ${visualMode.toUpperCase()}: ${enabled ? 'ON' : 'OFF'}`);
    
    // Initialize audio reactivity settings if not exists
    if (!window.audioReactivitySettings) {
        window.audioReactivitySettings = {
            // Sensitivity multipliers
            sensitivity: {
                low: 0.3,    // 30% sensitivity
                medium: 1.0, // 100% sensitivity (default)
                high: 2.0    // 200% sensitivity
            },
            // Visual mode parameters
            visualModes: {
                color: ['hue', 'saturation', 'intensity'],
                geometry: ['morphFactor', 'gridDensity', 'chaos'],  
                movement: ['speed', 'rot4dXW', 'rot4dYW', 'rot4dZW']
            },
            // Active modes
            activeSensitivity: 'medium',
            activeVisualModes: new Set(['color']) // Default: medium color only
        };
    }
    
    const settings = window.audioReactivitySettings;
    const modeKey = `${sensitivity}-${visualMode}`;
    
    if (enabled) {
        // Enable this mode
        settings.activeVisualModes.add(modeKey);
        settings.activeSensitivity = sensitivity;
        
        console.log(`  🎵 Activated: ${sensitivity} sensitivity with ${visualMode} visual changes`);
        console.log(`  📊 Sensitivity multiplier: ${settings.sensitivity[sensitivity]}x`);
        console.log(`  🎨 Visual parameters:`, settings.visualModes[visualMode]);
    } else {
        // Disable this mode  
        settings.activeVisualModes.delete(modeKey);
        console.log(`  🎵 Deactivated: ${sensitivity} ${visualMode}`);
    }
    
    // Update audio processing if any system has audio capability
    if (window.holographicSystem && window.holographicSystem.audioEnabled) {
        window.holographicSystem.audioReactivitySettings = settings;
        console.log('  ✨ Updated holographic system audio settings');
    }
    
    if (window.quantumEngine && window.quantumEngine.audioEnabled) {
        window.quantumEngine.audioReactivitySettings = settings;
        console.log('  🌌 Updated quantum engine audio settings');
    }
    
    // Show audio reactivity status
    showAudioReactivityStatus();
};

/**
 * Helper function for audio cell clicks (makes the checkboxes more clickable)
 */
window.toggleAudioCell = function(cellId) {
    const checkbox = document.getElementById(cellId);
    if (checkbox) {
        checkbox.checked = !checkbox.checked;
        
        // Parse the cell ID to get sensitivity and visual mode
        const sensitivity = cellId.replace(/Color|Geometry|Movement/, '').toLowerCase();
        let visualMode = '';
        if (cellId.includes('Color')) visualMode = 'color';
        else if (cellId.includes('Geometry')) visualMode = 'geometry';
        else if (cellId.includes('Movement')) visualMode = 'movement';
        
        // Call the main toggle function
        toggleAudioReactivity(sensitivity, visualMode, checkbox.checked);
    }
};

/**
 * Helper function to update UI sliders when LLM sets parameters
 */
function updateUIParameter(param, value) {
    const slider = document.getElementById(param);
    if (slider) {
        slider.value = value;
        // Trigger change event to update display value
        const event = new Event('input', { bubbles: true });
        slider.dispatchEvent(event);
    }
}

/**
 * Show interactivity status overlay
 */
function showInteractivityStatus() {
    // Create floating overlay for interactivity status
    let overlay = document.getElementById('reactivity-status-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'reactivity-status-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 60px;
            right: 20px;
            background: rgba(0, 0, 0, 0.9);
            border: 2px solid #00ffff;
            padding: 15px;
            border-radius: 10px;
            color: #fff;
            font-family: 'Orbitron', monospace;
            font-size: 0.9rem;
            z-index: 2000;
            backdrop-filter: blur(10px);
            animation: fadeInOut 3s ease;
        `;
        document.body.appendChild(overlay);
    }
    
    overlay.innerHTML = `
        <div style="color: #00ffff; font-weight: bold; margin-bottom: 10px;">
            🎛️ REACTIVITY STATUS
        </div>
        <div>🎵 Audio: ${audioEnabled ? '<span style="color: #00ff00">ON</span>' : '<span style="color: #ff4444">OFF</span>'}</div>
        <div>🖱️ Interactions: ${interactivityEnabled ? '<span style="color: #00ff00">ON</span>' : '<span style="color: #ff4444">OFF</span>'}</div>
    `;
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        if (overlay && overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
        }
    }, 3000);
}

/**
 * Show audio reactivity status overlay
 */
function showAudioReactivityStatus() {
    const settings = window.audioReactivitySettings;
    if (!settings) return;
    
    // Create floating overlay for audio reactivity status
    let overlay = document.getElementById('audio-reactivity-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'audio-reactivity-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 60px;
            left: 20px;
            background: rgba(40, 0, 40, 0.9);
            border: 2px solid #ff64ff;
            padding: 15px;
            border-radius: 10px;
            color: #fff;
            font-family: 'Orbitron', monospace;
            font-size: 0.8rem;
            z-index: 2000;
            backdrop-filter: blur(10px);
            animation: fadeInOut 4s ease;
            max-width: 300px;
        `;
        document.body.appendChild(overlay);
    }
    
    const activeModes = Array.from(settings.activeVisualModes);
    const modesList = activeModes.length > 0 ? 
        activeModes.map(mode => mode.replace('-', ' ')).join(', ') : 
        'None active';
        
    overlay.innerHTML = `
        <div style="color: #ff64ff; font-weight: bold; margin-bottom: 10px;">
            🎵 AUDIO REACTIVITY STATUS
        </div>
        <div>🔊 Sensitivity: <span style="color: #ff64ff">${settings.activeSensitivity.toUpperCase()}</span></div>
        <div>🎨 Active Modes: <span style="color: #ff64ff">${modesList}</span></div>
        <div>📊 Multiplier: <span style="color: #ff64ff">${settings.sensitivity[settings.activeSensitivity]}x</span></div>
    `;
    
    // Auto-hide after 4 seconds
    setTimeout(() => {
        if (overlay && overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
        }
    }, 4000);
}

// Legacy function name support
function showInteractivityOverlay() {
    showInteractivityStatus();
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'i' || e.key === 'I') {
        window.toggleInteractivity();
    }
});

// Listen for mouse events from gallery iframe for visualizer interactivity
window.addEventListener('message', (event) => {
    if (!event.data || !event.data.type) {
        return;
    }

    if (event.data.type === 'mouseMove') {
        const updateMouseForSystem = (system) => {
            if (system && system.visualizers) {
                system.visualizers.forEach(vis => {
                    if (vis) {
                        vis.mouseX = event.data.x;
                        vis.mouseY = event.data.y;
                        vis.mouseIntensity = event.data.intensity || 0.5;
                    }
                });
            }
        };

        const engine = getActiveEngine();
        if (engine) {
            updateMouseForSystem(engine);
        }
    } else if (event.data.type === 'mouseClick') {
        const triggerClickForSystem = (system) => {
            if (system && system.visualizers) {
                system.visualizers.forEach(vis => {
                    if (vis) {
                        vis.clickIntensity = event.data.intensity || 1.0;
                    }
                });
            }
        };

        const engine = getActiveEngine();
        if (engine) {
            triggerClickForSystem(engine);
        }
    }
});

/**
 * Setup geometry buttons for the current system
 */
window.setupGeometry = function(system) {
    const grid = document.getElementById('geometryGrid');
    if (!grid) return;

    geometryGridElement = grid;
    geometryGridSystem = system || getSystemKeyFallback();

    if (!geometrySubscriptionCleanup) {
        ensureGeometrySubscription();
    }

    renderGeometryGrid();
};

/**
 * Mobile panel toggle function
 */
window.toggleMobilePanel = function() {
    const controlPanel = document.getElementById('controlPanel');
    const collapseBtn = document.querySelector('.mobile-collapse-btn');
    
    if (controlPanel && collapseBtn) {
        controlPanel.classList.toggle('collapsed');
        collapseBtn.textContent = controlPanel.classList.contains('collapsed') ? '▲' : '▼';
        console.log('📱 Mobile panel toggled');
    }
};

// Note: createTradingCard is defined in gallery-manager.js

console.log('🎛️ UI Handlers Module: Loaded');