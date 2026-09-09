import { test, expect } from './fixtures';
import { openFilter, toggleFilter } from './helpers';
import {
  albumCards, expectAlbums, filterInput, filterPanel, prepareSearchDataset, searchTitles,
} from './playground-helpers';

test.beforeEach(async ({ page, context }) => {
  await prepareSearchDataset(page);
  await openFilter(page, context);
  await expectAlbums(page, searchTitles, 20);
});

const searches = [
  { name: 'ignores case and extra whitespace', query: '  lAs   vEgAs  ', indexes: [0, 2, 3] },
  { name: 'requires all words regardless of order', query: 'birthday my', indexes: [0, 1, 4] },
  { name: 'matches a double-quoted phrase within a title', query: '"my birthday"', indexes: [0, 4] },
  { name: 'matches a single-quoted phrase within a title', query: "'my birthday'", indexes: [0, 4] },
];

for (const { name, query, indexes } of searches) {
  test(name, async ({ page }) => {
    await filterInput(page).fill(query);
    await expectAlbums(page, indexes.map(index => searchTitles[index]), 20);
    await expect(page.locator('[data-af-system-card="create"]')).toBeVisible();
  });
}

test('changing the query brings previously hidden albums back', async ({ page }) => {
  await filterInput(page).fill('"my birthday"');
  await expectAlbums(page, [searchTitles[0], searchTitles[4]], 20);
  await filterInput(page).fill('orange');
  await expectAlbums(page, [searchTitles[7]], 20);
});

test('clear restores every album and returns focus to the input', async ({ page }) => {
  const clear = page.getByRole('button', { name: 'Clear filter', exact: true });
  await expect(clear).toBeDisabled();
  await filterInput(page).fill('orange');
  await expectAlbums(page, [searchTitles[7]], 20);
  await clear.click();
  await expect(filterInput(page)).toHaveValue('');
  await expect(filterInput(page)).toBeFocused();
  await expect(clear).toBeDisabled();
  await expect(page.locator('[data-af-album-card]:visible')).toHaveCount(20);
  await expect(page.locator('[data-af-album-card]:visible [data-af-album-title]'))
    .toHaveText(searchTitles);
  await expect(page.locator('#album-filter-inline-notice')).toHaveCount(0);
});

test('a whitespace-only query restores every album', async ({ page }) => {
  await filterInput(page).fill('orange');
  await expectAlbums(page, [searchTitles[7]], 20);
  await filterInput(page).fill('   ');
  await expectAlbums(page, searchTitles, 20);
});

test('zero matches hides all albums and explains the empty result', async ({ page }) => {
  await filterInput(page).fill('no-such-album-987654');
  await expectAlbums(page, [], 20);
  await expect(page.locator('[data-af-system-card="create"]')).toBeVisible();
  await expect(page.locator('#album-filter-inline-notice'))
    .toContainText('No matching albums in loaded list (0 of 20 loaded).');
});

for (const method of ['close button', 'Escape', 'extension action']) {
  test(`${method} restores albums and allows immediate reopening`, async ({ page, context }) => {
    await filterInput(page).fill('orange');
    await expectAlbums(page, [searchTitles[7]], 20);

    if (method === 'close button') {
      await page.getByRole('button', { name: 'Close panel', exact: true }).click();
    } else if (method === 'Escape') {
      await filterInput(page).press('Escape');
    } else {
      await toggleFilter(page, context);
    }

    await expect(filterPanel(page)).toHaveCount(0);
    await expect(page.locator('[data-af-album-card]:visible')).toHaveCount(20);
    await expect(page.locator('#album-filter-inline-notice')).toHaveCount(0);
    await expect(albumCards(page).first()).toHaveCSS('opacity', '1');

    await openFilter(page, context);
    await expect(filterInput(page)).toHaveValue('');
    await expect(filterInput(page)).toBeFocused();
    await expectAlbums(page, searchTitles, 20);
    await expect(filterPanel(page).getByRole('button', { name: 'Stop', exact: true }))
      .toBeDisabled();
  });
}
