import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['tests/unit/**/*.{test,spec}.js'],
        environment: 'jsdom',
        setupFiles: ['./tests/setup.js'],
        globals: true,
        css: false
    }
});
