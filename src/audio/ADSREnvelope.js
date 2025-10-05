/**
 * ADSREnvelope implements a simple Attack/Decay/Sustain/Release envelope that can be used
 * to smooth sudden changes in audio driven parameters. The implementation is designed to
 * work with millisecond timing to match the Web Audio API's high resolution clock but
 * gracefully falls back to Date timing if `performance.now` is unavailable.
 */
export class ADSREnvelope {
    constructor({ attack = 50, decay = 200, sustain = 0.7, release = 300 } = {}) {
        this.attack = Math.max(0, attack);
        this.decay = Math.max(0, decay);
        this.sustain = Math.min(1, Math.max(0, sustain));
        this.release = Math.max(0, release);

        this.phase = 'idle';
        this.value = 0;
        this.targetValue = 0;
        this.phaseStartTime = 0;
        this.releaseStartValue = 0;
    }

    /**
     * Trigger the envelope with a new target value.
     */
    trigger(targetValue, now = ADSREnvelope.now()) {
        const clampedTarget = Math.max(0, targetValue);
        this.targetValue = clampedTarget;
        this.phase = this.attack === 0 ? 'decay' : 'attack';
        this.phaseStartTime = now;
        this.value = this.attack === 0 ? clampedTarget : 0;
        this.releaseStartValue = this.value;
        if (this.attack === 0 && this.decay === 0) {
            this.phase = 'sustain';
            this.value = clampedTarget * this.sustain;
        }
    }

    /**
     * Begin the release phase manually. Useful when the trigger condition is no longer met.
     */
    releaseEnvelope(now = ADSREnvelope.now()) {
        if (this.phase === 'idle' || this.phase === 'release') {
            return;
        }
        this.phase = this.release === 0 ? 'idle' : 'release';
        this.phaseStartTime = now;
        this.releaseStartValue = this.value;
        if (this.release === 0) {
            this.value = 0;
        }
    }

    /**
     * Update the envelope state and return the current value.
     */
    update(now = ADSREnvelope.now()) {
        switch (this.phase) {
            case 'attack':
                if (this.attack === 0) {
                    this.phase = 'decay';
                    this.phaseStartTime = now;
                    this.value = this.targetValue;
                    break;
                }
                this.value = this.interpolate(0, this.targetValue, (now - this.phaseStartTime) / this.attack);
                if (now - this.phaseStartTime >= this.attack) {
                    this.phase = 'decay';
                    this.phaseStartTime = now;
                    this.value = this.targetValue;
                }
                break;

            case 'decay':
                if (this.decay === 0) {
                    this.phase = 'sustain';
                    this.value = this.targetValue * this.sustain;
                    break;
                }
                this.value = this.interpolate(
                    this.targetValue,
                    this.targetValue * this.sustain,
                    (now - this.phaseStartTime) / this.decay
                );
                if (now - this.phaseStartTime >= this.decay) {
                    this.phase = 'sustain';
                    this.value = this.targetValue * this.sustain;
                }
                break;

            case 'sustain':
                this.value = this.targetValue * this.sustain;
                break;

            case 'release':
                if (this.release === 0) {
                    this.phase = 'idle';
                    this.value = 0;
                    break;
                }
                this.value = this.interpolate(
                    this.releaseStartValue,
                    0,
                    (now - this.phaseStartTime) / this.release
                );
                if (now - this.phaseStartTime >= this.release) {
                    this.phase = 'idle';
                    this.value = 0;
                }
                break;

            case 'idle':
            default:
                this.value = 0;
                break;
        }

        return this.value;
    }

    /**
     * Reset the envelope back to the idle state immediately.
     */
    reset() {
        this.phase = 'idle';
        this.value = 0;
        this.targetValue = 0;
        this.phaseStartTime = 0;
        this.releaseStartValue = 0;
    }

    interpolate(start, end, progress) {
        const clamped = Math.min(1, Math.max(0, progress));
        return start + (end - start) * clamped;
    }

    static now() {
        if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
            return performance.now();
        }
        return Date.now();
    }
}
