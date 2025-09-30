/**
 * VIB34D Music Video Choreographer Engine
 * Dual-mode system: Reactive (built-in audio reactivity) + Choreographed (timeline-based)
 */

import { VIB34DIntegratedEngine } from './src/core/Engine.js';
import { QuantumEngine } from './src/quantum/QuantumEngine.js';
import { RealHolographicSystem } from './src/holograms/RealHolographicSystem.js';

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
        // Auto-generate choreography sequences
        this.sequences = [
            {
                time: 0,
                duration: 15,
                effects: {
                    geometry: 'cycle',
                    rotation: 'smooth',
                    chaos: 0.1,
                    speed: 0.5,
                    colorShift: 'slow'
                }
            },
            {
                time: 15,
                duration: 15,
                effects: {
                    geometry: 'morph',
                    rotation: 'accelerate',
                    chaos: 0.3,
                    speed: 1.0,
                    colorShift: 'medium'
                }
            },
            {
                time: 30,
                duration: 30,
                effects: {
                    geometry: 'random',
                    rotation: 'chaos',
                    chaos: 0.8,
                    speed: 2.0,
                    colorShift: 'fast'
                }
            },
            {
                time: 60,
                duration: 15,
                effects: {
                    geometry: 'hold',
                    rotation: 'minimal',
                    chaos: 0.05,
                    speed: 0.3,
                    colorShift: 'freeze'
                }
            },
            {
                time: 75,
                duration: 999,
                effects: {
                    geometry: 'explosive',
                    rotation: 'extreme',
                    chaos: 1.0,
                    speed: 3.0,
                    colorShift: 'rainbow'
                }
            }
        ];

        this.renderSequenceList();
        console.log('🎬 Generated default choreography');
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

                    <label>Chaos</label>
                    <input type="number" step="0.1" min="0" max="1" value="${seq.effects.chaos}" onchange="choreographer.updateSequence(${index}, 'chaos', this.value)">

                    <label>Speed</label>
                    <input type="number" step="0.1" min="0.1" max="3" value="${seq.effects.speed}" onchange="choreographer.updateSequence(${index}, 'speed', this.value)">

                    <label>Color Shift</label>
                    <select onchange="choreographer.updateSequence(${index}, 'colorShift', this.value)">
                        <option value="freeze" ${seq.effects.colorShift === 'freeze' ? 'selected' : ''}>Freeze</option>
                        <option value="slow" ${seq.effects.colorShift === 'slow' ? 'selected' : ''}>Slow</option>
                        <option value="medium" ${seq.effects.colorShift === 'medium' ? 'selected' : ''}>Medium</option>
                        <option value="fast" ${seq.effects.colorShift === 'fast' ? 'selected' : ''}>Fast</option>
                        <option value="rainbow" ${seq.effects.colorShift === 'rainbow' ? 'selected' : ''}>Rainbow</option>
                    </select>
                </div>
                <button onclick="choreographer.deleteSequence(${index})" style="margin-top: 10px; background: #f44; font-size: 10px; padding: 5px;">Delete</button>
            </div>
        `).join('');
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
        const setParam = (param, value) => {
            if (this.currentEngine.parameterManager) {
                this.currentEngine.parameterManager.setParameter(param, value);
            } else if (this.currentEngine.updateParameter) {
                this.currentEngine.updateParameter(param, value);
            } else if (this.currentEngine.updateParameters) {
                this.currentEngine.updateParameters({ [param]: value });
            }
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
     * CHOREOGRAPHED MODE: Timeline-based choreography with audio overlay
     */
    applyChoreography(audioData) {
        const currentTime = this.audio.currentTime;

        // Find active sequence
        const activeSequence = this.sequences.find(seq =>
            currentTime >= seq.time && currentTime < seq.time + seq.duration
        );

        if (!activeSequence) return;

        const effects = activeSequence.effects;

        const setParam = (param, value) => {
            if (this.currentEngine.parameterManager) {
                this.currentEngine.parameterManager.setParameter(param, value);
            } else if (this.currentEngine.updateParameter) {
                this.currentEngine.updateParameter(param, value);
            } else if (this.currentEngine.updateParameters) {
                this.currentEngine.updateParameters({ [param]: value });
            }
        };

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

        // Rotation choreography
        if (effects.rotation === 'chaos') {
            setParam('rot4dXW', Math.sin(currentTime * 2) * Math.PI * audioData.bass);
            setParam('rot4dYW', Math.cos(currentTime * 1.5) * Math.PI * audioData.mid);
            setParam('rot4dZW', Math.sin(currentTime * 3) * Math.PI * audioData.high);
        } else if (effects.rotation === 'smooth') {
            setParam('rot4dXW', Math.sin(currentTime * 0.5) * Math.PI);
            setParam('rot4dYW', Math.cos(currentTime * 0.3) * Math.PI);
        } else if (effects.rotation === 'extreme') {
            setParam('rot4dXW', Math.sin(currentTime * 5) * Math.PI * (1 + audioData.energy));
            setParam('rot4dYW', Math.cos(currentTime * 4) * Math.PI * (1 + audioData.bass));
            setParam('rot4dZW', Math.sin(currentTime * 6) * Math.PI * (1 + audioData.high));
        } else if (effects.rotation === 'accelerate') {
            const accel = (currentTime - activeSequence.time) / activeSequence.duration;
            setParam('rot4dXW', Math.sin(currentTime * (0.5 + accel * 2)) * Math.PI);
            setParam('rot4dYW', Math.cos(currentTime * (0.3 + accel * 1.5)) * Math.PI);
        }

        // Apply sequence parameters with audio overlay
        setParam('chaos', effects.chaos + audioData.energy * 0.3);
        setParam('speed', effects.speed * (1 + audioData.energy * 0.5));

        const morphBase = effects.rotation === 'chaos' ? 1.5 : 1.0;
        setParam('morphFactor', morphBase + audioData.mid * 0.5);

        const densityBase = 15 + audioData.bass * 30;
        setParam('gridDensity', Math.floor(densityBase));

        // Color shifting based on choreography
        if (effects.colorShift === 'rainbow') {
            setParam('hue', (currentTime * 60) % 360);
        } else if (effects.colorShift === 'fast') {
            setParam('hue', (currentTime * 30 + audioData.bass * 120) % 360);
        } else if (effects.colorShift === 'medium') {
            setParam('hue', (currentTime * 10) % 360);
        } else if (effects.colorShift === 'slow') {
            setParam('hue', (currentTime * 5) % 360);
        }

        setParam('intensity', 0.5 + audioData.energy * 0.5);
        setParam('saturation', 0.7 + audioData.bass * 0.3);
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