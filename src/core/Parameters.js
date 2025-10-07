/**
 * VIB34D Parameter Management System
 * Unified parameter control for both holographic and polytopal systems
 */

import { GeometryLibrary } from '../geometry/GeometryLibrary.js';
import {
    COLOR_MODES,
    COLOR_PALETTES,
    GRADIENT_TYPES,
    DEFAULT_COLOR_CONFIG
} from '../color/ColorSystem.js';

export class ParameterManager {
    constructor() {
        const geometryNames = GeometryLibrary.getGeometryNames();
        const defaultGeometryIndex = geometryNames.length > 0 ? 0 : -1;

        // Default parameter set combining both systems
        this.params = {
            // Current variation
            variation: 0,
            
            // 4D Polytopal Mathematics
            rot4dXW: 0.0,      // X-W plane rotation (-2 to 2)
            rot4dYW: 0.0,      // Y-W plane rotation (-2 to 2) 
            rot4dZW: 0.0,      // Z-W plane rotation (-2 to 2)
            dimension: 3.5,    // Dimensional level (3.0 to 4.5)
            
            // Holographic Visualization
            gridDensity: 15,   // Geometric detail (4 to 30)
            morphFactor: 1.0,  // Shape transformation (0 to 2)
            chaos: 0.2,        // Randomization level (0 to 1)
            speed: 1.0,        // Animation speed (0.1 to 3)
            hue: 200,          // Color rotation (0 to 360)
            intensity: 0.5,    // Visual intensity (0 to 1)
            saturation: 0.8,   // Color saturation (0 to 1)
            colorMode: DEFAULT_COLOR_CONFIG.colorMode,
            colorPalette: DEFAULT_COLOR_CONFIG.colorPalette,
            gradientType: DEFAULT_COLOR_CONFIG.gradientType,
            gradientSpeed: DEFAULT_COLOR_CONFIG.gradientSpeed,
            colorReactivity: DEFAULT_COLOR_CONFIG.colorReactivity,
            baseHue: DEFAULT_COLOR_CONFIG.baseHue,
            baseSaturation: DEFAULT_COLOR_CONFIG.baseSaturation,
            baseIntensity: DEFAULT_COLOR_CONFIG.baseIntensity,

            // Geometry selection
            geometry: Math.max(0, defaultGeometryIndex)        // Current geometry type (0-n)
        };

        // Parameter definitions for validation and UI
        this.parameterDefs = {
            variation: { min: 0, max: 99, step: 1, type: 'int' },
            rot4dXW: { min: -2, max: 2, step: 0.01, type: 'float' },
            rot4dYW: { min: -2, max: 2, step: 0.01, type: 'float' },
            rot4dZW: { min: -2, max: 2, step: 0.01, type: 'float' },
            dimension: { min: 3.0, max: 4.5, step: 0.01, type: 'float' },
            gridDensity: { min: 4, max: 100, step: 0.1, type: 'float' },
            morphFactor: { min: 0, max: 2, step: 0.01, type: 'float' },
            chaos: { min: 0, max: 1, step: 0.01, type: 'float' },
            speed: { min: 0.1, max: 3, step: 0.01, type: 'float' },
            hue: { min: 0, max: 360, step: 1, type: 'int' },
            intensity: { min: 0, max: 1, step: 0.01, type: 'float' },
            saturation: { min: 0, max: 1, step: 0.01, type: 'float' },
            colorMode: {
                type: 'enum',
                options: Array.from(COLOR_MODES),
                default: DEFAULT_COLOR_CONFIG.colorMode
            },
            colorPalette: {
                type: 'enum',
                options: Object.keys(COLOR_PALETTES),
                default: DEFAULT_COLOR_CONFIG.colorPalette
            },
            gradientType: {
                type: 'enum',
                options: Array.from(GRADIENT_TYPES),
                default: DEFAULT_COLOR_CONFIG.gradientType
            },
            gradientSpeed: {
                min: 0,
                max: 2,
                step: 0.01,
                type: 'float',
                default: DEFAULT_COLOR_CONFIG.gradientSpeed
            },
            colorReactivity: {
                min: 0,
                max: 1,
                step: 0.01,
                type: 'float',
                default: DEFAULT_COLOR_CONFIG.colorReactivity
            },
            baseHue: { min: 0, max: 360, step: 1, type: 'float', default: DEFAULT_COLOR_CONFIG.baseHue },
            baseSaturation: { min: 0, max: 1, step: 0.01, type: 'float', default: DEFAULT_COLOR_CONFIG.baseSaturation },
            baseIntensity: { min: 0, max: 1, step: 0.01, type: 'float', default: DEFAULT_COLOR_CONFIG.baseIntensity },
            geometry: { min: 0, max: Math.max(geometryNames.length - 1, 0), step: 1, type: 'int' }
        };
        
        // Track parameters that were introduced dynamically
        this.dynamicParameters = new Set();

        // Variation metadata updated by VariationManager
        this.defaultVariationDefinitions = [];
        this.customVariationCount = 70;
        this.totalVariationCount = (this.parameterDefs.variation?.max ?? 99) + 1;

        // Default parameter backup for reset
        this.defaults = { ...this.params };
    }

