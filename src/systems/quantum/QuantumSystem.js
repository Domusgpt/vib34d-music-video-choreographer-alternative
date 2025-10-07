import { BaseSystem } from '../shared/BaseSystem.js';
import { QuantumEngine } from '../../quantum/QuantumEngine.js';

const QUANTUM_LAYERS = [
    { id: 'quantum-background-canvas', role: 'background' },
    { id: 'quantum-shadow-canvas', role: 'shadow' },
    { id: 'quantum-content-canvas', role: 'content' },
    { id: 'quantum-highlight-canvas', role: 'highlight' },
    { id: 'quantum-accent-canvas', role: 'accent' }
];

export class QuantumSystem extends BaseSystem {
    constructor(config = {}) {
        super({
            key: 'quantum',
            name: 'Quantum Lattice Engine',
            description: 'Volumetric quantum renderer with lattice fields and higher dimensional rotations',
            canvas: QUANTUM_LAYERS,
            containerId: config.containerId || 'vib34dLayers'
        });
    }

    async onCreateEngine() {
        const engine = new QuantumEngine();
        if (typeof window !== 'undefined') {
            window.quantumEngine = engine;
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
            window.quantumEngine = this.engine;
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
            if (window.quantumEngine === this.engine) {
                window.quantumEngine = null;
            }
            if (window.currentSystemEngine === this.engine) {
                window.currentSystemEngine = null;
            }
        }
    }

    async onDestroy() {
        if (typeof window !== 'undefined' && window.quantumEngine === this.engine) {
            window.quantumEngine = null;
        }
    }
}
