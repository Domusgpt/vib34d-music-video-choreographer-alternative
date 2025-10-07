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
    width = 320,
    sampleSize = 12
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

    const controls = document.createElement('div');
    controls.className = 'controls';
    controls.style.display = 'flex';
    controls.style.flexWrap = 'wrap';
    controls.style.gap = '8px';
    controls.style.marginBottom = '12px';

    const makeButton = (label, theme = {}) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = label;
        const defaultTheme = {
            baseBg: 'rgba(21, 115, 135, 0.35)',
            hoverBg: 'rgba(21, 115, 135, 0.55)',
            baseBorder: 'rgba(139, 233, 255, 0.45)',
            hoverBorder: 'rgba(139, 233, 255, 0.75)'
        };
        const appliedTheme = { ...defaultTheme, ...theme };
        btn.dataset.baseBg = appliedTheme.baseBg;
        btn.dataset.hoverBg = appliedTheme.hoverBg;
        btn.dataset.baseBorder = appliedTheme.baseBorder;
        btn.dataset.hoverBorder = appliedTheme.hoverBorder;
        btn.style.background = appliedTheme.baseBg;
        btn.style.border = `1px solid ${appliedTheme.baseBorder}`;
        btn.style.borderRadius = '8px';
        btn.style.color = '#b3f4ff';
        btn.style.cursor = 'pointer';
        btn.style.fontSize = '11px';
        btn.style.letterSpacing = '0.05em';
        btn.style.padding = '6px 10px';
        btn.style.flex = '0 0 auto';
        btn.style.transition = 'background 0.2s ease, border 0.2s ease';
        btn.addEventListener('mouseenter', () => {
            btn.style.background = btn.dataset.hoverBg;
            btn.style.borderColor = btn.dataset.hoverBorder;
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.background = btn.dataset.baseBg;
            btn.style.borderColor = btn.dataset.baseBorder;
        });
        return btn;
    };

    const thresholdInputs = {};
    const PRESET_CONFIGS = {
        default: {
            label: 'Default',
            config: ReactiveVisualizerInspector.getDefaultContinuityConfig()
        },
        cinematic: {
            label: 'Cinematic Drift',
            config: {
                rotationJitterThreshold: 0.85,
                rotationStillnessTolerance: 0.18,
                audioSpikeThreshold: 0.48,
                audioStillnessTolerance: 0.12,
                intervalWarningMs: 2200
            }
        },
        sensitive: {
            label: 'Hyper Sensitive',
            config: {
                rotationJitterThreshold: 0.4,
                rotationStillnessTolerance: 0.08,
                audioSpikeThreshold: 0.25,
                audioStillnessTolerance: 0.08,
                intervalWarningMs: 1200
            }
        },
        custom: {
            label: 'Custom (Manual)',
            config: null
        }
    };

    const pauseBtn = makeButton('Pause');
    pauseBtn.setAttribute('aria-pressed', 'false');

    const copyBtn = makeButton('Copy JSON');
    const csvBtn = makeButton('Download CSV');
    const reportBtn = makeButton('Report');
    const clearBtn = makeButton('Clear');
    const newSessionBtn = makeButton('New Session', {
        baseBg: 'rgba(68, 32, 115, 0.45)',
        hoverBg: 'rgba(88, 42, 145, 0.7)',
        baseBorder: 'rgba(187, 160, 255, 0.55)',
        hoverBorder: 'rgba(212, 190, 255, 0.85)'
    });

    const sessionLabelInput = document.createElement('input');
    sessionLabelInput.type = 'text';
    sessionLabelInput.placeholder = 'Session label';
    sessionLabelInput.style.flex = '1 1 120px';
    sessionLabelInput.style.minWidth = '120px';
    sessionLabelInput.style.maxWidth = '180px';
    sessionLabelInput.style.padding = '6px 8px';
    sessionLabelInput.style.borderRadius = '8px';
    sessionLabelInput.style.border = '1px solid rgba(139, 233, 255, 0.45)';
    sessionLabelInput.style.background = 'rgba(0, 25, 35, 0.55)';
    sessionLabelInput.style.color = '#e6fcff';
    sessionLabelInput.style.fontSize = '11px';
    sessionLabelInput.style.letterSpacing = '0.05em';
    sessionLabelInput.style.outline = 'none';
    sessionLabelInput.setAttribute('aria-label', 'Inspector session label');

    const sampleWrapper = document.createElement('label');
    sampleWrapper.textContent = 'Window';
    sampleWrapper.style.display = 'flex';
    sampleWrapper.style.alignItems = 'center';
    sampleWrapper.style.gap = '6px';
    sampleWrapper.style.fontSize = '11px';
    sampleWrapper.style.letterSpacing = '0.05em';
    sampleWrapper.style.opacity = '0.8';

    const sampleInput = document.createElement('input');
    sampleInput.type = 'number';
    sampleInput.min = '1';
    sampleInput.max = '250';
    sampleInput.value = String(Math.max(1, Math.floor(sampleSize)));
    sampleInput.style.width = '56px';
    sampleInput.style.padding = '4px 6px';
    sampleInput.style.borderRadius = '6px';
    sampleInput.style.border = '1px solid rgba(139, 233, 255, 0.45)';
    sampleInput.style.background = 'rgba(0, 25, 35, 0.6)';
    sampleInput.style.color = '#e6fcff';
    sampleInput.style.fontSize = '11px';
    sampleInput.style.textAlign = 'center';

    sampleWrapper.appendChild(sampleInput);

    controls.append(
        pauseBtn,
        copyBtn,
        csvBtn,
        reportBtn,
        clearBtn,
        sessionLabelInput,
        newSessionBtn,
        sampleWrapper
    );

    const setPauseButtonTheme = (paused) => {
        if (paused) {
            pauseBtn.dataset.baseBg = 'rgba(82, 21, 21, 0.55)';
            pauseBtn.dataset.hoverBg = 'rgba(110, 35, 35, 0.75)';
            pauseBtn.dataset.baseBorder = 'rgba(255, 149, 128, 0.75)';
            pauseBtn.dataset.hoverBorder = 'rgba(255, 174, 150, 0.9)';
        } else {
            pauseBtn.dataset.baseBg = 'rgba(21, 115, 135, 0.35)';
            pauseBtn.dataset.hoverBg = 'rgba(21, 115, 135, 0.55)';
            pauseBtn.dataset.baseBorder = 'rgba(139, 233, 255, 0.45)';
            pauseBtn.dataset.hoverBorder = 'rgba(139, 233, 255, 0.75)';
        }
        pauseBtn.style.background = pauseBtn.dataset.baseBg;
        pauseBtn.style.borderColor = pauseBtn.dataset.baseBorder;
    };

    setPauseButtonTheme(false);

    const continuityDetails = document.createElement('details');
    continuityDetails.className = 'continuity-settings';
    continuityDetails.style.margin = '0 0 12px 0';
    continuityDetails.style.padding = '10px 12px 12px';
    continuityDetails.style.border = '1px solid rgba(139, 233, 255, 0.25)';
    continuityDetails.style.borderRadius = '10px';
    continuityDetails.style.background = 'rgba(0, 25, 35, 0.45)';
    continuityDetails.style.color = '#d7f9ff';
    continuityDetails.style.backdropFilter = 'blur(6px)';
    continuityDetails.style.fontSize = '11px';
    continuityDetails.style.lineHeight = '1.5';

    const continuitySummaryEl = document.createElement('summary');
    const continuitySummaryLabel = document.createElement('span');
    continuitySummaryLabel.textContent = 'Continuity Settings';
    const continuitySummaryPreset = document.createElement('span');
    continuitySummaryPreset.style.fontSize = '10px';
    continuitySummaryPreset.style.opacity = '0.7';
    continuitySummaryPreset.style.marginLeft = 'auto';
    continuitySummaryPreset.style.textTransform = 'uppercase';
    continuitySummaryPreset.style.letterSpacing = '0.08em';
    continuitySummaryPreset.textContent = '';
    continuitySummaryEl.append(continuitySummaryLabel, continuitySummaryPreset);
    continuitySummaryEl.style.cursor = 'pointer';
    continuitySummaryEl.style.fontWeight = '600';
    continuitySummaryEl.style.letterSpacing = '0.08em';
    continuitySummaryEl.style.marginBottom = '8px';
    continuitySummaryEl.style.outline = 'none';
    continuitySummaryEl.style.display = 'flex';
    continuitySummaryEl.style.alignItems = 'center';
    continuitySummaryEl.style.gap = '6px';

    const presetRow = document.createElement('div');
    presetRow.style.display = 'flex';
    presetRow.style.flexWrap = 'wrap';
    presetRow.style.gap = '8px';
    presetRow.style.alignItems = 'center';
    presetRow.style.marginTop = '8px';

    const presetLabel = document.createElement('label');
    presetLabel.textContent = 'Preset';
    presetLabel.style.display = 'flex';
    presetLabel.style.alignItems = 'center';
    presetLabel.style.gap = '6px';
    presetLabel.style.opacity = '0.85';
    presetLabel.style.fontSize = '11px';
    presetLabel.style.letterSpacing = '0.05em';

    const presetSelect = document.createElement('select');
    presetSelect.style.background = 'rgba(0, 25, 35, 0.6)';
    presetSelect.style.border = '1px solid rgba(139, 233, 255, 0.45)';
    presetSelect.style.borderRadius = '6px';
    presetSelect.style.color = '#e6fcff';
    presetSelect.style.padding = '4px 6px';
    presetSelect.style.fontSize = '11px';
    presetSelect.style.letterSpacing = '0.05em';
    presetSelect.style.cursor = 'pointer';

    Object.entries(PRESET_CONFIGS).forEach(([value, preset]) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = preset.label;
        presetSelect.appendChild(option);
    });

    presetLabel.appendChild(presetSelect);
    presetRow.appendChild(presetLabel);

    const thresholdGrid = document.createElement('div');
    thresholdGrid.style.display = 'grid';
    thresholdGrid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(140px, 1fr))';
    thresholdGrid.style.gap = '8px';
    thresholdGrid.style.marginTop = '10px';

    const createThresholdInput = (key, label, { step = '0.05', min = '0', title = '' } = {}) => {
        const wrapper = document.createElement('label');
        wrapper.textContent = label;
        wrapper.style.display = 'flex';
        wrapper.style.flexDirection = 'column';
        wrapper.style.gap = '4px';
        wrapper.style.opacity = '0.85';
        wrapper.style.fontSize = '10px';
        wrapper.style.letterSpacing = '0.05em';

        const input = document.createElement('input');
        input.type = 'number';
        input.step = step;
        input.min = min;
        input.style.width = '100%';
        input.style.padding = '4px 6px';
        input.style.borderRadius = '6px';
        input.style.border = '1px solid rgba(139, 233, 255, 0.45)';
        input.style.background = 'rgba(0, 25, 35, 0.55)';
        input.style.color = '#e6fcff';
        input.style.fontSize = '11px';
        input.style.textAlign = 'center';
        input.style.outline = 'none';
        if (title) {
            input.title = title;
        }
        input.dataset.key = key;
        wrapper.appendChild(input);
        thresholdInputs[key] = input;
        thresholdGrid.appendChild(wrapper);
    };

    createThresholdInput('rotationJitterThreshold', 'Δ Rotation >', {
        step: '0.05',
        min: '0',
        title: 'Trigger jitter warnings when rotation delta exceeds this value.'
    });
    createThresholdInput('audioSpikeThreshold', 'Δ Audio >', {
        step: '0.05',
        min: '0',
        title: 'Trigger lag warnings when audio delta exceeds this value.'
    });
    createThresholdInput('rotationStillnessTolerance', 'Rotation Still ≤', {
        step: '0.02',
        min: '0',
        title: 'Consider rotation unresponsive when delta stays below this value.'
    });
    createThresholdInput('audioStillnessTolerance', 'Audio Still ≤', {
        step: '0.02',
        min: '0',
        title: 'Consider audio unchanging when delta stays below this value.'
    });
    createThresholdInput('intervalWarningMs', 'Gap > (ms)', {
        step: '50',
        min: '0',
        title: 'Flag telemetry gaps longer than this duration in milliseconds.'
    });

    const continuityHint = document.createElement('p');
    continuityHint.textContent = 'Fine-tune jitter, lag, and gap detection thresholds or load presets for fast calibration.';
    continuityHint.style.margin = '10px 0 0';
    continuityHint.style.opacity = '0.7';
    continuityHint.style.fontSize = '10px';
    continuityHint.style.letterSpacing = '0.05em';

    continuityDetails.append(continuitySummaryEl, presetRow, thresholdGrid, continuityHint);

    const content = document.createElement('div');
    content.className = 'content';
    content.style.display = 'grid';
    content.style.gap = '8px';

    const sessionRow = createRow('Session');
    const sessionStatsRow = createRow('Session Stats');
    const visualizerRow = createRow('Visualizer');
    const stageRow = createRow('Stage');
    const dominantRow = createRow('Dominant Axis');
    const rotationRow = createRow('4D Rotation');
    const audioRow = createRow('Audio Support');
    const geometryRow = createRow('Geometry');
    const variantRow = createRow('Variant');
    const warningsRow = createRow('Warnings');
    const continuityModeRow = createRow('Continuity Mode');
    const continuityThresholdRow = createRow('Thresholds');
    const continuityRow = createRow('Continuity');
    const rollingRow = createRow('Rolling Metrics');

    rotationRow.valueEl.style.fontFamily = 'monospace';
    rotationRow.valueEl.style.letterSpacing = '0.05em';
    audioRow.valueEl.style.fontFamily = 'monospace';
    audioRow.valueEl.style.letterSpacing = '0.05em';
    continuityRow.valueEl.style.fontFamily = 'monospace';
    continuityRow.valueEl.style.letterSpacing = '0.05em';
    rollingRow.valueEl.style.fontFamily = 'monospace';
    rollingRow.valueEl.style.letterSpacing = '0.05em';

    const rows = [
        sessionRow,
        sessionStatsRow,
        visualizerRow,
        stageRow,
        dominantRow,
        rotationRow,
        audioRow,
        geometryRow,
        variantRow,
        warningsRow,
        continuityModeRow,
        continuityThresholdRow,
        continuityRow,
        rollingRow
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
    footer.textContent = 'Tip: Append ?inspectorPanel=1 to enable this overlay automatically. Use Pause/Copy/Report/Clear to manage telemetry.';

    panel.append(header, controls, continuityDetails, content, footer);
    document.body.appendChild(panel);

    const formatValue = (value) => (typeof value === 'number' ? value.toFixed(2) : '0.00');

    const formatDuration = (ms) => {
        if (!Number.isFinite(ms) || ms <= 0) {
            return '0s';
        }
        const totalSeconds = Math.max(0, Math.floor(ms / 1000));
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        if (minutes > 0) {
            return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
        }
        return `${seconds}s`;
    };

    const isApproxEqual = (a, b, tolerance = 0.005) => Math.abs(a - b) <= tolerance;

    const determinePresetKey = (config) => {
        if (!config) {
            return 'custom';
        }
        return Object.entries(PRESET_CONFIGS).reduce((matched, [key, preset]) => {
            if (matched !== 'custom' || !preset.config) {
                return matched;
            }
            const tolerance = key === 'default' ? 0.005 : 0.015;
            const matches = Object.entries(preset.config).every(([thresholdKey, thresholdValue]) => {
                if (thresholdValue == null) {
                    return true;
                }
                const comparisonTolerance = thresholdKey === 'intervalWarningMs' ? 25 : tolerance;
                return isApproxEqual(config[thresholdKey] ?? 0, thresholdValue, comparisonTolerance);
            });
            return matches ? key : matched;
        }, 'custom');
    };

    const syncPresetSelection = () => {
        const { config } = ReactiveVisualizerInspector.getContinuityProfileInfo();
        presetSelect.value = determinePresetKey(config);
    };

    const syncContinuityInputs = () => {
        const { config } = ReactiveVisualizerInspector.getContinuityProfileInfo();
        Object.entries(thresholdInputs).forEach(([key, input]) => {
            if (!input) {
                return;
            }
            const value = config[key];
            if (value == null) {
                input.value = '';
                return;
            }
            if (key === 'intervalWarningMs') {
                input.value = String(Math.round(value));
            } else {
                input.value = Number(value).toFixed(2);
            }
        });
        syncPresetSelection();
    };

    const renderContinuityProfile = () => {
        const { profile, config } = ReactiveVisualizerInspector.getContinuityProfileInfo();
        const label = profile === 'base'
            ? 'Base Defaults'
            : (profile === 'default' ? 'Global Override' : `Profile: ${profile}`);
        continuityModeRow.valueEl.textContent = label;
        const rotationThreshold = Number(config.rotationJitterThreshold ?? 0).toFixed(2);
        const audioThreshold = Number(config.audioSpikeThreshold ?? 0).toFixed(2);
        const rotationStill = Number(config.rotationStillnessTolerance ?? 0).toFixed(2);
        const audioStill = Number(config.audioStillnessTolerance ?? 0).toFixed(2);
        const interval = Math.round(Number(config.intervalWarningMs ?? 0));
        continuityThresholdRow.valueEl.textContent = `Δrot>${rotationThreshold} · Δaudio>${audioThreshold} · rot≤${rotationStill} · audio≤${audioStill} · gap>${interval}ms`;
        continuityThresholdRow.valueEl.style.fontFamily = 'monospace';
        continuityThresholdRow.valueEl.style.letterSpacing = '0.05em';
        continuitySummaryPreset.textContent = profile === 'base'
            ? 'BASE'
            : (profile === 'default' ? 'GLOBAL' : profile.toUpperCase());
    };

    const renderSessionInfo = (info) => {
        if (!info) {
            sessionRow.valueEl.textContent = 'Inactive';
            sessionStatsRow.valueEl.textContent = '—';
            return;
        }
        sessionRow.valueEl.textContent = info.label || info.id;
        sessionStatsRow.valueEl.textContent = `${info.sampleCount ?? 0} frames · ${formatDuration(info.durationMs ?? 0)}`;
    };

    const renderSummary = (summary) => {
        if (!summary) {
            visualizerRow.valueEl.textContent = 'Waiting for render…';
            stageRow.valueEl.textContent = '—';
            dominantRow.valueEl.textContent = '—';
            rotationRow.valueEl.textContent = '—';
            audioRow.valueEl.textContent = '—';
            geometryRow.valueEl.textContent = '—';
            variantRow.valueEl.textContent = '—';
            warningsRow.valueEl.textContent = 'None';
            warningsRow.valueEl.style.color = '#9de5ff';
            continuityRow.valueEl.textContent = 'Stable · awaiting history';
            continuityRow.valueEl.style.color = '#9de5ff';
            rollingRow.valueEl.textContent = 'No history yet';
            return;
        }

        const rotationValues = summary.rotation?.values || {};
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

    const renderContinuity = (summary) => {
        const metrics = ReactiveVisualizerInspector.getContinuityMetrics();
        const latestContinuity = summary?.continuity;

        if ((!metrics.samples && !(latestContinuity?.hasPrevious))) {
            continuityRow.valueEl.textContent = 'Stable · awaiting history';
            continuityRow.valueEl.style.color = '#9de5ff';
            renderContinuityProfile();
            return;
        }

        const interval = latestContinuity?.hasPrevious
            ? latestContinuity.intervalMs
            : metrics.lastIntervalMs;
        const rotationDelta = latestContinuity?.hasPrevious
            ? latestContinuity.rotationDelta
            : metrics.lastRotationDelta;
        const audioDelta = latestContinuity?.hasPrevious
            ? latestContinuity.audioDelta
            : metrics.lastAudioDelta;

        const normalizedRotationDelta = Number.isFinite(rotationDelta) ? rotationDelta : 0;
        const normalizedAudioDelta = Number.isFinite(audioDelta) ? audioDelta : 0;
        const avgIntervalMs = metrics.samples ? Math.round(metrics.averageIntervalMs) : 0;
        const latestIntervalText = Number.isFinite(interval) && interval > 0
            ? `${Math.round(interval)}ms`
            : '—';
        const avgIntervalText = metrics.samples ? `${avgIntervalMs}ms` : '—';
        const jitterEvents = metrics.rotationJitterEvents;
        const lagEvents = metrics.audioLagEvents;
        const gapEvents = metrics.intervalAnomalies;
        const alertCount = latestContinuity?.hasPrevious ? (latestContinuity.warnings?.length ?? 0) : 0;

        continuityRow.valueEl.textContent = `${latestIntervalText} latest · avg ${avgIntervalText} · Δrot ${formatValue(normalizedRotationDelta)} · Δaudio ${formatValue(normalizedAudioDelta)} · jitter ${jitterEvents} · lag ${lagEvents} · gaps ${gapEvents} · alerts ${alertCount}`;

        const hasIssues = Boolean(
            (latestContinuity && (latestContinuity.jitter || latestContinuity.lag || latestContinuity.intervalAnomaly))
            || jitterEvents
            || lagEvents
            || gapEvents
            || alertCount
        );
        continuityRow.valueEl.style.color = hasIssues ? '#ffb86c' : '#9de5ff';
        renderContinuityProfile();
    };

    const renderRolling = (size) => {
        const metrics = ReactiveVisualizerInspector.computeRollingMetrics(size);
        if (!metrics.sampleSize) {
            rollingRow.valueEl.textContent = 'No history yet';
            return;
        }
        const rotationAverage = formatValue(metrics.rotationMagnitude.average);
        const audioAverage = (metrics.audioSupportAverage * 100).toFixed(0);
        const warningPercent = (metrics.warningRate * 100).toFixed(0);
        const dominantAxis = Object.entries(metrics.dominantAxisFrequency)
            .sort(([, a], [, b]) => b - a)[0]?.[0] || 'n/a';
        rollingRow.valueEl.textContent = `${metrics.sampleSize} frames · rot ${rotationAverage} · audio ${audioAverage}% · warn ${warningPercent}% · axis ${dominantAxis}`;
    };

    let isPaused = false;
    let pendingSummary = null;
    let latestSummary = null;
    let currentSampleSize = Math.max(1, Math.floor(sampleSize));
    let sessionInfo = null;
    let sessionTicker = null;
    let sessionLabelEditing = false;

    const stopSessionTicker = () => {
        if (sessionTicker) {
            clearInterval(sessionTicker);
            sessionTicker = null;
        }
    };

    const refreshSessionTicker = () => {
        stopSessionTicker();
        if (!sessionInfo || sessionInfo.endedAt) {
            return;
        }
        sessionTicker = setInterval(() => {
            const latest = ReactiveVisualizerInspector.getSessionInfo();
            sessionInfo = latest;
            renderSessionInfo(latest);
        }, 1000);
    };

    const onSessionUpdate = (info) => {
        sessionInfo = info;
        renderSessionInfo(info);
        if (!sessionLabelEditing) {
            sessionLabelInput.value = info?.label ?? '';
        }
        refreshSessionTicker();
    };

    const update = (summary) => {
        latestSummary = summary;
        if (isPaused) {
            pendingSummary = summary;
            return;
        }
        renderSummary(summary);
        renderRolling(currentSampleSize);
        renderContinuity(summary);
    };

    const unsubscribe = ReactiveVisualizerInspector.addListener(update);
    const removeSessionListener = ReactiveVisualizerInspector.addSessionListener(onSessionUpdate);

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

    let copyResetTimeout = null;
    let csvResetTimeout = null;
    let reportResetTimeout = null;

    const teardown = () => {
        unsubscribe();
        removeSessionListener();
        clearTimeout(copyResetTimeout);
        clearTimeout(csvResetTimeout);
        clearTimeout(reportResetTimeout);
        stopSessionTicker();
        if (typeof window !== 'undefined' && window.VIB34D_DEBUG?.reactiveInspector) {
            delete window.VIB34D_DEBUG.reactiveInspector.panelElement;
        }
        if (panel.isConnected) {
            panel.remove();
        }
    };

    closeBtn.addEventListener('click', teardown);

    const resetCopyLabel = () => {
        copyBtn.textContent = 'Copy JSON';
    };

    const resetCsvLabel = () => {
        csvBtn.textContent = 'Download CSV';
    };

    const resetReportLabel = () => {
        reportBtn.textContent = 'Report';
    };

    pauseBtn.addEventListener('click', () => {
        isPaused = !isPaused;
        pauseBtn.textContent = isPaused ? 'Resume' : 'Pause';
        pauseBtn.setAttribute('aria-pressed', String(isPaused));
        setPauseButtonTheme(isPaused);
        if (!isPaused && pendingSummary) {
            renderSummary(pendingSummary);
            renderRolling(currentSampleSize);
            renderContinuity(pendingSummary);
            pendingSummary = null;
        }
    });

    copyBtn.addEventListener('click', async () => {
        const history = ReactiveVisualizerInspector.getHistory();
        if (!history.length) {
            copyBtn.textContent = 'No data';
            clearTimeout(copyResetTimeout);
            copyResetTimeout = setTimeout(resetCopyLabel, 1200);
            return;
        }
        const payload = JSON.stringify(history, null, 2);
        let copied = false;
        if (navigator?.clipboard?.writeText) {
            try {
                await navigator.clipboard.writeText(payload);
                copied = true;
            } catch (error) {
                console.warn('ReactiveInspectorPanel clipboard write failed:', error);
            }
        }
        if (!copied) {
            const blob = new Blob([payload], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const tempLink = document.createElement('a');
            tempLink.href = url;
            tempLink.download = 'reactive-inspector-history.json';
            document.body.appendChild(tempLink);
            tempLink.click();
            tempLink.remove();
            URL.revokeObjectURL(url);
            copied = true;
        }
        if (copied) {
            copyBtn.textContent = 'Copied!';
            clearTimeout(copyResetTimeout);
            copyResetTimeout = setTimeout(resetCopyLabel, 1600);
        }
    });

    csvBtn.addEventListener('click', async () => {
        const history = ReactiveVisualizerInspector.getHistory();
        if (!history.length) {
            csvBtn.textContent = 'No data';
            clearTimeout(csvResetTimeout);
            csvResetTimeout = setTimeout(resetCsvLabel, 1200);
            return;
        }

        const csv = ReactiveVisualizerInspector.exportContinuityCSV({ history });
        let exported = false;

        if (navigator?.clipboard?.writeText) {
            try {
                await navigator.clipboard.writeText(csv);
                exported = true;
                csvBtn.textContent = 'CSV Copied!';
            } catch (error) {
                console.warn('ReactiveInspectorPanel CSV clipboard write failed:', error);
            }
        }

        if (!exported) {
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const tempLink = document.createElement('a');
            tempLink.href = url;
            tempLink.download = 'reactive-inspector-continuity.csv';
            document.body.appendChild(tempLink);
            tempLink.click();
            tempLink.remove();
            URL.revokeObjectURL(url);
            exported = true;
            csvBtn.textContent = 'CSV Saved!';
        }

        if (exported) {
            clearTimeout(csvResetTimeout);
            csvResetTimeout = setTimeout(resetCsvLabel, 2000);
        }
    });

    reportBtn.addEventListener('click', async () => {
        const history = ReactiveVisualizerInspector.getHistory();
        if (!history.length) {
            reportBtn.textContent = 'No data';
            clearTimeout(reportResetTimeout);
            reportResetTimeout = setTimeout(resetReportLabel, 1200);
            return;
        }

        const report = ReactiveVisualizerInspector.generateReport({
            sampleSize: currentSampleSize,
            includeHistory: true
        });

        const payload = JSON.stringify(report, null, 2);
        let exported = false;

        if (navigator?.clipboard?.writeText) {
            try {
                await navigator.clipboard.writeText(payload);
                exported = true;
                reportBtn.textContent = 'Report Copied!';
            } catch (error) {
                console.warn('ReactiveInspectorPanel report clipboard write failed:', error);
            }
        }

        if (!exported) {
            const blob = new Blob([payload], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const tempLink = document.createElement('a');
            tempLink.href = url;
            tempLink.download = 'reactive-inspector-report.json';
            document.body.appendChild(tempLink);
            tempLink.click();
            tempLink.remove();
            URL.revokeObjectURL(url);
            exported = true;
            reportBtn.textContent = 'Report Saved!';
        }

        if (exported) {
            clearTimeout(reportResetTimeout);
            reportResetTimeout = setTimeout(resetReportLabel, 2000);
        }
    });

    clearBtn.addEventListener('click', () => {
        ReactiveVisualizerInspector.clearHistory();
        latestSummary = null;
        pendingSummary = null;
        renderSummary(null);
        renderRolling(currentSampleSize);
        renderContinuity(null);
    });

    sampleInput.addEventListener('change', () => {
        const nextValue = Number(sampleInput.value);
        if (!Number.isFinite(nextValue) || nextValue <= 0) {
            sampleInput.value = String(currentSampleSize);
            return;
        }
        currentSampleSize = Math.max(1, Math.floor(nextValue));
        sampleInput.value = String(currentSampleSize);
        if (!isPaused) {
            renderRolling(currentSampleSize);
        }
    });

    presetSelect.addEventListener('change', () => {
        const selected = presetSelect.value;
        if (selected === 'custom') {
            return;
        }
        ReactiveVisualizerInspector.resetContinuityThresholds();
        if (selected !== 'default') {
            const preset = PRESET_CONFIGS[selected];
            if (preset?.config) {
                ReactiveVisualizerInspector.updateContinuityThresholds(preset.config);
            }
        }
        syncContinuityInputs();
        renderContinuity(latestSummary);
        if (!isPaused) {
            renderRolling(currentSampleSize);
        }
    });

    const handleThresholdChange = (event) => {
        const target = event?.target;
        const key = target?.dataset?.key;
        if (!key) {
            return;
        }
        const value = Number(target.value);
        if (!Number.isFinite(value)) {
            return;
        }
        const normalized = key === 'intervalWarningMs'
            ? Math.max(0, Math.round(value))
            : Math.max(0, value);
        ReactiveVisualizerInspector.updateContinuityThresholds({ [key]: normalized });
        presetSelect.value = 'custom';
        syncContinuityInputs();
        renderContinuity(latestSummary);
        if (!isPaused) {
            renderRolling(currentSampleSize);
        }
    };

    Object.values(thresholdInputs).forEach((input) => {
        input?.addEventListener('change', handleThresholdChange);
        input?.addEventListener('blur', handleThresholdChange);
    });

    renderRolling(currentSampleSize);
    syncContinuityInputs();
    renderContinuity(latestSummary);
    if (!latestSummary) {
        renderSummary(null);
    }

    const initialSession = ReactiveVisualizerInspector.getSessionInfo();
    renderSessionInfo(initialSession);
    if (initialSession) {
        sessionInfo = initialSession;
        sessionLabelInput.value = initialSession.label || '';
        refreshSessionTicker();
    }

    sessionLabelInput.addEventListener('focus', () => {
        sessionLabelEditing = true;
    });

    sessionLabelInput.addEventListener('blur', () => {
        sessionLabelEditing = false;
        const value = sessionLabelInput.value.trim();
        if (value) {
            ReactiveVisualizerInspector.updateSession({ label: value });
        } else if (sessionInfo?.label) {
            sessionLabelInput.value = sessionInfo.label;
        }
    });

    sessionLabelInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            sessionLabelInput.blur();
        }
    });

    newSessionBtn.addEventListener('click', () => {
        const label = sessionLabelInput.value.trim();
        const nextSession = ReactiveVisualizerInspector.beginSession({ label, resetHistory: true });
        sessionInfo = nextSession;
        latestSummary = null;
        pendingSummary = null;
        renderSummary(null);
        renderRolling(currentSampleSize);
        renderContinuity(null);
        if (!sessionLabelEditing) {
            sessionLabelInput.value = nextSession?.label ?? '';
        }
        refreshSessionTicker();
    });

    return teardown;
}

export default installReactiveInspectorPanel;

