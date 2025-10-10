/**
 * VIB34D Quantum Engine
 * Manages the enhanced quantum system with complex 3D lattice functions
 */

import { QuantumHolographicVisualizer } from './QuantumVisualizer.js';
import { ParameterManager } from '../core/Parameters.js';
import { GeometryLibrary } from '../geometry/GeometryLibrary.js';

export class QuantumEngine {
    constructor() {
        console.log('🔮 Initializing VIB34D Quantum Engine...');

        this.visualizers = [];
        this.parameters = new ParameterManager();
        this.isActive = false;

        this.geometryNames = [];
        this.geometryMetadata = [];
        this.geometryUnsubscribe = null;
        this.activeGeometryLabel = 'Unknown';
        this.lastGeometryLogSignature = '';

        this.initializeGeometryManagement();

        // REMOVED: Built-in reactivity - ReactivityManager handles all interactions now

        // Initialize with quantum-enhanced defaults
        this.parameters.setParameter('hue', 280); // Purple-blue for quantum
        this.parameters.setParameter('intensity', 0.7); // Higher intensity
        this.parameters.setParameter('saturation', 0.9); // More vivid
        this.parameters.setParameter('gridDensity', 20); // Denser patterns
        this.parameters.setParameter('morphFactor', 1.0);
        
        this.init();
    }

    initializeGeometryManagement() {
        const initialNames = GeometryLibrary.getGeometryNames();
        this.handleGeometryUpdate(initialNames);
        this.subscribeToGeometryLibrary();
    }

    buildGeometryList(source = []) {
        const list = Array.isArray(source) ? source : [];
        const deduped = [];
        const seen = new Set();

        list.forEach((name) => {
            const normalized = GeometryLibrary.normalizeName(name);
            if (!normalized) {
                return;
            }

            const key = normalized.toUpperCase();
            if (seen.has(key)) {
                return;
            }

            seen.add(key);
            deduped.push(GeometryLibrary.formatDisplayName(normalized));
        });

        return deduped;
    }

    getFallbackGeometryNames() {
        if (Array.isArray(GeometryLibrary?.baseGeometries) && GeometryLibrary.baseGeometries.length) {
            return this.buildGeometryList(GeometryLibrary.baseGeometries);
        }

        return [
            'Tetrahedron',
            'Hypercube',
            'Sphere',
            'Torus',
            'Klein Bottle',
            'Fractal',
            'Wave',
            'Crystal'
        ];
    }

    resolveGeometryIndex(value) {
        const catalog = this.geometryNames.length ? this.geometryNames : this.getFallbackGeometryNames();
        if (!catalog.length) {
            return 0;
        }

        if (typeof value === 'string') {
            const normalized = GeometryLibrary.normalizeName(value);
            if (normalized) {
                const searchKey = normalized.toUpperCase();
                const foundIndex = catalog.findIndex(
                    (name) => GeometryLibrary.normalizeName(name).toUpperCase() === searchKey
                );

                if (foundIndex !== -1) {
                    return foundIndex;
                }
            }

            const parsed = Number(value);
            if (Number.isFinite(parsed)) {
                return this.resolveGeometryIndex(parsed);
            }

            return 0;
        }

        let numeric = Number(value);
        if (!Number.isFinite(numeric)) {
            numeric = 0;
        }

        numeric = Math.round(numeric);
        if (numeric < 0) {
            numeric = 0;
        }

        if (numeric >= catalog.length) {
            numeric = catalog.length - 1;
        }

        return numeric;
    }

    handleGeometryUpdate(names) {
        const next = this.buildGeometryList(names);
        const catalog = next.length ? next : this.getFallbackGeometryNames();

        this.geometryNames = catalog;
        this.geometryMetadata = GeometryLibrary.getGeometryMetadata(catalog);

        this.parameters.updateGeometryRange(catalog.length);
        const activeIndex = this.resolveGeometryIndex(this.parameters.getParameter('geometry'));
        this.parameters.setParameter('geometry', activeIndex);
        this.activeGeometryLabel = this.getGeometryDisplayName(activeIndex);

        this.visualizers.forEach((visualizer) => {
            if (typeof visualizer.updateGeometryMetadata === 'function') {
                visualizer.updateGeometryMetadata(catalog, this.geometryMetadata);
            }
            if (typeof visualizer.updateParameters === 'function') {
                visualizer.updateParameters({ geometry: activeIndex });
            }
        });

        this.logGeometryUpdate(catalog, activeIndex);
    }

    subscribeToGeometryLibrary() {
        if (typeof GeometryLibrary?.subscribe !== 'function') {
            return;
        }

        if (typeof this.geometryUnsubscribe === 'function') {
            this.geometryUnsubscribe();
        }

        this.geometryUnsubscribe = GeometryLibrary.subscribe(({ names }) => {
            this.handleGeometryUpdate(Array.isArray(names) ? names : []);
        });
    }

