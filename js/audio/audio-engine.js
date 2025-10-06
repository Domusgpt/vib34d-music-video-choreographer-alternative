/**
 * VIB34D Audio Engine Module
 * Advanced audio reactivity hub that feeds all visualization systems
 * Built on the unified AudioAnalyzer / ParameterMapper toolkit
 */

import { AudioAnalyzer } from '../../src/audio/AudioAnalyzer.js';
import { ParameterMapper } from '../../src/audio/ParameterMapper.js';
import { ADSREnvelope } from '../../src/audio/ADSREnvelope.js';

// Global audio state flags - CRITICAL for system integration
window.audioEnabled = false; // Global audio flag (will auto-enable on interaction)

const clamp01 = value => Math.min(Math.max(value, 0), 1);

function createDefaultReactiveState() {
    return {
        bass: 0,
        mid: 0,
        high: 0,
        sparkle: 0,
        energy: 0,
        motion: 0,
        onset: 0,
        hueShift: 0,
        intensity: 0,
        spectralCentroid: 0,
        spectralRolloff: 0,
        spectralFlux: 0,
        rms: 0,
        bpm: 0,
        bands: {
            subBass: 0,
            bass: 0,
            lowMid: 0,
            mid: 0,
            highMid: 0,
            high: 0,
            air: 0
        }
    };
}

/**
 * Advanced Audio Engine - Unified analysis + parameter routing
 */
export class AdvancedAudioEngine {
    constructor(options = {}) {
        this.context = null;
        this.mediaStream = null;
        this.analyserNode = null;
        this.audioAnalyzer = null;
        this.parameterMapper = null;
        this.listeners = new Set();

        this.isActive = false;
        this.isEnabled = false;
        this.processingHandle = null;
        this.frameScheduler = 'raf';

        this.options = {
            fftSize: options.fftSize || 2048,
            smoothingTimeConstant: options.smoothingTimeConstant ?? 0.7,
            energySmoothing: options.energySmoothing ?? 0.75,
            onsetThreshold: options.onsetThreshold ?? 0.18,
            minimumOnsetInterval: options.minimumOnsetInterval ?? 110
        };

        this.sensitivity = {
            bass: options.bassGain ?? 1,
            mid: options.midGain ?? 1,
            high: options.highGain ?? 1,
            energy: options.energyGain ?? 1,
            sparkle: options.sparkleGain ?? 1,
            motion: options.motionGain ?? 1
        };

        window.audioReactive = createDefaultReactiveState();

        console.log('🎵 Audio Engine: Advanced analyzer initialized with default values');
    }

    async init() {
        if (this.isActive) {
            if (this.context?.state === 'suspended') {
                await this.context.resume();
            }
            this.setEnabled(true);
            return true;
        }

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.warn('⚠️ Audio Analyzer: getUserMedia not available.');
            return false;
        }

