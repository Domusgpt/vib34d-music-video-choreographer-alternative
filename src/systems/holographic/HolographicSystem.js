import { BaseSystem } from '../shared/BaseSystem.js';
import { RealHolographicSystem } from '../../holograms/RealHolographicSystem.js';

const HOLOGRAPHIC_LAYERS = [
    { id: 'holo-background-canvas', role: 'background' },
    { id: 'holo-shadow-canvas', role: 'shadow' },
    { id: 'holo-content-canvas', role: 'content' },
    { id: 'holo-highlight-canvas', role: 'highlight' },
    { id: 'holo-accent-canvas', role: 'accent' }
];

export class HolographicSystem extends BaseSystem {
    constructor(config = {}) {
        super({
            key: 'holographic',
            name: 'Real Holographic System',
            description: 'Multi-layer holographic renderer with active variant catalog',
            canvas: HOLOGRAPHIC_LAYERS,
            containerId: config.containerId || 'vib34dLayers'
        });
    }

    async onCreateEngine() {
        const engine = new RealHolographicSystem();
        if (typeof window !== 'undefined') {
            window.holographicSystem = engine;
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
            window.holographicSystem = this.engine;
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
            if (window.holographicSystem === this.engine) {
                window.holographicSystem = null;
            }
            if (window.currentSystemEngine === this.engine) {
                window.currentSystemEngine = null;
            }
        }
    }

    async onDestroy() {
        if (typeof window !== 'undefined' && window.holographicSystem === this.engine) {
            window.holographicSystem = null;
        }
    }
}