    logGeometryUpdate(catalog = [], activeIndex = 0) {
        const label = catalog[activeIndex] || 'Unknown';
        const signature = `${catalog.join('|')}::${activeIndex}`;

        if (this.lastGeometryLogSignature === signature) {
            return;
        }

        this.lastGeometryLogSignature = signature;
        console.log('🌌 Quantum geometry catalog updated:', catalog);
        console.log(`🌌 Active quantum geometry → ${label}`);
    }

    getGeometryDisplayName(index) {
        const catalog = this.geometryNames.length ? this.geometryNames : this.getFallbackGeometryNames();
        return catalog[index] || 'Unknown';
    }

    getGeometryNames() {
        return [...this.geometryNames];
    }

    getActiveGeometryName() {
        return this.activeGeometryLabel;
    }
    
    /**
     * Initialize the quantum system
     */
    init() {
        this.createVisualizers();
        this.setupAudioReactivity();
        // REMOVED: Built-in gesture reactivity - ReactivityManager handles all interactions
        this.startRenderLoop();
        console.log('✨ Quantum Engine initialized with audio reactivity');
    }
    
    /**
     * Create quantum visualizers for all 5 layers
     */
    createVisualizers() {
        const layers = [
            { id: 'quantum-background-canvas', role: 'background', reactivity: 0.4 },
            { id: 'quantum-shadow-canvas', role: 'shadow', reactivity: 0.6 },
            { id: 'quantum-content-canvas', role: 'content', reactivity: 1.0 },
            { id: 'quantum-highlight-canvas', role: 'highlight', reactivity: 1.3 },
            { id: 'quantum-accent-canvas', role: 'accent', reactivity: 1.6 }
        ];
        
        layers.forEach(layer => {
            try {
                // Canvas elements should already exist in HTML
                const canvas = document.getElementById(layer.id);
                if (!canvas) {
                    console.warn(`⚠️ Canvas ${layer.id} not found in DOM - skipping`);
                    return;
                }
                
                const visualizer = new QuantumHolographicVisualizer(layer.id, layer.role, layer.reactivity, 0);
                if (visualizer.gl) {
                    this.visualizers.push(visualizer);
                    console.log(`🌌 Created quantum layer: ${layer.role}`);
                } else {
                    console.warn(`⚠️ No WebGL context for quantum layer ${layer.id}`);
                }
            } catch (error) {
                console.warn(`Failed to create quantum layer ${layer.id}:`, error);
            }
        });
        
        console.log(`✅ Created ${this.visualizers.length} quantum visualizers with enhanced effects`);
    }
    
    /**
     * Set system active/inactive
     */
    setActive(active) {
        this.isActive = active;
        
        if (active) {
            // Show quantum layers
            const quantumLayers = document.getElementById('quantumLayers');
            if (quantumLayers) {
                quantumLayers.style.display = 'block';
            }
            
            // Enable audio if global audio is enabled
            if (window.audioEnabled && !this.audioEnabled) {
                this.enableAudio();
            }
            
            console.log('🔮 Quantum System ACTIVATED - Audio frequency reactivity mode');
        } else {
            // Hide quantum layers
            const quantumLayers = document.getElementById('quantumLayers');
            if (quantumLayers) {
                quantumLayers.style.display = 'none';
            }
            console.log('🔮 Quantum System DEACTIVATED');
        }
    }
    
    // Method to be called when global audio is toggled
    toggleAudio(enabled) {
        if (enabled && this.isActive && !this.audioEnabled) {
            this.enableAudio();
        } else if (!enabled && this.audioEnabled) {
            // Disable audio
            this.audioEnabled = false;
            if (this.audioContext) {
                this.audioContext.close();
                this.audioContext = null;
            }
            console.log('🔇 Quantum audio reactivity disabled');
        }
    }
    
    /**
     * Setup audio frequency reactivity for Quantum system
     */
    setupAudioReactivity() {
        console.log('🌌 Setting up Quantum audio frequency reactivity');
        // Audio setup will be triggered when audio is enabled
    }
    
    // REMOVED: All built-in reactivity methods - ReactivityManager handles everything
    
    async enableAudio() {
        if (this.audioEnabled) return;
        
        try {
            // Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Create audio context and analyser
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            
            // Configure analyser for frequency analysis
            this.analyser.fftSize = 256;
            this.analyser.smoothingTimeConstant = 0.8;
            this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
            
            // Connect microphone to analyser
            const source = this.audioContext.createMediaStreamSource(stream);
            source.connect(this.analyser);
            
            this.audioEnabled = true;
            console.log('🎵 Quantum audio reactivity enabled');
            
        } catch (error) {
            console.error('❌ Failed to enable Quantum audio:', error);
            this.audioEnabled = false;
        }
    }
    
