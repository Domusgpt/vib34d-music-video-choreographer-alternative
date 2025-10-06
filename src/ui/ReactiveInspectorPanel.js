import { ReactiveVisualizerInspector } from '../diagnostics/ReactiveVisualizerInspector.js';

const PANEL_ID = 'reactive-visualizer-inspector-panel';
const ANCHOR_POSITIONS = {
    'bottom-right': { bottom: '16px', right: '16px' },
    'bottom-left': { bottom: '16px', left: '16px' },
    'top-right': { top: '16px', right: '16px' },
    'top-left': { top: '16px', left: '16px' }
};

function applyAnchorPosition(element, anchor) {
    Object.assign(element.style, {
        top: 'auto',
        right: 'auto',
        bottom: 'auto',
        left: 'auto'
    });
    const position = ANCHOR_POSITIONS[anchor] || ANCHOR_POSITIONS['bottom-right'];
    Object.assign(element.style, position);
}

function createRow(label) {
    const row = document.createElement('div');
    row.className = 'row';

    const labelEl = document.createElement('span');
    labelEl.className = 'label';
    labelEl.textContent = label;

    const valueEl = document.createElement('span');
    valueEl.className = 'value';
    valueEl.textContent = '—';

    row.append(labelEl, valueEl);
    return { row, valueEl };
}

