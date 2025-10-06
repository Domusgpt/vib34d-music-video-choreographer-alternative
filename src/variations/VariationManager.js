/**
 * VIB34D Variation Management System
 * Dynamically manages default and custom variations using the live geometry library.
 */

import { GeometryLibrary } from '../geometry/GeometryLibrary.js';
import {
    DEFAULT_VARIATION_TARGET as DEFAULT_VARIATION_LIMIT,
    resolveVariantCatalog
} from '../holograms/VariantCatalog.js';

const CUSTOM_VARIATION_SLOTS = 70;

export class VariationManager {
    constructor(engine) {
        this.engine = engine;
        this.defaultVariationTarget = DEFAULT_VARIATION_LIMIT;
        this.customSlotCount = CUSTOM_VARIATION_SLOTS;

        this.geometryMetadata = [];
        this.defaultVariations = [];
        this.customVariations = new Array(this.customSlotCount).fill(null);

        this.geometryUnsubscribe = null;
        this.pendingGridRefresh = false;

        this.handleGeometryUpdate(GeometryLibrary.getGeometryNames());
        this.subscribeToGeometryLibrary();
    }

    subscribeToGeometryLibrary() {
        if (typeof GeometryLibrary?.subscribe !== 'function') {
            return;
        }

        this.geometryUnsubscribe = GeometryLibrary.subscribe(({ names }) => {
            this.handleGeometryUpdate(names);
        });
    }

    destroy() {
        if (typeof this.geometryUnsubscribe === 'function') {
            this.geometryUnsubscribe();
            this.geometryUnsubscribe = null;
        }
    }

    handleGeometryUpdate(names) {
        const { metadata, definitions } = resolveVariantCatalog(
            this.defaultVariationTarget,
            names
        );

        this.geometryMetadata = metadata;
        this.defaultVariations = definitions;
        this.updateEngineVariationMetadata();
        this.syncCurrentVariationIndex();
        this.refreshGridIfMounted();
    }

    updateEngineVariationMetadata() {
        this.totalVariations = this.defaultVariations.length + this.customVariations.length;

        if (this.engine) {
            this.engine.totalVariations = this.totalVariations;
            if (this.engine.parameterManager?.updateVariationMetadata) {
                this.engine.parameterManager.updateVariationMetadata({
                    defaults: this.defaultVariations,
                    customCount: this.customVariations.length,
                    totalVariations: this.totalVariations
                });
            }
        }
    }

    syncCurrentVariationIndex() {
        if (!this.engine) {
            return;
        }

        if (!this.totalVariations) {
            this.engine.currentVariation = 0;
            if (this.engine.parameterManager) {
                this.engine.parameterManager.setParameter('variation', 0);
            }
            return;
        }

        if (this.engine.currentVariation >= this.totalVariations) {
            const newIndex = this.totalVariations - 1;
            this.engine.currentVariation = newIndex;
            if (this.engine.parameterManager) {
                this.engine.parameterManager.setParameter('variation', newIndex);
            }
        }
    }

    refreshGridIfMounted() {
        const gridContainer = typeof document !== 'undefined'
            ? document.getElementById('variationGrid')
            : null;

        if (gridContainer) {
            this.populateGrid();
        } else {
            this.pendingGridRefresh = true;
        }
    }

    getDefaultVariationCount() {
        return this.defaultVariations.length;
    }

    getCustomOffset() {
        return this.getDefaultVariationCount();
    }

    getGeometryDisplayName(index) {
        const meta = this.geometryMetadata[index];
        if (meta) {
            return meta.displayName;
        }

        const rawName = GeometryLibrary.getGeometryName(index);
        const normalized = GeometryLibrary.normalizeName(rawName);
        return normalized ? GeometryLibrary.formatDisplayName(normalized) : 'Unknown';
    }

    getVariationName(index) {
        const defaultCount = this.getDefaultVariationCount();
        if (index < defaultCount) {
            const definition = this.defaultVariations[index];
            return definition ? definition.label : `VARIATION ${index + 1}`;
        }

        const customIndex = index - defaultCount;
        const customVar = this.customVariations[customIndex];
        return customVar ? customVar.name : `CUSTOM ${customIndex + 1}`;
    }

