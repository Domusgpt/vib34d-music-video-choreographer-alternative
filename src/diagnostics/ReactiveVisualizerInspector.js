/**
 * Reactive Visualizer Inspector
 * Provides lightweight diagnostics for 4D rotation parameters and audio reactivity
 * across all visualizer implementations. Designed to work both in browser runtime
 * and Node-based diagnostics so we can validate behaviour without a WebGL context.
 */

const ROTATION_MAX = 2;
const ROTATION_TOLERANCE = 0.05;

export class ReactiveVisualizerInspector {
    static throttleMs = 750;
    static lastLogByVisualizer = new Map();
    static storedSummaries = [];
    static listeners = new Set();
    static lastSummary = null;
    static historyLimit = 50;

    /**
     * Inspect visualizer parameters and return a structured diagnostic summary.
     * @param {string} visualizerName
     * @param {{rot4dXW?: number, rot4dYW?: number, rot4dZW?: number}} params
     * @param {{
     *   audioReactive?: { bass?: number, mid?: number, high?: number, energy?: number },
     *   geometryIndex?: number | null,
     *   geometryLabel?: string | null,
     *   canvasId?: string | null,
     *   variant?: string | number | null
     * }} context
     */
    static inspect(visualizerName, params = {}, context = {}) {
        const rotation = this.computeRotationMetrics(params);
        const audio = this.computeAudioMetrics(context.audioReactive);
        const effect = this.describeEffect(rotation, audio);
        const warnings = this.collectWarnings(rotation, effect);

        return {
            visualizer: visualizerName,
            timestamp: Date.now(),
            rotation,
            audio,
            effect,
            warnings,
            geometryIndex: context.geometryIndex ?? null,
            geometryLabel: context.geometryLabel ?? null,
            canvasId: context.canvasId ?? null,
            variant: context.variant ?? null
        };
    }

    static inspectAndReport(visualizerName, params = {}, context = {}) {
        const summary = this.inspect(visualizerName, params, context);
        this.warnIfNeeded(summary);
        this.logIfRequested(summary);
        this.storeSummary(summary);
        return summary;
    }

    static computeRotationMetrics({ rot4dXW = 0, rot4dYW = 0, rot4dZW = 0 } = {}) {
        const magnitude = Math.sqrt(rot4dXW ** 2 + rot4dYW ** 2 + rot4dZW ** 2);
        const normalizedMagnitude = ROTATION_MAX === 0
            ? 0
            : magnitude / (Math.sqrt(3) * ROTATION_MAX);
        const dominant = this.findDominantAxis({ rot4dXW, rot4dYW, rot4dZW });
        const withinRange = [rot4dXW, rot4dYW, rot4dZW].every((value) =>
            Math.abs(value) <= ROTATION_MAX + ROTATION_TOLERANCE
        );

        return {
            values: { rot4dXW, rot4dYW, rot4dZW },
            magnitude,
            normalizedMagnitude,
            withinRange,
            dominantAxis: dominant.axis,
            dominantValue: dominant.value
        };
    }

    static computeAudioMetrics(audio = {}) {
        const bass = this.normalizeAudioValue(audio.bass);
        const mid = this.normalizeAudioValue(audio.mid);
        const high = this.normalizeAudioValue(audio.high);
        const energy = this.normalizeAudioValue(audio.energy);

        const magnitude = Math.sqrt(bass ** 2 + mid ** 2 + high ** 2 + energy ** 2);
        const normalizedMagnitude = Math.min(1, magnitude / 2);

        return {
            bass,
            mid,
            high,
            energy,
            magnitude,
            normalizedMagnitude
        };
    }

    static describeEffect(rotation, audio) {
        const normalized = rotation.normalizedMagnitude;
        let stage = 'intro';
        if (normalized >= 0.75) {
            stage = 'drop';
        } else if (normalized >= 0.45) {
            stage = 'build';
        } else if (normalized >= 0.2) {
            stage = 'verse';
        }

        const dominant = rotation.dominantAxis;
        const axisDescriptions = {
            rot4dXW: 'bass-driven horizontal hyper-spin',
            rot4dYW: 'vertical melodic morph',
            rot4dZW: 'depth-driven percussive rotation'
        };

        const stageDescriptions = {
            intro: 'minimal rotational drift – ideal for ambient intros',
            verse: 'steady multi-plane morph for structural grooves',
            build: 'escalating multi-axis swirl preparing for a drop',
            drop: 'full-spectrum 4D rotation with maximum impact'
        };

        return {
            stage,
            dominantAxis: dominant,
            description: `${stageDescriptions[stage]} (${axisDescriptions[dominant]})`,
            rotationIntensity: normalized,
            audioSupport: audio.normalizedMagnitude
        };
    }