    /**
     * Update parameter across all quantum visualizers with enhanced integration
     */
    updateParameter(param, value) {
        let nextValue = value;

        if (param === 'geometry') {
            nextValue = this.resolveGeometryIndex(value);
        }

        // Update internal parameter manager
        this.parameters.setParameter(param, nextValue);

        if (param === 'geometry') {
            this.activeGeometryLabel = this.getGeometryDisplayName(nextValue);
        }

        // CRITICAL: Apply to all quantum visualizers with immediate render
        this.visualizers.forEach(visualizer => {
            if (visualizer.updateParameters) {
                const params = {};
                params[param] = nextValue;
                visualizer.updateParameters(params);
            } else {
                // Fallback: direct parameter update with manual render
                if (visualizer.params) {
                    visualizer.params[param] = nextValue;
                    if (visualizer.render) {
                        visualizer.render();
                    }
                }
            }
        });

        console.log(`🔮 Updated quantum ${param}: ${nextValue}`);
    }
    
    /**
     * Update multiple parameters
     */
    updateParameters(params) {
        Object.keys(params).forEach(param => {
            this.updateParameter(param, params[param]);
        });
    }
    
    /**
     * Update mouse interaction
     */
    updateInteraction(x, y, intensity) {
        this.visualizers.forEach(visualizer => {
            if (visualizer.updateInteraction) {
                visualizer.updateInteraction(x, y, intensity);
            }
        });
    }
    
    /**
     * Get current parameters for saving/export
     */
    getParameters() {
        return this.parameters.getAllParameters();
    }
    
    /**
     * Set parameters from loaded/imported data
     */
    setParameters(params) {
        const sanitized = { ...params };

        if (Object.prototype.hasOwnProperty.call(sanitized, 'geometry')) {
            sanitized.geometry = this.resolveGeometryIndex(sanitized.geometry);
        }

        Object.keys(sanitized).forEach(param => {
            this.parameters.setParameter(param, sanitized[param]);
        });
        this.updateParameters(sanitized);
    }
    
    /**
     * Start the render loop
     */
    startRenderLoop() {
        if (window.mobileDebug) {
            window.mobileDebug.log(`🎬 Quantum Engine: Starting render loop with ${this.visualizers?.length} visualizers, isActive=${this.isActive}`);
        }
        
        const render = () => {
            if (this.isActive) {
                // MVEP-STYLE AUDIO PROCESSING: Use global audio data instead of internal processing
                // This eliminates conflicts with holographic system and ensures consistent audio reactivity
                // Audio reactivity now handled directly in visualizer render loops
                
                // CRITICAL FIX: Update visualizer parameters before rendering
                const currentParams = this.parameters.getAllParameters();
                
                this.visualizers.forEach(visualizer => {
                    if (visualizer.updateParameters && visualizer.render) {
                        visualizer.updateParameters(currentParams);
                        visualizer.render();
                    }
                });
                
                // Mobile debug: Log render activity periodically
                if (window.mobileDebug && !this._renderActivityLogged) {
                    window.mobileDebug.log(`🎬 Quantum Engine: Actively rendering ${this.visualizers?.length} visualizers`);
                    this._renderActivityLogged = true;
                }
            } else if (window.mobileDebug && !this._inactiveWarningLogged) {
                window.mobileDebug.log(`⚠️ Quantum Engine: Not rendering because isActive=false`);
                this._inactiveWarningLogged = true;
            }
            
            requestAnimationFrame(render);
        };
        
        render();
        console.log('🎬 Quantum render loop started');
        
        if (window.mobileDebug) {
            window.mobileDebug.log(`✅ Quantum Engine: Render loop started, will render when isActive=true`);
        }
    }
    
    /**
     * Update audio reactivity (for universal reactivity system)
     */
    // Audio reactivity now handled directly in visualizer render loops
    
    /**
     * Update click effects (for universal reactivity system)
     */
    updateClick(intensity) {
        this.visualizers.forEach(visualizer => {
            if (visualizer.triggerClick) {
                visualizer.triggerClick(0.5, 0.5, intensity); // Click at center with intensity
            }
        });
    }
    
    /**
     * Update scroll effects (for universal reactivity system)
     */
    updateScroll(velocity) {
        this.visualizers.forEach(visualizer => {
            if (visualizer.updateScroll) {
                visualizer.updateScroll(velocity);
            }
        });
    }
    
    /**
     * Clean up resources
     */
    destroy() {
        // Disconnect from universal reactivity
        if (window.universalReactivity) {
            window.universalReactivity.disconnectSystem('quantum');
        }

        if (typeof this.geometryUnsubscribe === 'function') {
            try {
                this.geometryUnsubscribe();
            } catch (error) {
                console.warn('Failed to dispose quantum geometry subscription', error);
            }
            this.geometryUnsubscribe = null;
        }

        this.visualizers.forEach(visualizer => {
            if (visualizer.destroy) {
                visualizer.destroy();
            }
        });
        this.visualizers = [];
        console.log('🧹 Quantum Engine destroyed');
    }
}