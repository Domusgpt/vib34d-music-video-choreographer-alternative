/**
 * ADSR Envelope System
 * Provides attack/decay/sustain/release dynamics for smooth parameter transitions
 *
 * A Paul Phillips Manifestation - Paul@clearseassolutions.com
 * "The Revolution Will Not be in a Structured Format" © 2025
 */

export class ADSREnvelope {
    constructor(attackMs = 200, decayMs = 500, sustain = 0.6, releaseMs = 1000) {
        this.attack = attackMs;
        this.decay = decayMs;
        this.sustain = sustain;
        this.release = releaseMs;

        this.state = 'idle'; // idle, attack, decay, sustain, release
        this.currentValue = 0;
        this.targetValue = 0;
        this.startTime = 0;
        this.startValue = 0;
        this.sustainValue = 0;
    }

    /**
     * Trigger envelope with new target value
     * Starts attack phase
     */
    trigger(value) {
        this.targetValue = value;
        this.startValue = this.currentValue;
        this.startTime = Date.now();
        this.state = 'attack';
        this.sustainValue = value * this.sustain;
    }

    /**
     * Start release phase
     * Smoothly returns to zero
     */
    release() {
        if (this.state === 'idle') return;

        this.startValue = this.currentValue;
        this.startTime = Date.now();
        this.state = 'release';
    }

    /**
     * Update envelope state and calculate current value
     * Call every frame
     */
    update() {
        const now = Date.now();
        const elapsed = now - this.startTime;

        switch (this.state) {
            case 'attack':
                if (elapsed < this.attack) {
                    // Linear attack
                    const progress = elapsed / this.attack;
                    this.currentValue = this.startValue + (this.targetValue - this.startValue) * progress;
                } else {
                    // Attack complete, move to decay
                    this.currentValue = this.targetValue;
                    this.state = 'decay';
                    this.startTime = now;
                    this.startValue = this.targetValue;
                }
                break;

            case 'decay':
                if (elapsed < this.decay) {
                    // Exponential decay to sustain level
                    const progress = elapsed / this.decay;
                    const expProgress = 1 - Math.exp(-5 * progress); // Exponential curve
                    this.currentValue = this.targetValue + (this.sustainValue - this.targetValue) * expProgress;
                } else {
                    // Decay complete, move to sustain
                    this.currentValue = this.sustainValue;
                    this.state = 'sustain';
                }
                break;

            case 'sustain':
                // Hold at sustain level
                this.currentValue = this.sustainValue;
                break;

            case 'release':
                if (elapsed < this.release) {
                    // Exponential release to zero
                    const progress = elapsed / this.release;
                    const expProgress = Math.exp(-5 * progress); // Exponential decay
                    this.currentValue = this.startValue * expProgress;
                } else {
                    // Release complete, return to idle
                    this.currentValue = 0;
                    this.state = 'idle';
                }
                break;

            case 'idle':
                this.currentValue = 0;
                break;
        }

        return this.currentValue;
    }

    /**
     * Get current envelope value without updating
     */
    getValue() {
        return this.currentValue;
    }

    /**
     * Get current envelope state
     */
    getState() {
        return this.state;
    }

    /**
     * Reset envelope to idle state
     */
    reset() {
        this.state = 'idle';
        this.currentValue = 0;
        this.targetValue = 0;
        this.startValue = 0;
    }

    /**
     * Set envelope parameters dynamically
     */
    setParameters(attackMs, decayMs, sustain, releaseMs) {
        if (attackMs !== undefined) this.attack = attackMs;
        if (decayMs !== undefined) this.decay = decayMs;
        if (sustain !== undefined) this.sustain = sustain;
        if (releaseMs !== undefined) this.release = releaseMs;
    }

    /**
     * Check if envelope is active (not idle)
     */
    isActive() {
        return this.state !== 'idle';
    }
}
