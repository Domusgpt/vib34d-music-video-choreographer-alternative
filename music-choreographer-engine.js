/**
 * VIB34D Music Video Choreographer Engine
 * Dual-mode system: Reactive (built-in audio reactivity) + Choreographed (timeline-based)
 */

import { DynamicParameterBridge } from './src/choreography/DynamicParameterBridge.js';
import { GeometryLibrary } from './src/geometry/GeometryLibrary.js';
import { SystemRegistry } from './src/systems/shared/SystemRegistry.js';
import { FacetedSystem } from './src/systems/faceted/FacetedSystem.js';
import { QuantumSystem } from './src/systems/quantum/QuantumSystem.js';
import { HolographicSystem } from './src/systems/holographic/HolographicSystem.js';
import {
    registerSystemRegistry,
    syncActiveSystemState,
    getActiveParameterManager as getRegistryParameterManager
} from './src/systems/shared/SystemAccess.js';

export class MusicVideoChoreographer {
    constructor(mode = 'reactive') {
        this.mode = mode; // 'reactive' or 'choreographed'
        this.audio = new Audio();
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        this.currentSystem = 'faceted';
        this.currentEngine = null;
        this.isPlaying = false;
        this.animationId = null;
        this.canvasManager = null;

        this.systemRegistry = new SystemRegistry({
            containerId: 'vib34dLayers',
            autoClear: true,
            destroyOnSwitch: true
        });
        this.systemRegistry.register('faceted', () => new FacetedSystem());
        this.systemRegistry.register('quantum', () => new QuantumSystem());
        this.systemRegistry.register('holographic', () => new HolographicSystem());
        registerSystemRegistry(this.systemRegistry);
        this.activeSystem = null;

        // Beat detection
        this.beatThreshold = 0.7;
        this.lastBeatTime = 0;
        this.beatInterval = 500;
        this.detectedBPM = 0;

        // Choreography sequences (for choreographed mode)
        this.sequences = [];
        this.currentSequence = null;
        this.dynamicBridge = new DynamicParameterBridge(this);

        // Geometry controls
        this.geometryModes = new Set(['hold', 'cycle', 'morph', 'random', 'explosive']);
        this.lastGeometryIndex = 0;
        this.refreshGeometryMetadata();
        this.resetGeometryState(false);
        this.geometrySubscription = GeometryLibrary.subscribe(() => {
            this.refreshGeometryMetadata();
        });

        // Audio reactivity multipliers (for reactive mode)
        this.reactivitySettings = {
            bassToGridDensity: 30,
            midToMorph: 0.5,
            highToChaos: 0.6,
            energyToIntensity: 0.5,
            energyToSpeed: 0.5
        };

        this.init();
    }

    resolveParameterManager() {
        const registryManager = getRegistryParameterManager();
        if (registryManager) {
            return registryManager;
        }
        if (this.currentEngine?.parameterManager) {
            return this.currentEngine.parameterManager;
        }
        if (this.activeSystem?.engine?.parameterManager) {
            return this.activeSystem.engine.parameterManager;
        }
        return null;
    }

    setParameterValue(param, value, options = {}) {
        const manager = this.resolveParameterManager();
        const allowOverflow = options?.allowOverflow ?? false;

        if (manager) {
            try {
                if (allowOverflow && typeof manager.setParameterExternal === 'function') {
                    const applied = manager.setParameterExternal(param, value, { allowOverflow: true });
                    if (applied) {
                        return true;
                    }
                }

                if (typeof manager.setParameter === 'function') {
                    const ownsParam = manager.params && Object.prototype.hasOwnProperty.call(manager.params, param);
                    const result = manager.setParameter(param, value);
                    if (ownsParam || result !== false) {
                        return true;
                    }
                }
            } catch (error) {
                console.debug('[MusicVideoChoreographer] ParameterManager set failed', param, error);
            }
        }

        const engineManager = this.currentEngine?.parameterManager;
        if (engineManager && engineManager !== manager && typeof engineManager.setParameter === 'function') {
            try {
                const result = engineManager.setParameter(param, value);
                if (result !== false) {
                    return true;
                }
            } catch (error) {
                console.debug('[MusicVideoChoreographer] Engine parameter set failed', param, error);
            }
        }

        if (this.currentEngine?.updateParameter) {
            try {
                this.currentEngine.updateParameter(param, value);
                return true;
            } catch (error) {
                console.debug('[MusicVideoChoreographer] updateParameter fallback failed', param, error);
            }
        }

        if (this.currentEngine?.updateParameters) {
            try {
                this.currentEngine.updateParameters({ [param]: value });
                return true;
            } catch (error) {
                console.debug('[MusicVideoChoreographer] updateParameters fallback failed', param, error);
            }
        }

        if (this.currentEngine && param in this.currentEngine) {
            this.currentEngine[param] = value;
            return true;
        }

        return false;
    }

    refreshGeometryMetadata() {
        this.geometryNames = GeometryLibrary.getGeometryNames();
        this.geometryCount = this.geometryNames.length;
        this.geometryNameLookup = new Map(
            this.geometryNames.map((name, index) => [name.toLowerCase(), index])
        );
        this.geometryIndexList = Array.from({ length: this.geometryCount }, (_, index) => index);

        if (this.geometryCount > 0) {
            this.lastGeometryIndex = this.normalizeGeometryIndex(this.lastGeometryIndex);
        } else {
            this.lastGeometryIndex = 0;
        }

        const manager = this.resolveParameterManager();
        if (manager?.updateGeometryRange) {
            manager.updateGeometryRange(this.geometryCount);
        }

        this.applyGeometryMetadataToUI();
    }

    applyGeometryMetadataToUI() {
        if (typeof document === 'undefined') return;

        const slider = document.getElementById('geometry');
        if (slider) {
            const maxIndex = Math.max(this.geometryCount - 1, 0);
            if (slider.max !== String(maxIndex)) {
                slider.max = String(maxIndex);
            }
            if (Number(slider.value) > maxIndex) {
                slider.value = String(maxIndex);
            }
        }

        const sliderWrapper = slider?.parentElement;
        if (sliderWrapper) {
            let legend = sliderWrapper.querySelector('.geometry-legend');
            if (!legend) {
                legend = document.createElement('div');
                legend.className = 'geometry-legend';
                legend.style.marginTop = '6px';
                legend.style.display = 'flex';
                legend.style.flexWrap = 'wrap';
                legend.style.gap = '4px';
                legend.style.fontSize = '9px';
                legend.style.lineHeight = '1.4';
                legend.style.opacity = '0.8';
                sliderWrapper.appendChild(legend);
            }

            legend.innerHTML = this.geometryNames.map((name, index) => {
                return `<span style="background:rgba(0,255,255,0.08);padding:2px 4px;border-radius:3px;">${index}: ${name}</span>`;
            }).join('');
        }

        this.updateGeometryReadout(this.lastGeometryIndex);
    }

    destroy() {
        if (typeof this.geometrySubscription === 'function') {
            try {
                this.geometrySubscription();
            } catch (err) {
                console.warn('[MusicVideoChoreographer] geometry unsubscribe failed', err);
            }
            this.geometrySubscription = null;
        }

        if (this.systemRegistry) {
            this.systemRegistry.destroyAll({ reason: 'choreographer-destroy' }).catch(error => {
                console.warn('[MusicVideoChoreographer] Failed to destroy system registry', error);
            });
        }
    }

