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

await fs.rm(tempDir, { recursive: true, force: true });

console.log('✅ ReactiveVisualizerInspector diagnostics verified');