    updateGeometryRange(geometryCount = GeometryLibrary.getGeometryNames().length) {
        const maxIndex = Math.max(geometryCount - 1, 0);
        if (!this.parameterDefs.geometry) {
            this.parameterDefs.geometry = { min: 0, max: maxIndex, step: 1, type: 'int' };
        } else {
            this.parameterDefs.geometry.min = 0;
            this.parameterDefs.geometry.max = maxIndex;
            this.parameterDefs.geometry.step = 1;
            this.parameterDefs.geometry.type = 'int';
        }

        if (this.params.geometry > maxIndex) {
            this.params.geometry = maxIndex;
        }
    }

    updateVariationMetadata({ defaults = [], customCount, totalVariations } = {}) {
        if (Array.isArray(defaults)) {
            this.defaultVariationDefinitions = defaults.map(definition => ({
                geometryIndex: typeof definition.geometryIndex === 'number' ? definition.geometryIndex : 0,
                level: typeof definition.level === 'number' ? definition.level : 0,
                label: definition.label || '',
                displayLabel: definition.displayLabel || definition.label || '',
                shortLabel: definition.shortLabel || '',
                cssClass: definition.cssClass || 'geometry'
            }));
        }

        if (typeof customCount === 'number') {
            this.customVariationCount = Math.max(0, customCount);
        }

        if (typeof totalVariations === 'number') {
            this.totalVariationCount = Math.max(0, totalVariations);
        } else {
            this.totalVariationCount = this.defaultVariationDefinitions.length + this.customVariationCount;
        }

        this.updateVariationRange(this.totalVariationCount);
        this.updateVariationInfo();
    }

    updateVariationRange(totalVariations = this.totalVariationCount) {
        const maxIndex = Math.max((typeof totalVariations === 'number' ? totalVariations : this.totalVariationCount) - 1, 0);

        if (!this.parameterDefs.variation) {
            this.parameterDefs.variation = { min: 0, max: maxIndex, step: 1, type: 'int' };
        } else {
            this.parameterDefs.variation.min = 0;
            this.parameterDefs.variation.max = maxIndex;
            this.parameterDefs.variation.step = 1;
            this.parameterDefs.variation.type = 'int';
        }

        const slider = typeof document !== 'undefined'
            ? document.getElementById('variationSlider')
            : null;

        if (slider) {
            slider.min = 0;
            slider.max = maxIndex;
            slider.step = 1;
        }
    }
    
    /**
     * Get all current parameters
     */
    getAllParameters() {
        return { ...this.params };
    }

    getParameterDefinition(name) {
        const def = this.parameterDefs[name];
        if (!def) {
            return null;
        }
        const clone = { ...def };
        if (Array.isArray(def.options)) {
            clone.options = def.options.slice();
        }
        return clone;
    }
    
