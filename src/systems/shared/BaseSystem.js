/**
 * BaseSystem - foundational lifecycle for all visualization engines
 * Handles canvas creation, engine initialization, activation, and teardown
 */

export class BaseSystem {
    constructor(config = {}) {
        if (!config.key) {
            throw new Error('BaseSystem requires a unique `key` identifier');
        }

        this.key = config.key;
        this.name = config.name || config.key;
        this.description = config.description || '';
        this.canvasConfig = Array.isArray(config.canvas) ? config.canvas : [];
        this.autoResize = config.autoResize !== false;
        this.containerId = config.containerId || null;
        this.metadata = config.metadata || {};

        this.container = null;
        this.canvasElements = [];
        this.engine = null;
        this.canvasManager = null;
        this.isActive = false;
        this.isInitialized = false;
    }

    /**
     * Initialize the system with a container. Subclasses can override onInitialize
     */
    async initialize(options = {}) {
        if (this.isInitialized) {
            return;
        }

        const container = this.#resolveContainer(options.container || options.containerId || this.containerId);
        if (!container) {
            throw new Error(`[BaseSystem:${this.key}] Visualization container not found`);
        }

        this.container = container;
        if (typeof this.onInitialize === 'function') {
            await this.onInitialize(options);
        }

        this.isInitialized = true;
    }

    /**
     * Activate the system, creating canvases and booting the engine
     */
    async activate(options = {}) {
        const container = this.#resolveContainer(options.container || options.containerId || this.containerId);
        if (!container) {
            throw new Error(`[BaseSystem:${this.key}] Cannot activate without a container element`);
        }

        this.container = container;

        if (!this.isInitialized) {
            await this.initialize({ ...options, container });
        }

        this.#createCanvasElements(options);

        this.engine = await this.createEngine(options) || null;
        if (this.engine && typeof this.engine === 'object') {
            this.canvasManager = this.engine.canvasManager || null;
        }

        if (typeof this.onAfterEngineCreated === 'function') {
            await this.onAfterEngineCreated(options);
        }

        if (typeof this.onActivate === 'function') {
            await this.onActivate(options);
        }

        this.isActive = true;
        return this;
    }

    /**
     * Deactivate the system without discarding initialization metadata
     */
    async deactivate(options = {}) {
        if (!this.isActive) {
            return this;
        }

        if (typeof this.onDeactivate === 'function') {
            await this.onDeactivate(options);
        }

        await this.destroyEngine();

        this.isActive = false;
        return this;
    }

    /**
     * Fully destroy the system (engine + canvases)
     */
    async destroy(options = {}) {
        await this.deactivate(options);

        this.#removeCanvasElements();

        if (typeof this.onDestroy === 'function') {
            await this.onDestroy(options);
        }

        this.container = null;
        this.isInitialized = false;
        return this;
    }

    /**
     * Subclasses override to create their engine instance
     */
    async createEngine(options = {}) {
        if (typeof this.onCreateEngine === 'function') {
            return this.onCreateEngine(options);
        }
        return null;
    }

    /**
     * Destroy the engine instance safely
     */
    async destroyEngine() {
        if (this.engine && typeof this.engine.destroy === 'function') {
            try {
                this.engine.destroy();
            } catch (error) {
                console.warn(`[BaseSystem:${this.key}] Failed to destroy engine`, error);
            }
        }

        this.engine = null;
        this.canvasManager = null;
    }

    /**
     * Create canvas elements for each configured layer
     */
    #createCanvasElements(options = {}) {
        if (!this.container) return;

        const layerClass = options.layerClass || 'system-layer';
        const canvases = [];
        const width = this.container.clientWidth || window.innerWidth;
        const height = this.container.clientHeight || window.innerHeight;

        this.canvasConfig.forEach((layer, index) => {
            const id = layer.id || `${this.key}-layer-${index}`;
            const safeId = (typeof CSS !== 'undefined' && typeof CSS.escape === 'function')
                ? CSS.escape(id)
                : id.replace(/[^a-zA-Z0-9_-]/g, '_');
            const existing = this.container.querySelector(`#${safeId}`);
            if (existing) {
                existing.remove();
            }

            const element = document.createElement(layer.tag || 'canvas');
            element.id = id;
            element.className = layer.className || layerClass;
            if (layer.role) {
                element.dataset.role = layer.role;
            }

            this.container.appendChild(element);

            if (this.autoResize && typeof HTMLCanvasElement !== 'undefined' && element instanceof HTMLCanvasElement) {
                element.width = width;
                element.height = height;
            }

            canvases.push(element);
        });

        this.canvasElements = canvases;
    }

    /**
     * Remove managed canvas elements from the DOM
     */
    #removeCanvasElements() {
        if (!Array.isArray(this.canvasElements)) return;

        this.canvasElements.forEach(canvas => {
            if (canvas && canvas.parentElement) {
                canvas.parentElement.removeChild(canvas);
            }
        });

        this.canvasElements = [];
    }

    /**
     * Resolve container element from selector, element, or default id
     */
    #resolveContainer(target) {
        if (!target) {
            return this.container || (this.containerId ? document.getElementById(this.containerId) : null);
        }

        if (typeof target === 'string') {
            return document.getElementById(target) || document.querySelector(target);
        }

        if (typeof HTMLElement !== 'undefined' && target instanceof HTMLElement) {
            return target;
        }

        return null;
    }
}
