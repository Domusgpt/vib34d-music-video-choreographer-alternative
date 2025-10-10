/**
 * Reactive Visualizer Inspector
 * Provides lightweight diagnostics for 4D rotation parameters and audio reactivity
 * across all visualizer implementations. Designed to work both in browser runtime
 * and Node-based diagnostics so we can validate behaviour without a WebGL context.
 */

const ROTATION_MAX = 2;
const ROTATION_TOLERANCE = 0.05;

const DEFAULT_CONTINUITY_THRESHOLDS = Object.freeze({
    rotationJitterThreshold: 0.65,
    rotationStillnessTolerance: 0.12,
    audioSpikeThreshold: 0.35,
    audioStillnessTolerance: 0.1,
    intervalWarningMs: 1500
});

const DEFAULT_HISTORY_LIMIT = 50;
const DEFAULT_THROTTLE_MS = 750;
const STORAGE_KEY = 'vib34d-reactive-inspector-state';
const STORAGE_VERSION = 1;

export class ReactiveVisualizerInspector {
    static throttleMs = DEFAULT_THROTTLE_MS;
    static lastLogByVisualizer = new Map();
    static storedSummaries = [];
    static listeners = new Set();
    static lastSummary = null;
    static lastSummaryByVisualizer = new Map();
    static historyLimit = DEFAULT_HISTORY_LIMIT;
    static sessionCounter = 0;
    static currentSession = null;
    static completedSessions = [];
    static sessionListeners = new Set();
    static rotationJitterThreshold = DEFAULT_CONTINUITY_THRESHOLDS.rotationJitterThreshold;
    static rotationStillnessTolerance = DEFAULT_CONTINUITY_THRESHOLDS.rotationStillnessTolerance;
    static audioSpikeThreshold = DEFAULT_CONTINUITY_THRESHOLDS.audioSpikeThreshold;
    static audioStillnessTolerance = DEFAULT_CONTINUITY_THRESHOLDS.audioStillnessTolerance;
    static intervalWarningMs = DEFAULT_CONTINUITY_THRESHOLDS.intervalWarningMs;
    static continuityProfiles = new Map();
    static persistenceDepth = 0;
    static storageKey = STORAGE_KEY;
    static storageVersion = STORAGE_VERSION;

    static get debugState() {
        if (typeof window === 'undefined') {
            return null;
        }
        window.VIB34D_DEBUG = window.VIB34D_DEBUG || {};
        window.VIB34D_DEBUG.reactiveInspector = window.VIB34D_DEBUG.reactiveInspector || {};
        return window.VIB34D_DEBUG.reactiveInspector;
    }

    static getDefaultContinuityConfig() {
        return { ...DEFAULT_CONTINUITY_THRESHOLDS };
    }

    static normalizeContinuityConfig(config = {}) {
        if (!config || typeof config !== 'object') {
            return {};
        }
        const normalized = {};
        const keys = [
            'rotationJitterThreshold',
            'rotationStillnessTolerance',
            'audioSpikeThreshold',
            'audioStillnessTolerance',
            'intervalWarningMs'
        ];
        keys.forEach((key) => {
            if (!Object.prototype.hasOwnProperty.call(config, key)) {
                return;
            }
            const value = Number(config[key]);
            if (!Number.isFinite(value)) {
                return;
            }
            normalized[key] = key.endsWith('Ms')
                ? Math.max(0, Math.round(value))
                : Math.max(0, value);
        });
        return normalized;
    }

    static getContinuityConfig(visualizer = null) {
        const base = {
            rotationJitterThreshold: this.rotationJitterThreshold,
            rotationStillnessTolerance: this.rotationStillnessTolerance,
            audioSpikeThreshold: this.audioSpikeThreshold,
            audioStillnessTolerance: this.audioStillnessTolerance,
            intervalWarningMs: this.intervalWarningMs
        };
        const defaultProfile = this.continuityProfiles.get('default') || null;
        const visualizerProfile = visualizer
            ? (this.continuityProfiles.get(visualizer) || null)
            : null;
        return {
            ...base,
            ...(defaultProfile || {}),
            ...(visualizerProfile || {})
        };
    }