    /**
     * Set a specific parameter with validation
     */
    setParameter(name, value) {
        const def = this.parameterDefs[name];
        if (!def) {
            console.warn(`Unknown parameter: ${name}`);
            return false;
        }

        if (def.allowOverflow) {
            this.params[name] = value;
            return true;
        }

        const type = def.type || (typeof def.min === 'number' || typeof def.max === 'number' ? 'float' : typeof value);

        if (type === 'enum') {
            const options = Array.isArray(def.options) ? def.options : [];
            if (!options.length) {
                console.warn(`[ParameterManager] Enum parameter ${name} has no options defined`);
                return false;
            }

            const normalized = typeof value === 'string'
                ? value
                : (value === null || value === undefined ? '' : String(value));

            if (options.includes(normalized)) {
                this.params[name] = normalized;
                return true;
            }

            const fallback = def.default ?? this.defaults[name] ?? options[0];
            this.params[name] = fallback;
            return false;
        }

        if (type === 'bool' || type === 'boolean') {
            this.params[name] = Boolean(value);
            return true;
        }

        if (type === 'string') {
            this.params[name] = value === null || value === undefined ? '' : String(value);
            return true;
        }

        let numeric = Number(value);
        if (!Number.isFinite(numeric)) {
            if (typeof def.default === 'number') {
                numeric = def.default;
            } else if (typeof this.defaults[name] === 'number') {
                numeric = this.defaults[name];
            } else if (typeof def.min === 'number' && Number.isFinite(def.min)) {
                numeric = def.min;
            } else {
                numeric = 0;
            }
        }

        if (typeof def.min === 'number' && !Number.isNaN(def.min)) {
            numeric = Math.max(def.min, numeric);
        }
        if (typeof def.max === 'number' && !Number.isNaN(def.max)) {
            numeric = Math.min(def.max, numeric);
        }

        if (def.type === 'int') {
            numeric = Math.round(numeric);
        }

        this.params[name] = numeric;
        return true;
    }
    
    /**
     * Set multiple parameters at once
     */
    setParameters(paramObj) {
        for (const [name, value] of Object.entries(paramObj)) {
            this.setParameter(name, value);
        }
    }
    
    /**
     * Get a specific parameter value
     */
    getParameter(name) {
        return this.params[name];
    }

    /**
     * Alias used by new choreography bridge
     */
    getParameterValue(name) {
        return this.getParameter(name);
    }

    /**
     * Register parameters introduced by AI choreography or external systems
     */
    registerDynamicParameter(name, definition = {}) {
        if (!name) {
            return;
        }

        let minValue = definition.min;
        let maxValue = definition.max;

        if (Array.isArray(definition.range)) {
            const [rangeMin, rangeMax] = definition.range;
            if (minValue === undefined) minValue = rangeMin;
            if (maxValue === undefined) maxValue = rangeMax;
        } else if (definition.range && typeof definition.range === 'object') {
            if (minValue === undefined) {
                minValue = definition.range.min ?? definition.range.lower;
            }
            if (maxValue === undefined) {
                maxValue = definition.range.max ?? definition.range.upper;
            }
        }

        const options = Array.isArray(definition.options)
            ? definition.options.map(option => typeof option === 'string' ? option : String(option))
            : undefined;

        const type = definition.type
            || (options && options.length ? 'enum' : 'float');

        if (type === 'enum') {
            const normalizedOptions = options && options.length ? options : [String(definition.defaultValue ?? '')];
            const defaultValue = definition.defaultValue ?? this.params[name] ?? normalizedOptions[0];

            if (!(name in this.params)) {
                this.params[name] = defaultValue;
            }

            this.parameterDefs[name] = {
                type: 'enum',
                options: normalizedOptions,
                default: defaultValue,
                allowOverflow: definition.allowOverflow ?? false
            };

            this.dynamicParameters.add(name);
            return;
        }

        const defaultValue = definition.defaultValue ?? this.params[name] ?? 0;
        const allowOverflow = definition.allowOverflow ?? true;
        const step = type === 'int' ? 1 : (definition.step ?? 0.01);
        const min = minValue ?? Number.NEGATIVE_INFINITY;
        const max = maxValue ?? Number.POSITIVE_INFINITY;

        if (!(name in this.params)) {
            this.params[name] = defaultValue;
        }

        this.parameterDefs[name] = {
            min,
            max,
            step,
            type,
            allowOverflow,
            default: defaultValue
        };

        this.dynamicParameters.add(name);
    }

    /**
     * External writers can opt into overflow behaviour or register new params
     */
    setParameterExternal(name, value, options = {}) {
        const {
            allowOverflow = false,
            register = false,
            definition = {},
            defaultValue = 0
        } = options;

        if (register && !this.parameterDefs[name]) {
            this.registerDynamicParameter(name, {
                ...definition,
                defaultValue,
                allowOverflow: allowOverflow || definition.allowOverflow
            });
        } else if (allowOverflow && this.parameterDefs[name] && !this.parameterDefs[name].allowOverflow) {
            this.parameterDefs[name].allowOverflow = true;
        }

        if (allowOverflow || (this.parameterDefs[name] && this.parameterDefs[name].allowOverflow)) {
            this.params[name] = value;
            return true;
        }

        return this.setParameter(name, value);
    }
    
