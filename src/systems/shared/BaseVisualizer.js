/**
 * BaseVisualizer - shared interface for WebGL / Canvas visualizers
 */

export class BaseVisualizer {
    constructor(config = {}) {
        this.id = config.id || null;
        this.role = config.role || 'content';
        this.reactivity = config.reactivity ?? 1.0;
        this.canvas = null;
        this.gl = null;
        this.contextType = config.contextType || 'webgl2';
        this.isInitialized = false;
    }

    /**
     * Resolve canvas and acquire rendering context
     */
    initializeCanvas() {
        if (!this.id) {
            throw new Error('BaseVisualizer requires a canvas id');
        }

        const canvas = document.getElementById(this.id);
        if (!canvas) {
            throw new Error(`BaseVisualizer could not find canvas with id ${this.id}`);
        }

        this.canvas = canvas;
        this.gl = canvas.getContext(this.contextType) || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        this.isInitialized = true;
        return this.gl;
    }

    /** Override in subclasses */
    updateFromAudio(_audioState) {}

    /** Override in subclasses */
    updateParameters(_params) {}

    /** Override in subclasses */
    render(_time) {}

    destroy() {
        this.canvas = null;
        this.gl = null;
        this.isInitialized = false;
    }
}