    static getContinuityProfileInfo(visualizer = null) {
        const profile = visualizer && this.continuityProfiles.has(visualizer)
            ? visualizer
            : (this.continuityProfiles.has('default') ? 'default' : 'base');
        return {
            profile,
            config: this.getContinuityConfig(visualizer)
        };
    }

    static setContinuityProfile(visualizer, config = {}) {
        if (!visualizer || typeof visualizer !== 'string') {
            return null;
        }
        const normalized = this.normalizeContinuityConfig(config);
        if (!Object.keys(normalized).length) {
            this.continuityProfiles.delete(visualizer);
            this.persistStateToStorage();
            return null;
        }
        this.continuityProfiles.set(visualizer, normalized);
        this.persistStateToStorage();
        return { ...normalized };
    }

    static removeContinuityProfile(visualizer) {
        if (!visualizer || typeof visualizer !== 'string') {
            return;
        }
        this.continuityProfiles.delete(visualizer);
        this.persistStateToStorage();
    }

    static clearContinuityProfiles() {
        this.continuityProfiles.clear();
        this.persistStateToStorage();
    }

    static getContinuityProfiles() {
        const result = {};
        this.continuityProfiles.forEach((value, key) => {
            result[key] = { ...value };
        });
        return result;
    }

    static updateContinuityThresholds(config = {}, { visualizer = null, persistProfile = true } = {}) {
        const normalized = this.normalizeContinuityConfig(config);
        if (!Object.keys(normalized).length) {
            return this.getContinuityConfig(visualizer);
        }
        if (!visualizer) {
            Object.entries(normalized).forEach(([key, value]) => {
                if (Object.prototype.hasOwnProperty.call(DEFAULT_CONTINUITY_THRESHOLDS, key)) {
                    this[key] = value;
                }
            });
            if (persistProfile) {
                const existing = this.continuityProfiles.get('default') || {};
                this.continuityProfiles.set('default', { ...existing, ...normalized });
                this.persistStateToStorage();
            }
            return this.getContinuityConfig();
        }
        const merged = { ...(this.continuityProfiles.get(visualizer) || {}), ...normalized };
        this.continuityProfiles.set(visualizer, merged);
        this.persistStateToStorage();
        return this.getContinuityConfig(visualizer);
    }

    static resetContinuityThresholds({ visualizer = null } = {}) {
        if (!visualizer) {
            Object.entries(DEFAULT_CONTINUITY_THRESHOLDS).forEach(([key, value]) => {
                this[key] = value;
            });
            this.continuityProfiles.delete('default');
            this.persistStateToStorage();
            return this.getContinuityConfig();
        }
        this.continuityProfiles.delete(visualizer);
        this.persistStateToStorage();
        return this.getContinuityConfig(visualizer);
    }

    static resetContinuityState() {
        this.lastSummaryByVisualizer.clear();
    }

    static canPersistState() {
        return typeof window !== 'undefined'
            && typeof window.localStorage !== 'undefined'
            && window.localStorage !== null;
    }

    static suspendPersistence() {
        this.persistenceDepth += 1;
    }

    static resumePersistence() {
        this.persistenceDepth = Math.max(0, this.persistenceDepth - 1);
    }

    static persistStateToStorage() {
        if (this.persistenceDepth > 0 || !this.canPersistState()) {
            return false;
        }
        try {
            const payload = this.getStateSnapshot();
            window.localStorage.setItem(this.storageKey, JSON.stringify(payload));
            return true;
        } catch (error) {
            console.warn('ReactiveVisualizerInspector failed to persist state:', error);
            return false;
        }
    }

    static clearStateFromStorage() {
        if (!this.canPersistState()) {
            return false;
        }
        try {
            window.localStorage.removeItem(this.storageKey);
            return true;
        } catch (error) {
            console.warn('ReactiveVisualizerInspector failed to clear persisted state:', error);
            return false;
        }
    }

