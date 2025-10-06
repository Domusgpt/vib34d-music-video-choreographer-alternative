import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sourcePath = path.resolve(__dirname, '../src/diagnostics/ReactiveVisualizerInspector.js');
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'reactive-visualizer-'));
const tempModulePath = path.join(tempDir, 'ReactiveVisualizerInspector.mjs');
await fs.writeFile(tempModulePath, await fs.readFile(sourcePath, 'utf8'), 'utf8');
const module = await import(pathToFileURL(tempModulePath));
const { ReactiveVisualizerInspector } = module;

const summary = ReactiveVisualizerInspector.inspect('unit-test', {
    rot4dXW: 1.4,
    rot4dYW: 1.1,
    rot4dZW: 0.5
}, {
    audioReactive: { bass: 0.7, mid: 0.4, high: 0.3, energy: 0.5 },
    geometryIndex: 5
});

assert.equal(summary.rotation.withinRange, true, 'Expected rotation within safe range');
assert.equal(summary.rotation.dominantAxis, 'rot4dXW', 'XW should be dominant rotation axis');
assert.equal(summary.effect.stage, 'build', 'Normalized rotation should classify as build stage');
assert(summary.effect.description.includes('multi-axis'), 'Effect description should explain motion');

const overflow = ReactiveVisualizerInspector.inspect('unit-test-overflow', {
    rot4dXW: 2.5,
    rot4dYW: 0.0,
    rot4dZW: 0.0
});

assert.equal(overflow.rotation.withinRange, false, 'Overflow rotation should be flagged');
assert(overflow.warnings.length > 0, 'Overflow should trigger at least one warning');

const updates = [];
const unsubscribe = ReactiveVisualizerInspector.addListener((summary) => {
    updates.push(summary.visualizer);
}, { replayLast: false });

ReactiveVisualizerInspector.inspectAndReport('listener-test', {
    rot4dXW: 0.25,
    rot4dYW: 0.1,
    rot4dZW: 0.05
});

assert.deepEqual(updates, ['listener-test'], 'Listener should capture inspectAndReport summaries');

unsubscribe();

ReactiveVisualizerInspector.inspectAndReport('listener-test-after-unsubscribe', {
    rot4dXW: 0.4
});

assert.deepEqual(updates, ['listener-test'], 'Listener should stop receiving updates after unsubscribe');

ReactiveVisualizerInspector.clearHistory();

const defaultMetrics = ReactiveVisualizerInspector.computeRollingMetrics();
assert.equal(defaultMetrics.sampleSize, 0, 'Rolling metrics should handle empty history');
assert.equal(defaultMetrics.rotationMagnitude.average, 0, 'Average rotation should default to 0 for empty history');

const limit = ReactiveVisualizerInspector.setHistoryLimit(5);
assert.equal(limit, 5, 'History limit should be configurable');

for (let i = 1; i <= 6; i += 1) {
    ReactiveVisualizerInspector.inspectAndReport(`history-${i}`, {
        rot4dXW: i * 0.1
    }, {
        audioReactive: { energy: i * 0.1 }
    });
}

const history = ReactiveVisualizerInspector.getHistory();
assert.equal(history.length, 5, 'History length should respect the configured limit');
assert.equal(history[0].visualizer, 'history-2', 'History should drop the earliest entries beyond the limit');

const metrics = ReactiveVisualizerInspector.computeRollingMetrics(3);
assert.equal(metrics.sampleSize, 3, 'Rolling metrics should use the requested window size');
assert(Math.abs(metrics.rotationMagnitude.average - 0.5) < 0.0001, 'Average rotation magnitude should match the latest samples');
assert.equal(metrics.stageCounts.intro, 3, 'Expected intro stage counts for low rotation magnitudes');
assert.equal(metrics.dominantAxisFrequency.rot4dXW, 3, 'Dominant axis frequency should reflect the latest samples');
assert.equal(metrics.warningRate, 0, 'Warnings should not appear for safe rotations');

ReactiveVisualizerInspector.clearHistory();
assert.equal(ReactiveVisualizerInspector.getHistory().length, 0, 'Clearing history should remove stored summaries');
assert.equal(ReactiveVisualizerInspector.getLastSummary(), null, 'Clearing history should reset the last summary reference');

ReactiveVisualizerInspector.setHistoryLimit(50);