        try {
            console.log('🎵 Advanced Audio Engine: Requesting microphone access…');
            this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.context = new (window.AudioContext || window.webkitAudioContext)();

            if (this.context.state === 'suspended') {
                await this.context.resume();
            }

            this.analyserNode = this.context.createAnalyser();
            this.analyserNode.fftSize = this.options.fftSize;
            this.analyserNode.smoothingTimeConstant = this.options.smoothingTimeConstant;

            const source = this.context.createMediaStreamSource(this.mediaStream);
            source.connect(this.analyserNode);

            this.audioAnalyzer = new AudioAnalyzer(this.analyserNode, {
                fftSize: this.options.fftSize,
                frequencySmoothing: this.options.smoothingTimeConstant,
                energySmoothing: this.options.energySmoothing,
                onsetThreshold: this.options.onsetThreshold,
                minimumOnsetInterval: this.options.minimumOnsetInterval
            });

            this.parameterMapper = this.#createDefaultMapper();

            this.isActive = true;
            this.setEnabled(true);
            this.#startProcessing();

            console.log('✅ Audio Engine: Advanced analyzer active');
            return true;
        } catch (error) {
            console.warn('⚠️ Audio Analyzer: Permission denied or device unavailable', error);
            this.isActive = false;
            this.setEnabled(false);
            return false;
        }
    }

    isAudioActive() {
        return this.isActive && this.isEnabled && window.audioEnabled;
    }

    setEnabled(enabled) {
        this.isEnabled = Boolean(enabled);
        window.audioEnabled = this.isEnabled;

        if (!this.isEnabled) {
            this.#resetReactiveState();
            this.#stopProcessingLoop();
        }

        if (!this.processingHandle && this.isActive && this.isEnabled) {
            this.#startProcessing();
        }
    }

    updateSensitivity(settings = {}) {
        if (typeof settings.bassGain === 'number') {
            this.sensitivity.bass = Math.max(0, settings.bassGain);
        }
        if (typeof settings.midGain === 'number') {
            this.sensitivity.mid = Math.max(0, settings.midGain);
        }
        if (typeof settings.highGain === 'number') {
            this.sensitivity.high = Math.max(0, settings.highGain);
        }
        if (typeof settings.energyGain === 'number') {
            this.sensitivity.energy = Math.max(0, settings.energyGain);
        }
        if (typeof settings.sparkleGain === 'number') {
            this.sensitivity.sparkle = Math.max(0, settings.sparkleGain);
        }
        if (typeof settings.motionGain === 'number') {
            this.sensitivity.motion = Math.max(0, settings.motionGain);
        }
    }

    registerMappings(parameterMappings = {}) {
        if (!this.parameterMapper) {
            this.parameterMapper = new ParameterMapper(parameterMappings);
            return;
        }

        Object.entries(parameterMappings).forEach(([parameter, config]) => {
            this.parameterMapper.registerMapping(parameter, config);
        });
    }

    subscribe(listener) {
        if (typeof listener !== 'function') {
            return () => {};
        }

        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    getAudioLevels() {
        return window.audioReactive;
    }

    stop() {
        this.isEnabled = false;
        window.audioEnabled = false;

        this.#stopProcessingLoop();

        if (this.analyserNode) {
            this.analyserNode.disconnect();
            this.analyserNode = null;
        }

        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }

        if (this.context) {
            this.context.close();
            this.context = null;
        }

        this.isActive = false;
        this.#resetReactiveState();

        console.log('🎵 Audio Engine: Stopped and cleaned up');
    }

    #startProcessing() {
        if (!this.isActive || !this.isEnabled || !this.audioAnalyzer || this.processingHandle != null) {
            return;
        }

        const useRaf = typeof requestAnimationFrame === 'function';
        this.frameScheduler = useRaf ? 'raf' : 'timeout';

        const step = () => {
            if (!this.isActive) {
                this.#stopProcessingLoop();
                return;
            }

            if (this.isEnabled) {
                this.#processFrame();
            }

            if (this.frameScheduler === 'raf') {
                this.processingHandle = requestAnimationFrame(step);
            } else {
                this.processingHandle = setTimeout(step, 16);
            }
        };

        if (this.frameScheduler === 'raf') {
            this.processingHandle = requestAnimationFrame(step);
        } else {
            this.processingHandle = setTimeout(step, 16);
        }
    }

    #processFrame() {
        if (!this.audioAnalyzer || !this.parameterMapper) {
            return;
        }

        const audioData = this.audioAnalyzer.analyze();
        const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        const mapped = this.parameterMapper.map(audioData, now);

        const combinedBands = {
            subBass: clamp01(audioData.bands?.subBass ?? 0),
            bass: clamp01(audioData.bands?.bass ?? 0),
            lowMid: clamp01(audioData.bands?.lowMid ?? 0),
            mid: clamp01(audioData.bands?.mid ?? 0),
            highMid: clamp01(audioData.bands?.highMid ?? 0),
            high: clamp01(audioData.bands?.high ?? 0),
            air: clamp01(audioData.bands?.air ?? 0)
        };

        const reactive = {
            bass: clamp01((mapped.bass ?? 0) * this.sensitivity.bass),
            mid: clamp01((mapped.mid ?? 0) * this.sensitivity.mid),
            high: clamp01((mapped.high ?? 0) * this.sensitivity.high),
            sparkle: clamp01((mapped.sparkle ?? combinedBands.air) * this.sensitivity.sparkle),
            energy: clamp01((mapped.energy ?? audioData.rms ?? 0) * this.sensitivity.energy),
            motion: clamp01((mapped.motion ?? audioData.spectralFlux ?? 0) * this.sensitivity.motion),
            onset: audioData.onset ? 1 : 0,
            hueShift: clamp01(mapped.hueShift ?? audioData.spectralCentroid ?? 0),
            intensity: clamp01(mapped.intensity ?? audioData.rms ?? 0),
            spectralCentroid: clamp01(audioData.spectralCentroid ?? 0),
            spectralRolloff: clamp01(audioData.spectralRolloff ?? 0),
            spectralFlux: clamp01(audioData.spectralFlux ?? 0),
            rms: clamp01(audioData.rms ?? 0),
            bpm: audioData.bpm || 0,
            bands: combinedBands
        };

        reactive.energy = Math.max(reactive.energy, (reactive.bass + reactive.mid + reactive.high) / 3);

        window.audioReactive = reactive;

        this.listeners.forEach(listener => {
            try {
                listener(reactive, audioData);
            } catch (error) {
                console.warn('Audio Engine listener error', error);
            }
        });

        if (Math.floor(now) % 5000 < 32) {
            console.log(
                `🎵 Audio levels: Bass=${reactive.bass.toFixed(2)} Mid=${reactive.mid.toFixed(2)} High=${reactive.high.toFixed(2)} Energy=${reactive.energy.toFixed(2)} BPM=${Math.round(reactive.bpm)}`
            );
        }
    }

    #stopProcessingLoop() {
        if (this.processingHandle == null) {
            return;
        }

        if (this.frameScheduler === 'raf') {
            if (typeof cancelAnimationFrame === 'function') {
                cancelAnimationFrame(this.processingHandle);
            }
        } else if (this.frameScheduler === 'timeout') {
            clearTimeout(this.processingHandle);
        }

        this.processingHandle = null;
    }

    #createDefaultMapper() {
        return new ParameterMapper({
            bass: {
                source: data => ((data.bands.subBass + data.bands.bass) / 2) || 0,
                curve: 'exponential',
                range: [0, 1],
                envelope: new ADSREnvelope(60, 140, 0.65, 220),
                envelopeTrigger: 0.05,
                envelopeRelease: 0.03
            },
            mid: {
                source: data => ((data.bands.lowMid + data.bands.mid) / 2) || 0,
                curve: 's-curve',
                intensity: 0.8,
                range: [0, 1],
                envelope: new ADSREnvelope(50, 100, 0.7, 200),
                envelopeTrigger: 0.05,
                envelopeRelease: 0.03
            },
            high: {
                source: data => ((data.bands.highMid + data.bands.high) / 2) || 0,
                curve: 'power',
                power: 1.4,
                range: [0, 1],
                envelope: new ADSREnvelope(35, 90, 0.6, 160),
                envelopeTrigger: 0.04,
                envelopeRelease: 0.025
            },
            sparkle: {
                source: data => data.bands.air || 0,
                curve: 'power',
                power: 1.6,
                range: [0, 1],
                envelope: new ADSREnvelope(25, 80, 0.5, 140),
                envelopeTrigger: 0.04,
                envelopeRelease: 0.02
            },
            energy: {
                source: data => data.rms || 0,
                curve: 'logarithmic',
                range: [0.1, 1],
                envelope: new ADSREnvelope(30, 120, 0.75, 260),
                envelopeTrigger: 0.04,
                envelopeRelease: 0.02
            },
            motion: {
                source: data => data.spectralFlux || 0,
                curve: 'exponential',
                range: [0, 1],
                envelope: new ADSREnvelope(20, 80, 0.5, 180),
                envelopeTrigger: 0.03,
                envelopeRelease: 0.015
            },
            hueShift: {
                source: data => data.spectralCentroid || 0,
                curve: 'linear',
                range: [0, 1]
            },
            intensity: {
                source: data => data.rms || 0,
                curve: 's-curve',
                intensity: 0.6,
                range: [0.2, 1],
                envelope: new ADSREnvelope(25, 70, 0.8, 160),
                envelopeTrigger: 0.04,
                envelopeRelease: 0.02
            }
        });
    }

    #resetReactiveState() {
        window.audioReactive = createDefaultReactiveState();
        this.listeners.forEach(listener => {
            try {
                listener(window.audioReactive, null);
            } catch (error) {
                console.warn('Audio Engine listener error during reset', error);
            }
        });
    }
}

