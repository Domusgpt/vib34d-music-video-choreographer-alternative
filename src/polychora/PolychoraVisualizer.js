import { GeometryLibrary } from '../geometry/GeometryLibrary.js';

const COLOR_MODE_MAP = Object.freeze({
    single: 0,
    dual: 1,
    triad: 2,
    complementary: 3,
    analogous: 4,
    palette: 5,
    gradient: 6,
    reactive: 7
});

const GRADIENT_TYPE_MAP = Object.freeze({
    horizontal: 0,
    vertical: 1,
    radial: 2,
    spiral: 3,
    wave: 4
});

const ROLE_CONFIG = Object.freeze({
    background: { intensity: 0.18, scale: 1.15, color: [0.08, 0.05, 0.16] },
    shadow: { intensity: 0.32, scale: 1.08, color: [0.04, 0.05, 0.12] },
    content: { intensity: 0.95, scale: 1.0, color: [0.42, 0.25, 0.72] },
    highlight: { intensity: 0.72, scale: 0.94, color: [0.86, 0.65, 1.0] },
    accent: { intensity: 0.55, scale: 0.88, color: [0.35, 0.78, 0.92] }
});

const DEFAULT_PARAMS = Object.freeze({
    geometry: 1,
    rot4dXW: 0,
    rot4dYW: 0,
    rot4dZW: 0,
    gridDensity: 18,
    morphFactor: 1.0,
    chaos: 0.15,
    speed: 1.0,
    hue: 280,
    intensity: 0.75,
    saturation: 0.85,
    colorMode: 'single',
    colorPalette: 'holographic',
    gradientType: 'horizontal',
    gradientSpeed: 0.3,
    colorReactivity: 0.65
});

export class PolychoraVisualizer {
    constructor(canvasId, role = 'content', reactivity = 1.0) {
        this.canvas = typeof document !== 'undefined' ? document.getElementById(canvasId) : null;
        if (!this.canvas) {
            console.warn(`[PolychoraVisualizer] Canvas not found: ${canvasId}`);
            return;
        }

        this.role = role;
        this.reactivity = reactivity;
        this.contextOptions = {
            alpha: true,
            depth: false,
            stencil: false,
            antialias: false,
            premultipliedAlpha: true,
            preserveDrawingBuffer: false,
            powerPreference: 'high-performance'
        };

        const roleConfig = ROLE_CONFIG[role] || ROLE_CONFIG.content;
        this.layerIntensity = roleConfig.intensity;
        this.layerScale = roleConfig.scale;
        this.layerColor = roleConfig.color.slice();

        this.params = { ...DEFAULT_PARAMS };
        this.audioResponse = { bass: 0, mid: 0, high: 0, energy: 0 };
        this.audioSmoothing = 0.18;

        this.colorUniformBuffer = new Float32Array(12);
        this.colorUniformState = {
            mode: COLOR_MODE_MAP.single,
            paletteSize: 0,
            gradientType: GRADIENT_TYPE_MAP.horizontal,
            gradientPhase: 0
        };

        this.time = 0;
        this.startTime = Date.now();
        this.handleResize = this.resize.bind(this);

        this.initContext();
        if (!this.gl) {
            return;
        }

        if (!this.initShaders()) {
            console.error('[PolychoraVisualizer] Failed to initialize shaders');
            this.disposeContext();
            return;
        }

        this.initBuffers();
        this.cacheUniformLocations();
        this.resize();

        window.addEventListener('resize', this.handleResize);
        GeometryLibrary.subscribe(() => {
            if (this.params.geometry >= GeometryLibrary.getGeometryNames().length) {
                this.params.geometry = Math.max(0, GeometryLibrary.getGeometryNames().length - 1);
            }
        });
    }

    initContext() {
        this.gl = this.canvas.getContext('webgl2', this.contextOptions) ||
                  this.canvas.getContext('webgl', this.contextOptions) ||
                  this.canvas.getContext('experimental-webgl', this.contextOptions);

        if (!this.gl) {
            console.error('[PolychoraVisualizer] WebGL not supported');
        }
    }

