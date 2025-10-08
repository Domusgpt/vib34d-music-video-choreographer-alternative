// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Timeline Adaptive Panel Coverage
 *
 * Ensures the metadata-driven timeline editor toggles correctly and
 * that newly added sequences adopt the shared SystemMetadata defaults.
 */

test.describe('Timeline adaptive panel', () => {
  test('toggles timeline editor and applies metadata defaults to new sequences', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const hybridModeButton = page.getByRole('button', { name: /HYBRID MODE/i });
    await expect(hybridModeButton).toBeVisible();
    await hybridModeButton.click();

    const timelineEditor = page.locator('#timeline-editor');
    await expect(timelineEditor).toHaveClass(/active/);

    const toggleButton = page.locator('#timelineEditorToggle');
    await expect(toggleButton).toHaveAttribute('aria-pressed', 'true');

    // Toggle closed then reopen to confirm accessibility hooks remain intact
    await toggleButton.click();
    await expect(timelineEditor).not.toHaveClass(/active/);
    await expect(toggleButton).toHaveAttribute('aria-pressed', 'false');

    await toggleButton.click();
    await expect(timelineEditor).toHaveClass(/active/);
    await expect(toggleButton).toHaveAttribute('aria-pressed', 'true');

    const blankTimelineButton = page.locator('#timelinePresetList button[data-action-id="blank-timeline"]');
    await expect(blankTimelineButton).toBeVisible();
    await blankTimelineButton.click();

    const sequenceItems = page.locator('#sequence-list .sequence-item');
    await expect(sequenceItems).toHaveCount(0, { timeout: 15000 });

    const addSequenceButton = page.locator('#timelineEditorActions button[data-action-id="add-sequence"]');
    await expect(addSequenceButton).toBeVisible();
    await addSequenceButton.click();

    await expect(sequenceItems).toHaveCount(1, { timeout: 15000 });

    const sequence = sequenceItems.first();

    await expect(sequence.locator('label:has-text("Start Time") + input')).toHaveValue(/^(0|0\.0+)$/);
    await expect(sequence.locator('label:has-text("Duration") + input')).toHaveValue(/^12(\.0+)?$/);
    await expect(sequence.locator('label:has-text("System") + select')).toHaveValue('faceted');
    await expect(sequence.locator('label:has-text("Geometry") + select')).toHaveValue('cycle');
    await expect(sequence.locator('label:has-text("Geometry Audio Axis") + select')).toHaveValue('energy');
    await expect(sequence.locator('label:has-text("Geometry") + select option[value="explosive"]')).toBeVisible();

    const addSequenceForSystem = async (systemKey, expectedIndex, { geometry, duration }) => {
      const systemButton = page.locator(`.system-btn[data-system="${systemKey}"]`);
      await systemButton.click();
      await expect(systemButton).toHaveClass(/active/);

      await addSequenceButton.click();
      await expect(sequenceItems).toHaveCount(expectedIndex + 1, { timeout: 15000 });

      const target = sequenceItems.nth(expectedIndex);
      await expect(target.locator('label:has-text("System") + select')).toHaveValue(systemKey);
      await expect(target.locator('label:has-text("Duration") + input')).toHaveValue(new RegExp(`^${duration}(\\.0+)?$`));
      await expect(target.locator('label:has-text("Geometry") + select')).toHaveValue(geometry);
    };

    await addSequenceForSystem('quantum', 1, { geometry: 'random', duration: 14 });
    await addSequenceForSystem('holographic', 2, { geometry: 'morph', duration: 12 });
    await addSequenceForSystem('polychora', 3, { geometry: 'cycle', duration: 16 });
  });
});