    generateDefaultVariation(index) {
        if (index >= this.getDefaultVariationCount()) {
            return null;
        }

        const params = this.engine?.parameterManager?.generateVariationParameters(index);
        return params ? { ...params, variation: index } : null;
    }

    applyVariation(index) {
        if (index < 0 || index >= this.totalVariations) {
            return false;
        }

        const defaultCount = this.getDefaultVariationCount();

        if (index < defaultCount) {
            if (this.engine?.parameterManager?.applyVariation) {
                this.engine.parameterManager.applyVariation(index);
            }
            this.engine.currentVariation = index;
            return true;
        }

        const customIndex = index - defaultCount;
        const customVar = this.customVariations[customIndex];

        if (customVar) {
            this.engine.parameterManager.setParameters({
                ...customVar.parameters,
                variation: index
            });
            this.engine.currentVariation = index;
            return true;
        }

        this.engine.parameterManager.setParameter('variation', index);
        this.engine.currentVariation = index;
        return false;
    }

    saveCurrentAsCustom() {
        const emptyIndex = this.customVariations.findIndex(slot => slot === null);
        if (emptyIndex === -1) {
            return -1;
        }

        const currentParams = this.engine.parameterManager.getAllParameters();
        const currentGeometry = GeometryLibrary.getGeometryName(currentParams.geometry);

        const customVariation = {
            name: `${currentGeometry} CUSTOM ${emptyIndex + 1}`,
            timestamp: new Date().toISOString(),
            parameters: { ...currentParams },
            metadata: {
                basedOnVariation: this.engine.currentVariation,
                createdFrom: 'current-state'
            }
        };

        this.customVariations[emptyIndex] = customVariation;
        this.saveCustomVariations();
        this.updateEngineVariationMetadata();

        return this.getCustomOffset() + emptyIndex;
    }

    deleteCustomVariation(customIndex) {
        if (customIndex >= 0 && customIndex < this.customVariations.length) {
            this.customVariations[customIndex] = null;
            this.saveCustomVariations();
            this.updateEngineVariationMetadata();
            return true;
        }
        return false;
    }

    populateGrid() {
        const gridContainer = document.getElementById('variationGrid');
        if (!gridContainer) {
            this.pendingGridRefresh = true;
            return;
        }

        this.pendingGridRefresh = false;
        gridContainer.innerHTML = '';

        const groups = this.getDefaultVariationGroups();
        groups.forEach(group => {
            if (!group.variations.length) {
                return;
            }

            const sectionDiv = document.createElement('div');
            sectionDiv.className = 'variation-section';
            sectionDiv.innerHTML = `<h3>${group.name}</h3>`;

            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'variation-buttons';

            group.variations.forEach(({ index, shortLabel }) => {
                const definition = this.defaultVariations[index];
                const button = this.createVariationButton(
                    index,
                    true,
                    group.cssClass,
                    shortLabel || definition?.shortLabel || 'Level'
                );
                buttonContainer.appendChild(button);
            });

            sectionDiv.appendChild(buttonContainer);
            gridContainer.appendChild(sectionDiv);
        });

        const customSection = document.createElement('div');
        customSection.className = 'variation-section custom-section';
        customSection.innerHTML = '<h3>Custom Variations</h3>';

        const customContainer = document.createElement('div');
        customContainer.className = 'variation-buttons custom-grid';

        const customOffset = this.getCustomOffset();
        for (let i = 0; i < this.customVariations.length; i += 1) {
            const button = this.createVariationButton(customOffset + i, false, 'custom');
            customContainer.appendChild(button);
        }

        customSection.appendChild(customContainer);
        gridContainer.appendChild(customSection);

        this.updateVariationGrid();
    }

    getDefaultVariationGroups() {
        const groups = new Map();

        this.defaultVariations.forEach((definition, index) => {
            if (!definition) {
                return;
            }

            const existing = groups.get(definition.geometryIndex);
            if (!existing) {
                groups.set(definition.geometryIndex, {
                    geometryIndex: definition.geometryIndex,
                    name: `${definition.displayName} Lattice`,
                    cssClass: definition.cssClass || 'geometry',
                    variations: []
                });
            }

            groups.get(definition.geometryIndex).variations.push({
                index,
                level: definition.level ?? 0,
                shortLabel: definition.shortLabel
            });
        });

        return Array.from(groups.values()).map(group => ({
            ...group,
            variations: group.variations
                .sort((a, b) => {
                    if (a.level === b.level) {
                        return a.index - b.index;
                    }
                    return a.level - b.level;
                })
                .map(({ index, shortLabel }) => ({ index, shortLabel }))
        }));
    }

