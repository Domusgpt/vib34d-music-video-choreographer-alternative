const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const TEST_AUDIO = '/mnt/c/Users/millz/Downloads/Aww shit in catching duces and I\'m not s.mp3';
const DOWNLOAD_PATH = path.join(__dirname, 'test-downloads');

(async () => {
    console.log('🧪 PLAYWRIGHT VIDEO EXPORT TEST\n');

    // Check audio file
    if (!fs.existsSync(TEST_AUDIO)) {
        console.error('❌ Test audio not found:', TEST_AUDIO);
        process.exit(1);
    }
    console.log('✅ Test audio:', path.basename(TEST_AUDIO), '\n');

    // Create download directory
    if (!fs.existsSync(DOWNLOAD_PATH)) {
        fs.mkdirSync(DOWNLOAD_PATH);
    }

    console.log('🌐 Launching Chromium...');
    const browser = await chromium.launch({
        headless: false, // Show browser so we can see what happens
        args: [
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream',
            '--autoplay-policy=no-user-gesture-required'
        ]
    });

    const context = await browser.newContext({
        acceptDownloads: true,
        permissions: ['microphone', 'camera']
    });

    const page = await context.newPage();

    // Listen to console
    page.on('console', msg => {
        const text = msg.text();
        if (text.includes('🎥') || text.includes('🤖') || text.includes('🎬') || text.includes('✅') || text.includes('❌')) {
            console.log('  [PAGE]', text);
        }
    });

    // Listen to errors
    page.on('pageerror', err => {
        console.error('  [ERROR]', err.message);
    });

    console.log('📄 Loading page...');
    await page.goto('https://domusgpt.github.io/vib34d-music-video-choreographer-alternative/', {
        waitUntil: 'networkidle',
        timeout: 30000
    });

    console.log('✅ Page loaded\n');

    // Wait for page to be ready
    await page.waitForSelector('#audio-file');

    console.log('📤 Uploading audio file...');
    await page.setInputFiles('#audio-file', TEST_AUDIO);

    // Wait for export button to be enabled
    await page.waitForFunction(() => {
        return !document.getElementById('export-btn').disabled;
    }, { timeout: 15000 });

    console.log('✅ Audio loaded, export button enabled\n');

    // Wait a bit for everything to initialize
    await page.waitForTimeout(2000);

    console.log('🎥 Clicking Export Video...\n');

    // Set up download listener
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });

    // Click export
    await page.click('#export-btn');

    // Wait for recording controls to appear
    await page.waitForSelector('#recording-controls:not([style*="display: none"])', { timeout: 5000 });
    console.log('✅ Recording controls visible\n');

    // Check recorder state
    const recorderInfo = await page.evaluate(() => {
        return {
            hasRecorder: !!window.activeRecorder,
            state: window.activeRecorder?.state || 'none',
            chunksCount: window.recordingChunks?.length || 0
        };
    });

    console.log('📊 Recorder state:', recorderInfo.state);
    console.log('📦 Initial chunks:', recorderInfo.chunksCount, '\n');

    // Monitor for 5 seconds
    console.log('⏱️  Recording for 5 seconds...\n');

    for (let i = 0; i < 5; i++) {
        await page.waitForTimeout(1000);

        const stats = await page.evaluate(() => {
            return {
                chunks: window.recordingChunks?.length || 0,
                totalSize: window.recordingChunks?.reduce((sum, c) => sum + c.size, 0) || 0,
                recorderState: window.activeRecorder?.state || 'none',
                audioTime: document.querySelector('audio')?.currentTime || 0
            };
        });

        const sizeMB = (stats.totalSize / 1024 / 1024).toFixed(2);
        console.log(`  ${i + 1}s: Chunks=${stats.chunks}, Size=${sizeMB}MB, Audio=${stats.audioTime.toFixed(1)}s, State=${stats.recorderState}`);
    }

    console.log('\n🛑 Stopping recording...\n');

    // Click stop button
    await page.click('button[onclick*="stopRecording"]');

    // Wait for download
    console.log('⏳ Waiting for download...');
    const download = await downloadPromise;

    console.log('✅ Download started!');
    console.log('   Filename:', download.suggestedFilename());

    // Save the file
    const downloadPath = path.join(DOWNLOAD_PATH, download.suggestedFilename());
    await download.saveAs(downloadPath);

    console.log('   Saved to:', downloadPath);

    // Check file
    const stats = fs.statSync(downloadPath);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

    console.log('\n📊 FINAL RESULTS:');
    console.log('================');
    console.log('✅ VIDEO EXPORTED SUCCESSFULLY!');
    console.log('   File:', download.suggestedFilename());
    console.log('   Size:', sizeMB, 'MB');
    console.log('   Path:', downloadPath);

    if (stats.size > 10000) {
        console.log('\n✅ TEST PASSED: Export works! File has content.');
    } else {
        console.log('\n⚠️  WARNING: File is very small, might be corrupted');
    }

    console.log('\n🎬 To verify video+audio, open:', downloadPath);

    await browser.close();
    console.log('\n✅ Test complete!');

    process.exit(stats.size > 10000 ? 0 : 1);

})().catch(err => {
    console.error('\n❌ TEST FAILED:', err.message);
    console.error(err.stack);
    process.exit(1);
});
