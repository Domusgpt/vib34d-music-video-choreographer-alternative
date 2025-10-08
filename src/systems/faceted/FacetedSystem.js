import { BaseSystem } from '../shared/BaseSystem.js';
import { VIB34DIntegratedEngine } from '../../core/Engine.js';

const FACETED_LAYERS = [
    { id: 'background-canvas', role: 'background' },
    { id: 'shadow-canvas', role: 'shadow' },
    { id: 'content-canvas', role: 'content' },
    { id: 'highlight-canvas', role: 'highlight' },
    { id: 'accent-canvas', role: 'accent' }
];

export class FacetedSystem extends BaseSystem {
    constructor(config = {}) {
        super({
            key: 'faceted',
            name: 'Faceted Holographic Grid',
            description: 'Five-layer holographic renderer with polychora geometry',
            canvas: FACETED_LAYERS,
            containerId: config.containerId || 'vib34dLayers'
        });
    }

    async onCreateEngine() {
        const engine = new VIB34DIntegratedEngine();
        if (typeof window !== 'undefined') {
            window.engine = engine;
            window.currentSystem = this.key;
            window.currentSystemEngine = engine;
        }
        return engine;
    }

    async onActivate() {
        if (!this.engine) return;
        if (typeof this.engine.setActive === 'function') {
            this.engine.setActive(true);
        } else {
            this.engine.isActive = true;
        }

        if (typeof window !== 'undefined') {
            window.engine = this.engine;
            window.currentSystem = this.key;
            window.currentSystemEngine = this.engine;
        }
    }

    async onDeactivate() {
        if (!this.engine) return;

        if (typeof this.engine.stopRenderLoop === 'function') {
            try {
                this.engine.stopRenderLoop();
            } catch (error) {
                console.warn('[FacetedSystem] Failed to stop render loop', error);
            }
        }

        if (typeof this.engine.setActive === 'function') {
            this.engine.setActive(false);
        } else {
            this.engine.isActive = false;
        }

        if (typeof window !== 'undefined') {
            if (window.engine === this.engine) {
                window.engine = null;
            }
            if (window.currentSystemEngine === this.engine) {
                window.currentSystemEngine = null;
            }
        }
    }

    async onDestroy() {
        if (typeof window !== 'undefined' && window.engine === this.engine) {
            window.engine = null;
        }
    }
}
