/**
 * Test video export functionality using Puppeteer
 * Tests with real MP3 file from Downloads
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const TEST_AUDIO = '/mnt/c/Users/millz/Downloads/Aww shit in catching duces and I\'m not s.mp3';
const TEST_DURATION = 10000; // Record for 10 seconds

async function testExport() {
    console.log('🧪 Starting video export test...\n');

    // Check if audio file exists
    if (!fs.existsSync(TEST_AUDIO)) {
        console.error('❌ Test audio file not found:', TEST_AUDIO);
        process.exit(1);
    }
    console.log('✅ Test audio file found:', TEST_AUDIO);

    const browser = await puppeteer.launch({
        headless: false, // Show browser to see what happens
        args: [
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream',
            '--autoplay-policy=no-user-gesture-required',
            '--allow-file-access-from-files'
        ]
    });

    const page = await browser.newPage();

    // Set download path
    const downloadPath = path.resolve(__dirname, 'test-downloads');
    if (!fs.existsSync(downloadPath)) {
        fs.mkdirSync(downloadPath);
    }

    await page._client().send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: downloadPath
    });

    console.log('📥 Download path:', downloadPath);

    // Listen to console logs from the page
    page.on('console', msg => {
        const text = msg.text();
        if (text.includes('🎥') || text.includes('🤖') || text.includes('🎬')) {
            console.log('  [PAGE]', text);
        }
    });

    // Listen to page errors
    page.on('pageerror', error => {
        console.error('❌ [PAGE ERROR]', error.message);
    });

    // Navigate to local server
    console.log('\n🌐 Starting local server...');
    const { spawn } = require('child_process');
    const server = spawn('python3', ['-m', 'http.server', '8888'], {
        cwd: __dirname
    });

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('🌐 Loading page: http://localhost:8888/index.html\n');
    await page.goto('http://localhost:8888/index.html', {
        waitUntil: 'networkidle0'
    });

    console.log('✅ Page loaded\n');

    // Wait for the page to be ready
    await page.waitForSelector('#audio-file');

    console.log('📤 Uploading audio file...');

    // Upload audio file
    const fileInput = await page.$('#audio-file');
    await fileInput.uploadFile(TEST_AUDIO);

    // Wait for audio to load
    await page.waitForFunction(() => {
        return !document.getElementById('export-btn').disabled;
    }, { timeout: 10000 });

    console.log('✅ Audio loaded, export button enabled\n');

    // Wait a bit for audio to initialize
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('🎥 Clicking Export Video button...\n');

    // Click export button
    await page.click('#export-btn');

    // Wait for recording to start
    await page.waitForFunction(() => {
        const controls = document.getElementById('recording-controls');
        return controls && controls.style.display !== 'none';
    }, { timeout: 5000 });

    console.log('✅ Recording started! Controls visible\n');

    // Check if recording state is active
    const recorderState = await page.evaluate(() => {
        return {
            hasRecorder: !!window.activeRecorder,
            state: window.activeRecorder ? window.activeRecorder.state : 'none',
            chunksCount: window.recordingChunks ? window.recordingChunks.length : 0
        };
    });

    console.log('📊 Recorder state:', recorderState);

    // Monitor chunks for TEST_DURATION
    console.log(`\n⏱️  Recording for ${TEST_DURATION / 1000} seconds...\n`);

    const startTime = Date.now();
    let lastChunkCount = 0;

    const monitorInterval = setInterval(async () => {
        const stats = await page.evaluate(() => {
            return {
                chunksCount: window.recordingChunks ? window.recordingChunks.length : 0,
                totalSize: window.recordingChunks
                    ? window.recordingChunks.reduce((sum, c) => sum + c.size, 0)
                    : 0,
                recorderState: window.activeRecorder ? window.activeRecorder.state : 'none',
                audioTime: document.querySelector('audio') ? document.querySelector('audio').currentTime : 0
            };
        });

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const sizeMB = (stats.totalSize / 1024 / 1024).toFixed(2);

        if (stats.chunksCount > lastChunkCount) {
            console.log(`  ⏱️  ${elapsed}s - Chunks: ${stats.chunksCount}, Size: ${sizeMB} MB, Audio: ${stats.audioTime.toFixed(1)}s`);
            lastChunkCount = stats.chunksCount;
        }
    }, 500);

    // Wait for recording duration
    await new Promise(resolve => setTimeout(resolve, TEST_DURATION));

    clearInterval(monitorInterval);

    console.log('\n🛑 Stopping recording...\n');

    // Click stop button
    await page.click('button[onclick*="stopRecording"]');

    // Wait for download to complete
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check if file was downloaded
    const files = fs.readdirSync(downloadPath);
    const videoFile = files.find(f => f.startsWith('vib34d-choreography-') && f.endsWith('.webm'));

    console.log('\n📊 FINAL RESULTS:');
    console.log('================');

    if (videoFile) {
        const filePath = path.join(downloadPath, videoFile);
        const stats = fs.statSync(filePath);
        console.log('✅ VIDEO EXPORTED SUCCESSFULLY!');
        console.log('   File:', videoFile);
        console.log('   Size:', (stats.size / 1024 / 1024).toFixed(2), 'MB');
        console.log('   Path:', filePath);

        // Check if file has content
        if (stats.size > 1000) {
            console.log('\n✅ TEST PASSED: Export works correctly!');
        } else {
            console.log('\n⚠️  WARNING: File is very small, might be corrupted');
        }
    } else {
        console.log('❌ NO VIDEO FILE FOUND');
        console.log('   Files in download dir:', files);
        console.log('\n❌ TEST FAILED: Export did not produce a file');
    }

    // Get final page state
    const finalState = await page.evaluate(() => {
        return {
            recordingControlsVisible: document.getElementById('recording-controls').style.display !== 'none',
            hasActiveRecorder: !!window.activeRecorder,
            chunksCollected: window.recordingChunks ? window.recordingChunks.length : 0
        };
    });

    console.log('\nFinal page state:', finalState);

    // Clean up
    console.log('\n🧹 Cleaning up...');
    server.kill();
    await browser.close();

    console.log('✅ Test complete!\n');

    // Exit with appropriate code
    process.exit(videoFile ? 0 : 1);
}

// Run test
testExport().catch(err => {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
});
