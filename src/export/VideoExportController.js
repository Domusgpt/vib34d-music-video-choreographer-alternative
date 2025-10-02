/**
 * VideoExportController
 *
 * Composes the layered canvases from the VIB34D systems into a single stream and
 * records synchronized audio/video output using MediaRecorder.  Designed to work
 * with dynamic choreography and AI-driven parameter updates.
 */

export class VideoExportController {
    constructor(options = {}) {
        this.canvasSelector = options.canvasSelector ?? '#vib34dLayers canvas';
        this.fps = options.fps ?? 60;
        this.mimeTypes = options.mimeTypes ?? [
            'video/webm;codecs=vp9',
            'video/webm;codecs=vp8',
            'video/webm'
        ];

        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.animationFrame = null;
        this.progressInterval = null;
        this.activeStream = null;
        this.compositeCanvas = null;
        this.active = false;
    }

    /**
     * Start a video export session.  Returns a promise resolved when the export
     * completes (successfully or with an error).
     */
    async export({
        audioElement,
        audioStream,
        onBeforeStart,
        onAfterStop,
        onProgress,
        onStatus,
        fileName = `vib34d-export-${Date.now()}.webm`
    }) {
        if (this.active) {
            throw new Error('Export already in progress');
        }

        if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
            throw new Error('MediaRecorder is not available in this environment.');
        }

        this.active = true;

        try {
            const canvases = Array.from(document.querySelectorAll(this.canvasSelector));
            if (!canvases.length) {
                throw new Error('No canvases found for export.');
            }

            const composite = this.createCompositeCanvas(canvases);
            this.compositeCanvas = composite;

            const stream = this.composeStreams(composite, canvases, audioElement, audioStream);
            this.activeStream = stream;
            const mimeType = this.detectMimeType();

            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType,
                videoBitsPerSecond: 8000000
            });

            this.recordedChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };

            const exportPromise = new Promise((resolve, reject) => {
                this.mediaRecorder.onstop = () => {
                    cancelAnimationFrame(this.animationFrame);
                    this.animationFrame = null;
                    clearInterval(this.progressInterval);
                    this.progressInterval = null;

                    try {
                        const blob = new Blob(this.recordedChunks, { type: mimeType });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = fileName;
                        document.body.appendChild(link);
                        link.click();
                        link.remove();
                        URL.revokeObjectURL(url);
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                };

                this.mediaRecorder.onerror = (event) => {
                    reject(event.error || new Error('MediaRecorder error'));
                };
            });

            if (onStatus) {
                onStatus('Preparing recording environment...');
            }

            this.startCompositeLoop(composite, canvases, onProgress, audioElement);

            this.mediaRecorder.start(100);

            if (onBeforeStart) {
                await onBeforeStart();
            }

            if (onStatus) {
                onStatus('Recording in progress...');
            }

            const stopHandler = () => {
                if (!this.mediaRecorder) return;
                try {
                    this.mediaRecorder.stop();
                } catch (error) {
                    console.error('Failed to stop recorder', error);
                }
            };

            const audioEnded = () => {
                audioElement?.removeEventListener('ended', audioEnded);
                stopHandler();
            };

            if (audioElement) {
                audioElement.addEventListener('ended', audioEnded, { once: true });
            }

            await exportPromise;

            if (onStatus) {
                onStatus('Export complete!');
            }

            if (onAfterStop) {
                await onAfterStop();
            }
        } finally {
            this.cleanup();
        }
    }

    createCompositeCanvas(canvases) {
        const composite = document.createElement('canvas');
        const width = this.measureWidth(canvases);
        const height = this.measureHeight(canvases);
        this.ensureHiDPI(composite, width, height);
        return composite;
    }

    composeStreams(composite, canvases, audioElement, audioStream) {
        if (!composite || typeof composite.captureStream !== 'function') {
            throw new Error('Canvas captureStream() is not supported in this browser.');
        }

        const stream = composite.captureStream(this.fps);

        if (audioStream && audioStream.getAudioTracks().length) {
            audioStream.getAudioTracks().forEach(track => stream.addTrack(track));
        } else if (audioElement && typeof audioElement.captureStream === 'function') {
            try {
                const mediaStream = audioElement.captureStream();
                mediaStream.getAudioTracks().forEach(track => stream.addTrack(track));
            } catch (error) {
                console.warn('Audio capture via captureStream() failed, continuing without embedded audio.', error);
            }
        }

        return stream;
    }

    detectMimeType() {
        for (const type of this.mimeTypes) {
            if (MediaRecorder.isTypeSupported(type)) {
                return type;
            }
        }
        return 'video/webm';
    }

    startCompositeLoop(composite, canvases, onProgress, audioElement) {
        const ctx = composite.getContext('2d');
        const drawFrame = () => {
            const { width, height } = this.syncCompositeSize(composite, canvases);
            ctx.clearRect(0, 0, width, height);
            canvases.forEach(canvas => {
                if (canvas.width === 0 || canvas.height === 0) return;
                ctx.drawImage(canvas, 0, 0, width, height);
            });
            this.animationFrame = requestAnimationFrame(drawFrame);
        };
        drawFrame();

        if (audioElement && onProgress) {
            this.progressInterval = setInterval(() => {
                if (!audioElement.duration) return;
                const progress = audioElement.currentTime / audioElement.duration;
                onProgress(this.clamp(progress, 0, 1));
            }, 200);
        }
    }

    syncCompositeSize(composite, canvases) {
        const width = this.measureWidth(canvases);
        const height = this.measureHeight(canvases);
        const currentWidth = Number(composite.dataset.displayWidth);
        const currentHeight = Number(composite.dataset.displayHeight);

        if (width !== currentWidth || height !== currentHeight) {
            this.ensureHiDPI(composite, width, height);
        }

        return {
            width: Number(composite.dataset.displayWidth) || width,
            height: Number(composite.dataset.displayHeight) || height
        };
    }

    measureWidth(canvases) {
        const fallback = window.innerWidth || 1920;
        const values = canvases.map(canvas => canvas.width || canvas.clientWidth || 0);
        const max = Math.max(...values, fallback);
        return Math.max(1, max);
    }

    measureHeight(canvases) {
        const fallback = window.innerHeight || 1080;
        const values = canvases.map(canvas => canvas.height || canvas.clientHeight || 0);
        const max = Math.max(...values, fallback);
        return Math.max(1, max);
    }

    ensureHiDPI(canvas, width, height) {
        const ratio = window.devicePixelRatio || 1;
        const displayWidth = Math.max(1, Math.round(width));
        const displayHeight = Math.max(1, Math.round(height));
        const pixelWidth = Math.max(1, Math.round(displayWidth * ratio));
        const pixelHeight = Math.max(1, Math.round(displayHeight * ratio));

        canvas.dataset.displayWidth = String(displayWidth);
        canvas.dataset.displayHeight = String(displayHeight);
        canvas.dataset.pixelRatio = String(ratio);

        canvas.style.width = `${displayWidth}px`;
        canvas.style.height = `${displayHeight}px`;

        if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
            canvas.width = pixelWidth;
            canvas.height = pixelHeight;
        }

        const ctx = canvas.getContext('2d');
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(ratio, ratio);
    }

    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    cleanup() {
        this.active = false;
        cancelAnimationFrame(this.animationFrame);
        this.animationFrame = null;
        clearInterval(this.progressInterval);
        this.progressInterval = null;

        if (this.activeStream) {
            this.activeStream.getTracks().forEach(track => track.stop());
            this.activeStream = null;
        }

        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.compositeCanvas = null;
    }
}
