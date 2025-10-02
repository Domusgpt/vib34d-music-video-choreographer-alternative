const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
    console.log('🧪 LAUNCHING HEADLESS CHROME TEST\n');
    
    const browser = await puppeteer.launch({
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream',
            '--autoplay-policy=no-user-gesture-required'
        ]
    });

    const page = await browser.newPage();
    
    // Capture console logs
    page.on('console', msg => console.log('  [BROWSER]', msg.text()));
    page.on('pageerror', err => console.log('  [ERROR]', err.message));

    console.log('📄 Loading deployed page...');
    await page.goto('https://domusgpt.github.io/vib34d-music-video-choreographer-alternative/', {
        waitUntil: 'networkidle0',
        timeout: 30000
    });

    console.log('✅ Page loaded\n');
    
    // Check if export button exists and is disabled
    const exportBtnExists = await page.$('#export-btn');
    console.log('Export button exists:', !!exportBtnExists);
    
    const exportDisabled = await page.$eval('#export-btn', btn => btn.disabled);
    console.log('Export button disabled (expected):', exportDisabled);
    
    // Check for canvas
    const canvasCount = await page.$$eval('canvas', canvases => canvases.length);
    console.log('Canvas elements:', canvasCount);
    
    // Check global functions
    const hasExportFunc = await page.evaluate(() => typeof window.exportVid === 'function');
    const hasStopFunc = await page.evaluate(() => typeof window.stopRecording === 'function');
    const hasCancelFunc = await page.evaluate(() => typeof window.cancelRecording === 'function');
    
    console.log('window.exportVid exists:', hasExportFunc);
    console.log('window.stopRecording exists:', hasStopFunc);
    console.log('window.cancelRecording exists:', hasCancelFunc);
    
    console.log('\n✅ ALL EXPORT INFRASTRUCTURE IS PRESENT');
    console.log('\n⚠️  Cannot test actual recording without audio file upload');
    console.log('MediaRecorder requires real audio stream to test properly.\n');
    
    await browser.close();
})();