export function installReactiveInspectorPanel({
    anchor = 'bottom-right',
    log = false,
    width = 320
} = {}) {
    if (typeof document === 'undefined') {
        console.warn('ReactiveInspectorPanel requires a browser environment.');
        return () => {};
    }

    const existing = document.getElementById(PANEL_ID);
    if (existing) {
        applyAnchorPosition(existing, anchor);
        existing.style.width = `${width}px`;
        return () => existing.remove();
    }

    const panel = document.createElement('aside');
    panel.id = PANEL_ID;
    panel.setAttribute('data-anchor', anchor);
    panel.style.position = 'fixed';
    panel.style.width = `${width}px`;
    panel.style.maxWidth = '90vw';
    panel.style.background = 'rgba(0, 0, 0, 0.82)';
    panel.style.backdropFilter = 'blur(8px)';
    panel.style.border = '1px solid rgba(0, 255, 255, 0.35)';
    panel.style.borderRadius = '12px';
    panel.style.boxShadow = '0 12px 32px rgba(0, 0, 0, 0.45)';
    panel.style.color = '#d7f9ff';
    panel.style.fontFamily = "'Orbitron', 'Segoe UI', sans-serif";
    panel.style.fontSize = '12px';
    panel.style.lineHeight = '1.6';
    panel.style.padding = '14px 16px';
    panel.style.zIndex = '2147483647';
    panel.style.transition = 'opacity 0.2s ease, transform 0.2s ease';

    applyAnchorPosition(panel, anchor);

    const header = document.createElement('div');
    header.className = 'header';
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.justifyContent = 'space-between';
    header.style.marginBottom = '12px';

    const title = document.createElement('h2');
    title.textContent = '4D Reactive Inspector';
    title.style.fontSize = '14px';
    title.style.letterSpacing = '0.08em';
    title.style.textTransform = 'uppercase';
    title.style.margin = '0';

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.textContent = '×';
    closeBtn.title = 'Close inspector panel';
    closeBtn.setAttribute('aria-label', 'Close inspector panel');
    closeBtn.style.background = 'transparent';
    closeBtn.style.border = 'none';
    closeBtn.style.color = '#8be9ff';
    closeBtn.style.fontSize = '18px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.lineHeight = '1';
    closeBtn.style.padding = '0 4px';

    header.append(title, closeBtn);

    const content = document.createElement('div');
    content.className = 'content';
    content.style.display = 'grid';
    content.style.gap = '8px';

    const visualizerRow = createRow('Visualizer');
    const stageRow = createRow('Stage');
    const dominantRow = createRow('Dominant Axis');
    const rotationRow = createRow('4D Rotation');
    const audioRow = createRow('Audio Support');
    const geometryRow = createRow('Geometry');
    const variantRow = createRow('Variant');
    const warningsRow = createRow('Warnings');

    rotationRow.valueEl.style.fontFamily = 'monospace';
    rotationRow.valueEl.style.letterSpacing = '0.05em';
    audioRow.valueEl.style.fontFamily = 'monospace';
    audioRow.valueEl.style.letterSpacing = '0.05em';

    const rows = [
        visualizerRow,
        stageRow,
        dominantRow,
        rotationRow,
        audioRow,
        geometryRow,
        variantRow,
        warningsRow
    ];

    rows.forEach(({ row }) => {
        row.style.display = 'flex';
        row.style.justifyContent = 'space-between';
        row.style.alignItems = 'center';
        row.style.gap = '8px';
        row.style.padding = '2px 0';
        content.appendChild(row);
    });

    rows.forEach(({ row }) => {
        const labelEl = row.querySelector('.label');
        const valueEl = row.querySelector('.value');
        labelEl.style.opacity = '0.75';
        labelEl.style.fontWeight = '600';
        labelEl.style.letterSpacing = '0.06em';
        valueEl.style.textAlign = 'right';
        valueEl.style.flex = '1';
    });

    const footer = document.createElement('footer');
    footer.style.marginTop = '12px';
    footer.style.fontSize = '10px';
    footer.style.opacity = '0.7';
    footer.textContent = 'Tip: Append ?inspectorPanel=1 to enable this overlay automatically.';

    panel.append(header, content, footer);
    document.body.appendChild(panel);

    const update = (summary) => {
        if (!summary) {
            visualizerRow.valueEl.textContent = 'Waiting for render…';
            stageRow.valueEl.textContent = '—';
            dominantRow.valueEl.textContent = '—';
            rotationRow.valueEl.textContent = '—';
            audioRow.valueEl.textContent = '—';
            geometryRow.valueEl.textContent = '—';
            variantRow.valueEl.textContent = '—';
            warningsRow.valueEl.textContent = 'None';
            return;
        }

        const rotationValues = summary.rotation?.values || {};
        const formatValue = (value) => (typeof value === 'number' ? value.toFixed(2) : '0.00');
        const rotationText = `XW ${formatValue(rotationValues.rot4dXW)} · YW ${formatValue(rotationValues.rot4dYW)} · ZW ${formatValue(rotationValues.rot4dZW)}`;

        visualizerRow.valueEl.textContent = summary.visualizer || '—';
        stageRow.valueEl.textContent = summary.effect
            ? `${summary.effect.stage.toUpperCase()} (${Math.round((summary.effect.rotationIntensity || 0) * 100)}%)`
            : '—';
        dominantRow.valueEl.textContent = summary.rotation?.dominantAxis || '—';
        rotationRow.valueEl.textContent = rotationText;
        audioRow.valueEl.textContent = summary.effect
            ? `${Math.round((summary.effect.audioSupport || 0) * 100)}% energy`
            : '—';
        geometryRow.valueEl.textContent = summary.geometryLabel
            ? `${summary.geometryLabel} (#${summary.geometryIndex ?? '—'})`
            : (typeof summary.geometryIndex === 'number' ? `#${summary.geometryIndex}` : '—');
        variantRow.valueEl.textContent = summary.variant != null ? `${summary.variant}` : '—';
        warningsRow.valueEl.textContent = summary.warnings?.length
            ? summary.warnings.join(' · ')
            : 'None';

        warningsRow.valueEl.style.color = summary.warnings?.length ? '#ffb86c' : '#9de5ff';
    };

    const unsubscribe = ReactiveVisualizerInspector.addListener(update);

    if (log) {
        window.VIB34D_DEBUG = window.VIB34D_DEBUG || {};
        window.VIB34D_DEBUG.reactiveInspector = window.VIB34D_DEBUG.reactiveInspector || {};
        window.VIB34D_DEBUG.reactiveInspector.log = true;
    }

    if (typeof window !== 'undefined') {
        window.VIB34D_DEBUG = window.VIB34D_DEBUG || {};
        window.VIB34D_DEBUG.reactiveInspector = window.VIB34D_DEBUG.reactiveInspector || {};
        window.VIB34D_DEBUG.reactiveInspector.panelElement = panel;
    }

    const teardown = () => {
        unsubscribe();
        if (typeof window !== 'undefined' && window.VIB34D_DEBUG?.reactiveInspector) {
            delete window.VIB34D_DEBUG.reactiveInspector.panelElement;
        }
        if (panel.isConnected) {
            panel.remove();
        }
    };

    closeBtn.addEventListener('click', teardown);

    return teardown;
}

export default installReactiveInspectorPanel;
