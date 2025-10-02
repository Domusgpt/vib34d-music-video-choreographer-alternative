import { vi } from 'vitest';

if (typeof globalThis.HTMLCanvasElement !== 'undefined') {
    const originalGetContext = globalThis.HTMLCanvasElement.prototype.getContext;
    globalThis.HTMLCanvasElement.prototype.getContext = function getContext(type) {
        if (type === '2d') {
            return {
                clearRect: vi.fn(),
                drawImage: vi.fn()
            };
        }
        return originalGetContext ? originalGetContext.call(this, type) : null;
    };
}

globalThis.requestAnimationFrame = globalThis.requestAnimationFrame || ((cb) => setTimeout(() => cb(Date.now()), 16));

globalThis.cancelAnimationFrame = globalThis.cancelAnimationFrame || ((id) => clearTimeout(id));
