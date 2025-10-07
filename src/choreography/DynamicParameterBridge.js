import {
    getActiveEngine as getRegistryEngine,
    getActiveParameterManager as getRegistryParameterManager
} from '../systems/shared/SystemAccess.js';

export class DynamicParameterBridge {
    constructor(choreographer) {
        this.choreographer = choreographer;
        this.parameterRegistry = new Map();
        this.actionHandlers = new Map();
    }

    registerParameter(name, definition = {}) {
        if (!name) return;
        const existing = this.parameterRegistry.get(name) || {};
        const merged = { ...existing, ...definition };
        this.parameterRegistry.set(name, merged);

        this._registerWithEngine(name, merged);
    }

    bindToEngine(engine) {
        const targetEngine = engine || this._resolveEngine();
        if (!targetEngine) return;
        this.parameterRegistry.forEach((definition, name) => {
            this._registerWithEngine(name, definition, targetEngine);
        });
    }

    registerAction(type, handler) {
        if (!type || typeof handler !== 'function') return;
        this.actionHandlers.set(type, handler);
    }

    normalizeSequences(rawSequences) {
        if (!Array.isArray(rawSequences)) {
            throw new Error('Choreography data must be an array');
        }

        return rawSequences.map((entry, index) => {
            const safeEntry = entry || {};
            const time = this._coerceNumber(
                safeEntry.time,
                safeEntry.start,
                safeEntry.startTime,
                safeEntry.begin,
                0
            );
            const duration = Math.max(0.5, this._coerceNumber(
                safeEntry.duration,
                safeEntry.length,
                safeEntry.dur,
                safeEntry.span,
                8
            ));

            const effectsSource = typeof safeEntry.effects === 'object' && safeEntry.effects !== null
                ? { ...safeEntry.effects }
                : {};

            const effects = {
                ...effectsSource,
            };

            if (safeEntry.system && !effects.system) effects.system = safeEntry.system;
            if (safeEntry.geometry && !effects.geometry) effects.geometry = safeEntry.geometry;
            if (safeEntry.rotation && !effects.rotation) effects.rotation = safeEntry.rotation;
            if (safeEntry.colorShift && !effects.colorShift) effects.colorShift = safeEntry.colorShift;

            const parameters = safeEntry.parameters || safeEntry.dynamicParameters || effects.parameters;
            if (parameters) {
                effects.parameters = { ...parameters };
            }

            const actions = safeEntry.actions || effects.actions;
            if (actions) {
                effects.actions = Array.isArray(actions) ? actions.slice() : [actions];
            }

            const definitions = safeEntry.define || effects.define;
            if (definitions && typeof definitions === 'object') {
                Object.entries(definitions).forEach(([name, definition]) => {
                    this.registerParameter(name, definition);
                });
                delete effects.define;
            }

            return {
                time,
                duration,
                effects,
                index
            };
        }).sort((a, b) => a.time - b.time);
    }

    apply(effects, audioData) {
        if (!effects) return;

        if (effects.define && typeof effects.define === 'object') {
            Object.entries(effects.define).forEach(([name, definition]) => {
                this.registerParameter(name, definition);
            });
        }

        if (effects.parameters) {
            this._applyParameters(effects.parameters, audioData);
        }

        if (effects.actions) {
            this._executeActions(effects.actions, audioData);
        }
    }

    _applyParameters(parameters, audioData) {
        Object.entries(parameters).forEach(([name, descriptor]) => {
            const resolvedValue = this._resolveDescriptor(descriptor, audioData, name);
            this._setEngineParameter(name, resolvedValue, descriptor);
        });
    }

    _executeActions(actions, audioData) {
        const list = Array.isArray(actions) ? actions : [actions];
        list.forEach(action => {
            if (!action) return;

            if (typeof action === 'string') {
                this._invokeAction({ type: action }, audioData);
                return;
            }

            this._invokeAction(action, audioData);
        });
    }

    _invokeAction(action, audioData) {
        const { type, method, target = 'engine' } = action;
        const handler = type && this.actionHandlers.get(type);
        if (handler) {
            try {
                handler({ action, audioData, choreographer: this.choreographer });
                return;
            } catch (err) {
                console.warn('[DynamicParameterBridge] custom action failed', type, err);
                return;
            }
        }

        const engine = this._resolveEngine();
        if (!engine) return;

        const methodName = method || type;
        if (!methodName) return;

        const args = Array.isArray(action.args) ? action.args : (action.payload ? [action.payload] : []);
        let context = engine;

        if (target === 'manager' && this.choreographer.canvasManager) {
            context = this.choreographer.canvasManager;
        } else if (target === 'audio' && this.choreographer.audioContext) {
            context = this.choreographer.audioContext;
        }

        const fn = context && context[methodName];
        if (typeof fn === 'function') {
            try {
                fn.apply(context, [...args, audioData]);
            } catch (err) {
                console.warn('[DynamicParameterBridge] action invocation failed', methodName, err);
            }
        }
    }