const baselineContinuity = ReactiveVisualizerInspector.getContinuityConfig();
const defaultContinuity = ReactiveVisualizerInspector.getDefaultContinuityConfig();
Object.entries(defaultContinuity).forEach(([key, value]) => {
    assert(Math.abs((baselineContinuity[key] ?? 0) - value) < 1e-9, `Baseline continuity ${key} should match default thresholds`);
});

const tunedContinuity = ReactiveVisualizerInspector.updateContinuityThresholds({
    rotationJitterThreshold: 0.44,
    audioSpikeThreshold: 0.28,
    intervalWarningMs: 1400
});
assert.equal(tunedContinuity.rotationJitterThreshold, 0.44, 'Global continuity threshold updates should apply immediately');

const continuityProfiles = ReactiveVisualizerInspector.getContinuityProfiles();
assert.equal(Number(continuityProfiles.default.rotationJitterThreshold.toFixed(2)), 0.44, 'Default continuity profile should store global overrides');

const quantumProfile = ReactiveVisualizerInspector.updateContinuityThresholds({
    rotationJitterThreshold: 0.92,
    rotationStillnessTolerance: 0.1
}, { visualizer: 'quantum-demo' });
assert.equal(Number(quantumProfile.rotationJitterThreshold.toFixed(2)), 0.92, 'Visualizer-specific thresholds should merge with global defaults');

const quantumInfo = ReactiveVisualizerInspector.getContinuityProfileInfo('quantum-demo');
assert.equal(quantumInfo.profile, 'quantum-demo', 'Profile info should report custom visualizer overrides');

ReactiveVisualizerInspector.removeContinuityProfile('quantum-demo');
const removedQuantumInfo = ReactiveVisualizerInspector.getContinuityProfileInfo('quantum-demo');
assert.notEqual(removedQuantumInfo.profile, 'quantum-demo', 'Removing a visualizer profile should fall back to global config');

ReactiveVisualizerInspector.resetContinuityThresholds();
assert.deepEqual(ReactiveVisualizerInspector.getContinuityProfiles(), {}, 'Resetting continuity thresholds should clear stored profiles');
const resetContinuity = ReactiveVisualizerInspector.getContinuityConfig();
Object.entries(defaultContinuity).forEach(([key, value]) => {
    assert(Math.abs((resetContinuity[key] ?? 0) - value) < 1e-9, `Reset ${key} should revert to default threshold`);
});

let csvOutput = ReactiveVisualizerInspector.exportContinuityCSV();
assert(csvOutput.startsWith('timestamp,visualizer'), 'CSV export should include a header row');

ReactiveVisualizerInspector.inspectAndReport('csv-visualizer', { rot4dXW: 0.45 }, {
    audioReactive: { energy: 0.5 },
    geometryLabel: 'Cube'
});

csvOutput = ReactiveVisualizerInspector.exportContinuityCSV();
assert(csvOutput.split('\n').length >= 2, 'CSV export should include data rows when history is present');
assert(csvOutput.includes('csv-visualizer'), 'CSV export should include the visualizer identifier');

ReactiveVisualizerInspector.clearHistory();

const dataset = [
    {
        visualizer: 'viz-alpha',
        params: { rot4dXW: 0.05 },
        context: {
            audioReactive: { bass: 1, mid: 0.9, high: 0.8, energy: 1 },
            geometryLabel: 'Prism',
            variant: 'alpha'
        }
    },
    {
        visualizer: 'viz-beta',
        params: { rot4dXW: 0.9, rot4dYW: 0.85, rot4dZW: 0.2 },
        context: {
            audioReactive: { bass: 0.5, energy: 0.3 },
            geometryIndex: 2,
            variant: 'beta'
        }
    },
    {
        visualizer: 'viz-warning',
        params: { rot4dXW: 2.8 },
        context: {
            audioReactive: { bass: 0.7, energy: 0.8 },
            geometryLabel: 'Prism',
            variant: 'beta'
        }
    },
    {
        visualizer: 'viz-drop',
        params: { rot4dXW: 2.0, rot4dYW: 2.0, rot4dZW: 1.8 },
        context: {
            audioReactive: { bass: 0.9, mid: 0.85, high: 0.82, energy: 0.95 },
            geometryLabel: 'Sphere',
            variant: 'gamma'
        }
    }
];

dataset.forEach(({ visualizer, params, context }) => {
    ReactiveVisualizerInspector.inspectAndReport(visualizer, params, context);
});

