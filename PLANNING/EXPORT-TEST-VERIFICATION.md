# Video Export Test Verification

## Code Flow Analysis

### 1. Export Button Click → `window.exportVid()`

**Checks performed:**
```javascript
✅ Line 874: if (!aud.src) → Verifies audio is loaded
✅ Line 880: if (!window.MediaRecorder) → Checks browser support
✅ Line 896: const visibleCanvas = find visible canvas → Gets current system canvas
✅ Line 898: if (!visibleCanvas) → Alert if no canvas
✅ Line 906: if (canvas.width === 0) → Verify canvas has content
✅ Lines 928-941: MediaRecorder mimeType support checking (vp9 → vp8 → webm)
```

### 2. Stream Setup (Lines 945-959)

```javascript
✅ Line 947: const videoStream = visibleCanvas.captureStream(60)
   → Captures canvas at 60fps as MediaStream

✅ Line 950: const exportDest = ctx.createMediaStreamDestination()
   → Creates audio destination from EXISTING audio context

✅ Line 953: anl.connect(exportDest)
   → Taps audio from analyser node (no conflicts!)

✅ Lines 956-959: Combine video + audio tracks into single stream
```

**This is CORRECT - no audio context conflicts**
- Uses existing `ctx` (AudioContext)
- Taps from `anl` (AnalyserNode) which is already connected
- No second MediaElementSource creation

### 3. MediaRecorder Setup (Lines 962-997)

```javascript
✅ Line 962: const recorder = new MediaRecorder(combinedStream, {...})
   → Creates recorder with combined video+audio stream

✅ Line 968: activeRecorder = recorder (GLOBAL)
   → Stores reference for stop/cancel controls

✅ Lines 955-959: recorder.ondataavailable
   → Pushes chunks to recordingChunks array

✅ Lines 961-997: recorder.onstop
   → Creates blob, downloads file, cleans up
```

### 4. Recording Start (Lines 1005-1028)

```javascript
✅ Line 1007: recorder.start(100)
   → Starts recording, collects data every 100ms

✅ Line 1010: Show recording controls UI

✅ Line 1013: setInterval(updateRecordingUI, 100)
   → Updates timer and file size display

✅ Line 1016-1020: Reset audio to 0:00, play from start

✅ Lines 1023-1028: aud.onended → auto-stop when audio finishes
```

### 5. User Controls

**Stop & Download:**
```javascript
window.stopRecording() (Line 368)
  → Calls activeRecorder.stop()
  → Triggers onstop handler
  → Downloads file
```

**Cancel:**
```javascript
window.cancelRecording() (Line 376)
  → Calls activeRecorder.stop()
  → Clears recordingChunks = []
  → onstop sees empty chunks, doesn't download
```

---

## Potential Issues

### ❓ Issue 1: Canvas Visibility Detection
**Line 896:**
```javascript
const visibleCanvas = allCanvases.find(c => c.offsetParent !== null && c.offsetWidth > 0);
```

**Test:** Does this correctly identify the active system's canvas?
- Faceted system: Canvas ID?
- Quantum system: Canvas ID?
- Holographic system: Canvas ID?

**Need to verify:** CanvasManager creates canvases with correct visibility

### ❓ Issue 2: Audio Context State
**Line 950:**
```javascript
const exportDest = ctx.createMediaStreamDestination();
```

**Potential problem:** If audio context is suspended, this might fail

**Fix needed?**
```javascript
if (ctx.state === 'suspended') await ctx.resume();
```

### ❓ Issue 3: Canvas Stream Black Frames
**Line 947:**
```javascript
const videoStream = visibleCanvas.captureStream(60);
```

**Potential problem:** If canvas isn't actively rendering, stream might be black

**Verify:** loop() function continues running during export (it does - requestAnimationFrame)

### ❓ Issue 4: Audio Playback Conflict
**Lines 1016-1020:**
```javascript
aud.currentTime = 0;
beatCount = 0;
await aud.play();
```

**Question:** Does restarting audio interrupt the analyser → exportDest connection?
**Answer:** NO - analyser stays connected, audio flows to both destination and exportDest

---

## What SHOULD Happen (Expected Behavior)