    disposeContext() {
        this.gl = null;
    }

    initShaders() {
        const vertexShaderSource = `attribute vec2 a_position;\nvarying vec2 v_uv;\n\nvoid main() {\n    v_uv = a_position * 0.5 + 0.5;\n    gl_Position = vec4(a_position, 0.0, 1.0);\n}`;

        const fragmentShaderSource = `#ifdef GL_FRAGMENT_PRECISION_HIGH\n    precision highp float;\n#else\n    precision mediump float;\n#endif\n\nvarying vec2 v_uv;\n\nuniform float u_time;\nuniform vec2 u_resolution;\nuniform float u_geometry;\nuniform float u_rot4dXW;\nuniform float u_rot4dYW;\nuniform float u_rot4dZW;\nuniform float u_gridDensity;\nuniform float u_morphFactor;\nuniform float u_chaos;\nuniform float u_speed;\nuniform float u_hue;\nuniform float u_intensity;\nuniform float u_saturation;\nuniform float u_layerIntensity;\nuniform float u_layerScale;\nuniform vec3 u_layerColor;\nuniform float u_colorReactivity;\nuniform int u_colorMode;\nuniform int u_paletteSize;\nuniform vec3 u_palette[4];\nuniform int u_gradientType;\nuniform float u_gradientPhase;\nuniform float u_bass;\nuniform float u_mid;\nuniform float u_high;\n\nconst int COLOR_MODE_SINGLE = 0;\nconst int COLOR_MODE_DUAL = 1;\nconst int COLOR_MODE_TRIAD = 2;\nconst int COLOR_MODE_COMPLEMENTARY = 3;\nconst int COLOR_MODE_ANALOGOUS = 4;\nconst int COLOR_MODE_PALETTE = 5;\nconst int COLOR_MODE_GRADIENT = 6;\nconst int COLOR_MODE_REACTIVE = 7;\n\nconst int GRADIENT_HORIZONTAL = 0;\nconst int GRADIENT_VERTICAL = 1;\nconst int GRADIENT_RADIAL = 2;\nconst int GRADIENT_SPIRAL = 3;\nconst int GRADIENT_WAVE = 4;\n\nfloat clamp01(float value) {\n    return clamp(value, 0.0, 1.0);\n}\n\nmat4 rotateXW(float angle) {\n    float c = cos(angle);\n    float s = sin(angle);\n    return mat4(\n        c, 0.0, 0.0, -s,\n        0.0, 1.0, 0.0, 0.0,\n        0.0, 0.0, 1.0, 0.0,\n        s, 0.0, 0.0, c\n    );\n}\n\nmat4 rotateYW(float angle) {\n    float c = cos(angle);\n    float s = sin(angle);\n    return mat4(\n        1.0, 0.0, 0.0, 0.0,\n        0.0, c, 0.0, -s,\n        0.0, 0.0, 1.0, 0.0,\n        0.0, s, 0.0, c\n    );\n}\n\nmat4 rotateZW(float angle) {\n    float c = cos(angle);\n    float s = sin(angle);\n    return mat4(\n        1.0, 0.0, 0.0, 0.0,\n        0.0, 1.0, 0.0, 0.0,\n        0.0, 0.0, c, -s,\n        0.0, 0.0, s, c\n    );\n}\n\nfloat hash(vec4 p) {\n    vec4 h = vec4(37.0, 57.0, 113.0, 147.0);\n    return fract(sin(dot(p, h)) * 43758.5453);\n}\n\nvec3 hsv2rgb(vec3 c) {\n    vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);\n    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);\n    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);\n}\n\nvec3 samplePaletteColor(float position) {\n    if (u_paletteSize <= 0) {\n        return vec3(1.0);\n    }\n\n    if (u_paletteSize == 1) {\n        return u_palette[0];\n    }\n\n    float clamped = clamp(position, 0.0, 0.9999);\n    float scaled = clamped * float(u_paletteSize - 1);\n    int index = int(floor(scaled));\n    int nextIndex = min(index + 1, u_paletteSize - 1);\n    float mixAmount = fract(scaled);\n    vec3 a = u_palette[index];\n    vec3 b = u_palette[nextIndex];\n    return mix(a, b, mixAmount);\n}\n\nfloat computePalettePosition(vec2 uv, float geometryValue) {\n    vec2 normalized = uv * 0.5 + 0.5;\n    float base = fract(u_gradientPhase + geometryValue * 0.25);\n\n    if (u_colorMode == COLOR_MODE_GRADIENT) {\n        if (u_gradientType == GRADIENT_HORIZONTAL) {\n            base = clamp01(normalized.x);\n        } else if (u_gradientType == GRADIENT_VERTICAL) {\n            base = clamp01(normalized.y);\n        } else if (u_gradientType == GRADIENT_RADIAL) {\n            float dist = length(normalized - 0.5);\n            base = clamp(dist * 1.4142, 0.0, 1.0);\n        } else if (u_gradientType == GRADIENT_SPIRAL) {\n            float angle = atan(normalized.y - 0.5, normalized.x - 0.5) / (6.28318);\n            base = fract(angle + u_gradientPhase);\n        } else if (u_gradientType == GRADIENT_WAVE) {\n            base = fract(normalized.x + sin((normalized.y + u_gradientPhase) * 6.28318) * 0.2 + u_gradientPhase);\n        }\n    } else {\n        base = fract(u_gradientPhase + geometryValue * 0.3 + normalized.x * 0.25);\n    }\n\n    return clamp01(base);\n}\n\nfloat polytope5Cell(vec4 p) {\n    vec4 corners[5];\n    corners[0] = vec4(1, 1, 1, -1) / sqrt(4.0);\n    corners[1] = vec4(1, -1, -1, -1) / sqrt(4.0);\n    corners[2] = vec4(-1, 1, -1, -1) / sqrt(4.0);\n    corners[3] = vec4(-1, -1, 1, -1) / sqrt(4.0);\n    corners[4] = vec4(0, 0, 0, 1);\n\n    float dist = 1e9;\n    for (int i = 0; i < 5; i++) {\n        float d = length(p - corners[i]);\n        dist = min(dist, d);\n    }\n    return dist - 0.8;\n}\n\nfloat polytopeTesseract(vec4 p) {\n    vec4 q = abs(p);\n    return max(max(q.x, max(q.y, max(q.z, q.w))) - 1.0, 0.0);\n}\n\nfloat polytope16Cell(vec4 p) {\n    return (abs(p.x) + abs(p.y) + abs(p.z) + abs(p.w)) - 1.5;\n}\n\nfloat polytope24Cell(vec4 p) {\n    vec4 q = abs(p);\n    float max1 = max(q.x, max(q.y, q.z));\n    float min1 = min(q.x, min(q.y, q.z));\n    float s = q.x + q.y + q.z + q.w;\n    return max(max1 + q.w - 1.3, s * 0.5 - 1.5);\n}\n\nfloat polytope600Cell(vec4 p) {\n    vec4 q = abs(p);\n    float sum = q.x + q.y + q.z + q.w;\n    return sum * 0.57735 - 1.2;\n}\n\nfloat polytope120Cell(vec4 p) {\n    float phi = 1.618033988749895;\n    vec4 q = abs(p);\n    float d1 = length(q) - 2.0;\n    float d2 = max(max(max(q.x/phi, q.y*phi), q.z/phi), q.w*phi) - 1.5;\n    return max(d1, d2);\n}\n\nfloat polytopeHypersphere(vec4 p) {\n    return length(p) - 1.5;\n}\n\nfloat polytopeDuocylinder(vec4 p) {\n    float r1 = length(p.xy) - 1.0;\n    float r2 = length(p.zw) - 1.0;\n    return sqrt(r1*r1 + r2*r2) - 0.5;\n}\n\nfloat true4DGeometryFunction(vec4 p) {\n    int geomType = int(u_geometry);\n    float gridSize = max(0.0001, u_gridDensity * 0.1);\n\n    mat4 rotation = rotateXW(u_rot4dXW) * rotateYW(u_rot4dYW) * rotateZW(u_rot4dZW);\n    vec4 rotatedP = rotation * p;\n    vec4 tiledP = fract(rotatedP * gridSize) - 0.5;\n\n    float dist = 0.0;\n    if (geomType == 0) {\n        dist = polytope5Cell(tiledP);\n    } else if (geomType == 1) {\n        dist = polytopeTesseract(tiledP);\n    } else if (geomType == 2) {\n        dist = polytopeHypersphere(tiledP);\n    } else if (geomType == 3) {\n        dist = polytopeDuocylinder(tiledP);\n    } else if (geomType == 4) {\n        dist = polytope16Cell(tiledP);\n    } else if (geomType == 5) {\n        dist = polytope24Cell(tiledP);\n    } else if (geomType == 6) {\n        dist = polytope600Cell(tiledP);\n    } else {\n        dist = polytope120Cell(tiledP);\n    }\n\n    dist *= u_morphFactor;\n    if (u_chaos > 0.0) {\n        float noise = hash(rotatedP * 7.3);\n        dist += (noise - 0.5) * u_chaos * 0.3;\n    }\n\n    return dist;\n}\n\nvec3 applyColorMode(vec3 baseColor, vec3 paletteColor, float paletteStrength, vec3 reactiveColor) {\n    if (u_colorMode == COLOR_MODE_REACTIVE) {\n        return mix(baseColor, reactiveColor, clamp01(paletteStrength));\n    }\n\n    if (u_paletteSize <= 0) {\n        return baseColor;\n    }\n\n    float blend = 0.6 + paletteStrength * 0.4;\n    if (u_colorMode == COLOR_MODE_SINGLE) {\n        return mix(baseColor, paletteColor, blend * 0.6);\n    }\n    if (u_colorMode == COLOR_MODE_PALETTE || u_colorMode == COLOR_MODE_GRADIENT) {\n        return mix(baseColor, paletteColor, blend);\n    }\n    if (u_colorMode == COLOR_MODE_DUAL || u_colorMode == COLOR_MODE_COMPLEMENTARY) {\n        vec3 complementary = vec3(paletteColor.b, paletteColor.r, paletteColor.g);
        return mix(baseColor, mix(paletteColor, complementary, 0.5), blend);
    }
    if (u_colorMode == COLOR_MODE_TRIAD) {
        vec3 triadA = vec3(paletteColor.g, paletteColor.b, paletteColor.r);
        vec3 triadB = vec3(paletteColor.b, paletteColor.r, paletteColor.g);
        vec3 triad = (paletteColor + triadA + triadB) / 3.0;
        return mix(baseColor, triad, blend);
    }
    if (u_colorMode == COLOR_MODE_ANALOGOUS) {
        vec3 shifted = paletteColor * vec3(1.1, 0.95, 1.05);
        return mix(baseColor, shifted, blend * 0.8);
    }

    return mix(baseColor, paletteColor, blend);
}

void main() {
    vec2 uv = (gl_FragCoord.xy - u_resolution.xy * 0.5) / min(u_resolution.x, u_resolution.y);
    float time = u_time * 0.001 * max(0.1, u_speed);

    vec4 rayDir = vec4(uv * u_layerScale, sin(time * 0.5), cos(time * 0.3));
    vec4 audioOffset = vec4(u_bass * 0.35, u_mid * 0.25, u_high * 0.2, (u_bass + u_high) * 0.15);
    rayDir += audioOffset;

    float dist = true4DGeometryFunction(rayDir);

    float alpha = 0.0;
    if (dist < 0.08) {
        alpha = 1.0 - (dist / 0.08);
        alpha = pow(alpha, 2.0);
    } else {
        alpha = exp(-dist * 6.5) * 0.35;
    }

    alpha *= u_layerIntensity * u_intensity;

    float hue = u_hue / 360.0;
    vec3 baseColor = hsv2rgb(vec3(hue, u_saturation, 1.0));
    baseColor = mix(baseColor, u_layerColor, 0.3);

    vec3 reactiveColor = clamp(vec3(
        baseColor.r + u_high * 0.8,
        baseColor.g + u_mid * 0.6,
        baseColor.b + u_bass * 0.7
    ), 0.0, 1.5);

    float palettePos = computePalettePosition(uv, u_geometry);
    vec3 paletteColor = samplePaletteColor(palettePos);

    float paletteStrength = float(u_paletteSize > 0) * clamp01(0.35 + u_colorReactivity * 0.65);
    vec3 finalColor = applyColorMode(baseColor, paletteColor, paletteStrength, reactiveColor);

    gl_FragColor = vec4(finalColor, clamp(alpha, 0.0, 1.0));
}
`;

        this.vertexShader = this.compileShader(this.gl.VERTEX_SHADER, vertexShaderSource);
        this.fragmentShader = this.compileShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);

