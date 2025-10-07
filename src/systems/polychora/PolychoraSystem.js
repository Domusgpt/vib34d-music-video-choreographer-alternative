import { BaseSystem } from '../shared/BaseSystem.js';
import { PolychoraEngine } from '../../polychora/PolychoraEngine.js';

const POLYCHORA_LAYERS = [
    { id: 'polychora-background-canvas', role: 'background' },
    { id: 'polychora-shadow-canvas', role: 'shadow' },
    { id: 'polychora-content-canvas', role: 'content' },
    { id: 'polychora-highlight-canvas', role: 'highlight' },
    { id: 'polychora-accent-canvas', role: 'accent' }
];

export class PolychoraSystem extends BaseSystem {
    constructor(config = {}) {
        super({
            key: 'polychora',
            name: 'Polychora 4D Engine',
            description: 'True 4D polytope renderer with advanced color + audio integration',
            canvas: POLYCHORA_LAYERS,
            containerId: config.containerId || 'vib34dLayers'
        });
    }

    async onCreateEngine() {
        const engine = new PolychoraEngine();
        if (typeof window !== 'undefined') {
            window.polychoraSystem = engine;
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
            window.polychoraSystem = this.engine;
            window.currentSystem = this.key;
            window.currentSystemEngine = this.engine;
        }
    }

    async onDeactivate() {
        if (!this.engine) return;
        if (typeof this.engine.setActive === 'function') {
            this.engine.setActive(false);
        } else {
            this.engine.isActive = false;
        }

        if (typeof window !== 'undefined') {
            if (window.polychoraSystem === this.engine) {
                window.polychoraSystem = null;
            }
            if (window.currentSystemEngine === this.engine) {
                window.currentSystemEngine = null;
            }
        }
    }

    async onDestroy() {
        if (typeof window !== 'undefined' && window.polychoraSystem === this.engine) {
            window.polychoraSystem = null;
        }
    }
}
