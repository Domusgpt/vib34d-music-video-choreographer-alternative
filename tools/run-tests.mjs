#!/usr/bin/env node
import { spawn } from 'node:child_process';

const args = process.argv.slice(2);
const dashDashIndex = args.indexOf('--');
const passthroughArgs = dashDashIndex === -1 ? [] : args.slice(dashDashIndex + 1);
const filteredArgs = dashDashIndex === -1 ? args : args.slice(0, dashDashIndex);

const flags = new Set(filteredArgs);
const onlyUnit = flags.has('--only-unit');
const onlyPlaywright = flags.has('--only-playwright');
const skipUnit = flags.has('--skip-unit') || onlyPlaywright;
const skipPlaywright = flags.has('--skip-playwright') || onlyUnit || process.env.SKIP_PLAYWRIGHT === '1';
const requirePlaywright = flags.has('--require-playwright') || process.env.CI;

const playwrightArgs = passthroughArgs.length > 0 ? passthroughArgs : [];

async function run(command, commandArgs, { label, optional = false } = {}) {
    return new Promise((resolve) => {
        const child = spawn(command, commandArgs, { stdio: 'inherit', shell: false });

        child.on('error', (error) => {
            console.error(`\n❌ Failed to start ${label || command}:`, error.message);
            resolve({ code: 1, error });
        });

        child.on('close', (code, signal) => {
            if (signal) {
                console.warn(`\n⚠️ ${label || command} terminated with signal ${signal}`);
                return resolve({ code: 1, signal });
            }

            if (code !== 0) {
                if (optional) {
                    console.warn(`\n⚠️ Optional task ${label || command} exited with code ${code}`);
                } else {
                    console.error(`\n❌ Task ${label || command} exited with code ${code}`);
                }
            }

            resolve({ code });
        });
    });
}

async function main() {
    const summary = [];
    let overallCode = 0;

    if (!skipUnit) {
        console.log('\n▶️ Running reactive inspector diagnostics...');
        const result = await run('node', ['tests/reactive-inspector.test.mjs'], { label: 'Reactive Inspector diagnostics' });
        summary.push({ name: 'unit:reactive-inspector', ...result });
        if (result.code !== 0) {
            overallCode = result.code;
        }
    } else {
        summary.push({ name: 'unit:reactive-inspector', skipped: true });
    }

    if (!skipPlaywright) {
        console.log('\n▶️ Running Playwright suite...');
        const result = await run('node', ['node_modules/@playwright/test/cli.js', 'test', ...playwrightArgs], {
            label: 'Playwright tests',
            optional: !requirePlaywright,
        });
        summary.push({ name: 'e2e:playwright', ...result, optional: !requirePlaywright });
        if (result.code !== 0 && requirePlaywright) {
            overallCode = result.code;
        }
    } else {
        summary.push({ name: 'e2e:playwright', skipped: true, optional: !requirePlaywright });
    }

    console.log('\n==== Test Summary ====');
    for (const item of summary) {
        if (item.skipped) {
            console.log(`- ${item.name}: skipped${item.optional ? ' (optional)' : ''}`);
            continue;
        }
        if (item.code === 0) {
            console.log(`- ${item.name}: ✅ passed`);
        } else if (item.optional) {
            console.log(`- ${item.name}: ⚠️ optional failure (exit code ${item.code ?? 'unknown'})`);
        } else {
            console.log(`- ${item.name}: ❌ failed (exit code ${item.code ?? 'unknown'})`);
        }
    }

    if (overallCode !== 0) {
        console.log('\nTests completed with failures.');
        process.exit(overallCode);
    }

    const optionalFailures = summary.filter((item) => !item.skipped && item.optional && item.code && item.code !== 0);
    if (optionalFailures.length > 0) {
        console.log('\nOptional tasks failed. Set --require-playwright or CI=1 to make them blocking.');
    }

    console.log('\nAll required tests completed.');
}

main().catch((error) => {
    console.error('\nUnexpected error while running tests:', error);
    process.exit(1);
});