    _resolveDescriptor(descriptor, audioData, name) {
        if (typeof descriptor === 'number' || Array.isArray(descriptor)) {
            return descriptor;
        }

        if (typeof descriptor === 'string') {
            if (audioData && descriptor in audioData) {
                return audioData[descriptor];
            }
            return descriptor;
        }

        if (!descriptor || typeof descriptor !== 'object') {
            return descriptor;
        }

        const registryMeta = this.parameterRegistry.get(name) || {};
        const base = descriptor.value ?? descriptor.base ?? registryMeta.base ?? registryMeta.default ?? 0;
        let value = base;

        if (descriptor.randomize) {
            const amount = typeof descriptor.randomize === 'number'
                ? descriptor.randomize
                : (descriptor.randomize.amount ?? 0);
            value += (Math.random() * 2 - 1) * amount;
        }

        if (descriptor.audioAxis || descriptor.audio) {
            const axis = descriptor.audioAxis || descriptor.audio;
            const axisValue = this._sampleAudioAxis(axis, audioData);
            const scale = descriptor.scale ?? descriptor.multiplier ?? 1;
            const bias = descriptor.offset ?? descriptor.bias ?? 0;
            value += axisValue * scale + bias;
        }

        if (descriptor.expression && audioData) {
            try {
                const fn = new Function('audio', `return (${descriptor.expression});`);
                value = fn(audioData);
            } catch (err) {
                console.warn('[DynamicParameterBridge] expression failed', err);
            }
        }

        if (descriptor.wave) {
            const { speed = 1, amplitude = 1, phase = 0 } = descriptor.wave;
            const t = this.choreographer.audio ? this.choreographer.audio.currentTime : 0;
            value += Math.sin(t * speed + phase) * amplitude;
        }

        if (descriptor.mode) {
            const current = this._getCurrentParameterValue(name);
            value = this._applyMode(current, value, descriptor.mode, descriptor);
        }

        const range = descriptor.range || registryMeta.range;
        if (range) {
            value = this._applyRange(value, range);
        }

        if (descriptor.precision !== undefined && typeof value === 'number') {
            const factor = Math.pow(10, descriptor.precision);
            value = Math.round(value * factor) / factor;
        }

        return value;
    }

    _sampleAudioAxis(axis, audioData) {
        if (!audioData) return 0;
        if (typeof axis === 'string' && axis in audioData) {
            return audioData[axis];
        }
        if (Array.isArray(axis)) {
            return axis
                .map(key => (typeof key === 'string' && key in audioData) ? audioData[key] : 0)
                .reduce((acc, val) => acc + val, 0) / axis.length;
        }
        if (typeof axis === 'function') {
            try {
                return axis(audioData);
            } catch (err) {
                console.warn('[DynamicParameterBridge] audio axis fn failed', err);
            }
        }
        return 0;
    }

    _applyRange(value, range) {
        if (!range) return value;
        if (Array.isArray(range)) {
            const [min, max] = range;
            if (typeof value === 'number') {
                return Math.min(max ?? value, Math.max(min ?? value, value));
            }
            return value;
        }
        if (typeof range === 'object') {
            const min = range.min ?? range.lower;
            const max = range.max ?? range.upper;
            if (typeof value === 'number') {
                return Math.min(max ?? value, Math.max(min ?? value, value));
            }
        }
        return value;
    }

    _applyMode(current, incoming, mode, descriptor) {
        if (current === undefined || current === null || typeof current !== 'number') {
            return incoming;
        }

        switch (mode) {
            case 'add':
            case 'additive':
                return current + incoming;
            case 'multiply':
            case 'mult':
                return current * incoming;
            case 'mix': {
                const weight = descriptor?.weight ?? descriptor?.mix ?? 0.5;
                return current * (1 - weight) + incoming * weight;
            }
            case 'max':
                return Math.max(current, incoming);
            case 'min':
                return Math.min(current, incoming);
            default:
                return incoming;
        }
    }

    _getCurrentParameterValue(name) {
        const engine = this._resolveEngine();
        if (!engine) return undefined;

        try {
            const manager = this._resolveParameterManager(engine);
            if (manager) {
                if (manager.getParameterValue) {
                    return manager.getParameterValue(name);
                }
                if (manager.getParameter) {
                    return manager.getParameter(name);
                }
            }
        } catch (err) {
            console.warn('[DynamicParameterBridge] getParameterValue failed', name, err);
        }

        if (name in engine) {
            return engine[name];
        }

        return undefined;
    }

