import { test, expect } from './fixtures';
import { openFilter } from './helpers';
import {
  albumCards, expectAlbums, filterInput, filterPanel, preparePlayground, prepareSearchDataset,
} from './playground-helpers';

for (const autoLoad of [false, true]) {
  test(`new playground cards start dim and matches become opaque (Auto-load ${autoLoad ? 'on' : 'off'})`, async ({ page, context }) => {
    await preparePlayground(page, { total: 48, batch: 24, delay: 300 });
    await openFilter(page, context);
    const firstTitles = await page.locator('[data-af-album-title]').allTextContents();
    await filterInput(page).fill('a');
    await expectAlbums(page, firstTitles.filter(title => /a/i.test(title)), 24);
    await expect(page.locator('[data-af-system-card="create"]')).toHaveCSS('opacity', '1');

    // Observe the actual playground batch insertion, before the extension's debounced scan.
    await page.evaluate(() => {
      const grid = document.querySelector<HTMLElement>('[data-af-album-grid]')!;
      grid.dataset.testPendingStyles = '[]';
      const observer = new MutationObserver(records => {
        const cards = records.flatMap(record => Array.from(record.addedNodes))
          .filter((node): node is HTMLElement => node instanceof HTMLElement && node.hasAttribute('data-af-album-card'));
        if (!cards.length) return;
        grid.dataset.testPendingStyles = JSON.stringify(cards.map(card => ({
          title: card.querySelector('[data-af-album-title]')?.textContent || '',
          opacity: Number(getComputedStyle(card).opacity),
          visible: card.getClientRects().length > 0,
        })));
        observer.disconnect();
      });
      observer.observe(grid, { childList: true });
    });

    if (autoLoad) {
      await filterPanel(page).getByRole('button', { name: 'Auto-load', exact: true }).click();
    } else {
      await page.getByRole('button', { name: 'Load next batch', exact: true }).click();
    }
    await expect(albumCards(page)).toHaveCount(48);
    const samples: { title: string; opacity: number; visible: boolean }[] = JSON.parse(
      (await page.locator('[data-af-album-grid]').getAttribute('data-test-pending-styles'))!,
    );
    expect(samples).toHaveLength(24);
    expect(samples.some(card => /a/i.test(card.title))).toBe(true);
    expect(samples.some(card => !/a/i.test(card.title))).toBe(true);
    for (const sample of samples) {
      expect(sample.visible, `${sample.title} should initially occupy layout space`).toBe(true);
      expect(sample.opacity, `${sample.title} should be dim on arrival`).toBeLessThan(1);
      expect(sample.opacity).toBeGreaterThan(0);
    }

    const titles = await page.locator('[data-af-album-title]').allTextContents();
    const matches = titles.filter(title => /a/i.test(title));
    await expect(page.locator('[data-af-album-card]:visible [data-af-album-title]')).toHaveText(matches);
    for (const card of await page.locator('[data-af-album-card]:visible').all()) {
      await expect(card).toHaveCSS('opacity', '1');
    }
    await expect(page.locator('[data-af-system-card="create"]')).toHaveCSS('opacity', '1');
    if (autoLoad) {
      await expect(filterPanel(page).getByRole('button', { name: 'Stop', exact: true }))
        .toBeDisabled({ timeout: 8000 });
    }
  });
}

for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
  test(`compact playground layout restores after clearing at ${viewport.width}px`, async ({ page, context }) => {
    await page.setViewportSize(viewport);
    await prepareSearchDataset(page);
    const grid = page.locator('[data-af-album-grid]');
    const originalColumns = await grid.evaluate(node => getComputedStyle(node).gridTemplateColumns);
    await openFilter(page, context);
    await filterInput(page).fill('orange');
    await expectAlbums(page, ['Orange, 2025'], 20);

    const create = await page.locator('[data-af-system-card="create"]').boundingBox();
    const match = await page.locator('[data-af-album-card]:visible').boundingBox();
    expect(create).not.toBeNull();
    expect(match).not.toBeNull();
    if (viewport.width > 640) {
      expect(Math.abs(match!.y - create!.y)).toBeLessThan(1);
      expect(Math.abs(match!.x - (create!.x + create!.width))).toBeLessThan(1);
    } else {
      expect(Math.abs(match!.x - create!.x)).toBeLessThan(1);
      expect(match!.y).toBeGreaterThan(create!.y);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    await page.getByRole('button', { name: 'Clear filter', exact: true }).click();
    await expect(page.locator('[data-af-album-card]:visible')).toHaveCount(20);
    await expect(grid).toHaveCSS('grid-template-columns', originalColumns);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}
