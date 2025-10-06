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

    static get debugState() {
        if (typeof window === 'undefined') {
            return null;
        }
        window.VIB34D_DEBUG = window.VIB34D_DEBUG || {};
        window.VIB34D_DEBUG.reactiveInspector = window.VIB34D_DEBUG.reactiveInspector || {};
        return window.VIB34D_DEBUG.reactiveInspector;
    }

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
        const debugState = this.debugState;
        if (debugState) {
            debugState.lastSummary = summary;
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

    static getHistory() {
        const debugState = this.debugState;
        if (debugState && Array.isArray(debugState.history)) {
            return [...debugState.history];
        }
        return [...this.storedSummaries];
    }

    static clearHistory() {
        const debugState = this.debugState;
        if (debugState) {
            debugState.history = [];
            debugState.lastSummary = null;
        }
        this.storedSummaries.length = 0;
        this.lastSummary = null;
        this.lastLogByVisualizer.clear();
    }

    static setHistoryLimit(limit) {
        const parsed = Number(limit);
        if (!Number.isFinite(parsed) || parsed <= 0) {
            return this.historyLimit;
        }
        const normalized = Math.max(1, Math.floor(parsed));
        this.historyLimit = normalized;

        const debugState = this.debugState;
        if (debugState) {
            debugState.historyLimit = normalized;
            if (Array.isArray(debugState.history) && debugState.history.length > normalized) {
                debugState.history.splice(0, debugState.history.length - normalized);
            }
        }

        if (this.storedSummaries.length > normalized) {
            this.storedSummaries.splice(0, this.storedSummaries.length - normalized);
        }

        return this.historyLimit;
    }

    static computeRollingMetrics(sampleSize = 10) {
        const history = this.getHistory();
        if (!history.length) {
            return {
                sampleSize: 0,
                rotationMagnitude: { average: 0, min: 0, max: 0 },
                audioSupportAverage: 0,
                warningRate: 0,
                stageCounts: {},
                dominantAxisFrequency: {},
                latestSummary: null
            };
        }

        const size = Math.min(history.length, Math.max(1, Math.floor(Number(sampleSize) || 1)));
        const subset = history.slice(history.length - size);

        const stageCounts = { intro: 0, verse: 0, build: 0, drop: 0 };
        const dominantAxisFrequency = { rot4dXW: 0, rot4dYW: 0, rot4dZW: 0 };
        let rotationSum = 0;
        let audioSupportSum = 0;
        let warningsCount = 0;
        let rotationMin = Number.POSITIVE_INFINITY;
        let rotationMax = Number.NEGATIVE_INFINITY;

        subset.forEach((entry) => {
            const rotationMagnitude = entry?.rotation?.magnitude ?? 0;
            const audioSupport = entry?.effect?.audioSupport ?? 0;
            const stage = entry?.effect?.stage;
            const axis = entry?.rotation?.dominantAxis;
            const warningTotal = Array.isArray(entry?.warnings) ? entry.warnings.length : 0;

            rotationSum += rotationMagnitude;
            audioSupportSum += audioSupport;
            warningsCount += warningTotal;
            rotationMin = Math.min(rotationMin, rotationMagnitude);
            rotationMax = Math.max(rotationMax, rotationMagnitude);

            if (stage) {
                stageCounts[stage] = (stageCounts[stage] ?? 0) + 1;
            }
            if (axis) {
                dominantAxisFrequency[axis] = (dominantAxisFrequency[axis] ?? 0) + 1;
            }
        });

        if (!Number.isFinite(rotationMin)) {
            rotationMin = 0;
        }
        if (!Number.isFinite(rotationMax)) {
            rotationMax = 0;
        }

        return {
            sampleSize: subset.length,
            rotationMagnitude: {
                average: rotationSum / subset.length,
                min: rotationMin,
                max: rotationMax
            },
            audioSupportAverage: audioSupportSum / subset.length,
            warningRate: subset.length ? warningsCount / subset.length : 0,
            stageCounts,
            dominantAxisFrequency,
            latestSummary: subset[subset.length - 1] ?? null
        };
    }

    static generateReport({ sampleSize = 12, includeHistory = false, includeMetrics = true } = {}) {
        const history = this.getHistory();
        const report = {
            generatedAt: new Date().toISOString(),
            historyLimit: this.historyLimit,
            totalSamples: history.length,
            visualizerUsage: {},
            geometryUsage: {},
            variantUsage: {},
            warnings: { total: 0, byMessage: {} },
            rangeViolations: 0,
            stalledFrames: 0,
            stageTotals: { intro: 0, verse: 0, build: 0, drop: 0 },
            dominantAxisTotals: { rot4dXW: 0, rot4dYW: 0, rot4dZW: 0 },
            audioEnergy: { min: 0, max: 0, average: 0 },
            latestSummary: this.lastSummary
        };

        if (history.length) {
            const warningMessages = report.warnings.byMessage;
            let audioMin = Number.POSITIVE_INFINITY;
            let audioMax = Number.NEGATIVE_INFINITY;
            let audioSum = 0;

            history.forEach((entry) => {
                const name = entry?.visualizer ?? 'unknown';
                report.visualizerUsage[name] = (report.visualizerUsage[name] ?? 0) + 1;

                const geometryLabel = entry?.geometryLabel ?? (typeof entry?.geometryIndex === 'number'
                    ? `#${entry.geometryIndex}`
                    : 'unassigned');
                report.geometryUsage[geometryLabel] = (report.geometryUsage[geometryLabel] ?? 0) + 1;

                const variantKey = entry?.variant != null ? String(entry.variant) : 'unassigned';
                report.variantUsage[variantKey] = (report.variantUsage[variantKey] ?? 0) + 1;

                const stage = entry?.effect?.stage;
                if (stage) {
                    report.stageTotals[stage] = (report.stageTotals[stage] ?? 0) + 1;
                }

                const axis = entry?.rotation?.dominantAxis;
                if (axis) {
                    report.dominantAxisTotals[axis] = (report.dominantAxisTotals[axis] ?? 0) + 1;
                }

                if (entry?.warnings?.length) {
                    report.warnings.total += entry.warnings.length;
                    entry.warnings.forEach((warning) => {
                        const key = warning || 'Unknown warning';
                        warningMessages[key] = (warningMessages[key] ?? 0) + 1;
                    });
                }

                if (entry?.rotation && entry.rotation.withinRange === false) {
                    report.rangeViolations += 1;
                }

                const rotationIntensity = entry?.effect?.rotationIntensity ?? 0;
                const audioSupport = entry?.effect?.audioSupport ?? 0;
                if (audioSupport > 0.6 && rotationIntensity < 0.1) {
                    report.stalledFrames += 1;
                }

                const energy = entry?.audio?.energy ?? 0;
                audioMin = Math.min(audioMin, energy);
                audioMax = Math.max(audioMax, energy);
                audioSum += energy;
            });

            if (Number.isFinite(audioMin)) {
                report.audioEnergy.min = audioMin;
            }
            if (Number.isFinite(audioMax)) {
                report.audioEnergy.max = audioMax;
            }
            report.audioEnergy.average = history.length ? audioSum / history.length : 0;
        }

        if (includeMetrics) {
            report.metrics = this.computeRollingMetrics(sampleSize);
        }

        if (includeHistory) {
            report.history = history;
        }

        return report;
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
        return Boolean(this.debugState?.log);
    }
}

export default ReactiveVisualizerInspector;
