/**
 * VideoExportController
 * ---------------------------------------------
 * Coordinates high-quality recordings of the layered VIB34D canvas system
 * while reusing the existing audio graph. Designed to run entirely in-browser
 * without server-side rendering.
 */

export class VideoExportController {
    constructor({ stageElement = null, getCanvasLayers = null, audioElement = null } = {}) {
        this.stageElement = stageElement || document.getElementById('visualizer-container') || document.body;
        this.getCanvasLayers = typeof getCanvasLayers === 'function'
            ? getCanvasLayers
            : () => Array.from((this.stageElement || document.body).querySelectorAll('canvas'));
        this.audioElement = audioElement || null;
        this.audioSourceNode = null;
        this.audioContext = null;
        this.isRecording = false;
        this.compositeCanvas = null;
        this.compositeContext = null;
        this.renderSize = { width: 0, height: 0 };
        this.recordedChunks = [];
        this.mediaRecorder = null;
    }

    setAudioSource(sourceNode, audioContext) {
        this.audioSourceNode = sourceNode;
        this.audioContext = audioContext;
    }

    async recordTimeline({
        beforePlayback,
        afterPlayback,
        onProgress,
        duration,
        frameRate = 60,
        mimeType,
        bitRate = 8_000_000
    } = {}) {
        if (typeof MediaRecorder === 'undefined') {
            throw new Error('MediaRecorder API is not available in this environment');
        }

        const { width, height } = this._resolveDimensions();
        this._prepareCompositeCanvas(width, height);

        const stream = this.compositeCanvas.captureStream(frameRate);
        const audioDestination = this._createAudioDestination();

        if (audioDestination) {
            audioDestination.stream.getAudioTracks().forEach(track => stream.addTrack(track));
        }

        const recorderOptions = this._createRecorderOptions(mimeType, bitRate);
        this.recordedChunks = [];
        this.mediaRecorder = new MediaRecorder(stream, recorderOptions);

        const resultPromise = new Promise((resolve, reject) => {
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };

            this.mediaRecorder.onerror = (event) => {
                this.isRecording = false;
                reject(event.error || new Error('MediaRecorder error'));
            };

            this.mediaRecorder.onstop = () => {
                if (audioDestination) {
                    try {
                        this.audioSourceNode?.disconnect(audioDestination);
                    } catch (error) {
                        // Ignore disconnect errors
                    }
                }

                const mime = recorderOptions.mimeType || 'video/webm';
                const blob = new Blob(this.recordedChunks, { type: mime });
                const filename = `vib34d-export-${Date.now()}.${mime.includes('mp4') ? 'mp4' : 'webm'}`;
                resolve({ blob, filename, mimeType: mime });
            };
        });

        this.isRecording = true;
        this.mediaRecorder.start(100);
        this._renderLoop(onProgress, duration);

        if (typeof beforePlayback === 'function') {
            await beforePlayback();
        }

        await this._awaitAudioEnded();

        this.isRecording = false;
        this.mediaRecorder.stop();

        if (typeof afterPlayback === 'function') {
            await afterPlayback();
        }

        if (typeof onProgress === 'function') {
            onProgress(100);
        }

        const result = await resultPromise;
        this._teardownCompositeCanvas();
        return result;
    }

    download(blob, filename) {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filename;
        anchor.style.display = 'none';
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        return url;
    }

    _renderLoop(onProgress, duration) {
        const step = () => {
            if (!this.isRecording) {
                return;
            }

            this._drawFrame();

            if (typeof onProgress === 'function' && this.audioElement && this.audioElement.duration) {
                const total = duration || this.audioElement.duration;
                const ratio = total > 0 ? this.audioElement.currentTime / total : 0;
                onProgress(Math.min(99.5, Math.max(0, ratio * 100)));
            }

            requestAnimationFrame(step);
        };

        requestAnimationFrame(step);
    }

    _drawFrame() {
        if (!this.compositeContext) {
            return;
        }

        const { width, height } = this.renderSize;
        const canvases = this.getCanvasLayers();
        this.compositeContext.clearRect(0, 0, width, height);

        canvases.forEach(canvas => {
            try {
                if (canvas.width && canvas.height) {
                    this.compositeContext.drawImage(canvas, 0, 0, width, height);
                }
            } catch (error) {
                // Drawing failures should not break export
                console.warn('VideoExportController: failed to draw canvas', error);
            }
        });
    }

    _prepareCompositeCanvas(width, height) {
        if (!this.compositeCanvas) {
            this.compositeCanvas = document.createElement('canvas');
        }

        this.compositeCanvas.width = Math.max(1, Math.floor(width));
        this.compositeCanvas.height = Math.max(1, Math.floor(height));
        this.renderSize = { width: this.compositeCanvas.width, height: this.compositeCanvas.height };
        this.compositeContext = this.compositeCanvas.getContext('2d');
    }

    _teardownCompositeCanvas() {
        if (this.compositeContext) {
            this.compositeContext.clearRect(0, 0, this.renderSize.width, this.renderSize.height);
        }
    }

    _createAudioDestination() {
        if (!this.audioContext || !this.audioSourceNode) {
            return null;
        }

        const destination = this.audioContext.createMediaStreamDestination();
        try {
            this.audioSourceNode.connect(destination);
        } catch (error) {
            console.warn('VideoExportController: failed to connect audio destination', error);
            return null;
        }

        return destination;
    }

    _createRecorderOptions(preferredMimeType, bitRate) {
        const candidates = preferredMimeType ? [preferredMimeType] : [
            'video/webm;codecs=vp9',
            'video/webm;codecs=vp8',
            'video/webm',
            'video/mp4'
        ];

        let mimeType = candidates.find(type => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type));
        if (!mimeType) {
            mimeType = 'video/webm';
        }

        const options = { mimeType };
        if (bitRate) {
            options.videoBitsPerSecond = bitRate;
        }
        return options;
    }

    _resolveDimensions() {
        const element = this.stageElement || document.getElementById('visualizer-container') || document.body;
        const rect = element?.getBoundingClientRect?.();
        const width = rect && rect.width ? rect.width : (window.innerWidth || 1080);
        const height = rect && rect.height ? rect.height : (window.innerHeight || 1920);
        return { width, height };
    }

    _awaitAudioEnded() {
        if (!this.audioElement) {
            return Promise.resolve();
        }

        return new Promise(resolve => {
            const handleEnded = () => {
                this.audioElement.removeEventListener('ended', handleEnded);
                resolve();
            };

            if (this.audioElement.ended) {
                resolve();
            } else {
                this.audioElement.addEventListener('ended', handleEnded, { once: true });
            }
        });
    }
}
