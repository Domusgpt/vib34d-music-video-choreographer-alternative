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

await fs.rm(tempDir, { recursive: true, force: true });

console.log('✅ ReactiveVisualizerInspector diagnostics verified');