const report = ReactiveVisualizerInspector.generateReport({ sampleSize: 2 });
assert.equal(report.totalSamples, dataset.length, 'Report should count all history entries');
assert.equal(report.metrics.sampleSize, 2, 'Report metrics should respect requested sample size');
assert.ok(report.visualizerUsage['viz-alpha'] === 1 && report.visualizerUsage['viz-warning'] === 1, 'Visualizer usage should track sample counts');
assert.equal(report.geometryUsage.Prism, 2, 'Geometry usage should count repeated geometry labels');
assert.equal(report.variantUsage.beta, 2, 'Variant usage should track repeated variant labels');
assert(report.warnings.total >= 1, 'Report should aggregate warning totals');
assert.equal(report.rangeViolations, 1, 'Out of range rotations should be counted');
assert(report.stalledFrames >= 1, 'High audio / low rotation frames should be tallied');
assert(report.stageTotals.drop >= 1, 'Drop stage samples should be counted');
assert(report.dominantAxisTotals.rot4dXW >= dataset.length - 1, 'Dominant axis totals should accumulate');
assert(report.audioEnergy.max <= 1 && report.audioEnergy.min >= 0, 'Audio energy bounds should reflect normalized values');

const reportWithHistory = ReactiveVisualizerInspector.generateReport({ includeHistory: true, includeMetrics: false });
assert.equal(Array.isArray(reportWithHistory.history), true, 'Report should include full history when requested');
assert.equal(reportWithHistory.history.length, dataset.length, 'Included history should match stored summaries');
assert.equal(Object.prototype.hasOwnProperty.call(reportWithHistory, 'metrics'), false, 'Metrics should be omitted when includeMetrics=false');

ReactiveVisualizerInspector.clearHistory();

ReactiveVisualizerInspector.resetContinuityThresholds();

const originalDateNow = Date.now;
let fakeNow = 1_000;
Date.now = () => fakeNow;

ReactiveVisualizerInspector.updateContinuityThresholds({
    rotationJitterThreshold: 0.2,
    audioSpikeThreshold: 0.3,
    rotationStillnessTolerance: 0.06,
    audioStillnessTolerance: 0.05,
    intervalWarningMs: 1_200
}, { persistProfile: false });

const baselineContinuitySample = ReactiveVisualizerInspector.inspectAndReport('continuity-test', { rot4dXW: 0.1 }, {
    audioReactive: { energy: 0.2 }
});

assert.equal(baselineContinuitySample.continuity.hasPrevious, false, 'Initial continuity sample should not report previous frame data');

fakeNow += 1_700;

const jitterSummary = ReactiveVisualizerInspector.inspectAndReport('continuity-test', { rot4dXW: 1.0 }, {
    audioReactive: { energy: 0.25 }
});

assert.equal(jitterSummary.continuity.jitter, true, 'Large rotation delta with static audio should register jitter');
assert.equal(jitterSummary.continuity.intervalAnomaly, true, 'Extended telemetry gap should be flagged as an interval anomaly');
assert(jitterSummary.warnings.some((msg) => msg.includes('Rotation jitter spike')), 'Jitter warning should surface in summary warnings');
assert.equal(jitterSummary.continuity.profile, 'base', 'Continuity profile should report the active threshold source');
assert(jitterSummary.continuity.thresholds.rotationJitterThreshold <= 0.21, 'Continuity thresholds should be attached to summaries');

fakeNow += 200;

const lagSummary = ReactiveVisualizerInspector.inspectAndReport('continuity-test', { rot4dXW: 1.05 }, {
    audioReactive: { energy: 0.95 }
});

assert.equal(lagSummary.continuity.lag, true, 'Audio spike without matching rotation should trigger lag flag');
assert(lagSummary.warnings.some((msg) => msg.includes('Audio-reactive spike')), 'Lag warning should be appended to the summary');

const continuityMetrics = ReactiveVisualizerInspector.getContinuityMetrics();
assert.equal(continuityMetrics.rotationJitterEvents >= 1, true, 'Continuity metrics should count jitter events');
assert.equal(continuityMetrics.audioLagEvents >= 1, true, 'Continuity metrics should count lag events');
assert.equal(continuityMetrics.intervalAnomalies >= 1, true, 'Continuity metrics should count interval anomalies');
assert.equal(continuityMetrics.lastIntervalMs, lagSummary.continuity.intervalMs, 'Continuity metrics should track the latest interval duration');
assert(Math.abs(continuityMetrics.lastRotationDelta - lagSummary.continuity.rotationDelta) < 1e-9, 'Continuity metrics should preserve the latest rotation delta');
assert(Math.abs(continuityMetrics.lastAudioDelta - lagSummary.continuity.audioDelta) < 1e-9, 'Continuity metrics should preserve the latest audio delta');