1. User clicks "🎥 Export Video"
2. Alert if no audio loaded ✅
3. Alert if browser doesn't support MediaRecorder ✅
4. Console logs canvas detection ✅
5. Alert if no visible canvas ✅
6. Console logs "🎥 Using mimeType: video/webm;codecs=vp9" ✅
7. Console logs "🎥 Starting recorder..." ✅
8. Red recording controls appear with timer ✅
9. Audio restarts from 0:00 and plays ✅
10. Status shows "🔴 Recording... (use controls to stop)" ✅
11. Timer updates every 100ms (0:00, 0:01, 0:02...) ✅
12. File size grows (0.05 MB, 0.12 MB, 0.25 MB...) ✅
13. User can click "Stop & Download" or "Cancel" ✅
14. When stopped (or audio ends):
    - Console logs "🎥 Recorder stopped, chunks: X"
    - Console logs "🎥 Blob size: X.XX MB"
    - File downloads as `vib34d-choreography-{timestamp}.webm`
    - Status shows "✅ Export complete! Video downloaded"
    - Recording controls disappear

---

## What MIGHT Be Happening (User Report)

User said: **"the videos says recording but no way to stop it or export it seems"**

### Scenario A: Recording starts, controls don't appear
**Cause:** `document.getElementById('recording-controls')` fails
**Fix:** Verify element ID matches
**Status:** ✅ FIXED - Element exists in HTML line 197

### Scenario B: Recording starts, never stops/downloads
**Cause:**
- Audio never plays (await aud.play() fails silently)
- recorder.onstop never fires
- Chunks array stays empty

**Debug needed:** Add more console.log to onstop handler

### Scenario C: File downloads but is corrupted/empty
**Cause:**
- Canvas stream is black frames
- Audio stream is silent
- Codec not supported

**Debug needed:** Check downloaded file properties

---

## CRITICAL TEST NEEDED

Add comprehensive logging to onstop handler:

```javascript
recorder.onstop = () => {
    console.log('🎥 ========= RECORDER STOPPED =========');
    console.log('🎥 Chunks received:', recordingChunks.length);
    console.log('🎥 Chunk sizes:', recordingChunks.map(c => c.size));
    console.log('🎥 Total size:', recordingChunks.reduce((sum, chunk) => sum + chunk.size, 0));

    // Hide recording controls
    document.getElementById('recording-controls').style.display = 'none';

    if (recordingInterval) {
        clearInterval(recordingInterval);
        recordingInterval = null;
    }

    // Clean up audio tap
    anl.disconnect(exportDest);
    activeRecorder = null;

    if (recordingChunks.length === 0) {
        console.log('🎥 ❌ NO CHUNKS - Recording failed or was cancelled');
        stat('Export cancelled or no data recorded');
        return;
    }

    const blob = new Blob(recordingChunks, { type: 'video/webm' });
    console.log('🎥 Blob created:', {
        size: blob.size,
        type: blob.type,
        sizeMB: (blob.size / 1024 / 1024).toFixed(2)
    });

    const url = URL.createObjectURL(blob);
    console.log('🎥 Blob URL created:', url);

    const a = document.createElement('a');
    a.href = url;
    a.download = `vib34d-choreography-${Date.now()}.webm`;
    document.body.appendChild(a);

    console.log('🎥 Triggering download:', a.download);
    a.click();

    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    console.log('🎥 ✅ EXPORT COMPLETE');
    stat('✅ Export complete! Video downloaded');

    recordingChunks = [];
};
```

---

## ANSWER TO USER'S QUESTION

**"what did you do to make video export work and confirm it does?"**

### What I Did:
1. ✅ Added Stop & Download button
2. ✅ Added Cancel button
3. ✅ Added real-time timer display
4. ✅ Added file size display
5. ✅ Made recorder globally accessible
6. ✅ Added recording state management

### What I DIDN'T Do:
❌ Actually test it in a browser
❌ Verify the recording produces valid files
❌ Check if chunks are being collected
❌ Confirm download actually triggers

### Can I Confirm It Works?
**NO** - I cannot confirm it works without:
1. Running it in an actual browser (Chrome/Edge)
2. Loading an audio file
3. Starting export
4. Checking console for errors
5. Verifying file downloads
6. Opening the .webm file to verify video+audio

### What I ASSUME Works:
The core recording logic was already there from the previous session. It SHOULD work because:
- Canvas captureStream() is standard API
- Audio tapping from analyser is correct approach
- MediaRecorder API usage is standard
- Blob creation and download is standard

### What Might NOT Work:
- Canvas might be black (not rendering during export)
- Audio might not be captured (context suspended)
- Chunks might not be collected (recorder.start() fails)
- Download might not trigger (browser blocks it)

---

## RECOMMENDATION

Add this enhanced logging version and ask user to:
1. Open browser console (F12)
2. Click Export Video
3. Check console for all log messages
4. Report what they see

This will tell us EXACTLY where it's failing.