    /**
     * Set geometry type with validation
     */
    setGeometry(geometryType) {
        this.setParameter('geometry', geometryType);
    }
    
    /**
     * Update parameters from UI controls
     */
    updateFromControls() {
        const controlIds = [
            'variationSlider', 'rot4dXW', 'rot4dYW', 'rot4dZW', 'dimension',
            'gridDensity', 'morphFactor', 'chaos', 'speed', 'hue'
        ];
        
        controlIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                const value = parseFloat(element.value);
                
                // Map slider IDs to parameter names
                let paramName = id;
                if (id === 'variationSlider') {
                    paramName = 'variation';
                }
                
                this.setParameter(paramName, value);
            }
        });
    }
    
    /**
     * Update UI display values from current parameters
     */
    updateDisplayValues() {
        // Update slider values
        this.updateSliderValue('variationSlider', this.params.variation);
        this.updateSliderValue('rot4dXW', this.params.rot4dXW);
        this.updateSliderValue('rot4dYW', this.params.rot4dYW);
        this.updateSliderValue('rot4dZW', this.params.rot4dZW);
        this.updateSliderValue('dimension', this.params.dimension);
        this.updateSliderValue('gridDensity', this.params.gridDensity);
        this.updateSliderValue('morphFactor', this.params.morphFactor);
        this.updateSliderValue('chaos', this.params.chaos);
        this.updateSliderValue('speed', this.params.speed);
        this.updateSliderValue('hue', this.params.hue);
        
        // Update display texts
        this.updateDisplayText('rot4dXWDisplay', this.params.rot4dXW.toFixed(2));
        this.updateDisplayText('rot4dYWDisplay', this.params.rot4dYW.toFixed(2));
        this.updateDisplayText('rot4dZWDisplay', this.params.rot4dZW.toFixed(2));
        this.updateDisplayText('dimensionDisplay', this.params.dimension.toFixed(2));
        this.updateDisplayText('gridDensityDisplay', this.params.gridDensity.toFixed(1));
        this.updateDisplayText('morphFactorDisplay', this.params.morphFactor.toFixed(2));
        this.updateDisplayText('chaosDisplay', this.params.chaos.toFixed(2));
        this.updateDisplayText('speedDisplay', this.params.speed.toFixed(2));
        this.updateDisplayText('hueDisplay', this.params.hue + '°');
        
        // Update variation info
        this.updateVariationInfo();
        
        // Update geometry preset buttons
        this.updateGeometryButtons();
    }
    
    updateSliderValue(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.value = value;
        }
    }
    
    updateDisplayText(id, text) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = text;
        }
    }
    
    updateVariationInfo() {
        const variationDisplay = typeof document !== 'undefined'
            ? document.getElementById('currentVariationDisplay')
            : null;

        if (!variationDisplay) {
            return;
        }

        const variationIndex = this.params.variation ?? 0;
        const defaultCount = this.defaultVariationDefinitions.length;
        let label;

        if (variationIndex < defaultCount) {
            const definition = this.defaultVariationDefinitions[variationIndex];
            label = definition?.displayLabel || definition?.label || `Variation ${variationIndex + 1}`;
        } else if (variationIndex < this.totalVariationCount) {
            const customIndex = variationIndex - defaultCount;
            label = `Custom Variation ${customIndex + 1}`;
        } else {
            label = 'Variation';
        }

        variationDisplay.textContent = `${variationIndex + 1} - ${label}`;
    }
    
    updateGeometryButtons() {
        document.querySelectorAll('[data-geometry]').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.geometry) === this.params.geometry);
        });
    }
    
    /**
     * Randomize all parameters
     */
    randomizeAll() {
        this.params.rot4dXW = Math.random() * 4 - 2;
        this.params.rot4dYW = Math.random() * 4 - 2;
        this.params.rot4dZW = Math.random() * 4 - 2;
        this.params.dimension = 3.0 + Math.random() * 1.5;
        this.params.gridDensity = 4 + Math.random() * 26;
        this.params.morphFactor = Math.random() * 2;
        this.params.chaos = Math.random();
        this.params.speed = 0.1 + Math.random() * 2.9;
        this.params.hue = Math.random() * 360;
        this.params.geometry = Math.floor(Math.random() * 8);
    }
    
    /**
     * Reset to default parameters
     */
    resetToDefaults() {
        this.params = { ...this.defaults };
    }
    
    /**
     * Load parameter configuration
     */
    loadConfiguration(config) {
        if (config && typeof config === 'object') {
            // Validate and apply configuration
            for (const [key, value] of Object.entries(config)) {
                if (this.parameterDefs[key]) {
                    this.setParameter(key, value);
                }
            }
            return true;
        }
        return false;
    }
    
    /**
     * Export current configuration
     */
    exportConfiguration() {
        return {
            type: 'vib34d-integrated-config',
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            name: `VIB34D Config ${new Date().toLocaleDateString()}`,
            parameters: { ...this.params }
        };
    }
    
    /**
     * Generate variation-specific parameters
     */
    generateVariationParameters(variationIndex) {
        if (variationIndex < this.defaultVariationDefinitions.length) {
            const definition = this.defaultVariationDefinitions[variationIndex];
            if (definition) {
                const geometryIndex = definition.geometryIndex ?? 0;
                const level = definition.level ?? 0;
                const baseParams = GeometryLibrary.getVariationParameters(geometryIndex, level);
                const rotations = this.computeDefaultRotations(geometryIndex, level);

                return {
                    geometry: geometryIndex,
                    gridDensity: baseParams.gridDensity,
                    morphFactor: baseParams.morphFactor,
                    chaos: baseParams.chaos,
                    speed: baseParams.speed,
                    hue: baseParams.hue,
                    rot4dXW: rotations.rot4dXW,
                    rot4dYW: rotations.rot4dYW,
                    rot4dZW: rotations.rot4dZW,
                    dimension: 3.0 + (level * 0.25)
                };
            }
        }

        return { ...this.params };
    }

    computeDefaultRotations(geometryIndex, level) {
        const normalizedLevel = typeof level === 'number' ? level : 0;
        const centeredLevel = normalizedLevel - 1.5;

        return {
            rot4dXW: centeredLevel * 0.45,
            rot4dYW: ((geometryIndex % 3) - 1) * 0.35,
            rot4dZW: (((geometryIndex + normalizedLevel) % 4) - 1.5) * 0.28
        };
    }

    /**
     * Apply variation to current parameters
     */
    applyVariation(variationIndex) {
        const variationParams = this.generateVariationParameters(variationIndex);
        this.setParameters(variationParams);
        this.params.variation = variationIndex;
    }
    
    /**
     * Get HSV color values for current hue
     */
    getColorHSV() {
        return {
            h: this.params.hue,
            s: 0.8, // Fixed saturation
            v: 0.9  // Fixed value
        };
    }
    
    /**
     * Get RGB color values for current hue
     */
    getColorRGB() {
        const hsv = this.getColorHSV();
        return this.hsvToRgb(hsv.h, hsv.s, hsv.v);
    }
    
    /**
     * Convert HSV to RGB
     */
    hsvToRgb(h, s, v) {
        h = h / 60;
        const c = v * s;
        const x = c * (1 - Math.abs((h % 2) - 1));
        const m = v - c;
        
        let r, g, b;
        if (h < 1) {
            [r, g, b] = [c, x, 0];
        } else if (h < 2) {
            [r, g, b] = [x, c, 0];
        } else if (h < 3) {
            [r, g, b] = [0, c, x];
        } else if (h < 4) {
            [r, g, b] = [0, x, c];
        } else if (h < 5) {
            [r, g, b] = [x, 0, c];
        } else {
            [r, g, b] = [c, 0, x];
        }
        
        return {
            r: Math.round((r + m) * 255),
            g: Math.round((g + m) * 255),
            b: Math.round((b + m) * 255)
        };
    }
    
    /**
     * Validate parameter configuration
     */
    validateConfiguration(config) {
        if (!config || typeof config !== 'object') {
            return { valid: false, error: 'Configuration must be an object' };
        }
        
        if (config.type !== 'vib34d-integrated-config') {
            return { valid: false, error: 'Invalid configuration type' };
        }
        
        if (!config.parameters) {
            return { valid: false, error: 'Missing parameters object' };
        }
        
        // Validate individual parameters
        for (const [key, value] of Object.entries(config.parameters)) {
            if (this.parameterDefs[key]) {
                const def = this.parameterDefs[key];
                if (typeof value !== 'number' || value < def.min || value > def.max) {
                    return { valid: false, error: `Invalid value for parameter ${key}: ${value}` };
                }
            }
        }
        
        return { valid: true };
    }
}