/**
 * VIB34D Music Video Choreographer Engine
 * Dual-mode system: Reactive (built-in audio reactivity) + Choreographed (timeline-based)
 */

import { VIB34DIntegratedEngine } from './src/core/Engine.js';
import { QuantumEngine } from './src/quantum/QuantumEngine.js';
import { RealHolographicSystem } from './src/holograms/RealHolographicSystem.js';
import { AdaptiveChoreographyDirector } from './src/ai/AdaptiveChoreographyDirector.js';
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

        this.director = new AdaptiveChoreographyDirector();
        this.dynamicParameterDefs = this.director.getParameterDefinitions();
        this.videoExporter = null;
        this.audioBufferAnalysis = null;
        this.audioDuration = 0;
        this.exportInProgress = false;
        this.audioElement = this.audio;

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
        this.registerDynamicParametersOnActiveEngine();
        this.prepareVideoExporter();

        // Setup event listeners
        this.setupEventListeners();

        // Initialize mode-specific features
        if (this.mode === 'choreographed') {
            await this.generateDefaultChoreography();
        }

        this.updateExportUI('ready', 'Load an audio file to enable video export.');

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

        const exportButton = document.getElementById('export-video-btn');
        if (exportButton) {
            exportButton.addEventListener('click', () => this.handleVideoExport());
        }
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

        this.prepareVideoExporter();
        if (this.videoExporter) {
            this.videoExporter.setAudioSource(this.sourceNode, this.audioContext);
        }

        // Enable controls
        document.getElementById('play-btn').disabled = false;
        document.getElementById('pause-btn').disabled = false;
        document.getElementById('stop-btn').disabled = false;

        try {
            this.updateExportUI('working', 'Analyzing audio & generating choreography...');
            const arrayBuffer = await file.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer.slice(0));
            this.audioDuration = audioBuffer.duration;
            this.audioBufferAnalysis = this.director.analyzeAudioBuffer(audioBuffer);
            this.sequences = this.director.generatePlan(audioBuffer.duration, this.audioBufferAnalysis || {});
            this.renderSequenceList();
            this.updateExportUI('ready', 'AI choreography ready for export.');
        } catch (error) {
            console.error('Audio analysis failed:', error);
            this.updateExportUI('error', `Audio analysis failed: ${error.message}`);
        }

        this.updateStatus(`Loaded: ${file.name}`);
        console.log('🎵 Audio file loaded:', file.name);
    }

    async generateDefaultChoreography() {
        this.sequences = this.director.generatePlan(90, {
            averageRMS: 0.28,
            peak: 0.7,
            sectionProfile: {
                intro: 0.35,
                build: 0.5,
                drop: 0.82,
                breakdown: 0.42,
                finale: 0.88
            }
        });

        this.renderSequenceList();
        console.log('🎬 Generated adaptive baseline choreography');
    }

    renderSequenceList() {
        const list = document.getElementById('sequence-list');
        if (!list) return;

        list.innerHTML = this.sequences.map((seq, index) => `
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
                    </select>

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
                ${this.renderCustomSummary(seq.custom || seq.effects?.custom)}
                <button onclick="choreographer.deleteSequence(${index})" style="margin-top: 10px; background: #f44; font-size: 10px; padding: 5px;">Delete</button>
            </div>
        `).join('');
    }

    renderCustomSummary(customConfig) {
        if (!customConfig || Object.keys(customConfig).length === 0) {
            return `<div class="custom-summary" style="font-size: 9px; margin-top: 6px; color: #0cf;">AI Director auto-controls advanced parameters.</div>`;
        }

        const rows = Object.entries(customConfig).map(([name, config]) => {
            const baseValue = typeof config === 'number' ? config : (config.base ?? 0);
            const audioMap = (config.audioMap && Object.keys(config.audioMap).length > 0)
                ? Object.entries(config.audioMap).map(([band, weight]) => `${band}×${weight}`).join(', ')
                : 'static';
            return `<div class="custom-summary-row" style="display:flex; gap:6px; font-size:9px; color:#0ff; justify-content:space-between;"><span style="text-transform:uppercase; letter-spacing:0.5px;">${name}</span><span>base ${baseValue.toFixed(2)}</span><span>${audioMap}</span></div>`;
        }).join('');

        return `<div class="custom-summary" style="margin-top:6px; padding:6px; border:1px solid rgba(0,255,255,0.2); border-radius:4px; background:rgba(0,255,255,0.05);">${rows}</div>`;
    }

    getActiveParameterManager() {
        if (!this.currentEngine) {
            return null;
        }

        if (this.currentEngine.parameterManager) {
            return this.currentEngine.parameterManager;
        }

        if (this.currentEngine.parameters) {
            return this.currentEngine.parameters;
        }

        return null;
    }

    registerDynamicParametersOnActiveEngine() {
        const manager = this.getActiveParameterManager();
        if (!manager) {
            return;
        }

        this.dynamicParameterDefs.forEach(def => {
            if (typeof manager.hasParameter === 'function' && manager.hasParameter(def.name)) {
                if (typeof manager.extendParameterRange === 'function') {
                    manager.extendParameterRange(def.name, { min: def.min, max: def.max });
                }
                return;
            }

            if (typeof manager.registerParameter === 'function') {
                manager.registerParameter(def.name, def);
            } else if (typeof manager.setParameter === 'function') {
                manager.setParameter(def.name, def.defaultValue ?? 0, { autoRegister: true, skipClamp: true });
            }
        });
    }

    prepareVideoExporter() {
        const stageResolver = () => document.getElementById('visualizer-container') || document.getElementById('stage-container') || document.body;

        if (!this.videoExporter) {
            this.videoExporter = new VideoExportController({
                stageElement: stageResolver(),
                audioElement: this.audio,
                getCanvasLayers: () => Array.from((stageResolver() || document.body).querySelectorAll('canvas'))
            });
        }

        if (this.videoExporter && this.sourceNode && this.audioContext) {
            this.videoExporter.setAudioSource(this.sourceNode, this.audioContext);
        }
    }

    updateExportUI(state, message) {
        const statusEl = document.getElementById('export-status');
        const progressFill = document.getElementById('export-progress-fill');
        const exportButton = document.getElementById('export-video-btn');

        if (!statusEl || !progressFill || !exportButton) {
            return;
        }

        if (state === 'working') {
            exportButton.disabled = true;
            statusEl.textContent = message || 'Rendering video...';
            statusEl.style.color = '#0ff';
            progressFill.style.width = '5%';
        } else if (state === 'error') {
            exportButton.disabled = false;
            statusEl.textContent = message || 'Export failed.';
            statusEl.style.color = '#ff6688';
        } else {
            exportButton.disabled = state === 'disabled';
            statusEl.textContent = message || 'Ready to export video.';
            statusEl.style.color = '#0f0';
            if (state !== 'working') {
                progressFill.style.width = '0%';
            }
        }
    }

    updateExportProgress(percent) {
        const progressFill = document.getElementById('export-progress-fill');
        const statusEl = document.getElementById('export-status');
        if (!progressFill) {
            return;
        }

        const clamped = Math.max(0, Math.min(100, percent));
        progressFill.style.width = `${clamped}%`;
        if (statusEl && this.exportInProgress) {
            statusEl.textContent = `Rendering... ${clamped.toFixed(0)}%`;
        }
    }

    async handleVideoExport() {
        if (this.exportInProgress) {
            return;
        }

        if (!this.videoExporter) {
            this.prepareVideoExporter();
        }

        if (!this.videoExporter) {
            this.updateExportUI('error', 'Video exporter unavailable in this environment.');
            return;
        }

        if (!this.audio || !this.audio.src) {
            this.updateExportUI('error', 'Load an audio file before exporting.');
            return;
        }

        if (!this.sequences || this.sequences.length === 0) {
            this.updateExportUI('error', 'Generate choreography before exporting.');
            return;
        }

        this.exportInProgress = true;

        try {
            this.stop();
            this.updateExportUI('working', 'Preparing AI choreography playback...');
            this.audio.currentTime = 0;

            const result = await this.videoExporter.recordTimeline({
                beforePlayback: async () => {
                    this.audio.currentTime = 0;
                    await this.play();
                },
                afterPlayback: async () => {
                    this.stop();
                },
                onProgress: (value) => this.updateExportProgress(value),
                duration: this.audioDuration || this.audio.duration || undefined
            });

            this.videoExporter.download(result.blob, result.filename);
            this.updateExportUI('ready', `✅ Saved ${result.filename}`);
        } catch (error) {
            console.error('Video export failed:', error);
            this.updateExportUI('error', `❌ Export failed: ${error.message}`);
        } finally {
            this.exportInProgress = false;
            setTimeout(() => this.updateExportProgress(0), 800);
        }
    }

    applyParameter(name, value, options = {}) {
        const manager = this.getActiveParameterManager();
        let finalValue = value;

        if (manager && typeof manager.setParameter === 'function') {
            finalValue = manager.setParameter(name, value, options);
        }

        if (this.currentEngine?.updateParameter) {
            this.currentEngine.updateParameter(name, finalValue);
        } else if (this.currentEngine?.updateParameters) {
            this.currentEngine.updateParameters({ [name]: finalValue });
        }

        return finalValue;
    }

    applyCustomParameters(customConfig, audioData) {
        if (!customConfig) {
            return;
        }

        Object.entries(customConfig).forEach(([name, config]) => {
            if (config == null) {
                return;
            }

            let targetValue;
            let skipClamp = false;

            if (typeof config === 'number') {
                targetValue = config;
            } else {
                targetValue = config.base ?? 0;
                if (config.audioMap) {
                    Object.entries(config.audioMap).forEach(([band, strength]) => {
                        if (audioData[band] !== undefined) {
                            targetValue += audioData[band] * strength;
                        }
                    });
                }

                if (config.range) {
                    targetValue = Math.max(config.range[0], Math.min(config.range[1], targetValue));
                }

                skipClamp = config.allowOverflow ?? false;
            }

            this.applyParameter(name, targetValue, { skipClamp });
        });
    }

    updateSequence(index, property, value) {
        const seq = this.sequences[index];
        if (!seq) return;

        if (property === 'time' || property === 'duration') {
            seq[property] = parseFloat(value);
        } else if (property === 'chaos' || property === 'speed') {
            seq.effects[property] = parseFloat(value);
        } else {
            seq.effects[property] = value;
        }

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
        if (container) {
            container.innerHTML = '';
        }

        // Create canvases based on system requirements
        if (container && systemName === 'faceted') {
            const layers = ['background', 'shadow', 'content', 'highlight', 'accent'];
            layers.forEach(layer => {
                const canvas = document.createElement('canvas');
                canvas.id = `${layer}-canvas`;
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
                container.appendChild(canvas);
            });
        } else if (container && systemName === 'quantum') {
            const layers = ['background', 'shadow', 'content', 'highlight', 'accent'];
            layers.forEach(layer => {
                const canvas = document.createElement('canvas');
                canvas.id = `quantum-${layer}-canvas`;
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
                container.appendChild(canvas);
            });
        } else if (container && systemName === 'holographic') {
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
            this.registerDynamicParametersOnActiveEngine();
            this.prepareVideoExporter();

            // Update UI
            document.querySelectorAll('.system-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.system === systemName);
            });

            console.log('✅ Switched to', systemName, 'system');
        } catch (error) {
            console.error('Failed to switch system:', error);
        }
    }

    async play() {
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }

        const playPromise = this.audio.play();
        this.isPlaying = true;
        this.startVisualization();
        this.updateStatus('Playing...');

        return playPromise;
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
        const setParam = (param, value, options) => this.applyParameter(param, value, options);

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

        const setParam = (param, value, options) => this.applyParameter(param, value, options);

        // CHECK FOR SYSTEM SWITCH (if sequence specifies a different system)
        if (effects.system && effects.system !== this.currentSystem) {
            console.log(`🎬 Choreography: Switching to ${effects.system} system at ${currentTime.toFixed(1)}s`);
            this.switchSystem(effects.system);
        }

        // Geometry choreography
        if (effects.geometry === 'cycle') {
            const geomIndex = Math.floor((currentTime - activeSequence.time) / 2) % 9;
            setParam('geometry', geomIndex);
        } else if (effects.geometry === 'random' && audioData.energy > 0.6) {
            const geomIndex = Math.floor(Math.random() * 9);
            setParam('geometry', geomIndex);
        } else if (effects.geometry === 'explosive' && Math.random() < 0.1) {
            const geomIndex = Math.floor(Math.random() * 9);
            setParam('geometry', geomIndex);
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
        const baseHue = effects.baseHue ?? 0;
        if (effects.colorShift === 'rainbow') {
            hueValue = (baseHue + currentTime * 60 + audioData.energy * 60) % 360;
        } else if (effects.colorShift === 'fast') {
            hueValue = (baseHue + currentTime * 30 + audioData.bass * 120) % 360;
        } else if (effects.colorShift === 'medium') {
            hueValue = (baseHue + currentTime * 10 + audioData.mid * 60) % 360;
        } else if (effects.colorShift === 'slow') {
            hueValue = (baseHue + currentTime * 5 + audioData.high * 30) % 360;
        } else if (effects.colorShift === 'freeze') {
            hueValue = (effects.baseHue || baseHue || 180) + audioData.energy * 30;
        } else {
            hueValue = (baseHue + currentTime * 5) % 360;
        }
        setParam('hue', hueValue % 360);

        // Intensity & Saturation: ALWAYS audio-reactive
        setParam('intensity', 0.5 + audioData.energy * 0.5);
        setParam('saturation', 0.7 + audioData.bass * 0.3);

        const customConfig = activeSequence.custom || effects.custom;
        this.applyCustomParameters(customConfig, audioData);

        // ENABLE BUILT-IN AUDIO REACTIVITY for engines that have it
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