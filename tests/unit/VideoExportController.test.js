import { describe, beforeEach, afterEach, expect, it, vi } from 'vitest';
import { VideoExportController } from '../../src/export/VideoExportController.js';

class MockMediaRecorder {
    static supported = new Set(['video/webm;codecs=vp8', 'video/webm']);

    static isTypeSupported(type) {
        return this.supported.has(type);
    }

    constructor(stream, options) {
        this.stream = stream;
        this.options = options;
        this.state = 'inactive';
        this.ondataavailable = null;
        this.onerror = null;
        this.onstop = null;
    }

    start() {
        this.state = 'recording';
    }

    stop() {
        this.state = 'inactive';
        if (typeof this.onstop === 'function') {
            this.onstop();
        }
    }
}

describe('VideoExportController', () => {
    let originalMediaRecorder;
    let stage;

    beforeEach(() => {
        originalMediaRecorder = globalThis.MediaRecorder;
        globalThis.MediaRecorder = MockMediaRecorder;

        stage = document.createElement('div');
        stage.id = 'visualizer-container';
        stage.getBoundingClientRect = () => ({ width: 640, height: 360 });
        document.body.appendChild(stage);
    });

    afterEach(() => {
        if (stage?.parentNode) {
            stage.parentNode.removeChild(stage);
        }
        globalThis.MediaRecorder = originalMediaRecorder;
        vi.restoreAllMocks();
    });

    it('resolves stage dimensions from DOM elements', () => {
        const controller = new VideoExportController({ stageElement: stage, getCanvasLayers: () => [] });
        const dimensions = controller._resolveDimensions();

        expect(dimensions.width).toBe(640);
        expect(dimensions.height).toBe(360);
    });

    it('creates recorder options honoring supported mime types and bit rate', () => {
        const controller = new VideoExportController({ stageElement: stage, getCanvasLayers: () => [] });
        const options = controller._createRecorderOptions(undefined, 5_000_000);

        expect(options.mimeType).toBe('video/webm;codecs=vp8');
        expect(options.videoBitsPerSecond).toBe(5_000_000);
    });

    it('prepares a composite canvas context for rendering', () => {
        const controller = new VideoExportController({ stageElement: stage, getCanvasLayers: () => [] });
        controller._prepareCompositeCanvas(800, 600);

        expect(controller.renderSize).toEqual({ width: 800, height: 600 });
        expect(controller.compositeCanvas).toBeTruthy();
        expect(typeof controller.compositeContext.clearRect).toBe('function');
    });
});
