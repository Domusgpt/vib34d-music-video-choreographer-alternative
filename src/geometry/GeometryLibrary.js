/**
 * VIB3 Geometry Library
 * 8 geometric types with 4D polytopal mathematics integration
 * WebGL 1.0 compatible shaders only
 */

export class GeometryLibrary {
    static baseGeometries = [
        'TETRAHEDRON',
        'HYPERCUBE',
        'SPHERE',
        'TORUS',
        'KLEIN BOTTLE',
        'FRACTAL',
        'WAVE',
        'CRYSTAL'
    ];

    static baseGeometryClassMap = {
        'TETRAHEDRON': 'tetrahedron',
        'HYPERCUBE': 'hypercube',
        'SPHERE': 'sphere',
        'TORUS': 'torus',
        'KLEIN BOTTLE': 'klein',
        'FRACTAL': 'fractal',
        'WAVE': 'wave',
        'CRYSTAL': 'crystal'
    };

    static customGeometries = [];

    static listeners = new Set();
    static version = 0;

    static getGeometryNames() {
        return [...this.baseGeometries, ...this.customGeometries];
    }

    static getGeometryName(type) {
        const names = this.getGeometryNames();
        return names[type] || 'UNKNOWN';
    }

    static normalizeName(name) {
        if (typeof name !== 'string') {
            return '';
        }
        return name.trim().replace(/\s+/g, ' ');
    }

    static formatDisplayName(name) {
        return (name || '')
            .split(' ')
            .filter(Boolean)
            .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
            .join(' ');
    }

    static formatCssClass(key, fallbackIndex = 0) {
        const base = (key || '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-');
        if (!base) {
            return `geometry-${fallbackIndex}`;
        }
        return `geometry-${base}`;
    }

    static getLevelCountForKey(key) {
        switch (key) {
            case 'FRACTAL':
            case 'WAVE':
                return 3;
            default:
                return 4;
        }
    }

    static getGeometryMetadata(names) {
        const list = Array.isArray(names) && names.length ? names : this.getGeometryNames();
        const seen = new Set();

        const metadata = [];
        list.forEach((name) => {
            const normalized = this.normalizeName(name);
            if (!normalized) {
                return;
            }

            const key = normalized.toUpperCase();
            if (seen.has(key)) {
                return;
            }
            seen.add(key);

            const geometryIndex = metadata.length;
            metadata.push({
                key,
                rawName: normalized,
                displayName: this.formatDisplayName(normalized),
                cssClass: this.baseGeometryClassMap[key] || this.formatCssClass(key, geometryIndex),
                levels: this.getLevelCountForKey(key),
                geometryIndex
            });
        });

        return metadata;
    }

    static buildVariationDefinitions(metadata = this.getGeometryMetadata(), target = 30) {
        if (!Array.isArray(metadata) || !metadata.length) {
            return [];
        }

        const perGeometry = metadata.map(meta => {
            const levelCount = Math.max(1, meta.levels || 1);
            const entries = [];
            for (let level = 0; level < levelCount; level += 1) {
                entries.push({
                    geometryIndex: meta.geometryIndex,
                    geometryKey: meta.key,
                    cssClass: meta.cssClass,
                    displayName: meta.displayName,
                    level,
                    label: `${meta.key} LATTICE ${level + 1}`,
                    displayLabel: `${meta.displayName} Lattice ${level + 1}`,
                    shortLabel: `Level ${level + 1}`
                });
            }
            return entries;
        });

        const definitions = [];
        let levelIndex = 0;
        let added = true;

        while (definitions.length < target && added) {
            added = false;
            perGeometry.forEach(entries => {
                if (definitions.length >= target) {
                    return;
                }
                if (entries[levelIndex]) {
                    definitions.push(entries[levelIndex]);
                    added = true;
                }
            });
            levelIndex += 1;
        }

        if (!definitions.length && perGeometry.length) {
            const fallback = perGeometry.find(list => list.length);
            if (fallback && fallback.length) {
                definitions.push(fallback[0]);
            }
        }

        return definitions;
    }

    static hasGeometry(name) {
        const normalized = this.normalizeName(name).toUpperCase();
        if (!normalized) return false;
        return this.getGeometryNames().some(item => item.toUpperCase() === normalized);
    }

    static registerGeometry(name) {
        const normalized = this.normalizeName(name);
        if (!normalized) {
            return false;
        }

        if (this.hasGeometry(normalized)) {
            return false;
        }

        this.customGeometries.push(normalized.toUpperCase());
        this.version += 1;
        this.notifyListeners();
        return true;
    }

    static clearCustomGeometries() {
        if (!this.customGeometries.length) {
            return;
        }

        this.customGeometries = [];
        this.version += 1;
        this.notifyListeners();
    }

    static replaceCustomGeometries(list = []) {
        const normalized = Array.isArray(list) ? list : [list];
        const newEntries = normalized
            .map(name => this.normalizeName(name))
            .filter(Boolean)
            .map(name => name.toUpperCase());

        const changed = newEntries.length !== this.customGeometries.length
            || newEntries.some((entry, index) => entry !== this.customGeometries[index]);

        if (!changed) {
            return false;
        }

        this.customGeometries = newEntries;
        this.version += 1;
        this.notifyListeners();
        return true;
    }

    static subscribe(listener) {
        if (typeof listener !== 'function') {
            return () => {};
        }

        this.listeners.add(listener);
        try {
            listener({
                names: this.getGeometryNames(),
                version: this.version
            });
        } catch (err) {
            console.warn('[GeometryLibrary] listener threw during subscribe', err);
        }

        return () => {
            this.listeners.delete(listener);
        };
    }

    static notifyListeners() {
        const payload = {
            names: this.getGeometryNames(),
            version: this.version
        };
        this.listeners.forEach(listener => {
            try {
                listener(payload);
            } catch (err) {
                console.warn('[GeometryLibrary] listener failed', err);
            }
        });
    }

    /**
     * Get variation parameters for specific geometry and level
     */
    static getVariationParameters(geometryType, level) {
        const baseParams = {
            gridDensity: 8 + (level * 4),
            morphFactor: 0.5 + (level * 0.3),
            chaos: level * 0.15,
            speed: 0.8 + (level * 0.2),
            hue: (geometryType * 45 + level * 15) % 360
        };
        
        // Geometry-specific adjustments
        switch (geometryType) {
            case 0: // Tetrahedron
                baseParams.gridDensity *= 1.2;
                break;
            case 1: // Hypercube
                baseParams.morphFactor *= 0.8;
                break;
            case 2: // Sphere
                baseParams.chaos *= 1.5;
                break;
            case 3: // Torus
                baseParams.speed *= 1.3;
                break;
            case 4: // Klein Bottle
                baseParams.gridDensity *= 0.7;
                baseParams.morphFactor *= 1.4;
                break;
            case 5: // Fractal
                baseParams.gridDensity *= 0.5;
                baseParams.chaos *= 2.0;
                break;
            case 6: // Wave
                baseParams.speed *= 1.8;
                baseParams.chaos *= 0.5;
                break;
            case 7: // Crystal
                baseParams.gridDensity *= 1.5;
                baseParams.morphFactor *= 0.6;
                break;
        }
        
        return baseParams;
    }
}