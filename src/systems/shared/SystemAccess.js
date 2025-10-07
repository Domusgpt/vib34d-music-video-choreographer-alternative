/**
 * SystemAccess - shared helpers for working with the global SystemRegistry.
 * Provides a single source of truth for resolving the active system, engine,
 * and parameter manager so UI/export/timeline layers stay in sync.
 */

let registryRef = null;
let registryUnsubscribe = null;
let activeDescriptor = {
    key: null,
    system: null,
    metadata: null
};

function toEngine(systemInstance) {
    if (!systemInstance || typeof systemInstance !== 'object') {
        return null;
    }
    if (systemInstance.engine && typeof systemInstance.engine === 'object') {
        return systemInstance.engine;
    }
    return null;
}

function updateActiveDescriptor({ key = null, system = null, metadata = null } = {}) {
    activeDescriptor = {
        key,
        system,
        metadata
    };

    const engine = toEngine(system);
    if (typeof window !== 'undefined') {
        if (key) {
            window.currentSystem = key;
        }
        if (engine) {
            window.currentSystemEngine = engine;
        }
        if (engine?.parameterManager) {
            window.parameterManager = engine.parameterManager;
            window.activeParameterManager = engine.parameterManager;
        } else if (window.activeParameterManager && key === null) {
            window.activeParameterManager = null;
        }

        window.getActiveSystemEngine = getActiveEngine;
        window.getActiveParameterManager = getActiveParameterManager;
        window.getActiveSystemKey = getActiveSystemKey;
        window.getActiveParameterSnapshot = getActiveParameterSnapshot;
    }
}

function ensureRegistryListeners(registry) {
    if (!registry || typeof registry.onChange !== 'function') {
        return;
    }

    if (typeof registryUnsubscribe === 'function') {
        try {
            registryUnsubscribe();
        } catch (error) {
            console.warn('[SystemAccess] Failed to remove previous registry listener', error);
        }
        registryUnsubscribe = null;
    }

    registryUnsubscribe = registry.onChange(({ key, system, metadata }) => {
        updateActiveDescriptor({ key, system, metadata });
    });

    if (typeof registry.getActiveKey === 'function') {
        const key = registry.getActiveKey();
        const system = typeof registry.getActiveSystem === 'function'
            ? registry.getActiveSystem()
            : null;
        updateActiveDescriptor({ key, system, metadata: null });
    }
}

export function registerSystemRegistry(registry) {
    if (!registry) {
        return null;
    }

    registryRef = registry;

    if (typeof window !== 'undefined') {
        window.systemRegistry = registry;
        window.getSystemRegistry = getSystemRegistry;
    }

    ensureRegistryListeners(registry);
    return registry;
}

export function getSystemRegistry() {
    return registryRef || (typeof window !== 'undefined' ? window.systemRegistry || null : null);
}

export function syncActiveSystemState() {
    const registry = getSystemRegistry();
    if (!registry) {
        updateActiveDescriptor({ key: window?.currentSystem ?? null, system: null, metadata: null });
        return;
    }

    const key = typeof registry.getActiveKey === 'function' ? registry.getActiveKey() : null;
    const system = typeof registry.getActiveSystem === 'function' ? registry.getActiveSystem() : null;
    updateActiveDescriptor({ key, system, metadata: null });
}

export function onRegistryChange(callback, { emitCurrent = true } = {}) {
    const registry = getSystemRegistry();
    if (!registry || typeof registry.onChange !== 'function' || typeof callback !== 'function') {
        return () => {};
    }

    const unsubscribe = registry.onChange(callback);
    if (emitCurrent) {
        const key = getActiveSystemKey();
        const system = getActiveSystem();
        if (key || system) {
            callback({ key, system, metadata: activeDescriptor.metadata });
        }
    }
    return unsubscribe;
}

export function getActiveSystemKey() {
    if (activeDescriptor.key) {
        return activeDescriptor.key;
    }
    if (typeof window !== 'undefined' && typeof window.currentSystem === 'string') {
        return window.currentSystem;
    }
    const registry = getSystemRegistry();
    if (registry && typeof registry.getActiveKey === 'function') {
        return registry.getActiveKey();
    }
    return null;
}

export function getActiveSystem() {
    if (activeDescriptor.system) {
        return activeDescriptor.system;
    }
    const registry = getSystemRegistry();
    if (registry && typeof registry.getActiveSystem === 'function') {
        return registry.getActiveSystem();
    }
    return null;
}

export function getActiveEngine() {
    const system = getActiveSystem();
    const engine = toEngine(system);
    if (engine) {
        return engine;
    }
    if (typeof window !== 'undefined') {
        return window.currentSystemEngine || window.engine || null;
    }
    return null;
}

export function getActiveParameterManager() {
    const engine = getActiveEngine();
    if (engine?.parameterManager) {
        return engine.parameterManager;
    }
    if (typeof window !== 'undefined') {
        return window.activeParameterManager || window.parameterManager || null;
    }
    return null;
}

export function getActiveParameterSnapshot() {
    const manager = getActiveParameterManager();
    if (manager?.getAllParameters) {
        try {
            return manager.getAllParameters();
        } catch (error) {
            console.warn('[SystemAccess] Active parameter manager snapshot failed', error);
        }
    }

    const engine = getActiveEngine();
    if (engine?.getParameters) {
        try {
            return engine.getParameters();
        } catch (error) {
            console.warn('[SystemAccess] Active engine parameter snapshot failed', error);
        }
    }

    return null;
}

export function hasSystemRegistry() {
    return !!getSystemRegistry();
}

// Initialize from window globals if they already exist (e.g., legacy pages)
if (typeof window !== 'undefined' && window.systemRegistry) {
    registerSystemRegistry(window.systemRegistry);
    syncActiveSystemState();
}