/**
 * Audio Toggle Function - Global function for UI integration
 * Toggles audio reactivity and updates UI state
 */
export function setupAudioToggle() {
    window.toggleAudio = async function toggleAudio() {
        const audioBtn = document.getElementById('audioToggle') || document.querySelector('[onclick="toggleAudio()"]');

        if (!window.audioEngine) {
            console.warn('⚠️ No audio engine instance available');
            return;
        }

        if (!window.audioEngine.isActive) {
            const success = await window.audioEngine.init();
            if (!success) {
                console.warn('⚠️ Audio Reactivity: Permission denied or unavailable');
                return;
            }
            if (audioBtn) {
                audioBtn.classList.add('active');
                audioBtn.title = 'Audio Reactivity: ON';
            }
            console.log('🎵 Audio Reactivity: ON');
            return;
        }

        const nextEnabled = !window.audioEnabled;
        window.audioEngine.setEnabled(nextEnabled);

        if (audioBtn) {
            audioBtn.classList.toggle('active', nextEnabled);
            audioBtn.title = `Audio Reactivity: ${nextEnabled ? 'ON' : 'OFF'}`;
        }

        console.log(`🎵 Audio Reactivity: ${nextEnabled ? 'ON' : 'OFF'}`);
    };
}

// Create and initialize the global audio engine instance
const audioEngine = new AdvancedAudioEngine();
window.audioEngine = audioEngine;

// Set up global audio toggle function
setupAudioToggle();

console.log('🎵 Audio Engine Module: Advanced analyzer loaded');
