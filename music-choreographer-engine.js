/**
 * VIB34D Music Video Choreographer Engine
 * Dual-mode system: Reactive (built-in audio reactivity) + Choreographed (timeline-based)
 */

import { VIB34DIntegratedEngine } from './src/core/Engine.js';
import { QuantumEngine } from './src/quantum/QuantumEngine.js';
import { RealHolographicSystem } from './src/holograms/RealHolographicSystem.js';
import { AIGenerativeChoreographyEngine } from './src/choreography/AIGenerativeChoreographyEngine.js';
import { VideoExportController } from './src/export/VideoExportController.js';

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

        // Beat detection
        this.beatThreshold = 0.7;
        this.lastBeatTime = 0;
        this.beatInterval = 500;
        this.detectedBPM = 0;

        // Choreography sequences (for choreographed mode)
        this.sequences = [];
        this.currentSequence = null;

        // Audio reactivity multipliers (for reactive mode)
        this.reactivitySettings = {
            bassToGridDensity: 30,
            midToMorph: 0.5,
            highToChaos: 0.6,
            energyToIntensity: 0.5,
            energyToSpeed: 0.5
        };

        // AI choreography + export systems
        this.aiChoreographyEngine = new AIGenerativeChoreographyEngine();
        this.videoExporter = new VideoExportController({
            canvasSelector: '#vib34dLayers canvas'
        });
        this.customParameterState = {};
        this.customParameterDefinitions = {};
        this.isExporting = false;

        this.exportUi = {
            button: document.getElementById('export-video-btn'),
            status: document.getElementById('export-status-text'),
            progress: document.getElementById('export-progress-fill')
        };

        this.effectOverlay = null;

        this.init();
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

        // Setup event listeners
        this.setupEventListeners();
        this.createEffectOverlay();
        this.refreshTransportAvailability();

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
        if (this.exportUi.button) {
            this.exportUi.button.addEventListener('click', () => this.exportVideo());
        }

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

        if (!this.exportDestination) {
            this.exportDestination = this.audioContext.createMediaStreamDestination();
            this.sourceNode.connect(this.exportDestination);
        }

        // Enable controls
        this.refreshTransportAvailability();

        this.updateStatus(`Loaded: ${file.name}`);
        this.updateExportStatus(`Loaded ${file.name}. Ready to export.`);
        this.updateExportProgress(0);
        console.log('🎵 Audio file loaded:', file.name);
    }

    async generateDefaultChoreography() {
        const timeline = this.aiChoreographyEngine.generateInitialTimeline({
            duration: 90,
            systems: ['faceted', 'quantum', 'holographic']
        });

        this.sequences = timeline;
        this.renderSequenceList();
        console.log('🤖 Generated AI choreography timeline with', this.sequences.length, 'segments');
    }

    renderSequenceList() {
        const list = document.getElementById('sequence-list');
        if (!list) return;

        list.innerHTML = this.sequences.map((seq, index) => {
            const effects = seq.effects || {};
            const start = Number(seq.time ?? 0);
            const end = start + Number(seq.duration ?? 0);
            const isAI = this.aiChoreographyEngine.isAISchema(seq);

            if (isAI) {
                const primarySystem = this.extractPrimarySystem(effects);
                const geometryMode = typeof effects.geometry === 'string' ? effects.geometry : (effects.geometry?.mode ?? 'ai-dynamic');
                const summary = effects.metaSummary || [];
                return `
                    <div class="sequence-item ai-sequence">
                        <h4>AI Sequence ${index + 1} (${start.toFixed(1)}s → ${end.toFixed(1)}s)</h4>
                        <div class="ai-sequence-meta">
                            <div><strong>Systems:</strong> ${this.describeSystem(effects)}</div>
                            <div><strong>Geometry Flow:</strong> ${geometryMode}</div>
                        </div>
                        <div class="sequence-controls compact">
                            <label>Start Time (s)</label>
                            <input type="number" value="${start}" step="0.1" onchange="choreographer.updateSequence(${index}, 'time', this.value)">
                            <label>Duration (s)</label>
                            <input type="number" value="${seq.duration}" step="0.1" onchange="choreographer.updateSequence(${index}, 'duration', this.value)">
                            <label>Primary System</label>
                            <select onchange="choreographer.updateSequence(${index}, 'system', this.value)">
                                ${['faceted','quantum','holographic'].map(system => `<option value="${system}" ${system === primarySystem ? 'selected' : ''}>${system.toUpperCase()}</option>`).join('')}
                            </select>
                        </div>
                        ${summary.length ? `<ul class="ai-sequence-summary">${summary.map(item => `<li>${item}</li>`).join('')}</ul>` : ''}
                        <button onclick="choreographer.deleteSequence(${index})" class="danger-btn">Delete</button>
                    </div>
                `;
            }

            return `
                <div class="sequence-item">
                    <h4>Sequence ${index + 1} (${start}s - ${end}s)</h4>
                    <div class="sequence-controls">
                        <label>Start Time (s)</label>
                        <input type="number" value="${start}" onchange="choreographer.updateSequence(${index}, 'time', this.value)">

                        <label>Duration (s)</label>
                        <input type="number" value="${seq.duration}" onchange="choreographer.updateSequence(${index}, 'duration', this.value)">

                        <label>🎨 System</label>
                        <select onchange="choreographer.updateSequence(${index}, 'system', this.value)" style="grid-column: span 2;">
                            <option value="faceted" ${effects.system === 'faceted' ? 'selected' : ''}>🔷 Faceted</option>
                            <option value="quantum" ${effects.system === 'quantum' ? 'selected' : ''}>🌌 Quantum</option>
                            <option value="holographic" ${effects.system === 'holographic' ? 'selected' : ''}>✨ Holographic</option>
                        </select>

                        <label>Geometry</label>
                        <select onchange="choreographer.updateSequence(${index}, 'geometry', this.value)">
                            <option value="hold" ${effects.geometry === 'hold' ? 'selected' : ''}>Hold</option>
                            <option value="cycle" ${effects.geometry === 'cycle' ? 'selected' : ''}>Cycle</option>
                            <option value="morph" ${effects.geometry === 'morph' ? 'selected' : ''}>Morph</option>
                            <option value="random" ${effects.geometry === 'random' ? 'selected' : ''}>Random</option>
                            <option value="explosive" ${effects.geometry === 'explosive' ? 'selected' : ''}>Explosive</option>
                        </select>

                        <label>Rotation</label>
                        <select onchange="choreographer.updateSequence(${index}, 'rotation', this.value)">
                            <option value="minimal" ${effects.rotation === 'minimal' ? 'selected' : ''}>Minimal</option>
                            <option value="smooth" ${effects.rotation === 'smooth' ? 'selected' : ''}>Smooth</option>
                            <option value="accelerate" ${effects.rotation === 'accelerate' ? 'selected' : ''}>Accelerate</option>
                            <option value="chaos" ${effects.rotation === 'chaos' ? 'selected' : ''}>Chaos</option>
                            <option value="extreme" ${effects.rotation === 'extreme' ? 'selected' : ''}>Extreme</option>
                        </select>

                        <label>Chaos Base</label>
                        <input type="number" step="0.1" min="0" max="1" value="${effects.chaos || 0.5}" onchange="choreographer.updateSequence(${index}, 'chaos', this.value)">

                        <label>Speed Base</label>
                        <input type="number" step="0.1" min="0.1" max="3" value="${effects.speed || 1.0}" onchange="choreographer.updateSequence(${index}, 'speed', this.value)">

                        <label>Color Shift</label>
                        <select onchange="choreographer.updateSequence(${index}, 'colorShift', this.value)">
                            <option value="freeze" ${effects.colorShift === 'freeze' ? 'selected' : ''}>Freeze</option>
                            <option value="slow" ${effects.colorShift === 'slow' ? 'selected' : ''}>Slow</option>
                            <option value="medium" ${effects.colorShift === 'medium' ? 'selected' : ''}>Medium</option>
                            <option value="fast" ${effects.colorShift === 'fast' ? 'selected' : ''}>Fast</option>
                            <option value="rainbow" ${effects.colorShift === 'rainbow' ? 'selected' : ''}>Rainbow</option>
                        </select>
                    </div>
                    <div class="sequence-hint">ℹ️ Audio reactivity is ALWAYS active - these are base values that audio modulates</div>
                    <button onclick="choreographer.deleteSequence(${index})" class="danger-btn">Delete</button>
                </div>
            `;
        }).join('');
    }

    extractPrimarySystem(effects) {
        if (typeof effects.system === 'string') {
            return effects.system;
        }
        if (effects.system?.playlist?.length) {
            return effects.system.playlist[0];
        }
        return this.currentSystem;
    }

    describeSystem(effects) {
        if (typeof effects.system === 'string') {
            return effects.system.toUpperCase();
        }
        if (effects.system?.playlist?.length) {
            return effects.system.playlist.map(system => system.toUpperCase()).join(' → ');
        }
        return this.currentSystem.toUpperCase();
    }

    updateSequence(index, property, value) {
        const seq = this.sequences[index];
        if (!seq) return;

        const effects = seq.effects || {};
        const isAI = this.aiChoreographyEngine.isAISchema(seq);

        if (property === 'time' || property === 'duration') {
            seq[property] = parseFloat(value);
        } else if (isAI) {
            if (property === 'system') {
                if (typeof effects.system === 'string') {
                    effects.system = value;
                } else {
                    const playlist = [value, ...(effects.system?.playlist || []).filter(item => item !== value)];
                    effects.system = { ...(effects.system || {}), playlist };
                }
            }
        } else if (property === 'chaos' || property === 'speed') {
            effects[property] = parseFloat(value);
        } else {
            effects[property] = value;
        }

        seq.effects = effects;
        this.renderSequenceList();
        console.log(`Updated sequence ${index}:`, seq);
    }

    deleteSequence(index) {
        this.sequences.splice(index, 1);
        this.renderSequenceList();
    }

    addSequenceToTimeline(newSeq) {
        this.sequences.push(newSeq);
        this.sequences.sort((a, b) => a.time - b.time);
        this.renderSequenceList();
    }

    async switchSystem(systemName) {
        // Cleanup old engine
        if (this.currentEngine && this.currentEngine.destroy) {
            this.currentEngine.destroy();
        }

        // Clear canvases
        const container = document.getElementById('vib34dLayers');
        container.innerHTML = '';

        // Create canvases based on system requirements
        if (systemName === 'faceted') {
            const layers = ['background', 'shadow', 'content', 'highlight', 'accent'];
            layers.forEach(layer => {
                const canvas = document.createElement('canvas');
                canvas.id = `${layer}-canvas`;
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
                container.appendChild(canvas);
            });
        } else if (systemName === 'quantum') {
            const layers = ['background', 'shadow', 'content', 'highlight', 'accent'];
            layers.forEach(layer => {
                const canvas = document.createElement('canvas');
                canvas.id = `quantum-${layer}-canvas`;
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
                container.appendChild(canvas);
            });
        } else if (systemName === 'holographic') {
            for (let i = 0; i < 5; i++) {
                const canvas = document.createElement('canvas');
                canvas.id = `holo-layer-${i}`;
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
                container.appendChild(canvas);
            }
        }

        // Initialize new engine
        try {
            if (systemName === 'faceted') {
                this.currentEngine = new VIB34DIntegratedEngine();
            } else if (systemName === 'quantum') {
                this.currentEngine = new QuantumEngine();
            } else if (systemName === 'holographic') {
                this.currentEngine = new RealHolographicSystem();
            }

            this.currentSystem = systemName;
            this.syncCustomParametersToEngine();

            // Update UI
            document.querySelectorAll('.system-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.system === systemName);
            });

            console.log('✅ Switched to', systemName, 'system');
        } catch (error) {
            console.error('Failed to switch system:', error);
        }
    }

    play() {
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        const playPromise = this.audio.play();
        if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(error => console.warn('Audio playback interrupted:', error));
        }
        this.isPlaying = true;
        this.startVisualization();
        this.updateStatus('Playing...');
        this.refreshTransportAvailability();
        return playPromise;
    }

    pause() {
        this.audio.pause();
        this.isPlaying = false;
        this.updateStatus('Paused');
        this.refreshTransportAvailability();
    }

    stop() {
        this.audio.pause();
        this.audio.currentTime = 0;
        this.isPlaying = false;
        this.updateStatus('Stopped');
        this.refreshTransportAvailability();
        this.handleInactiveChoreographyState({ bass: 0, mid: 0, high: 0, energy: 0 }, 0);
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
        const setParam = (param, value) => this.setParameterOnEngine(param, value);

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

        const activeIndex = this.sequences.findIndex(seq =>
            currentTime >= seq.time && currentTime < seq.time + seq.duration
        );

        if (activeIndex === -1) {
            this.handleInactiveChoreographyState(audioData, currentTime);
            return;
        }

        const activeSequence = this.sequences[activeIndex];
        const relativeTime = currentTime - activeSequence.time;
        const progress = activeSequence.duration > 0 ? relativeTime / activeSequence.duration : 0;

        const evaluation = this.aiChoreographyEngine.evaluate(activeSequence, {
            audio: audioData,
            absoluteTime: currentTime,
            progress,
            currentSystem: this.currentSystem,
            bpm: this.detectedBPM || 120
        });

        if (evaluation?.handled) {
            this.applyEvaluationResult(evaluation, {
                audioData,
                currentTime,
                relativeTime,
                progress,
                sequenceIndex: activeIndex
            });
            return;
        }

        this.updateCustomParameterState({});
        this.syncCustomParametersToEngine();
        this.applyLegacyChoreography(activeSequence, audioData, currentTime);
    }

    applyEvaluationResult(evaluation, context) {
        const setParam = (param, value) => this.setParameterOnEngine(param, value);

        if (evaluation.system && evaluation.system !== this.currentSystem) {
            console.log(`🤖 AI choreography requesting ${evaluation.system} system at ${context.currentTime?.toFixed(1) ?? 0}s`);
            this.switchSystem(evaluation.system);
        }

        if (evaluation.parameterRanges && this.currentEngine?.parameterManager) {
            Object.entries(evaluation.parameterRanges).forEach(([name, range]) => {
                this.currentEngine.parameterManager.extendParameterRange(name, range);
            });
        }

        if (evaluation.parameters) {
            Object.entries(evaluation.parameters).forEach(([param, value]) => setParam(param, value));
        }

        const newCustomValues = {};
        if (evaluation.customParameters) {
            Object.entries(evaluation.customParameters).forEach(([name, info]) => {
                const definition = info.definition || { min: null, max: null, step: 0.01, type: 'float' };
                const value = info.value ?? 0;
                this.customParameterDefinitions[name] = definition;
                if (this.currentEngine?.parameterManager) {
                    this.currentEngine.parameterManager.registerParameter(name, definition, value);
                }
                newCustomValues[name] = value;
            });
        }

        this.updateCustomParameterState(newCustomValues);
        this.syncCustomParametersToEngine(setParam);

        if (typeof context.sequenceIndex === 'number') {
            const target = this.sequences[context.sequenceIndex];
            if (target) {
                target.effects = {
                    ...(target.effects || {}),
                    metaSummary: evaluation.summary || target.effects?.metaSummary
                };
            }
        }

        this.applyExtendedEffects(evaluation.extended || {}, context);

        if (this.currentEngine && this.currentEngine.audioEnabled !== undefined) {
            this.currentEngine.audioEnabled = true;
        }
    }

    applyLegacyChoreography(sequence, audioData, currentTime) {
        const effects = sequence.effects || {};
        const setParam = (param, value) => this.setParameterOnEngine(param, value);

        if (effects.system && effects.system !== this.currentSystem) {
            console.log(`🎬 Choreography: Switching to ${effects.system} system at ${currentTime.toFixed(1)}s`);
            this.switchSystem(effects.system);
        }

        const progress = sequence.duration > 0 ? (currentTime - sequence.time) / sequence.duration : 0;

        if (effects.geometry === 'cycle') {
            const geomIndex = Math.floor((currentTime - sequence.time) / 2) % 9;
            setParam('geometry', geomIndex);
        } else if (effects.geometry === 'random' && audioData.energy > 0.6) {
            const geomIndex = Math.floor(Math.random() * 9);
            setParam('geometry', geomIndex);
        } else if (effects.geometry === 'explosive' && Math.random() < 0.1) {
            const geomIndex = Math.floor(Math.random() * 9);
            setParam('geometry', geomIndex);
        }

        if (effects.rotation === 'chaos') {
            setParam('rot4dXW', Math.sin(currentTime * 2) * Math.PI * audioData.bass);
            setParam('rot4dYW', Math.cos(currentTime * 1.5) * Math.PI * audioData.mid);
            setParam('rot4dZW', Math.sin(currentTime * 3) * Math.PI * audioData.high);
        } else if (effects.rotation === 'smooth') {
            setParam('rot4dXW', Math.sin(currentTime * 0.5 + audioData.bass * 2) * Math.PI);
            setParam('rot4dYW', Math.cos(currentTime * 0.3 + audioData.mid * 2) * Math.PI);
            setParam('rot4dZW', Math.sin(currentTime * 0.4 + audioData.high * 2) * Math.PI * 0.5);
        } else if (effects.rotation === 'extreme') {
            setParam('rot4dXW', Math.sin(currentTime * 5) * Math.PI * (1 + audioData.energy));
            setParam('rot4dYW', Math.cos(currentTime * 4) * Math.PI * (1 + audioData.bass));
            setParam('rot4dZW', Math.sin(currentTime * 6) * Math.PI * (1 + audioData.high));
        } else if (effects.rotation === 'accelerate') {
            const accel = (currentTime - sequence.time) / sequence.duration;
            setParam('rot4dXW', Math.sin(currentTime * (0.5 + accel * 2 + audioData.bass)) * Math.PI);
            setParam('rot4dYW', Math.cos(currentTime * (0.3 + accel * 1.5 + audioData.mid)) * Math.PI);
        } else if (effects.rotation === 'minimal') {
            setParam('rot4dXW', audioData.bass * Math.PI * 0.3);
            setParam('rot4dYW', audioData.mid * Math.PI * 0.3);
            setParam('rot4dZW', audioData.high * Math.PI * 0.2);
        }

        const chaosBase = effects.chaos || 0.5;
        setParam('chaos', chaosBase + audioData.energy * 0.4);

        const speedBase = effects.speed || 1.0;
        setParam('speed', speedBase * (1 + audioData.energy * 0.6));

        const morphBase = effects.rotation === 'chaos' ? 1.5 : 1.0;
        setParam('morphFactor', morphBase + audioData.mid * 0.7);

        const densityBase = 15 + (effects.densityBoost || 0);
        setParam('gridDensity', Math.floor(densityBase + audioData.bass * 35));

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
            hueValue = (effects.baseHue || 180) + audioData.energy * 30;
        }
        setParam('hue', hueValue % 360);

        setParam('intensity', 0.5 + audioData.energy * 0.5);
        setParam('saturation', 0.7 + audioData.bass * 0.3);

        this.applyExtendedEffects({}, { audioData, currentTime, progress });

        if (this.currentEngine && this.currentEngine.audioEnabled !== undefined) {
            this.currentEngine.audioEnabled = true;
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

    refreshTransportAvailability() {
        const hasAudio = !!this.audio?.src;
        ['play-btn', 'pause-btn', 'stop-btn'].forEach(id => {
            const button = document.getElementById(id);
            if (!button) return;
            button.disabled = !hasAudio || this.isExporting;
        });

        if (this.exportUi.button) {
            this.exportUi.button.disabled = !hasAudio || this.isExporting;
        }
    }

    updateStatus(message) {
        document.getElementById('status').textContent = message;
    }

    setExportingState(state) {
        this.isExporting = state;
        this.refreshTransportAvailability();
    }

    updateExportStatus(message) {
        if (this.exportUi.status) {
            this.exportUi.status.textContent = message;
        }
        if (message) {
            this.updateStatus(message);
        }
    }

    updateExportProgress(progress) {
        if (this.exportUi.progress) {
            const safeProgress = Math.max(0, Math.min(1, progress || 0));
            this.exportUi.progress.style.width = `${Math.round(safeProgress * 100)}%`;
        }
    }

    async exportVideo() {
        if (!this.audio?.src) {
            this.updateExportStatus('❗ Load an audio file before exporting video.');
            return;
        }
        if (this.isExporting) return;

        this.setExportingState(true);
        this.updateExportStatus('Preparing video export...');
        this.updateExportProgress(0);

        try {
            await this.videoExporter.export({
                audioElement: this.audio,
                audioStream: this.exportDestination?.stream,
                onBeforeStart: async () => {
                    this.stop();
                    this.audio.currentTime = 0;
                    await this.play();
                },
                onAfterStop: async () => {
                    this.stop();
                },
                onProgress: progress => this.updateExportProgress(progress),
                onStatus: status => this.updateExportStatus(status)
            });
        } catch (error) {
            console.error('Video export failed:', error);
            this.updateExportStatus(`Export failed: ${error.message}`);
        } finally {
            this.setExportingState(false);
            setTimeout(() => this.updateExportProgress(0), 500);
        }
    }

    setParameterOnEngine(name, value) {
        if (this.currentEngine?.parameterManager) {
            this.currentEngine.parameterManager.setParameter(name, value);
        } else if (this.currentEngine?.updateParameter) {
            this.currentEngine.updateParameter(name, value);
        } else if (this.currentEngine?.updateParameters) {
            this.currentEngine.updateParameters({ [name]: value });
        }
    }

    updateCustomParameterState(newValues = {}) {
        const keys = new Set([
            ...Object.keys(this.customParameterState),
            ...Object.keys(newValues)
        ]);

        if (!keys.size) return;

        const damping = 0.85;
        keys.forEach(key => {
            if (Object.prototype.hasOwnProperty.call(newValues, key)) {
                this.customParameterState[key] = newValues[key];
            } else {
                const previous = this.customParameterState[key] ?? 0;
                const decayed = Math.abs(previous) < 0.0001 ? 0 : previous * damping;
                this.customParameterState[key] = decayed;
            }
        });
    }

    syncCustomParametersToEngine(setter = (name, value) => this.setParameterOnEngine(name, value)) {
        if (!Object.keys(this.customParameterDefinitions).length) return;

        Object.entries(this.customParameterDefinitions).forEach(([name, definition]) => {
            const value = this.customParameterState[name] ?? 0;
            const safeValue = Number.isFinite(value) ? value : 0;

            if (this.currentEngine?.parameterManager) {
                const defs = this.currentEngine.parameterManager.parameterDefs || {};
                if (!defs[name]) {
                    this.currentEngine.parameterManager.registerParameter(name, definition, safeValue);
                } else {
                    this.currentEngine.parameterManager.extendParameterRange(name, definition);
                }
            }

            setter(name, safeValue);
            this.customParameterState[name] = safeValue;
        });
    }

    handleInactiveChoreographyState(audioData, currentTime) {
        if (!Object.keys(this.customParameterDefinitions).length && !Object.keys(this.customParameterState).length) {
            return;
        }

        this.updateCustomParameterState({});
        this.syncCustomParametersToEngine();
        this.applyExtendedEffects({}, { audioData, currentTime, progress: 0 });
    }

    applyExtendedEffects(extended = {}, context = {}) {
        const container = document.getElementById('vib34dLayers');
        if (!container) return;
        const overlay = this.createEffectOverlay();

        const energyLevel = context?.audioData?.energy ?? 0;
        const timelineProgress = context?.progress ?? 0;

        const cameraOrbit = extended.cameraOrbit;
        const rollOffset = this.customParameterState.ai_cameraRoll ?? 0;

        if (cameraOrbit) {
            const xDeg = (cameraOrbit.y ?? 0) * -0.12;
            const yDeg = (cameraOrbit.x ?? 0) * 0.12;
            const roll = (cameraOrbit.roll ?? 0) + rollOffset;
            const zoom = 1 + (((cameraOrbit.zoom ?? 1) - 1) * 0.4);
            container.style.transform = `perspective(2000px) rotateX(${xDeg.toFixed(3)}deg) rotateY(${yDeg.toFixed(3)}deg) rotateZ(${roll.toFixed(3)}deg) scale(${zoom.toFixed(3)})`;
        } else {
            container.style.transform = '';
        }

        const bloom = this.customParameterState.ai_layerBloom ?? 0;
        const displacement = this.customParameterState.ai_displacementWarp ?? 0;

        const filterParts = [];
        if (extended.layerPulse) {
            const pulse = extended.layerPulse;
            const brightness = (pulse.content + bloom).toFixed(3);
            const saturation = (pulse.highlight + bloom * 0.4).toFixed(3);
            filterParts.push(`brightness(${brightness})`, `saturate(${saturation})`);
            if (overlay) {
                const accent = pulse.accent ?? 1;
                const timelineBoost = 1 + timelineProgress * 0.2;
                const overlayOpacity = Math.min(1, (0.2 + (accent - 1) * 0.5 + bloom * 0.2) * timelineBoost);
                overlay.style.opacity = overlayOpacity.toFixed(3);
                overlay.style.backdropFilter = `blur(${(pulse.blur + displacement * 4).toFixed(1)}px)`;
            }
        } else {
            if (overlay) {
                const ambientOpacity = Math.min(0.35, energyLevel * 0.18 + bloom * 0.12);
                overlay.style.opacity = ambientOpacity.toFixed(3);
                overlay.style.backdropFilter = `blur(${(2 + displacement * 2).toFixed(1)}px)`;
            }
        }

        if (extended.glitch) {
            const glitchIntensity = extended.glitch.intensity ?? 0;
            const combined = glitchIntensity + displacement * 0.5;
            filterParts.push(`contrast(${(1 + combined * 0.3).toFixed(3)})`);
            container.style.setProperty('--ai-glitch-intensity', combined.toFixed(3));
            if (overlay) {
                overlay.style.mixBlendMode = glitchIntensity > 0.25 ? 'screen' : 'normal';
            }
        } else {
            container.style.removeProperty('--ai-glitch-intensity');
            if (!extended.layerPulse) {
                container.style.filter = '';
            }
        }

        if (!filterParts.length) {
            const baseline = 1 + energyLevel * 0.08 + bloom * 0.05;
            filterParts.push(`brightness(${baseline.toFixed(3)})`);
        }

        container.style.filter = filterParts.join(' ');

        if (extended.vignette && overlay) {
            const rgb = this.hslToRgb(extended.vignette.hue ?? 220, 0.7, 0.55);
            overlay.style.background = `radial-gradient(circle at center, rgba(${rgb}, ${Math.max(0, 0.12 - (extended.vignette.strength ?? 0) * 0.08)}), rgba(0,0,0,${Math.min(0.85, (extended.vignette.strength ?? 0) + 0.2)}))`;
        } else if (overlay) {
            overlay.style.background = '';
        }
    }

    createEffectOverlay() {
        if (this.effectOverlay) {
            return this.effectOverlay;
        }

        const container = document.getElementById('visualizer-container');
        if (!container) return null;

        const overlay = document.createElement('div');
        overlay.id = 'ai-effect-overlay';
        overlay.style.position = 'absolute';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.pointerEvents = 'none';
        overlay.style.transition = 'opacity 0.4s ease, backdrop-filter 0.4s ease';
        overlay.style.opacity = '0';
        overlay.style.mixBlendMode = 'screen';
        container.appendChild(overlay);
        this.effectOverlay = overlay;
        return overlay;
    }

    hslToRgb(h, s, l) {
        const hue = ((h % 360) + 360) % 360 / 360;
        const sat = Math.max(0, Math.min(1, s));
        const light = Math.max(0, Math.min(1, l));

        if (sat === 0) {
            const val = Math.round(light * 255);
            return `${val},${val},${val}`;
        }

        const q = light < 0.5 ? light * (1 + sat) : light + sat - light * sat;
        const p = 2 * light - q;
        const hue2rgb = t => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };

        const r = Math.round(hue2rgb(hue + 1 / 3) * 255);
        const g = Math.round(hue2rgb(hue) * 255);
        const b = Math.round(hue2rgb(hue - 1 / 3) * 255);
        return `${r},${g},${b}`;
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
                    this.sequences = JSON.parse(event.target.result);
                    this.renderSequenceList();
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