    static getStateSnapshot() {
        return {
            version: this.storageVersion,
            capturedAt: Date.now(),
            thresholds: {
                rotationJitterThreshold: this.rotationJitterThreshold,
                rotationStillnessTolerance: this.rotationStillnessTolerance,
                audioSpikeThreshold: this.audioSpikeThreshold,
                audioStillnessTolerance: this.audioStillnessTolerance,
                intervalWarningMs: this.intervalWarningMs
            },
            continuityProfiles: this.getContinuityProfiles(),
            historyLimit: this.historyLimit,
            throttleMs: this.throttleMs
        };
    }

    static applyStateSnapshot(snapshot = {}, { merge = false, persist = false } = {}) {
        if (!snapshot || typeof snapshot !== 'object') {
            return false;
        }

        this.suspendPersistence();
        try {
            if (!merge) {
                Object.entries(DEFAULT_CONTINUITY_THRESHOLDS).forEach(([key, value]) => {
                    this[key] = value;
                });
                this.clearContinuityProfiles();
                this.setHistoryLimit(DEFAULT_HISTORY_LIMIT);
                this.throttleMs = DEFAULT_THROTTLE_MS;
            }

            if (snapshot.thresholds) {
                const normalizedThresholds = this.normalizeContinuityConfig(snapshot.thresholds);
                Object.entries(normalizedThresholds).forEach(([key, value]) => {
                    if (Object.prototype.hasOwnProperty.call(DEFAULT_CONTINUITY_THRESHOLDS, key)) {
                        this[key] = value;
                    }
                });
            }

            if (snapshot.continuityProfiles && typeof snapshot.continuityProfiles === 'object') {
                Object.entries(snapshot.continuityProfiles).forEach(([name, config]) => {
                    if (typeof name === 'string' && config) {
                        this.setContinuityProfile(name, config);
                    }
                });
            }

            if (Number.isFinite(snapshot.historyLimit)) {
                this.setHistoryLimit(snapshot.historyLimit);
            }

            if (Number.isFinite(snapshot.throttleMs)) {
                this.throttleMs = Math.max(0, Math.floor(snapshot.throttleMs));
            }
        } finally {
            this.resumePersistence();
        }

        if (persist) {
            this.persistStateToStorage();
        }

        return true;
    }

    static loadStateFromStorage({ merge = false } = {}) {
        if (!this.canPersistState()) {
            return false;
        }
        try {
            const raw = window.localStorage.getItem(this.storageKey);
            if (!raw) {
                return false;
            }
            const parsed = JSON.parse(raw);
            if (parsed && (!parsed.version || parsed.version === this.storageVersion)) {
                return this.applyStateSnapshot(parsed, { merge, persist: false });
            }
            console.warn('ReactiveVisualizerInspector ignored incompatible persisted state version.');
            return false;
        } catch (error) {
            console.warn('ReactiveVisualizerInspector failed to load persisted state:', error);
            return false;
        }
    }

    static exportState({ pretty = false } = {}) {
        const snapshot = this.getStateSnapshot();
        return JSON.stringify(snapshot, null, pretty ? 2 : 0);
    }

    static importState(payload, { merge = false, persist = true } = {}) {
        if (!payload) {
            return false;
        }
        try {
            const parsed = typeof payload === 'string' ? JSON.parse(payload) : payload;
            if (!parsed || typeof parsed !== 'object') {
                return false;
            }
            return this.applyStateSnapshot(parsed, { merge, persist });
        } catch (error) {
            console.warn('ReactiveVisualizerInspector failed to import state:', error);
            return false;
        }
    }

