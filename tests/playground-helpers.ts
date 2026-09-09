import type { Page } from '@playwright/test';
import { expect } from './fixtures';

export const albumCards = (page: Page) => page.locator('[data-af-album-card]');
export const filterPanel = (page: Page) => page.locator('#album-filter-panel');
export const filterInput = (page: Page) => page.getByPlaceholder('Filter albums by title...');

export const searchTitles = [
  'My birthday in Las Vegas',
  'Birthday with my family',
  'Las Vegas weekend',
  'Vegas memories from Las',
  'MY BIRTHDAY',
  'Birthday picnic',
  'My holiday',
  'Orange, 2025',
  ...Array.from({ length: 12 }, (_, index) => `Archive ${index + 1}`),
];

export async function preparePlayground(
  page: Page,
  { total = 20, batch = 20, delay = 100 } = {},
) {
  await page.goto('http://127.0.0.1:3000');
  // Keep batch tests independent of viewport size and natural infinite scrolling.
  // Manual loading and the playground's real auto-load loop remain unchanged.
  await page.addStyleTag({ content: '#scroll-sentinel { display: none !important; }' });
  await expect(page.locator('[data-af-loading]')).toBeHidden();
  await expect(albumCards(page).first()).toBeVisible();

  await page.getByLabel('Total albums', { exact: true }).fill(String(total));
  await page.getByLabel('Batch size', { exact: true }).fill(String(batch));
  await page.getByLabel('Min load delay (ms)', { exact: true }).fill(String(delay));
  await page.getByLabel('Max load delay (ms)', { exact: true }).fill(String(delay));
  await page.getByLabel('Random seed', { exact: true }).fill('album-filter-poc');
  await page.getByRole('button', { name: 'Generate list', exact: true }).click();
  await expect(albumCards(page)).toHaveCount(Math.min(total, batch));
  await expect(page.locator('[data-af-loading]')).toBeHidden();
}

export async function prepareSearchDataset(page: Page) {
  await preparePlayground(page);
  // Controlled input data, not a replacement for extension filtering logic.
  await page.locator('[data-af-album-title]').evaluateAll((nodes, titles) => {
    nodes.forEach((node, index) => { node.textContent = titles[index]; });
  }, searchTitles);
}

export async function expectAlbums(page: Page, expected: string[], loaded: number) {
  await expect(albumCards(page)).toHaveCount(loaded);
  await expect(page.locator('[data-af-album-card]:visible [data-af-album-title]'))
    .toHaveText(expected);
  await expect(page.locator('[data-af-album-card]:not(:visible)'))
    .toHaveCount(loaded - expected.length);
  await expect(filterPanel(page).locator('.af-status'))
    .toHaveText(new RegExp(`Albums loaded: ${loaded} .*Showing: ${expected.length}$`));
}