        if (!this.vertexShader || !this.fragmentShader) {
            return false;
        }

        this.program = this.gl.createProgram();
        this.gl.attachShader(this.program, this.vertexShader);
        this.gl.attachShader(this.program, this.fragmentShader);
        this.gl.linkProgram(this.program);

        if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
            console.error('[PolychoraVisualizer] Shader link error:', this.gl.getProgramInfoLog(this.program));
            return false;
        }

        this.gl.useProgram(this.program);

        const positionBuffer = this.gl.createBuffer();
        this.vertexBuffer = positionBuffer;
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
        const vertices = new Float32Array([
            -1, -1,  1, -1,  -1,  1,
            -1,  1,  1, -1,   1,  1
        ]);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);

        const positionLocation = this.gl.getAttribLocation(this.program, 'a_position');
        this.gl.enableVertexAttribArray(positionLocation);
        this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);

        return true;
    }

    compileShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);

        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error('[PolychoraVisualizer] Shader compile error:', this.gl.getShaderInfoLog(shader));
            return null;
        }

        return shader;
    }

    initBuffers() {
        if (!this.vertexBuffer) {
            this.vertexBuffer = this.gl.createBuffer();
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
            const vertices = new Float32Array([
                -1, -1,
                 1, -1,
                -1,  1,
                -1,  1,
                 1, -1,
                 1,  1
            ]);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);
            const positionLocation = this.gl.getAttribLocation(this.program, 'a_position');
            this.gl.enableVertexAttribArray(positionLocation);
            this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);
        } else {
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
        }
    }

    cacheUniformLocations() {
        const fetch = name => this.gl.getUniformLocation(this.program, name);
        this.uniforms = {
            time: fetch('u_time'),
            resolution: fetch('u_resolution'),
            geometry: fetch('u_geometry'),
            rot4dXW: fetch('u_rot4dXW'),
            rot4dYW: fetch('u_rot4dYW'),
            rot4dZW: fetch('u_rot4dZW'),
            gridDensity: fetch('u_gridDensity'),
            morphFactor: fetch('u_morphFactor'),
            chaos: fetch('u_chaos'),
            speed: fetch('u_speed'),
            hue: fetch('u_hue'),
            intensity: fetch('u_intensity'),
            saturation: fetch('u_saturation'),
            layerIntensity: fetch('u_layerIntensity'),
            layerScale: fetch('u_layerScale'),
            layerColor: fetch('u_layerColor'),
            colorMode: fetch('u_colorMode'),
            palette: fetch('u_palette'),
            paletteSize: fetch('u_paletteSize'),
            gradientType: fetch('u_gradientType'),
            gradientPhase: fetch('u_gradientPhase'),
            colorReactivity: fetch('u_colorReactivity'),
            bass: fetch('u_bass'),
            mid: fetch('u_mid'),
            high: fetch('u_high')
        };
    }

    resize() {
        if (!this.canvas || !this.gl) return;
        const dpr = window.devicePixelRatio || 1;
        const width = this.canvas.clientWidth * dpr;
        const height = this.canvas.clientHeight * dpr;

        if (this.canvas.width !== width || this.canvas.height !== height) {
            this.canvas.width = width;
            this.canvas.height = height;
        }

        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }

    updateParameters(params = {}) {
        Object.assign(this.params, params);
    }

    getCurrentAudioState() {
        if (typeof window === 'undefined') {
            return null;
        }

        if (window.audioEngine && typeof window.audioEngine.getAudioLevels === 'function') {
            return window.audioEngine.getAudioLevels();
        }

        return window.audioReactive || null;
    }

    getCurrentColorState() {
        if (typeof window === 'undefined') {
            return null;
        }

        if (window.audioEngine && typeof window.audioEngine.getColorState === 'function') {
            const state = window.audioEngine.getColorState();
            if (state) {
                return state;
            }
        }

        return window.colorState || window.audioReactive?.color || null;
    }

    prepareColorUniforms(colorState) {
        const buffer = this.colorUniformBuffer;
        buffer.fill(0);

        let paletteSize = 0;
        if (colorState?.uniforms?.palette && Array.isArray(colorState.uniforms.palette)) {
            const palette = colorState.uniforms.palette;
            paletteSize = Math.min(palette.length, 4);
            for (let i = 0; i < paletteSize; i += 1) {
                const color = palette[i] || [0, 0, 0];
                const offset = i * 3;
                buffer[offset] = color[0] ?? 0;
                buffer[offset + 1] = color[1] ?? 0;
                buffer[offset + 2] = color[2] ?? 0;
            }
        }

        const gradientTypeKey = colorState?.gradient?.type || this.params.gradientType || 'horizontal';
        const gradientType = GRADIENT_TYPE_MAP[gradientTypeKey] ?? GRADIENT_TYPE_MAP.horizontal;
        const gradientPhase = typeof colorState?.gradient?.phase === 'number'
            ? colorState.gradient.phase
            : 0;
        const modeKey = colorState?.mode || this.params.colorMode || 'single';
        const mode = COLOR_MODE_MAP[modeKey] ?? COLOR_MODE_MAP.single;

        this.colorUniformState.mode = mode;
        this.colorUniformState.paletteSize = paletteSize;
        this.colorUniformState.gradientType = gradientType;
        this.colorUniformState.gradientPhase = gradientPhase;

        return this.colorUniformState;
    }

    applyColorUniforms(uniformState) {
        if (!this.gl || !this.uniforms) return;

        if (this.uniforms.colorMode) {
            this.gl.uniform1i(this.uniforms.colorMode, uniformState.mode);
        }
        if (this.uniforms.palette) {
            this.gl.uniform3fv(this.uniforms.palette, this.colorUniformBuffer);
        }
        if (this.uniforms.paletteSize) {
            this.gl.uniform1i(this.uniforms.paletteSize, uniformState.paletteSize);
        }
        if (this.uniforms.gradientType) {
            this.gl.uniform1i(this.uniforms.gradientType, uniformState.gradientType);
        }
        if (this.uniforms.gradientPhase) {
            this.gl.uniform1f(this.uniforms.gradientPhase, uniformState.gradientPhase);
        }
    }

    updateAudioResponse(audioState) {
        if (!audioState) {
            this.audioResponse.bass *= 0.9;
            this.audioResponse.mid *= 0.9;
            this.audioResponse.high *= 0.9;
            this.audioResponse.energy *= 0.9;
            return this.audioResponse;
        }

        const bands = audioState.bands || audioState;
        const targetBass = bands?.bass?.value ?? bands?.bass ?? 0;
        const targetMid = bands?.mid?.value ?? bands?.mid ?? 0;
        const targetHigh = bands?.high?.value ?? bands?.high ?? 0;
        const targetEnergy = audioState.energy ?? audioState.rms ?? 0;

        const smooth = this.audioSmoothing;
        this.audioResponse.bass += (targetBass - this.audioResponse.bass) * smooth;
        this.audioResponse.mid += (targetMid - this.audioResponse.mid) * smooth;
        this.audioResponse.high += (targetHigh - this.audioResponse.high) * smooth;
        this.audioResponse.energy += (targetEnergy - this.audioResponse.energy) * smooth;

        return this.audioResponse;
    }

    render() {
        if (!this.gl || !this.program) {
            return;
        }

        this.resize();
        this.gl.useProgram(this.program);
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

        this.time += 16;
        const elapsed = Date.now() - this.startTime;
        const audioState = this.getCurrentAudioState();
        const audioResponse = this.updateAudioResponse(audioState);
        const colorState = audioState?.color || this.getCurrentColorState();
        const colorUniforms = this.prepareColorUniforms(colorState);

        const params = this.params;
        let hueDegrees = typeof params.hue === 'number' ? params.hue : DEFAULT_PARAMS.hue;
        let saturation = params.saturation ?? DEFAULT_PARAMS.saturation;
        let intensity = params.intensity ?? DEFAULT_PARAMS.intensity;

        if (colorState?.primary) {
            hueDegrees = colorState.primary.h;
            saturation = Math.max(saturation, colorState.primary.s);
            intensity = Math.max(intensity, colorState.primary.v);
        }

        if (colorState?.accent) {
            saturation = Math.max(saturation, colorState.accent.s * 0.85);
        }

        const hue = (hueDegrees % 360 + 360) % 360;
        const colorReactivity = typeof params.colorReactivity === 'number'
            ? params.colorReactivity
            : DEFAULT_PARAMS.colorReactivity;

        this.gl.uniform2f(this.uniforms.resolution, this.canvas.width, this.canvas.height);
        this.gl.uniform1f(this.uniforms.time, elapsed);
        this.gl.uniform1f(this.uniforms.geometry, params.geometry ?? 0);
        this.gl.uniform1f(this.uniforms.rot4dXW, params.rot4dXW ?? 0);
        this.gl.uniform1f(this.uniforms.rot4dYW, params.rot4dYW ?? 0);
        this.gl.uniform1f(this.uniforms.rot4dZW, params.rot4dZW ?? 0);
        this.gl.uniform1f(this.uniforms.gridDensity, params.gridDensity ?? DEFAULT_PARAMS.gridDensity);
        this.gl.uniform1f(this.uniforms.morphFactor, params.morphFactor ?? DEFAULT_PARAMS.morphFactor);
        this.gl.uniform1f(this.uniforms.chaos, params.chaos ?? DEFAULT_PARAMS.chaos);
        this.gl.uniform1f(this.uniforms.speed, params.speed ?? DEFAULT_PARAMS.speed);
        this.gl.uniform1f(this.uniforms.hue, hue);
        this.gl.uniform1f(this.uniforms.intensity, intensity);
        this.gl.uniform1f(this.uniforms.saturation, saturation);
        this.gl.uniform1f(this.uniforms.layerIntensity, this.layerIntensity);
        this.gl.uniform1f(this.uniforms.layerScale, this.layerScale);
        this.gl.uniform3fv(this.uniforms.layerColor, this.layerColor);
        this.gl.uniform1f(this.uniforms.colorReactivity, colorReactivity);
        this.gl.uniform1f(this.uniforms.bass, audioResponse.bass || 0);
        this.gl.uniform1f(this.uniforms.mid, audioResponse.mid || 0);
        this.gl.uniform1f(this.uniforms.high, audioResponse.high || 0);

        this.applyColorUniforms(colorUniforms);

        if (this.vertexBuffer) {
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
        }

        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    }

    cleanup() {
        window.removeEventListener('resize', this.handleResize);
        if (!this.gl) return;

        if (this.vertexBuffer) {
            this.gl.deleteBuffer(this.vertexBuffer);
            this.vertexBuffer = null;
        }

        if (this.program) {
            this.gl.deleteProgram(this.program);
            this.program = null;
        }

        if (this.vertexShader) {
            this.gl.deleteShader(this.vertexShader);
            this.vertexShader = null;
        }

        if (this.fragmentShader) {
            this.gl.deleteShader(this.fragmentShader);
            this.fragmentShader = null;
        }
    }
}
