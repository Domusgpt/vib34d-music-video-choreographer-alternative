/**
 * SystemRegistry - orchestrates BaseSystem lifecycles and switching
 */

export class SystemRegistry {
    constructor(options = {}) {
        this.containerId = options.containerId || null;
        this.container = this.#resolveContainer(options.container || this.containerId);
        this.autoClear = options.autoClear !== false;
        this.destroyOnSwitch = options.destroyOnSwitch !== false;

        this.systems = new Map(); // key => { factory, instance, metadata }
        this.activeKey = null;
        this.listeners = new Set();
    }

    register(key, factory, metadata = {}) {
        if (!key) {
            throw new Error('SystemRegistry.register requires a unique key');
        }
        if (typeof factory !== 'function') {
            throw new Error(`SystemRegistry.register(${key}) requires a factory function`);
        }

        this.systems.set(key, {
            factory,
            instance: null,
            metadata
        });
    }

    has(key) {
        return this.systems.has(key);
    }

    getSystemMetadata(key = this.activeKey) {
        if (!key || !this.systems.has(key)) {
            return null;
        }

        const entry = this.systems.get(key);
        return entry?.metadata || null;
    }

    listSystems() {
        return Array.from(this.systems.entries()).map(([key, entry]) => ({
            key,
            metadata: entry?.metadata || null,
            isActive: key === this.activeKey
        }));
    }

    getActiveKey() {
        return this.activeKey;
    }

    getActiveSystem() {
        const entry = this.activeKey ? this.systems.get(this.activeKey) : null;
        return entry?.instance || null;
    }

    onChange(callback) {
        if (typeof callback === 'function') {
            this.listeners.add(callback);
        }
        return () => this.listeners.delete(callback);
    }

    async activate(key, options = {}) {
        if (!this.systems.has(key)) {
            throw new Error(`SystemRegistry could not find system: ${key}`);
        }

        const entry = this.systems.get(key);
        const container = this.#prepareContainer(options);

        if (this.activeKey && this.activeKey !== key) {
            await this.#deactivateCurrent({ reason: 'switch', next: key });
        }

        if (this.autoClear && container && options.clearContainer !== false) {
            container.innerHTML = '';
        }

        const system = await this.#ensureInstance(entry, { container });
        await system.activate({ ...options, container });

        this.activeKey = key;
        if (typeof window !== 'undefined') {
            window.currentSystem = key;
            window.currentSystemEngine = system.engine || null;
        }

        this.listeners.forEach(listener => {
            try {
                listener({ key, system, metadata: entry.metadata });
            } catch (error) {
                console.warn('[SystemRegistry] listener error', error);
            }
        });

        return system;
    }

    async deactivate(key, options = {}) {
        if (!this.systems.has(key)) return;
        const entry = this.systems.get(key);
        if (!entry.instance) return;

        await entry.instance.deactivate({ ...options, reason: options.reason || 'manual' });
        if (this.destroyOnSwitch || options.destroy !== false) {
            await entry.instance.destroy({ ...options, reason: options.reason || 'manual' });
            entry.instance = null;
        }

        if (this.activeKey === key) {
            this.activeKey = null;
            if (typeof window !== 'undefined' && window.currentSystem === key) {
                window.currentSystem = null;
                window.currentSystemEngine = null;
            }
        }
    }

    async destroyAll(options = {}) {
        const keys = Array.from(this.systems.keys());
        for (const key of keys) {
            await this.deactivate(key, { ...options, destroy: true, reason: 'registry-destroy' });
        }
        this.systems.clear();
        this.activeKey = null;
    }

    #resolveContainer(target) {
        if (!target) return null;
        if (typeof target === 'string') {
            return document.getElementById(target) || document.querySelector(target);
        }
        if (typeof HTMLElement !== 'undefined' && target instanceof HTMLElement) {
            return target;
        }
        return null;
    }

    #prepareContainer(options = {}) {
        if (options.container) {
            return options.container;
        }

        if (!this.container || options.containerId) {
            this.container = this.#resolveContainer(options.containerId || this.containerId);
        }

        if (!this.container) {
            this.container = this.#resolveContainer('vib34dLayers');
        }

        if (!this.container) {
            throw new Error('SystemRegistry could not resolve a visualization container');
        }

        return this.container;
    }

    async #ensureInstance(entry, context = {}) {
        if (entry.instance) {
            return entry.instance;
        }

        const instance = await entry.factory({ metadata: entry.metadata, container: context.container });
        if (!instance) {
            throw new Error('SystemRegistry factory did not return a system instance');
        }

        if (context.container) {
            await instance.initialize({ container: context.container });
        }

        entry.instance = instance;
        return instance;
    }

    async #deactivateCurrent(options = {}) {
        if (!this.activeKey) return;
        const currentKey = this.activeKey;
        const currentEntry = this.systems.get(currentKey);
        if (!currentEntry?.instance) {
            this.activeKey = null;
            return;
        }

        await currentEntry.instance.deactivate({ reason: options.reason || 'switch', nextSystem: options.next });
        if (this.destroyOnSwitch) {
            await currentEntry.instance.destroy({ reason: options.reason || 'switch', nextSystem: options.next });
            currentEntry.instance = null;
        }

        if (typeof window !== 'undefined' && window.currentSystem === currentKey) {
            window.currentSystem = null;
            window.currentSystemEngine = null;
        }

        this.activeKey = null;
    }
}