    _setEngineParameter(name, value, descriptor) {
        const engine = this.choreographer.currentEngine;
        if (!engine) return;

        const meta = (descriptor && typeof descriptor === 'object') ? descriptor : {};
        const registryMeta = this.parameterRegistry.get(name) || {};
        const methodName = meta.method || registryMeta.method;
        const target = meta.target || registryMeta.target || 'engine';
        const allowOverflow = meta.allowOverflow ?? registryMeta.allowOverflow ?? false;
        const definition = meta.definition || registryMeta.definition || registryMeta;

        const applyToEngine = (eng) => {
            if (!eng) return false;

            if (methodName && typeof eng[methodName] === 'function') {
                try {
                    eng[methodName](value, meta, this.choreographer, registryMeta);
                    return true;
                } catch (err) {
                    console.warn('[DynamicParameterBridge] method application failed', methodName, err);
                }
            }

            const manager = this._resolveParameterManager(eng);
            if (manager) {
                const definitionPayload = this._createParameterDefinition(definition);
                if (manager.setParameterExternal && manager.setParameterExternal(name, value, {
                    allowOverflow,
                    register: !!(definitionPayload && (allowOverflow || this.parameterRegistry.has(name))),
                    definition: definitionPayload,
                    defaultValue: definitionPayload?.defaultValue ?? registryMeta.base ?? 0
                })) {
                    return true;
                }

                if (manager.setParameter && manager.setParameter(name, value)) {
                    return true;
                }
            }

            if (eng.parameterManager && eng.parameterManager !== manager) {
                if (eng.parameterManager.setParameter && eng.parameterManager.setParameter(name, value)) {
                    return true;
                }
            }

            if (eng.updateParameter) {
                try {
                    eng.updateParameter(name, value);
                    return true;
                } catch (err) {
                    console.warn('[DynamicParameterBridge] updateParameter failed', name, err);
                }
            }

            if (eng.updateParameters) {
                try {
                    eng.updateParameters({ [name]: value });
                    return true;
                } catch (err) {
                    console.warn('[DynamicParameterBridge] updateParameters failed', name, err);
                }
            }

            if (name in eng) {
                eng[name] = value;
                return true;
            }

            return false;
        };

        if (target === 'manager') {
            const manager = this._resolveParameterManager(engine) || this.choreographer.canvasManager;
            if (manager && applyToEngine(manager)) return;
        }

        if (!applyToEngine(engine) && meta.fallbackToManager && this.choreographer.canvasManager) {
            applyToEngine(this.choreographer.canvasManager);
        }
    }

    _coerceNumber(...candidates) {
        for (const candidate of candidates) {
            if (candidate === undefined || candidate === null) continue;
            const value = Number(candidate);
            if (!Number.isNaN(value)) {
                return value;
            }
        }
        return 0;
    }

    _registerWithEngine(name, definition, engine = this._resolveEngine()) {
        const manager = this._resolveParameterManager(engine);
        if (!manager || !manager.registerDynamicParameter) {
            return;
        }

        const normalized = this._createParameterDefinition(definition);
        if (!normalized) {
            return;
        }

        manager.registerDynamicParameter(name, normalized);
    }

    _resolveEngine() {
        return this.choreographer?.currentEngine || getRegistryEngine();
    }

    _resolveParameterManager(engine = this._resolveEngine()) {
        const registryManager = getRegistryParameterManager();
        if (registryManager) {
            return registryManager;
        }
        if (engine?.parameterManager) {
            return engine.parameterManager;
        }
        return null;
    }

    _createParameterDefinition(definition = {}) {
        if (!definition || typeof definition !== 'object') {
            return null;
        }

        const output = {};

        if (definition.range) {
            if (Array.isArray(definition.range)) {
                output.min = definition.range[0];
                output.max = definition.range[1];
            } else if (typeof definition.range === 'object') {
                output.min = definition.range.min ?? definition.range.lower;
                output.max = definition.range.max ?? definition.range.upper;
            }
        }

        if (definition.min !== undefined) output.min = definition.min;
        if (definition.max !== undefined) output.max = definition.max;
        if (definition.step !== undefined) output.step = definition.step;
        if (definition.type) output.type = definition.type;
        if (definition.allowOverflow !== undefined) output.allowOverflow = definition.allowOverflow;
        if (definition.default !== undefined) output.defaultValue = definition.default;
        if (definition.base !== undefined && output.defaultValue === undefined) output.defaultValue = definition.base;

        if (Object.keys(output).length === 0) {
            return null;
        }

        return output;
    }
}