    static collectWarnings(rotation, effect) {
        const warnings = [];
        if (!rotation.withinRange) {
            warnings.push('4D rotation values exceed safe range (±2 radians).');
        }
        if (effect.rotationIntensity < 0.05 && effect.audioSupport > 0.6) {
            warnings.push('High audio energy detected but rotations remain static.');
        }
        return warnings;
    }

    static warnIfNeeded(summary) {
        if (!summary.warnings.length) {
            return;
        }
        const message = `⚠️ [${summary.visualizer}] ${summary.warnings.join(' ')}`;
        if (typeof console !== 'undefined') {
            console.warn(message, summary);
        }
    }

    static logIfRequested(summary) {
        if (!this.shouldLog()) {
            return;
        }
        const now = Date.now();
        const lastLog = this.lastLogByVisualizer.get(summary.visualizer) || 0;
        if (now - lastLog < this.throttleMs) {
            return;
        }
        this.lastLogByVisualizer.set(summary.visualizer, now);
        const logFn = console?.table ? console.table.bind(console) : console.log.bind(console);
        logFn({
            visualizer: summary.visualizer,
            canvas: summary.canvasId ?? 'n/a',
            geometry: summary.geometryLabel ?? summary.geometryIndex ?? 'n/a',
            rot4dXW: summary.rotation.values.rot4dXW.toFixed(2),
            rot4dYW: summary.rotation.values.rot4dYW.toFixed(2),
            rot4dZW: summary.rotation.values.rot4dZW.toFixed(2),
            rotationStage: summary.effect.stage,
            audioSupport: summary.effect.audioSupport.toFixed(2)
        });
    }

    static storeSummary(summary) {
        this.lastSummary = summary;
        if (typeof window !== 'undefined') {
            window.VIB34D_DEBUG = window.VIB34D_DEBUG || {};
            window.VIB34D_DEBUG.reactiveInspector = window.VIB34D_DEBUG.reactiveInspector || {};
            window.VIB34D_DEBUG.reactiveInspector.lastSummary = summary;
            const debugState = window.VIB34D_DEBUG.reactiveInspector;
            if (!Array.isArray(debugState.history)) {
                debugState.history = [];
            }
            debugState.history.push(summary);
            const limit = typeof debugState.historyLimit === 'number'
                ? Math.max(1, debugState.historyLimit)
                : this.historyLimit;
            if (debugState.history.length > limit) {
                debugState.history.splice(0, debugState.history.length - limit);
            }
        } else {
            // Node diagnostics fallback for unit tests
            this.storedSummaries.push(summary);
            if (this.storedSummaries.length > this.historyLimit) {
                this.storedSummaries.splice(0, this.storedSummaries.length - this.historyLimit);
            }
        }
        this.notifyListeners(summary);
    }

    static addListener(listener, { replayLast = true } = {}) {
        if (typeof listener !== 'function') {
            return () => {};
        }
        this.listeners.add(listener);
        if (replayLast && this.lastSummary) {
            try {
                listener(this.lastSummary);
            } catch (error) {
                console.error('ReactiveVisualizerInspector listener error (initial replay):', error);
            }
        }
        return () => this.removeListener(listener);
    }

    static removeListener(listener) {
        this.listeners.delete(listener);
    }

    static notifyListeners(summary) {
        this.listeners.forEach((listener) => {
            try {
                listener(summary);
            } catch (error) {
                console.error('ReactiveVisualizerInspector listener error:', error);
            }
        });
    }

    static getLastSummary() {
        return this.lastSummary;
    }

    static findDominantAxis(rotations) {
        return Object.entries(rotations).reduce((dominant, [axis, value]) => {
            if (Math.abs(value) > Math.abs(dominant.value)) {
                return { axis, value };
            }
            return dominant;
        }, { axis: 'rot4dXW', value: rotations.rot4dXW });
    }

    static normalizeAudioValue(value) {
        if (typeof value !== 'number' || Number.isNaN(value)) {
            return 0;
        }
        return Math.max(0, Math.min(1, value));
    }

    static shouldLog() {
        if (typeof window === 'undefined') {
            return false;
        }
        return Boolean(window.VIB34D_DEBUG?.reactiveInspector?.log);
    }
}

export default ReactiveVisualizerInspector;