    getGeometryName(index) {
        if (!Number.isFinite(index)) {
            return 'UNKNOWN';
        }
        if (!this.geometryNames || !this.geometryNames.length) {
            return `#${index}`;
        }
        const normalized = this.normalizeGeometryIndex(index);
        return this.geometryNames[normalized] || `#${index}`;
    }

    updateGeometryReadout(index) {
        if (typeof document === 'undefined') return;
        const readout = document.getElementById('v-geometry');
        if (!readout) return;

        if (index === null || index === undefined) {
            readout.textContent = '--';
            return;
        }

        const geometryName = this.getGeometryName(index);
        readout.textContent = `${index} · ${geometryName}`;
    }

    registerGeometryIfNeeded(name) {
        if (!name) return null;
        const normalized = GeometryLibrary.normalizeName(name);
        if (!normalized) return null;

        const key = normalized.toLowerCase();
        if (this.geometryNameLookup && this.geometryNameLookup.has(key)) {
            return this.geometryNameLookup.get(key);
        }

        const added = GeometryLibrary.registerGeometry(normalized);
        if (added) {
            this.refreshGeometryMetadata();
        }

        return this.geometryNameLookup?.get(key) ?? null;
    }

    async init() {
        console.log(`🎵 Initializing Music Video Choreographer in ${this.mode.toUpperCase()} mode`);

        // Initialize audio context
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 2048;
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

        // Initialize default engine
        await this.switchSystem('faceted');
        this.dynamicBridge.bindToEngine(this.currentEngine);

        // Setup event listeners
        this.setupEventListeners();

        // Expose AI choreography ingestion for external tooling / UI overlays
        window.loadAIChoreography = (data) => this.ingestAIChoreography(data);

        // Initialize mode-specific features
        if (this.mode === 'choreographed') {
            await this.generateDefaultChoreography();
        }

        console.log('✅ Choreographer initialized');
    }

