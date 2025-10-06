export class ADSREnvelope {
    constructor(attackMs = 100, decayMs = 200, sustainLevel = 0.7, releaseMs = 200) {
        this.attack = Math.max(0, attackMs);
        this.decay = Math.max(0, decayMs);
        this.sustain = Math.min(Math.max(sustainLevel, 0), 1);
        this.release = Math.max(0, releaseMs);

        this.phase = 'idle';
        this.value = 0;
        this.targetValue = 0;
        this.phaseStartTime = this.#now();
        this.startValue = 0;
    }

    reset() {
        this.phase = 'idle';
        this.value = 0;
        this.targetValue = 0;
        this.startValue = 0;
        this.phaseStartTime = this.#now();
    }

    trigger(level = 1, time = this.#now()) {
        const clamped = Math.min(Math.max(level, 0), 1);
        this.targetValue = clamped;
        this.phaseStartTime = time;

        if (this.attack <= 0) {
            this.value = clamped;
            this.startValue = this.value;

            if (this.decay <= 0) {
                this.phase = 'sustain';
            } else {
                this.phase = 'decay';
            }
        } else {
            this.phase = 'attack';
            this.startValue = this.value;
        }
    }

    releasePhase(time = this.#now()) {
        if (this.phase === 'idle' || this.release === 0) {
            this.reset();
            return;
        }

        if (this.phase === 'release') {
            return;
        }

        this.phase = 'release';
        this.phaseStartTime = time;
        this.startValue = this.value;
    }

    update(time = this.#now()) {
        const now = time;
        switch (this.phase) {
            case 'attack':
                this.value = this.#interpolate(this.startValue, this.targetValue, this.attack, now);
                if (now - this.phaseStartTime >= this.attack) {
                    this.phase = this.decay === 0 ? 'sustain' : 'decay';
                    this.phaseStartTime = now;
                    this.startValue = this.value;
                }
                break;
            case 'decay':
                {
                    const target = this.targetValue * this.sustain;
                    this.value = this.#interpolate(this.startValue, target, this.decay, now);
                    if (now - this.phaseStartTime >= this.decay) {
                        this.phase = 'sustain';
                        this.phaseStartTime = now;
                        this.startValue = this.value;
                    }
                }
                break;
            case 'sustain':
                this.value = this.targetValue * this.sustain;
                break;
            case 'release':
                this.value = this.#interpolate(this.startValue, 0, this.release, now);
                if (now - this.phaseStartTime >= this.release) {
                    this.reset();
                }
                break;
            default:
                this.value = 0;
                break;
        }

        return this.value;
    }

    isActive() {
        return this.phase !== 'idle';
    }

    clone() {
        return new ADSREnvelope(this.attack, this.decay, this.sustain, this.release);
    }

    #interpolate(start, end, duration, now) {
        if (duration <= 0) {
            return end;
        }
        const progress = Math.min((now - this.phaseStartTime) / duration, 1);
        return start + (end - start) * progress;
    }

    #now() {
        if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
            return performance.now();
        }
        return Date.now();
    }
}

export default ADSREnvelope;