    static resetState({ clearProfiles = true, clearStorage = false } = {}) {
        this.suspendPersistence();
        try {
            Object.entries(DEFAULT_CONTINUITY_THRESHOLDS).forEach(([key, value]) => {
                this[key] = value;
            });
            if (clearProfiles) {
                this.continuityProfiles.clear();
            } else {
                this.continuityProfiles.delete('default');
            }
            this.setHistoryLimit(DEFAULT_HISTORY_LIMIT);
            this.throttleMs = DEFAULT_THROTTLE_MS;
        } finally {
            this.resumePersistence();
        }

        if (clearStorage) {
            this.clearStateFromStorage();
        }
        this.persistStateToStorage();
        return this.getStateSnapshot();
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
        const continuity = this.applyContinuityAnalysis(summary);
        if (continuity) {
            summary.continuity = continuity;
            if (Array.isArray(continuity.warnings) && continuity.warnings.length) {
                summary.warnings.push(...continuity.warnings);
            }
        }
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

    static applyContinuityAnalysis(summary) {
        if (!summary || !summary.visualizer) {
            return null;
        }

        const previous = this.lastSummaryByVisualizer.get(summary.visualizer) || null;
        const continuityConfig = this.getContinuityConfig(summary.visualizer);
        const profileInfo = this.getContinuityProfileInfo(summary.visualizer);
        const continuity = {
            hasPrevious: Boolean(previous),
            rotationDelta: 0,
            audioDelta: 0,
            intervalMs: 0,
            jitter: false,
            lag: false,
            intervalAnomaly: false,
            warnings: [],
            profile: profileInfo.profile,
            thresholds: { ...continuityConfig }
        };

        if (previous) {
            const currentRotation = summary?.rotation?.magnitude ?? 0;
            const previousRotation = previous?.rotation?.magnitude ?? 0;
            const currentAudio = summary?.effect?.audioSupport ?? 0;
            const previousAudio = previous?.effect?.audioSupport ?? 0;

            continuity.rotationDelta = Math.abs(currentRotation - previousRotation);
            continuity.audioDelta = Math.abs(currentAudio - previousAudio);
            continuity.intervalMs = Math.max(0, summary.timestamp - (previous.timestamp ?? summary.timestamp));

            if (continuity.rotationDelta > continuityConfig.rotationJitterThreshold
                && continuity.audioDelta <= continuityConfig.audioStillnessTolerance) {
                continuity.jitter = true;
                continuity.warnings.push('Rotation jitter spike detected without matching audio change.');
            }

            if (continuity.audioDelta > continuityConfig.audioSpikeThreshold
                && continuity.rotationDelta <= continuityConfig.rotationStillnessTolerance) {
                continuity.lag = true;
                continuity.warnings.push('Audio-reactive spike detected without rotation response.');
            }

            if (continuity.intervalMs > continuityConfig.intervalWarningMs) {
                continuity.intervalAnomaly = true;
                continuity.warnings.push(`Telemetry gap detected (${Math.round(continuity.intervalMs)}ms).`);
            }
        }

        this.lastSummaryByVisualizer.set(summary.visualizer, summary);
        return continuity;
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
        const session = this.ensureActiveSession();
        summary.sessionId = session?.id ?? null;

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
        if (session) {
            if (!session.firstSummaryTimestamp) {
                session.firstSummaryTimestamp = summary.timestamp;
            }
            session.sampleCount += 1;
            session.lastTimestamp = summary.timestamp;
            session.endedAt = null;
            this.notifySessionListeners(this.getSessionInfo());
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
        this.resetContinuityState();

        if (this.currentSession && !this.currentSession.endedAt) {
            this.currentSession.sampleCount = 0;
            this.currentSession.firstSummaryTimestamp = null;
            this.currentSession.lastTimestamp = null;
            this.notifySessionListeners(this.getSessionInfo());
        }
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

        this.persistStateToStorage();
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

    static summarizeContinuity(history) {
        const stats = {
            samples: 0,
            rotationJitterEvents: 0,
            audioLagEvents: 0,
            intervalAnomalies: 0,
            averageIntervalMs: 0,
            lastIntervalMs: 0,
            lastRotationDelta: 0,
            lastAudioDelta: 0
        };

        if (!Array.isArray(history) || !history.length) {
            return stats;
        }

        let intervalSum = 0;

        history.forEach((entry) => {
            const continuity = entry?.continuity;
            if (!continuity || !continuity.hasPrevious) {
                return;
            }

            if (continuity.jitter) {
                stats.rotationJitterEvents += 1;
            }
            if (continuity.lag) {
                stats.audioLagEvents += 1;
            }
            if (continuity.intervalAnomaly) {
                stats.intervalAnomalies += 1;
            }

            if (Number.isFinite(continuity.intervalMs) && continuity.intervalMs >= 0) {
                intervalSum += continuity.intervalMs;
                stats.samples += 1;
                stats.lastIntervalMs = continuity.intervalMs;
            }

            if (Number.isFinite(continuity.rotationDelta)) {
                stats.lastRotationDelta = continuity.rotationDelta;
            }

            if (Number.isFinite(continuity.audioDelta)) {
                stats.lastAudioDelta = continuity.audioDelta;
            }
        });

        if (stats.samples > 0) {
            stats.averageIntervalMs = intervalSum / stats.samples;
        }

        return stats;
    }

    static getContinuityMetrics() {
        return this.summarizeContinuity(this.getHistory());
    }

    static generateReport({ sampleSize = 12, includeHistory = false, includeMetrics = true, includeCompletedSessions = false } = {}) {
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
            latestSummary: this.lastSummary,
            session: this.getSessionInfo(),
            continuityThresholds: this.getContinuityConfig(),
            continuityProfiles: this.getContinuityProfiles()
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

        report.continuity = this.summarizeContinuity(history);

        if (includeHistory) {
            report.history = history;
        }

        if (includeCompletedSessions) {
            report.completedSessions = this.completedSessions.map((session) => ({ ...session }));
        }

        return report;
    }

    static exportContinuityCSV({ history = null, includeHeader = true } = {}) {
        const records = Array.isArray(history) ? history : this.getHistory();
        const rows = [];
        const escapeValue = (value) => {
            if (value == null) {
                return '';
            }
            const stringValue = String(value);
            if (/[",\n]/.test(stringValue)) {
                return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
        };

        if (includeHeader) {
            rows.push([
                'timestamp',
                'visualizer',
                'geometry',
                'variant',
                'rot4dXW',
                'rot4dYW',
                'rot4dZW',
                'rotationMagnitude',
                'audioSupport',
                'stage',
                'warnings',
                'continuityProfile',
                'rotationDelta',
                'audioDelta',
                'intervalMs',
                'jitter',
                'lag',
                'intervalAnomaly'
            ].join(','));
        }

        records.forEach((entry) => {
            const rotationValues = entry?.rotation?.values || {};
            const continuity = entry?.continuity || {};
            const row = [
                escapeValue(entry?.timestamp ?? ''),
                escapeValue(entry?.visualizer ?? ''),
                escapeValue(entry?.geometryLabel ?? entry?.geometryIndex ?? ''),
                escapeValue(entry?.variant ?? ''),
                escapeValue(rotationValues.rot4dXW ?? ''),
                escapeValue(rotationValues.rot4dYW ?? ''),
                escapeValue(rotationValues.rot4dZW ?? ''),
                escapeValue(entry?.rotation?.magnitude ?? ''),
                escapeValue(entry?.effect?.audioSupport ?? ''),
                escapeValue(entry?.effect?.stage ?? ''),
                escapeValue((entry?.warnings || []).join(' | ')),
                escapeValue(continuity.profile ?? ''),
                escapeValue(continuity.rotationDelta ?? ''),
                escapeValue(continuity.audioDelta ?? ''),
                escapeValue(continuity.intervalMs ?? ''),
                escapeValue(Boolean(continuity.jitter)),
                escapeValue(Boolean(continuity.lag)),
                escapeValue(Boolean(continuity.intervalAnomaly))
            ];
            rows.push(row.join(','));
        });

        return rows.join('\n');
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

    static ensureActiveSession() {
        if (!this.currentSession || this.currentSession.endedAt) {
            const now = Date.now();
            this.sessionCounter += 1;
            const label = this.currentSession?.endedAt && this.currentSession?.label
                ? `${this.currentSession.label} · next`
                : `Session ${this.sessionCounter}`;
            const metadata = this.currentSession?.endedAt && this.currentSession?.metadata
                ? { ...this.currentSession.metadata }
                : {};
            this.currentSession = {
                id: `session-${now}-${Math.random().toString(16).slice(2, 8)}`,
                label,
                metadata,
                startedAt: now,
                sampleCount: 0,
                firstSummaryTimestamp: null,
                lastTimestamp: null,
                endedAt: null
            };
            this.notifySessionListeners(this.getSessionInfo());
        }
        return this.currentSession;
    }

    static beginSession({ label, metadata = {}, resetHistory = true } = {}) {
        const now = Date.now();
        if (this.currentSession) {
            if (!this.currentSession.endedAt) {
                this.currentSession.endedAt = now;
            }
            const snapshot = this.getSessionInfo();
            if (snapshot) {
                this.completedSessions.push(snapshot);
            }
        }

        if (resetHistory) {
            this.clearHistory();
        }

        this.sessionCounter += 1;
        const sessionLabel = typeof label === 'string' && label.trim()
            ? label.trim()
            : `Session ${this.sessionCounter}`;
        this.currentSession = {
            id: `session-${now}-${Math.random().toString(16).slice(2, 8)}`,
            label: sessionLabel,
            metadata: { ...metadata },
            startedAt: now,
            sampleCount: 0,
            firstSummaryTimestamp: null,
            lastTimestamp: null,
            endedAt: null
        };
        this.notifySessionListeners(this.getSessionInfo());
        return this.getSessionInfo();
    }

    static endSession({ finalizeReport = false, sampleSize = 12, includeHistory = true, includeMetrics = true, includeCompletedSessions = false, resetHistory = true } = {}) {
        if (!this.currentSession) {
            const emptyReport = finalizeReport
                ? this.generateReport({ sampleSize, includeHistory, includeMetrics, includeCompletedSessions })
                : null;
            return { session: null, report: emptyReport };
        }

        const now = Date.now();
        if (!this.currentSession.startedAt) {
            this.currentSession.startedAt = now;
        }
        this.currentSession.endedAt = now;

        const sessionSnapshot = this.getSessionInfo();
        this.completedSessions.push(sessionSnapshot);
        this.notifySessionListeners(sessionSnapshot);

        const report = finalizeReport
            ? this.generateReport({ sampleSize, includeHistory, includeMetrics, includeCompletedSessions })
            : null;

        if (resetHistory) {
            this.clearHistory();
        }

        this.currentSession = null;
        this.notifySessionListeners(null);
        return { session: sessionSnapshot, report };
    }

    static getSessionInfo() {
        if (!this.currentSession) {
            return null;
        }
        const now = Date.now();
        const endedAt = this.currentSession.endedAt ?? null;
        const durationMs = (endedAt ?? now) - (this.currentSession.startedAt ?? now);
        return {
            id: this.currentSession.id,
            label: this.currentSession.label,
            metadata: { ...this.currentSession.metadata },
            startedAt: this.currentSession.startedAt,
            endedAt,
            sampleCount: this.currentSession.sampleCount,
            durationMs,
            firstSummaryTimestamp: this.currentSession.firstSummaryTimestamp ?? null,
            lastTimestamp: this.currentSession.lastTimestamp ?? null
        };
    }

    static getCompletedSessions() {
        return this.completedSessions.map((session) => ({ ...session }));
    }

    static updateSession({ label, metadata } = {}) {
        const session = this.ensureActiveSession();
        if (!session) {
            return null;
        }
        if (typeof label === 'string') {
            const trimmed = label.trim();
            if (trimmed) {
                session.label = trimmed;
            }
        }
        if (metadata && typeof metadata === 'object') {
            session.metadata = { ...session.metadata, ...metadata };
        }
        this.notifySessionListeners(this.getSessionInfo());
        return this.getSessionInfo();
    }

    static addSessionListener(listener, { replayCurrent = true } = {}) {
        if (typeof listener !== 'function') {
            return () => {};
        }
        this.sessionListeners.add(listener);
        if (replayCurrent) {
            try {
                listener(this.getSessionInfo());
            } catch (error) {
                console.error('ReactiveVisualizerInspector session listener error (initial replay):', error);
            }
        }
        return () => this.removeSessionListener(listener);
    }

    static removeSessionListener(listener) {
        this.sessionListeners.delete(listener);
    }

    static notifySessionListeners(sessionInfo) {
        this.sessionListeners.forEach((listener) => {
            try {
                listener(sessionInfo);
            } catch (error) {
                console.error('ReactiveVisualizerInspector session listener error:', error);
            }
        });
    }
}

export default ReactiveVisualizerInspector;