const continuityReport = ReactiveVisualizerInspector.generateReport({ sampleSize: 3 });
assert(continuityReport.continuity.rotationJitterEvents >= 1, 'Report continuity section should include jitter totals');
assert(continuityReport.continuity.audioLagEvents >= 1, 'Report continuity section should include lag totals');
assert(continuityReport.continuity.intervalAnomalies >= 1, 'Report continuity section should include interval anomaly totals');
assert.equal(continuityReport.continuity.lastIntervalMs, lagSummary.continuity.intervalMs, 'Continuity report should carry the latest interval duration');
assert(Math.abs(continuityReport.continuity.lastRotationDelta - lagSummary.continuity.rotationDelta) < 1e-9, 'Continuity report should carry the latest rotation delta');
assert(Math.abs(continuityReport.continuity.lastAudioDelta - lagSummary.continuity.audioDelta) < 1e-9, 'Continuity report should carry the latest audio delta');
assert.equal(continuityReport.continuity.samples >= 2, true, 'Continuity report should track interval samples');
assert(continuityReport.continuityThresholds.rotationJitterThreshold <= 0.21, 'Report should expose the active continuity thresholds');
assert.equal(Object.prototype.hasOwnProperty.call(continuityReport.continuityProfiles, 'default'), false, 'Temporary threshold overrides should not persist profiles when disabled');

Date.now = originalDateNow;
ReactiveVisualizerInspector.resetContinuityThresholds();
ReactiveVisualizerInspector.clearHistory();

const preSession = ReactiveVisualizerInspector.getSessionInfo();
if (preSession) {
    ReactiveVisualizerInspector.endSession({ resetHistory: true });
}

const sessionDetails = ReactiveVisualizerInspector.beginSession({ label: 'Unit Session', metadata: { mode: 'test' } });
assert.equal(sessionDetails.label, 'Unit Session', 'Session label should match requested value');
assert.equal(sessionDetails.sampleCount, 0, 'New session should start with zero samples');

const sessionSummary = ReactiveVisualizerInspector.inspectAndReport('session-visualizer', { rot4dXW: 0.3 }, { audioReactive: { energy: 0.4 } });
assert.equal(sessionSummary.sessionId, sessionDetails.id, 'Session identifier should be attached to telemetry summaries');

const liveSession = ReactiveVisualizerInspector.getSessionInfo();
assert.equal(liveSession.sampleCount, 1, 'Session should track sample counts as telemetry arrives');

const updatedSession = ReactiveVisualizerInspector.updateSession({ label: 'Renamed Session', metadata: { iteration: 1 } });
assert.equal(updatedSession.label, 'Renamed Session', 'Session rename should propagate through inspector state');
assert.equal(updatedSession.metadata.iteration, 1, 'Session metadata updates should merge with existing values');

const { session: finalSession, report: finalReport } = ReactiveVisualizerInspector.endSession({
    finalizeReport: true,
    includeHistory: true,
    includeMetrics: true,
    includeCompletedSessions: true
});

assert(finalSession, 'Ending a session should return the final session snapshot');
assert.equal(finalSession.label, 'Renamed Session', 'Ended session snapshot should use the latest label');
assert.equal(finalSession.sampleCount, 1, 'Ended session should retain sample counts');
assert(finalReport.session && finalReport.session.label === 'Renamed Session', 'Generated report should include the ended session details');
assert(Array.isArray(finalReport.completedSessions), 'Report should be able to include completed session history');
const lastCompletedSession = finalReport.completedSessions[finalReport.completedSessions.length - 1];
assert(lastCompletedSession.id === finalSession.id, 'Completed sessions list should contain the ended session');

assert.equal(ReactiveVisualizerInspector.getSessionInfo(), null, 'Inspector should not track an active session after endSession');

await fs.rm(tempDir, { recursive: true, force: true });

console.log('✅ ReactiveVisualizerInspector diagnostics verified');