    setupEventListeners() {
        // File input
        document.getElementById('audio-file').addEventListener('change', (e) => {
            this.loadAudioFile(e.target.files[0]);
        });

        // Playback controls
        document.getElementById('play-btn').addEventListener('click', () => this.play());
        document.getElementById('pause-btn').addEventListener('click', () => this.pause());
        document.getElementById('stop-btn').addEventListener('click', () => this.stop());

        // Timeline seeking
        document.getElementById('timeline').addEventListener('click', (e) => {
            const rect = e.target.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            this.audio.currentTime = pos * this.audio.duration;
        });

        // System switching
        document.querySelectorAll('.system-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchSystem(btn.dataset.system);
            });
        });

        // Audio events
        this.audio.addEventListener('ended', () => this.stop());
        this.audio.addEventListener('timeupdate', () => this.updateTimeline());
    }

    async loadAudioFile(file) {
        if (!file) return;

        const url = URL.createObjectURL(file);
        this.audio.src = url;

        // Connect audio to analyser
        if (!this.sourceNode) {
            this.sourceNode = this.audioContext.createMediaElementSource(this.audio);
            this.sourceNode.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);
        }

        // Enable controls
        document.getElementById('play-btn').disabled = false;
        document.getElementById('pause-btn').disabled = false;
        document.getElementById('stop-btn').disabled = false;

        this.updateStatus(`Loaded: ${file.name}`);
        console.log('🎵 Audio file loaded:', file.name);
    }

    async generateDefaultChoreography() {
        // Auto-generate choreography sequences WITH SYSTEM SWITCHING
        this.sequences = [
            {
                time: 0,
                duration: 14,
                effects: {
                    system: 'faceted', // Start with Faceted
                    geometry: 'cycle',
                    geometryList: this.geometryNames.slice(),
                    rotation: 'smooth',
                    chaos: 0.1,
                    speed: 0.6,
                    colorShift: 'slow',
                    densityBoost: 0,
                    parameters: {
                        gridDensity: {
                            value: 20,
                            audioAxis: 'bass',
                            scale: 55,
                            allowOverflow: true,
                            range: [12, 160]
                        },
                        morphFactor: {
                            value: 0.9,
                            audioAxis: 'mid',
                            scale: 1.3,
                            allowOverflow: true,
                            range: [0, 3]
                        },
                        hue: {
                            value: 210,
                            audioAxis: 'energy',
                            scale: 60,
                            mode: 'mix'
                        }
                    }
                }
            },
            {
                time: 14,
                duration: 14,
                effects: {
                    system: 'faceted', // stay on Faceted but build energy
                    geometry: 'morph',
                    geometryList: this.geometryNames.slice(),
                    rotation: 'accelerate',
                    chaos: 0.28,
                    speed: 1.1,
                    colorShift: 'medium',
                    densityBoost: 16,
                    parameters: {
                        chaos: {
                            value: 0.35,
                            audioAxis: 'high',
                            scale: 0.6,
                            mode: 'add',
                            range: [0, 1]
                        },
                        speed: {
                            value: 1.2,
                            audioAxis: 'energy',
                            scale: 0.9,
                            allowOverflow: true,
                            range: [0.8, 3.5]
                        }
                    }
                }
            },
            {
                time: 28,
                duration: 18,
                effects: {
                    system: 'quantum', // SWITCH to Quantum for the first drop
                    geometry: 'random',
                    geometryList: this.geometryNames.slice(),
                    rotation: 'chaos',
                    chaos: 0.75,
                    speed: 2.1,
                    colorShift: 'fast',
                    densityBoost: 28,
                    parameters: {
                        gridDensity: {
                            value: 48,
                            audioAxis: ['bass', 'energy'],
                            scale: 65,
                            randomize: 8,
                            allowOverflow: true,
                            range: [25, 180]
                        },
                        intensity: {
                            value: 0.9,
                            audioAxis: 'energy',
                            scale: 0.8,
                            mode: 'max',
                            range: [0, 2],
                            allowOverflow: true
                        },
                        saturation: {
                            value: 1.1,
                            audioAxis: 'bass',
                            scale: 0.6,
                            allowOverflow: true,
                            range: [0, 2]
                        }
                    },
                    actions: ['triggerClick']
                }
            },
            {
                time: 46,
                duration: 12,
                effects: {
                    system: 'holographic', // ethereal breakdown
                    geometry: 'explosive',
                    geometryList: this.geometryNames.slice(),
                    rotation: 'minimal',
                    chaos: 0.22,
                    speed: 0.7,
                    colorShift: 'freeze',
                    baseHue: 260,
                    densityBoost: -8,
                    parameters: {
                        hue: {
                            value: 240,
                            wave: { speed: 0.35, amplitude: 45 },
                            allowOverflow: true,
                            range: [120, 420]
                        },
                        saturation: {
                            value: 0.35,
                            audioAxis: 'mid',
                            scale: -0.4,
                            mode: 'mix',
                            range: [0, 1]
                        },
                        intensity: {
                            value: 0.45,
                            audioAxis: 'energy',
                            scale: 0.35,
                            range: [0, 2]
                        }
                    }
                }
            },
            {
                time: 58,
                duration: 16,
                effects: {
                    system: 'faceted', // rebuild
                    geometry: 'cycle',
                    rotation: 'smooth',
                    chaos: 0.18,
                    speed: 1.3,
                    colorShift: 'medium',
                    densityBoost: 12,
                    parameters: {
                        morphFactor: {
                            value: 1.1,
                            audioAxis: 'mid',
                            scale: 1.4,
                            allowOverflow: true,
                            range: [0.2, 2.8]
                        },
                        gridDensity: {
                            value: 26,
                            audioAxis: 'bass',
                            scale: 40,
                            mode: 'mix',
                            allowOverflow: true,
                            range: [12, 140]
                        }
                    }
                }
            },
            {
                time: 74,
                duration: 999,
                effects: {
                    system: 'quantum', // Final drop on Quantum
                    geometry: 'explosive',
                    rotation: 'extreme',
                    chaos: 1.0,
                    speed: 3.2,
                    colorShift: 'rainbow',
                    densityBoost: 42,
                    parameters: {
                        gridDensity: {
                            value: 60,
                            audioAxis: 'bass',
                            scale: 75,
                            allowOverflow: true,
                            range: [30, 220]
                        },
                        chaos: {
                            value: 0.8,
                            audioAxis: 'energy',
                            scale: 0.3,
                            mode: 'max',
                            range: [0, 1]
                        },
                        speed: {
                            value: 2.4,
                            audioAxis: 'energy',
                            scale: 1.2,
                            allowOverflow: true,
                            range: [1.2, 4]
                        }
                    },
                    actions: ['triggerClick']
                }
            }
        ];

        this.resetGeometryState(false);
        this.renderSequenceList();
        this.scanGeometryDescriptors(this.sequences);
        console.log('🎬 Generated default choreography with system switching');
    }

    renderSequenceList() {
        const list = document.getElementById('sequence-list');
        if (!list) return;

        const legendMarkup = `
            <div class="geometry-legend-panel" style="margin-bottom:10px;padding:8px;border-radius:6px;background:rgba(0,255,255,0.06);border:1px solid rgba(0,255,255,0.2);font-size:10px;line-height:1.5;">
                <strong>Available Geometries (${this.geometryNames.length})</strong><br>
                ${this.geometryNames.map((name, idx) => `<span style="display:inline-block;margin:2px 4px;padding:2px 6px;border-radius:4px;background:rgba(0,255,255,0.08);">${idx}: ${name}</span>`).join(' ')}
            </div>
        `;

        const sequenceMarkup = this.sequences.length ? this.sequences.map((seq, index) => {
            const dynamicSummary = this.renderDynamicSummary(seq.effects);
            const startIndex = this.resolveGeometryDescriptor(seq.effects.geometryStart);
            const geometryListValue = this.describeGeometryListInput(seq.effects.geometryList);
            const intervalValue = seq.effects.geometryInterval ?? '';
            const cyclesValue = seq.effects.geometryCycles ?? '';
            const thresholdValue = seq.effects.geometryEnergyThreshold ?? '';
            const axisValue = seq.effects.geometryAudioAxis ?? '';
            const geometryValue = seq.effects.geometry;
            const numericGeometryTarget = (typeof geometryValue === 'number' && Number.isFinite(geometryValue))
                ? this.normalizeGeometryIndex(geometryValue)
                : null;
            return `
            <div class="sequence-item">
                <h4>Sequence ${index + 1} (${seq.time}s - ${seq.time + seq.duration}s)</h4>
                <div class="sequence-controls">
                    <label>Start Time (s)</label>
                    <input type="number" value="${seq.time}" onchange="choreographer.updateSequence(${index}, 'time', this.value)">

                    <label>Duration (s)</label>
                    <input type="number" value="${seq.duration}" onchange="choreographer.updateSequence(${index}, 'duration', this.value)">

                    <label>🎨 System</label>
                    <select onchange="choreographer.updateSequence(${index}, 'system', this.value)" style="grid-column: span 2;">
                        <option value="faceted" ${seq.effects.system === 'faceted' ? 'selected' : ''}>🔷 Faceted</option>
                        <option value="quantum" ${seq.effects.system === 'quantum' ? 'selected' : ''}>🌌 Quantum</option>
                        <option value="holographic" ${seq.effects.system === 'holographic' ? 'selected' : ''}>✨ Holographic</option>
                    </select>

                    <label>Geometry</label>
                    <select onchange="choreographer.updateSequence(${index}, 'geometry', this.value)">
                        <option value="hold" ${seq.effects.geometry === 'hold' ? 'selected' : ''}>Hold</option>
                        <option value="cycle" ${seq.effects.geometry === 'cycle' ? 'selected' : ''}>Cycle</option>
                        <option value="morph" ${seq.effects.geometry === 'morph' ? 'selected' : ''}>Morph</option>
                        <option value="random" ${seq.effects.geometry === 'random' ? 'selected' : ''}>Random</option>
                        <option value="explosive" ${seq.effects.geometry === 'explosive' ? 'selected' : ''}>Explosive</option>
                        ${this.geometryNames.map((name, idx) => {
                            const normalized = name.toLowerCase();
                            const isSelected = (typeof geometryValue === 'string' && geometryValue.toLowerCase() === normalized)
                                || (numericGeometryTarget !== null && numericGeometryTarget === idx);
                            return `<option value="${name}" ${isSelected ? 'selected' : ''}>${name}</option>`;
                        }).join('')}
                    </select>

                    <label>Start Geometry</label>
                    <select onchange="choreographer.updateSequence(${index}, 'geometryStart', this.value)">
                        <option value="" ${startIndex === null || startIndex === undefined ? 'selected' : ''}>Auto (carry over)</option>
                        ${this.geometryNames.map((name, idx) => `<option value="${idx}" ${startIndex === idx ? 'selected' : ''}>${idx}: ${name}</option>`).join('')}
                    </select>

                    <label>Geometry List</label>
                    <input type="text" value="${geometryListValue}" placeholder="e.g. Tetrahedron, Wave, 3" onchange="choreographer.updateSequence(${index}, 'geometryList', this.value)">

                    <label>Geometry Interval (s)</label>
                    <input type="number" step="0.1" min="0.1" value="${intervalValue}" placeholder="2" onchange="choreographer.updateSequence(${index}, 'geometryInterval', this.value)">

                    <label>Geometry Cycles</label>
                    <input type="number" step="1" min="1" value="${cyclesValue}" placeholder="1" onchange="choreographer.updateSequence(${index}, 'geometryCycles', this.value)">

                    <label>Geometry Audio Axis</label>
                    <select onchange="choreographer.updateSequence(${index}, 'geometryAudioAxis', this.value)">
                        ${this.renderGeometryAxisOptions(axisValue)}
                    </select>

                    <label>Random Threshold</label>
                    <input type="number" step="0.05" min="0" max="1" value="${thresholdValue}" placeholder="${seq.effects.geometry === 'explosive' ? 0.4 : 0.6}" onchange="choreographer.updateSequence(${index}, 'geometryEnergyThreshold', this.value)">

                    <label>Rotation</label>
                    <select onchange="choreographer.updateSequence(${index}, 'rotation', this.value)">
                        <option value="minimal" ${seq.effects.rotation === 'minimal' ? 'selected' : ''}>Minimal</option>
                        <option value="smooth" ${seq.effects.rotation === 'smooth' ? 'selected' : ''}>Smooth</option>
                        <option value="accelerate" ${seq.effects.rotation === 'accelerate' ? 'selected' : ''}>Accelerate</option>
                        <option value="chaos" ${seq.effects.rotation === 'chaos' ? 'selected' : ''}>Chaos</option>
                        <option value="extreme" ${seq.effects.rotation === 'extreme' ? 'selected' : ''}>Extreme</option>
                    </select>

                    <label>Chaos Base</label>
                    <input type="number" step="0.1" min="0" max="1" value="${seq.effects.chaos || 0.5}" onchange="choreographer.updateSequence(${index}, 'chaos', this.value)">

                    <label>Speed Base</label>
                    <input type="number" step="0.1" min="0.1" max="3" value="${seq.effects.speed || 1.0}" onchange="choreographer.updateSequence(${index}, 'speed', this.value)">

                    <label>Color Shift</label>
                    <select onchange="choreographer.updateSequence(${index}, 'colorShift', this.value)">
                        <option value="freeze" ${seq.effects.colorShift === 'freeze' ? 'selected' : ''}>Freeze</option>
                        <option value="slow" ${seq.effects.colorShift === 'slow' ? 'selected' : ''}>Slow</option>
                        <option value="medium" ${seq.effects.colorShift === 'medium' ? 'selected' : ''}>Medium</option>
                        <option value="fast" ${seq.effects.colorShift === 'fast' ? 'selected' : ''}>Fast</option>
                        <option value="rainbow" ${seq.effects.colorShift === 'rainbow' ? 'selected' : ''}>Rainbow</option>
                    </select>
                </div>
                <div style="font-size: 9px; color: #666; margin-top: 5px; padding: 5px; background: rgba(0,255,255,0.05); border-radius: 3px;">
                    ℹ️ Audio reactivity is ALWAYS active - these are base values that audio modulates
                </div>
                ${dynamicSummary}
                <button onclick="choreographer.deleteSequence(${index})" style="margin-top: 10px; background: #f44; font-size: 10px; padding: 5px;">Delete</button>
            </div>
        `;
        }).join('') : `<div class="sequence-empty" style="padding:12px;border:1px dashed rgba(0,255,255,0.3);border-radius:6px;font-size:11px;color:#7ff;">No sequences defined yet.</div>`;

        list.innerHTML = legendMarkup + sequenceMarkup;
    }

    describeGeometryStrategy(effects = {}) {
        if (!effects) return '';

        const summaryParts = [];
        const geometry = effects.geometry;

        if (geometry !== undefined && geometry !== null) {
            if (typeof geometry === 'string') {
                const trimmed = geometry.trim();
                if (this.geometryModes.has(trimmed.toLowerCase())) {
                    summaryParts.push(`Mode: ${trimmed}`);
                } else {
                    const index = this.resolveGeometryDescriptor(trimmed);
                    if (index !== null && index !== undefined) {
                        summaryParts.push(`Target: ${this.getGeometryName(index)} (#${index})`);
                    } else {
                        summaryParts.push(`Target: ${GeometryLibrary.normalizeName(trimmed)}`);
                    }
                }
            } else if (typeof geometry === 'number' && Number.isFinite(geometry)) {
                const normalized = this.normalizeGeometryIndex(geometry);
                summaryParts.push(`Target #: ${this.getGeometryName(normalized)} (#${normalized})`);
            } else if (typeof geometry === 'object') {
                const mode = geometry.mode || geometry.behavior || geometry.type;
                if (mode) {
                    summaryParts.push(`Mode: ${mode}`);
                }
                if (geometry.name) {
                    const index = this.resolveGeometryDescriptor(geometry.name);
                    if (index !== null && index !== undefined) {
                        summaryParts.push(`Target: ${this.getGeometryName(index)} (#${index})`);
                    } else {
                        summaryParts.push(`Target: ${GeometryLibrary.normalizeName(geometry.name)}`);
                    }
                }
                if (geometry.list) {
                    const listSummary = this.describeGeometryListInput(geometry.list);
                    if (listSummary) {
                        summaryParts.push(`List: ${listSummary}`);
                    }
                }
            }
        }

        const startIndex = this.resolveGeometryDescriptor(effects.geometryStart);
        if (startIndex !== null && startIndex !== undefined) {
            summaryParts.push(`Start ➜ ${this.getGeometryName(startIndex)} (#${startIndex})`);
        }

        const listValue = this.describeGeometryListInput(effects.geometryList);
        if (listValue) {
            summaryParts.push(`List ➜ ${listValue}`);
        }

        if (effects.geometryInterval !== undefined && effects.geometryInterval !== null) {
            summaryParts.push(`Interval ${Number(effects.geometryInterval).toFixed(2)}s`);
        }

        if (effects.geometryCycles !== undefined && effects.geometryCycles !== null) {
            summaryParts.push(`Cycles ×${Math.round(effects.geometryCycles)}`);
        }

        if (effects.geometryAudioAxis) {
            summaryParts.push(`Axis ${effects.geometryAudioAxis}`);
        }

        if (effects.geometryEnergyThreshold !== undefined) {
            summaryParts.push(`Threshold ${Number(effects.geometryEnergyThreshold).toFixed(2)}`);
        }

        if (!summaryParts.length) {
            return '';
        }

        return summaryParts.join(' | ');
    }

    renderDynamicSummary(effects = {}) {
        const parts = [];
        const geometrySummary = this.describeGeometryStrategy(effects);
        if (geometrySummary) {
            parts.push(`<div class="dynamic-summary" style="margin-top:6px;padding:6px;border-radius:4px;background:rgba(0,170,255,0.08);font-size:10px;line-height:1.4;"><strong>Geometry</strong><br>${geometrySummary}</div>`);
        }
        if (effects.parameters && Object.keys(effects.parameters).length) {
            const entries = Object.entries(effects.parameters).map(([name, descriptor]) => {
                if (typeof descriptor === 'number') {
                    return `${name}: ${descriptor}`;
                }
                if (typeof descriptor === 'object') {
                    const details = [];
                    if (descriptor.audioAxis || descriptor.audio) {
                        details.push(`↔ audio:${descriptor.audioAxis || descriptor.audio}`);
                    }
                    if (descriptor.range) {
                        details.push(`range:${JSON.stringify(descriptor.range)}`);
                    }
                    if (descriptor.mode) {
                        details.push(`mode:${descriptor.mode}`);
                    }
                    return `${name}: ${descriptor.value ?? descriptor.base ?? 'auto'}${details.length ? ' (' + details.join(', ') + ')' : ''}`;
                }
                return `${name}: ${descriptor}`;
            }).join('<br>');
            parts.push(`<div class="dynamic-summary" style="margin-top:6px;padding:6px;border-radius:4px;background:rgba(0,255,255,0.05);font-size:10px;line-height:1.4;"><strong>Dynamic Parameters</strong><br>${entries}</div>`);
        }

        if (effects.actions && effects.actions.length) {
            const entries = effects.actions.map(action => {
                if (typeof action === 'string') return action;
                if (action.type) {
                    const suffix = action.args ? ` → ${JSON.stringify(action.args)}` : '';
                    return `${action.type}${suffix}`;
                }
                return JSON.stringify(action);
            }).join('<br>');
            parts.push(`<div class="dynamic-summary" style="margin-top:6px;padding:6px;border-radius:4px;background:rgba(255,0,255,0.05);font-size:10px;line-height:1.4;"><strong>Actions</strong><br>${entries}</div>`);
        }

        if (!parts.length) {
            return '';
        }

        return `<div class="dynamic-insight">${parts.join('')}</div>`;
    }

    updateSequence(index, property, value) {
        const seq = this.sequences[index];
        if (!seq) return;

        if (property === 'time' || property === 'duration') {
            seq[property] = parseFloat(value);
        } else if (property === 'chaos' || property === 'speed') {
            seq.effects[property] = parseFloat(value);
        } else if (property === 'geometry') {
            const resolved = this.normalizeGeometryBehaviorValue(value);
            if (resolved === null) {
                delete seq.effects.geometry;
            } else {
                seq.effects.geometry = resolved;
            }
        } else if (property === 'geometryStart') {
            const resolved = this.coerceGeometryIndexDescriptor(value);
            if (resolved === null || resolved === undefined) {
                delete seq.effects.geometryStart;
            } else {
                seq.effects.geometryStart = resolved;
            }
        } else if (property === 'geometryList') {
            const list = this.coerceGeometryList(value);
            if (list && list.length) {
                seq.effects.geometryList = list;
            } else {
                delete seq.effects.geometryList;
            }
        } else if (property === 'geometryInterval') {
            const numeric = parseFloat(value);
            if (Number.isFinite(numeric)) {
                seq.effects.geometryInterval = Math.max(0.05, numeric);
            } else {
                delete seq.effects.geometryInterval;
            }
        } else if (property === 'geometryCycles') {
            const numeric = parseInt(value, 10);
            if (Number.isFinite(numeric)) {
                seq.effects.geometryCycles = Math.max(1, numeric);
            } else {
                delete seq.effects.geometryCycles;
            }
        } else if (property === 'geometryAudioAxis') {
            const axis = value ? value.toString().toLowerCase() : '';
            if (!axis) {
                delete seq.effects.geometryAudioAxis;
            } else {
                seq.effects.geometryAudioAxis = axis;
            }
        } else if (property === 'geometryEnergyThreshold') {
            const numeric = parseFloat(value);
            if (Number.isFinite(numeric)) {
                seq.effects.geometryEnergyThreshold = Math.min(1, Math.max(0, numeric));
            } else {
                delete seq.effects.geometryEnergyThreshold;
            }
        } else {
            seq.effects[property] = value;
        }

        if ([
            'time',
            'duration',
            'geometry',
            'geometryList',
            'geometryInterval',
            'geometryStart',
            'geometryCycles',
            'geometryAudioAxis',
            'geometryEnergyThreshold'
        ].includes(property)) {
            this.resetGeometryState(true);
        }

        this.scanGeometryDescriptors(this.sequences);
        this.renderSequenceList();
        console.log(`Updated sequence ${index}:`, seq);
    }

    deleteSequence(index) {
        this.sequences.splice(index, 1);
        this.resetGeometryState(true);
        this.renderSequenceList();
    }

    addSequenceToTimeline(newSeq) {
        this.sequences.push(newSeq);
        this.sequences.sort((a, b) => a.time - b.time);
        this.scanGeometryDescriptors(this.sequences);
        this.resetGeometryState(true);
        this.renderSequenceList();
    }

    async switchSystem(systemName) {
        try {
            const system = await this.systemRegistry.activate(systemName, {
                clearContainer: true
            });

            this.activeSystem = system;
            this.currentEngine = system?.engine || null;
            this.currentSystem = systemName;
            this.canvasManager = system?.canvasManager || this.currentEngine?.canvasManager || null;

            this.dynamicBridge.bindToEngine(this.currentEngine);

            document.querySelectorAll('.system-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.system === systemName);
            });

            syncActiveSystemState();
            console.log('✅ Switched to', systemName, 'system via SystemRegistry');
            this.refreshGeometryMetadata();
        } catch (error) {
            console.error('Failed to switch system:', error);
        }
    }

    play() {
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        this.audio.play();
        this.isPlaying = true;
        this.startVisualization();
        this.updateStatus('Playing...');
    }

    pause() {
        this.audio.pause();
        this.isPlaying = false;
        this.updateStatus('Paused');
    }

    stop() {
        this.audio.pause();
        this.audio.currentTime = 0;
        this.isPlaying = false;
        this.updateStatus('Stopped');
    }

    startVisualization() {
        const render = () => {
            if (!this.isPlaying) return;

            // Get audio data
            this.analyser.getByteFrequencyData(this.dataArray);
            const audioData = this.processAudioData(this.dataArray);

            // Detect beats
            this.detectBeat(audioData);

            // Apply mode-specific logic
            if (this.mode === 'reactive') {
                this.applyReactiveMode(audioData);
            } else if (this.mode === 'choreographed') {
                this.applyChoreography(audioData);
            }

            // Update info panel
            this.updateInfoPanel(audioData);

            this.animationId = requestAnimationFrame(render);
        };
        render();
    }

    processAudioData(dataArray) {
        const bass = this.getAverage(dataArray, 0, 100) / 255;
        const mid = this.getAverage(dataArray, 100, 400) / 255;
        const high = this.getAverage(dataArray, 400, 1024) / 255;
        const energy = (bass + mid + high) / 3;

        return { bass, mid, high, energy };
    }

    getAverage(array, start, end) {
        let sum = 0;
        for (let i = start; i < end; i++) {
            sum += array[i];
        }
        return sum / (end - start);
    }

    detectBeat(audioData) {
        const now = Date.now();
        if (audioData.bass > this.beatThreshold && now - this.lastBeatTime > this.beatInterval) {
            this.lastBeatTime = now;
            this.onBeat();
            this.detectedBPM = Math.round(60000 / this.beatInterval);
        }
    }

    onBeat() {
        // Visual beat indicator
        const indicator = document.getElementById('beatIndicator');
        indicator.classList.add('active');
        setTimeout(() => indicator.classList.remove('active'), 300);

        // Trigger engine effects
        if (this.currentEngine && this.currentEngine.triggerClick) {
            this.currentEngine.triggerClick(1.0);
        }
    }

    /**
     * REACTIVE MODE: Built-in audio reactivity with direct parameter mapping
     */
    applyReactiveMode(audioData) {
        const setParam = (param, value, options) => {
            this.setParameterValue(param, value, options);
        };

        // Direct audio-to-parameter mapping
        const densityBase = 15 + audioData.bass * this.reactivitySettings.bassToGridDensity;
        setParam('gridDensity', Math.floor(densityBase));

        const morphBase = 1.0 + audioData.mid * this.reactivitySettings.midToMorph;
        setParam('morphFactor', morphBase);

        const chaosValue = 0.2 + audioData.high * this.reactivitySettings.highToChaos;
        setParam('chaos', chaosValue);

        const speedValue = 1.0 + audioData.energy * this.reactivitySettings.energyToSpeed;
        setParam('speed', speedValue);

        const intensityValue = 0.5 + audioData.energy * this.reactivitySettings.energyToIntensity;
        setParam('intensity', intensityValue);

        const saturationValue = 0.7 + audioData.bass * 0.3;
        setParam('saturation', saturationValue);

        // Reactive hue shifting based on frequencies
        const currentTime = this.audio.currentTime;
        const hueShift = (audioData.mid * 60 + audioData.high * 30) % 360;
        setParam('hue', (currentTime * 5 + hueShift) % 360);

        // Reactive 4D rotations
        setParam('rot4dXW', Math.sin(currentTime * 0.5 + audioData.bass * Math.PI) * Math.PI);
        setParam('rot4dYW', Math.cos(currentTime * 0.3 + audioData.mid * Math.PI) * Math.PI);
        setParam('rot4dZW', Math.sin(currentTime * 0.7 + audioData.high * Math.PI) * Math.PI);
    }

    /**
     * CHOREOGRAPHED MODE: Timeline-based choreography with FULL audio reactivity
     * Choreography controls: system switching, geometry changes, base parameters
     * Audio reactivity: ALWAYS active, overlays on choreographed parameters
     */
    applyChoreography(audioData) {
        const currentTime = this.audio.currentTime;

        // Find active sequence
        const activeSequence = this.sequences.find(seq =>
            currentTime >= seq.time && currentTime < seq.time + seq.duration
        );

        if (!activeSequence) return;

        const effects = activeSequence.effects;

        const setParam = (param, value, options) => {
            this.setParameterValue(param, value, options);
        };

        // CHECK FOR SYSTEM SWITCH (if sequence specifies a different system)
        if (effects.system && effects.system !== this.currentSystem) {
            console.log(`🎬 Choreography: Switching to ${effects.system} system at ${currentTime.toFixed(1)}s`);
            this.switchSystem(effects.system);
        }

        const sequenceId = this.sequences.indexOf(activeSequence);
        if (sequenceId !== this.geometryState.activeSequenceId) {
            this.geometryState.activeSequenceId = sequenceId;
            this.geometryState.sequenceStartGeometry = this.lastGeometryIndex;
            this.geometryState.lastRandomIndex = this.lastGeometryIndex;
            this.geometryState.lastRandomChangeTime = -Infinity;
        }

        const geometryIndex = this.computeGeometryTarget(
            effects,
            activeSequence,
            currentTime,
            audioData
        );

        if (geometryIndex !== null && geometryIndex !== undefined) {
            setParam('geometry', geometryIndex);
            this.lastGeometryIndex = geometryIndex;
            this.geometryState.lastRandomIndex = geometryIndex;
            this.updateGeometryReadout(geometryIndex);
        }

        // Rotation choreography (WITH audio overlay)
        if (effects.rotation === 'chaos') {
            setParam('rot4dXW', Math.sin(currentTime * 2) * Math.PI * audioData.bass);
            setParam('rot4dYW', Math.cos(currentTime * 1.5) * Math.PI * audioData.mid);
            setParam('rot4dZW', Math.sin(currentTime * 3) * Math.PI * audioData.high);
        } else if (effects.rotation === 'smooth') {
            // Base smooth rotation + audio influence
            setParam('rot4dXW', Math.sin(currentTime * 0.5 + audioData.bass * 2) * Math.PI);
            setParam('rot4dYW', Math.cos(currentTime * 0.3 + audioData.mid * 2) * Math.PI);
            setParam('rot4dZW', Math.sin(currentTime * 0.4 + audioData.high * 2) * Math.PI * 0.5);
        } else if (effects.rotation === 'extreme') {
            setParam('rot4dXW', Math.sin(currentTime * 5) * Math.PI * (1 + audioData.energy));
            setParam('rot4dYW', Math.cos(currentTime * 4) * Math.PI * (1 + audioData.bass));
            setParam('rot4dZW', Math.sin(currentTime * 6) * Math.PI * (1 + audioData.high));
        } else if (effects.rotation === 'accelerate') {
            const accel = (currentTime - activeSequence.time) / activeSequence.duration;
            setParam('rot4dXW', Math.sin(currentTime * (0.5 + accel * 2 + audioData.bass)) * Math.PI);
            setParam('rot4dYW', Math.cos(currentTime * (0.3 + accel * 1.5 + audioData.mid)) * Math.PI);
        } else if (effects.rotation === 'minimal') {
            // Minimal rotation BUT still audio reactive
            setParam('rot4dXW', audioData.bass * Math.PI * 0.3);
            setParam('rot4dYW', audioData.mid * Math.PI * 0.3);
            setParam('rot4dZW', audioData.high * Math.PI * 0.2);
        }

        // AUDIO REACTIVITY ALWAYS ACTIVE - overlays on choreographed base values

        // Chaos: Base from sequence + audio boost
        const chaosBase = effects.chaos || 0.5;
        setParam('chaos', chaosBase + audioData.energy * 0.4);

        // Speed: Base from sequence + audio multiplier
        const speedBase = effects.speed || 1.0;
        setParam('speed', speedBase * (1 + audioData.energy * 0.6));

        // Morph Factor: Audio-reactive morphing
        const morphBase = effects.rotation === 'chaos' ? 1.5 : 1.0;
        setParam('morphFactor', morphBase + audioData.mid * 0.7);

        // Grid Density: ALWAYS audio-reactive
        const densityBase = 15 + (effects.densityBoost || 0);
        setParam('gridDensity', Math.floor(densityBase + audioData.bass * 35));

        // Color shifting: Choreographed pattern + audio modulation
        let hueValue = 0;
        if (effects.colorShift === 'rainbow') {
            hueValue = (currentTime * 60 + audioData.energy * 60) % 360;
        } else if (effects.colorShift === 'fast') {
            hueValue = (currentTime * 30 + audioData.bass * 120) % 360;
        } else if (effects.colorShift === 'medium') {
            hueValue = (currentTime * 10 + audioData.mid * 60) % 360;
        } else if (effects.colorShift === 'slow') {
            hueValue = (currentTime * 5 + audioData.high * 30) % 360;
        } else if (effects.colorShift === 'freeze') {
            // Even "freeze" gets audio modulation
            hueValue = (effects.baseHue || 180) + audioData.energy * 30;
        }
        setParam('hue', hueValue % 360);

        // Intensity & Saturation: ALWAYS audio-reactive
        setParam('intensity', 0.5 + audioData.energy * 0.5);
        setParam('saturation', 0.7 + audioData.bass * 0.3);

        // ENABLE BUILT-IN AUDIO REACTIVITY for engines that have it
        if (this.currentEngine && this.currentEngine.audioEnabled !== undefined) {
            this.currentEngine.audioEnabled = true;
        }

        // Allow AI-defined parameters and actions to override / extend the base behaviour
        this.dynamicBridge.apply(effects, audioData);
    }

    computeGeometryTarget(effects, activeSequence, currentTime, audioData) {
        if (!effects) return null;

        const geometrySetting = effects.geometry;
        if (geometrySetting === undefined || geometrySetting === null) {
            return null;
        }

        if (typeof geometrySetting === 'number' && Number.isFinite(geometrySetting)) {
            return this.normalizeGeometryIndex(geometrySetting);
        }

        if (typeof geometrySetting === 'string') {
            const key = geometrySetting.toLowerCase().trim();
            if (this.geometryNameLookup.has(key)) {
                return this.geometryNameLookup.get(key);
            }
            return this.computeGeometryByMode(
                key,
                effects,
                activeSequence,
                currentTime,
                audioData,
                {}
            );
        }

        if (typeof geometrySetting === 'object') {
            if (typeof geometrySetting.index === 'number') {
                return this.normalizeGeometryIndex(geometrySetting.index);
            }

            if (geometrySetting.name) {
                const nameKey = String(geometrySetting.name).toLowerCase().trim();
                if (this.geometryNameLookup.has(nameKey)) {
                    return this.geometryNameLookup.get(nameKey);
                }
            }

            const modeSource = geometrySetting.mode || geometrySetting.behavior || geometrySetting.type;
            if (modeSource) {
                const modeKey = String(modeSource).toLowerCase().trim();
                return this.computeGeometryByMode(
                    modeKey,
                    effects,
                    activeSequence,
                    currentTime,
                    audioData,
                    geometrySetting
                );
            }
        }

        return null;
    }

    computeGeometryByMode(mode, effects, activeSequence, currentTime, audioData, config = {}) {
        if (!mode) return null;

        const normalizedList = this.normalizeGeometryList(config.list ?? effects.geometryList);
        const interval = Math.max(0.1, config.interval ?? effects.geometryInterval ?? 2);
        const direction = (config.direction === 'reverse' || config.direction === 'backward' || config.direction === -1)
            ? -1
            : 1;

        switch (mode) {
            case 'hold':
                return this.lastGeometryIndex;
            case 'cycle': {
                const elapsed = Math.max(0, currentTime - activeSequence.time);
                const rawSteps = Math.floor(elapsed / interval);

                if (normalizedList && normalizedList.length) {
                    const listLength = normalizedList.length;
                    const stepIndex = rawSteps % listLength;
                    const pointer = direction >= 0
                        ? stepIndex
                        : (listLength - ((stepIndex % listLength) + 1));
                    return normalizedList[(pointer + listLength) % listLength];
                }

                const startIndex = this.normalizeGeometryIndex(
                    config.startIndex ?? config.start ?? effects.geometryStart ?? this.geometryState.sequenceStartGeometry ?? this.lastGeometryIndex
                );
                return this.normalizeGeometryIndex(startIndex + rawSteps * direction);
            }
            case 'morph': {
                const list = (normalizedList && normalizedList.length)
                    ? normalizedList
                    : this.geometryIndexList;
                if (!list.length) {
                    return this.lastGeometryIndex;
                }

                const duration = Math.max(activeSequence.duration || 0.001, 0.001);
                const progress = Math.max(0, currentTime - activeSequence.time) / duration;
                const cycles = Math.max(1, config.cycles ?? config.repeats ?? effects.geometryCycles ?? 1);
                const scaled = progress * list.length * cycles;
                const indexInList = Math.floor(scaled) % list.length;
                return list[indexInList];
            }
            case 'random':
            case 'explosive': {
                const list = (normalizedList && normalizedList.length)
                    ? normalizedList
                    : this.geometryIndexList;
                if (!list.length) {
                    return this.lastGeometryIndex;
                }

                const axisKey = config.axis || config.audioAxis || effects.geometryAudioAxis;
                const audioMetric = axisKey && audioData && audioData[axisKey] !== undefined
                    ? audioData[axisKey]
                    : (audioData?.energy ?? 0);
                const threshold = config.threshold ?? effects.geometryEnergyThreshold ?? (mode === 'explosive' ? 0.4 : 0.6);
                const minInterval = Math.max(0.05, config.interval ?? effects.geometryInterval ?? (mode === 'explosive' ? 0.4 : 0.75));
                const force = config.always === true;

                if ((force || audioMetric >= threshold) && (currentTime - this.geometryState.lastRandomChangeTime >= minInterval)) {
                    let nextIndex = list[Math.floor(Math.random() * list.length)];
                    if (config.avoidRepeats !== false && list.length > 1) {
                        let attempts = 0;
                        while (nextIndex === this.geometryState.lastRandomIndex && attempts < 5) {
                            nextIndex = list[Math.floor(Math.random() * list.length)];
                            attempts++;
                        }
                    }
                    this.geometryState.lastRandomIndex = nextIndex;
                    this.geometryState.lastRandomChangeTime = currentTime;
                    return nextIndex;
                }

                return this.geometryState.lastRandomIndex;
            }
            default:
                if (this.geometryNameLookup.has(mode)) {
                    return this.geometryNameLookup.get(mode);
                }
                return this.lastGeometryIndex;
        }
    }

    normalizeGeometryIndex(index) {
        if (!Number.isFinite(index) || this.geometryCount <= 0) {
            return 0;
        }

        const base = Math.floor(index);
        const wrapped = ((base % this.geometryCount) + this.geometryCount) % this.geometryCount;
        return wrapped;
    }

    normalizeGeometryList(source) {
        if (!source) return null;
        const list = Array.isArray(source) ? source : [source];
        const normalized = list
            .map((item, idx) => this.geometryDescriptorToIndex(item, idx))
            .filter(value => value !== null && value !== undefined);
        return normalized.length ? normalized : null;
    }

    geometryDescriptorToIndex(descriptor, fallback = 0) {
        if (descriptor === undefined || descriptor === null) {
            return this.normalizeGeometryIndex(fallback);
        }

        if (typeof descriptor === 'number' && Number.isFinite(descriptor)) {
            return this.normalizeGeometryIndex(descriptor);
        }

        if (typeof descriptor === 'string') {
            const key = descriptor.toLowerCase().trim();
            if (this.geometryNameLookup.has(key)) {
                return this.geometryNameLookup.get(key);
            }
        }

        if (typeof descriptor === 'object') {
            if (typeof descriptor.index === 'number') {
                return this.normalizeGeometryIndex(descriptor.index);
            }
            if (descriptor.name) {
                const key = String(descriptor.name).toLowerCase().trim();
                if (this.geometryNameLookup.has(key)) {
                    return this.geometryNameLookup.get(key);
                }
            }
        }

        return this.normalizeGeometryIndex(fallback);
    }

    resolveGeometryDescriptor(descriptor) {
        if (descriptor === undefined || descriptor === null) {
            return null;
        }

        if (typeof descriptor === 'number' && Number.isFinite(descriptor)) {
            return this.normalizeGeometryIndex(descriptor);
        }

        if (typeof descriptor === 'string') {
            const trimmed = descriptor.trim();
            if (!trimmed) return null;
            if (/^-?\d+$/.test(trimmed)) {
                return this.normalizeGeometryIndex(Number(trimmed));
            }
            const key = GeometryLibrary.normalizeName(trimmed).toLowerCase();
            if (this.geometryNameLookup.has(key)) {
                return this.geometryNameLookup.get(key);
            }
            return null;
        }

        if (typeof descriptor === 'object') {
            if (typeof descriptor.index === 'number') {
                return this.normalizeGeometryIndex(descriptor.index);
            }
            if (descriptor.name) {
                return this.resolveGeometryDescriptor(descriptor.name);
            }
        }

        return null;
    }

    describeGeometryListInput(list) {
        if (!list) return '';

        const entries = Array.isArray(list)
            ? list
            : (typeof list === 'string' ? list.split(',') : [list]);

        const formatted = entries.map((item) => {
            if (item === undefined || item === null) return '';
            if (typeof item === 'number' && Number.isFinite(item)) {
                return this.getGeometryName(item);
            }
            if (typeof item === 'string') {
                const trimmed = item.trim();
                if (!trimmed) return '';
                if (/^-?\d+$/.test(trimmed)) {
                    return this.getGeometryName(Number(trimmed));
                }
                return GeometryLibrary.normalizeName(trimmed);
            }
            if (typeof item === 'object') {
                if (typeof item.index === 'number') {
                    return this.getGeometryName(item.index);
                }
                if (item.name) {
                    return GeometryLibrary.normalizeName(item.name);
                }
            }
            return '';
        }).filter(Boolean);

        return formatted.join(', ');
    }

    renderGeometryAxisOptions(selected) {
        const normalized = (selected || '').toString().toLowerCase();
        const options = [
            { value: '', label: 'Auto (energy mix)' },
            { value: 'bass', label: 'Bass' },
            { value: 'mid', label: 'Mid' },
            { value: 'high', label: 'High' },
            { value: 'energy', label: 'Energy' }
        ];

        return options.map(({ value, label }) => {
            const isSelected = value === '' ? !normalized : normalized === value;
            return `<option value="${value}" ${isSelected ? 'selected' : ''}>${label}</option>`;
        }).join('');
    }

    normalizeGeometryBehaviorValue(value) {
        if (value === undefined || value === null) {
            return null;
        }

        if (typeof value === 'number' && Number.isFinite(value)) {
            return this.normalizeGeometryIndex(value);
        }

        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (!trimmed) return null;
            if (/^-?\d+$/.test(trimmed)) {
                return this.normalizeGeometryIndex(Number(trimmed));
            }
            const lower = trimmed.toLowerCase();
            if (this.geometryModes.has(lower)) {
                return lower;
            }
            const normalized = GeometryLibrary.normalizeName(trimmed);
            const index = this.registerGeometryIfNeeded(normalized);
            if (index !== null && index !== undefined) {
                return this.getGeometryName(index);
            }
            return normalized;
        }

        if (typeof value === 'object') {
            if (Array.isArray(value)) {
                return value.slice();
            }
            return { ...value };
        }

        return value;
    }

    coerceGeometryIndexDescriptor(value) {
        if (value === undefined || value === null) {
            return null;
        }

        if (typeof value === 'number' && Number.isFinite(value)) {
            return this.normalizeGeometryIndex(value);
        }

        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (!trimmed) return null;
            if (/^-?\d+$/.test(trimmed)) {
                return this.normalizeGeometryIndex(Number(trimmed));
            }
            const normalized = GeometryLibrary.normalizeName(trimmed);
            const index = this.registerGeometryIfNeeded(normalized);
            if (index !== null && index !== undefined) {
                return index;
            }
            return null;
        }

        if (typeof value === 'object') {
            if (typeof value.index === 'number') {
                return this.normalizeGeometryIndex(value.index);
            }
            if (value.name) {
                return this.coerceGeometryIndexDescriptor(value.name);
            }
        }

        return null;
    }

    coerceGeometryList(value) {
        if (value === undefined || value === null || value === '') {
            return null;
        }

        let entries;
        if (Array.isArray(value)) {
            entries = value;
        } else if (typeof value === 'string') {
            const trimmed = value.trim();
            if (!trimmed) return null;
            entries = trimmed.split(',').map(token => token.trim()).filter(Boolean);
        } else {
            entries = [value];
        }

        const mapped = entries
            .map(item => this.coerceGeometryIndexDescriptor(item))
            .filter(idx => idx !== null && idx !== undefined);

        return mapped.length ? mapped : null;
    }

    scanGeometryDescriptors(sequences) {
        if (!Array.isArray(sequences)) return;

        let needsRefresh = false;

        const registerName = (candidate) => {
            if (!candidate) return;
            const normalized = GeometryLibrary.normalizeName(candidate);
            if (!normalized) return;
            const lower = normalized.toLowerCase();
            if (this.geometryModes.has(lower)) return;
            if (/^-?\d+$/.test(normalized)) return;
            if (this.geometryNameLookup && this.geometryNameLookup.has(lower)) return;
            if (GeometryLibrary.registerGeometry(normalized)) {
                needsRefresh = true;
            }
        };

        const visitDescriptor = (descriptor) => {
            if (descriptor === undefined || descriptor === null) return;
            if (Array.isArray(descriptor)) {
                descriptor.forEach(item => visitDescriptor(item));
                return;
            }
            if (typeof descriptor === 'number') return;
            if (typeof descriptor === 'string') {
                registerName(descriptor);
                return;
            }
            if (typeof descriptor === 'object') {
                if (typeof descriptor.index === 'number') return;
                if (descriptor.name) {
                    registerName(descriptor.name);
                }
                if (descriptor.list) {
                    visitDescriptor(descriptor.list);
                }
            }
        };

        sequences.forEach(seq => {
            const effects = seq.effects || {};
            visitDescriptor(effects.geometry);
            visitDescriptor(effects.geometryStart);
            visitDescriptor(effects.geometryEnd);
            visitDescriptor(effects.geometryList);
        });

        if (needsRefresh) {
            this.refreshGeometryMetadata();
        }
    }

    resetGeometryState(preserveLast = false) {
        const baseIndex = preserveLast && Number.isFinite(this.lastGeometryIndex)
            ? this.normalizeGeometryIndex(this.lastGeometryIndex)
            : 0;

        this.lastGeometryIndex = baseIndex;
        this.geometryState = {
            activeSequenceId: null,
            sequenceStartGeometry: baseIndex,
            lastRandomIndex: baseIndex,
            lastRandomChangeTime: -Infinity
        };

        this.updateGeometryReadout(this.lastGeometryIndex);
    }

    ingestAIChoreography(sequenceData) {
        try {
            const normalized = this.dynamicBridge.normalizeSequences(sequenceData);
            this.sequences = normalized.map(seq => ({
                time: seq.time,
                duration: seq.duration,
                effects: seq.effects
            }));
            this.scanGeometryDescriptors(this.sequences);
            this.resetGeometryState(true);
            this.renderSequenceList();
            this.updateStatus(`AI choreography loaded (${this.sequences.length} sequences)`);
        } catch (error) {
            console.error('Failed to ingest AI choreography', error);
            this.updateStatus('AI choreography failed: ' + error.message);
        }
    }

    updateTimeline() {
        const progress = (this.audio.currentTime / this.audio.duration) * 100;
        document.getElementById('timeline-progress').style.width = progress + '%';
    }

    updateInfoPanel(audioData) {
        document.getElementById('beat-info').textContent = `BPM: ${this.detectedBPM} | Threshold: ${this.beatThreshold}`;
        document.getElementById('energy-info').textContent = `Energy: ${(audioData.energy * 100).toFixed(0)}% | Bass: ${(audioData.bass * 100).toFixed(0)}%`;
    }

    updateStatus(message) {
        document.getElementById('status').textContent = message;
    }

    exportChoreography() {
        const data = JSON.stringify(this.sequences, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'choreography.json';
        a.click();
        URL.revokeObjectURL(url);
        console.log('💾 Exported choreography');
    }

    importChoreography() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    this.ingestAIChoreography(data);
                    console.log('📂 Imported choreography');
                } catch (error) {
                    console.error('Failed to import choreography:', error);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }
}