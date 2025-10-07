import { ParameterManager } from '../core/Parameters.js';
import { PolychoraVisualizer } from './PolychoraVisualizer.js';

const LAYERS = [
    { id: 'polychora-background-canvas', role: 'background' },
    { id: 'polychora-shadow-canvas', role: 'shadow' },
    { id: 'polychora-content-canvas', role: 'content' },
    { id: 'polychora-highlight-canvas', role: 'highlight' },
    { id: 'polychora-accent-canvas', role: 'accent' }
];

export class PolychoraEngine {
    constructor() {
        this.parameterManager = new ParameterManager();
        this.parameters = this.parameterManager; // Legacy compatibility
        this.visualizers = [];
        this.isActive = false;
        this.animationId = null;
        this.clickPulse = 0;
        this.audioSettings = {
            bassToRotation: 2.0,
            midToMorph: 1.2,
            highToColor: 1.0
        };

        this.createVisualizers();
        this.applyParametersToVisualizers();
    }

    createVisualizers() {
        this.visualizers = [];
        const params = this.parameterManager.getAllParameters();

        LAYERS.forEach(layer => {
            const visualizer = new PolychoraVisualizer(layer.id, layer.role, 1.0);
            if (visualizer && visualizer.gl) {
                visualizer.updateParameters(params);
                this.visualizers.push(visualizer);
            }
        });
    }

    applyParametersToVisualizers() {
        const snapshot = this.parameterManager.getAllParameters();
        this.visualizers.forEach(visualizer => visualizer.updateParameters(snapshot));
    }

    startRenderLoop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        const render = () => {
            if (!this.isActive) {
                this.animationId = null;
                return;
            }

            if (this.clickPulse > 0.001) {
                const boost = this.clickPulse * 0.2;
                const baseIntensity = this.parameterManager.getParameter('intensity') ?? 0.7;
                const boosted = Math.min(1.5, baseIntensity + boost);
                this.visualizers.forEach(visualizer => {
                    visualizer.updateParameters({ intensity: boosted });
                });
                this.clickPulse *= 0.92;
                if (this.clickPulse < 0.001) {
                    this.applyParametersToVisualizers();
                }
            }

            this.visualizers.forEach(visualizer => visualizer.render());
            this.animationId = requestAnimationFrame(render);
        };

        this.animationId = requestAnimationFrame(render);
    }

    stopRenderLoop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    setActive(active) {
        if (this.isActive === active) {
            return;
        }

        this.isActive = active;
        if (active) {
            this.applyParametersToVisualizers();
            this.startRenderLoop();
        } else {
            this.stopRenderLoop();
        }
    }

    updateParameter(name, value) {
        const result = this.parameterManager.setParameter(name, value);
        if (result !== false) {
            this.applyParametersToVisualizers();
        }
        return result;
    }

    updateParameters(params = {}) {
        Object.entries(params).forEach(([key, value]) => {
            this.parameterManager.setParameter(key, value);
        });
        this.applyParametersToVisualizers();
    }

    getParameters() {
        return this.parameterManager.getAllParameters();
    }

    setParameters(params = {}) {
        if (!params) return;
        this.parameterManager.loadParameters?.(params);
        Object.entries(params).forEach(([key, value]) => {
            this.parameterManager.setParameter(key, value);
        });
        this.applyParametersToVisualizers();
    }

    triggerClick(strength = 1) {
        this.clickPulse = Math.min(1.5, this.clickPulse + Math.max(0, strength));
    }

    updateAudioReactivity(settings = {}) {
        if (settings && typeof settings === 'object') {
            this.audioSettings = { ...this.audioSettings, ...settings };
        }
        return this.audioSettings;
    }

    start() {
        this.setActive(true);
    }

    stop() {
        this.setActive(false);
    }

    getParameter(name) {
        return this.parameterManager.getParameter(name);
    }

    destroy() {
        this.stopRenderLoop();
        this.visualizers.forEach(visualizer => visualizer.cleanup());
        this.visualizers = [];
    }
}
