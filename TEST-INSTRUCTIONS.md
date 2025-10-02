# Video Export Test Instructions

## I Cannot Test This Myself
The WSL environment doesn't support GUI browsers, so I've created test files for YOU to run.

---

## Option 1: Manual Test Page (EASIEST)

### Steps:
1. Open: http://localhost:8889/test-export-manual.html
   OR open file directly: `test-export-manual.html`

2. Click "Choose File" and select an MP3 from your Downloads folder

3. Wait for "Audio loaded" success message

4. Click "Run Export Test"

5. **Watch the test results** - it will log everything:
   - Canvas detection
   - Stream creation
   - Chunk collection
   - Blob creation
   - Download trigger

6. If it works, you'll see:
   ```
   ✅ Blob created: X.XX MB
   ✅ Download triggered: test-export-{timestamp}.webm
   🎉 EXPORT TEST PASSED!
   ```

7. Check your Downloads folder for the .webm file

8. Open the .webm file - verify it has video + audio

---

## Option 2: Test Full Application

### Steps:
1. Open: https://domusgpt.github.io/vib34d-music-video-choreographer-alternative/

2. Open browser console (F12)

3. Load an audio file

4. Click "🎥 Export Video"

5. **Watch console for these logs:**
   ```
   🎥 ========= STARTING EXPORT =========
   🎥 Recorder state: inactive
   🎥 Video tracks: 1
   🎥 Audio tracks: 1
   🎥 Recorder.start() called, state: recording
   🎥 Chunk #1 received: XXXXX bytes
   🎥 Chunk #2 received: XXXXX bytes
   ... (more chunks)
   ```

6. Red recording controls should appear with timer

7. Click "Stop & Download" or let audio finish

8. **Watch for these final logs:**
   ```
   🎥 ========= RECORDER STOPPED =========
   🎥 Chunks received: XX
   🎥 Total bytes: XXXXXX
   🎥 Blob created: {size: XXXX, type: "video/webm", sizeMB: "X.XX MB"}
   🎥 Triggering download: vib34d-choreography-XXXXXXXXX.webm
   🎥 ✅ EXPORT COMPLETE - File should be downloading
   ```

9. Check Downloads folder

10. Open .webm file to verify

---

## What to Report

### If It Works:
✅ "Export works! File size: X.XX MB, plays correctly"

### If It Fails:
❌ Copy ALL console logs and tell me:
- Where did it stop?
- What was the last log message?
- Any errors in red?
- Did chunks collect? (Check for "Chunk #X received" messages)
- Did blob create? (Check for "Blob created" message)
- Did download trigger? (Check for "Triggering download" message)

---

## Expected Behavior

### Working Export Should Show:
1. ✅ Canvas detection (faceted/quantum/holographic)
2. ✅ Recorder state: "recording"
3. ✅ Video tracks: 1, Audio tracks: 1
4. ✅ Chunks arriving every ~100ms
5. ✅ Timer counting up
6. ✅ File size growing
7. ✅ Stop button works
8. ✅ Blob creates with >0 bytes
9. ✅ File downloads
10. ✅ File plays with video + audio

### Common Failure Points:
- ❌ "No visible canvas" → Switch to a system first
- ❌ "Video tracks: 0" → Canvas not capturing
- ❌ "Audio tracks: 0" → Audio context issue
- ❌ No chunks arrive → MediaRecorder not working
- ❌ Chunks = 0 bytes → Stream has no data
- ❌ Blob creates but no download → Browser blocked it

---

## Debugging

If chunks never arrive:
- Check if canvas is rendering (should see visuals)
- Check if audio is playing (should hear it)
- Try different browser (Chrome vs Firefox vs Edge)

If blob creates but no download:
- Check browser's download permissions
- Check if popup blocker is active
- Try right-click → "Save as" on console URL

If file is empty/corrupted:
- Check if canvas was black during recording
- Check if audio was muted
- Try shorter recording (5-10 seconds)

---

## Test Files Created

1. `test-export-manual.html` - Standalone test page
2. `test-export.js` - Puppeteer test (requires puppeteer install)
3. Updated `index.html` - Has comprehensive logging

---

## My Honest Answer

**I added:**
- Stop/Cancel buttons
- Timer and file size display
- Comprehensive console logging
- Test files

**I did NOT:**
- Actually run it in a browser
- Verify files download correctly
- Test with real audio
- Confirm video+audio work

**The code SHOULD work** based on:
- Standard MediaRecorder API usage
- Correct stream combination
- Proper audio tapping (no conflicts)
- Valid codec selection

**But I cannot guarantee it works until you test it.**

That's the truth.