    createVariationButton(variationIndex, isDefault, geomClass, levelLabel = '') {
        const button = document.createElement('button');
        const name = this.getVariationName(variationIndex);
        const numberLabel = (variationIndex + 1).toString().padStart(2, '0');

        const classes = ['preset-btn', geomClass || 'geometry'];
        classes.push(isDefault ? 'default-variation' : 'custom-variation');
        button.className = classes.join(' ');
        button.dataset.variation = variationIndex;
        button.title = `${variationIndex + 1}. ${name}`;

        if (isDefault) {
            button.innerHTML = `
                <div class="variation-number">${numberLabel}</div>
                <div class="variation-level">${levelLabel}</div>
            `;
        } else {
            const customIndex = variationIndex - this.getDefaultVariationCount();
            const hasCustom = this.customVariations[customIndex] !== null;

            button.innerHTML = `
                <div class="variation-number">${variationIndex + 1}</div>
                <div class="variation-type">${hasCustom ? 'CUSTOM' : 'EMPTY'}</div>
            `;

            if (!hasCustom) {
                button.classList.add('empty-slot');
            }
        }

        button.addEventListener('click', () => {
            if (isDefault || this.customVariations[variationIndex - this.getDefaultVariationCount()] !== null) {
                this.engine.setVariation(variationIndex);
                this.updateVariationGrid();
            }
        });

        if (!isDefault) {
            button.addEventListener('contextmenu', (event) => {
                event.preventDefault();
                const customIndex = variationIndex - this.getDefaultVariationCount();
                if (this.customVariations[customIndex] !== null) {
                    if (confirm(`Delete custom variation ${variationIndex + 1}?`)) {
                        this.deleteCustomVariation(customIndex);
                        this.populateGrid();
                    }
                }
            });
        }

        return button;
    }

    updateVariationGrid() {
        const buttons = document.querySelectorAll('.preset-btn');
        buttons.forEach(btn => {
            btn.classList.remove('active');
            if (parseInt(btn.dataset.variation, 10) === this.engine.currentVariation) {
                btn.classList.add('active');
            }
        });
    }

    loadCustomVariations() {
        try {
            const stored = localStorage.getItem('vib34d-custom-variations');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) {
                    this.customVariations = new Array(this.customSlotCount)
                        .fill(null)
                        .map((_, index) => parsed[index] || null);
                }
            }
        } catch (error) {
            console.warn('Failed to load custom variations:', error);
        }

        this.updateEngineVariationMetadata();
    }

    saveCustomVariations() {
        try {
            localStorage.setItem('vib34d-custom-variations', JSON.stringify(this.customVariations));
        } catch (error) {
            console.warn('Failed to save custom variations:', error);
        }
    }

    exportCustomVariations() {
        const exportData = {
            type: 'vib34d-custom-variations',
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            variations: this.customVariations.filter(v => v !== null)
        };

        const json = JSON.stringify(exportData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = 'vib34d-custom-variations.json';
        link.click();

        URL.revokeObjectURL(url);
    }

    async importCustomVariations(file) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);

            if (data.type === 'vib34d-custom-variations' && Array.isArray(data.variations)) {
                let importCount = 0;

                data.variations.forEach(variation => {
                    const emptyIndex = this.customVariations.findIndex(slot => slot === null);
                    if (emptyIndex !== -1) {
                        this.customVariations[emptyIndex] = variation;
                        importCount += 1;
                    }
                });

                this.saveCustomVariations();
                this.populateGrid();
                this.updateEngineVariationMetadata();

                return importCount;
            }
        } catch (error) {
            console.error('Failed to import custom variations:', error);
        }

        return 0;
    }

    getStatistics() {
        const customCount = this.customVariations.filter(v => v !== null).length;

        return {
            totalVariations: this.totalVariations,
            defaultVariations: this.getDefaultVariationCount(),
            customVariations: customCount,
            emptySlots: this.customVariations.length - customCount,
            currentVariation: this.engine.currentVariation,
            isCustom: this.engine.currentVariation >= this.getDefaultVariationCount()
        };
    }
}
