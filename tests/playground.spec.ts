import { test, expect } from './fixtures';

test('opens the album playground', async ({ page }) => {
  await page.goto('http://127.0.0.1:3000');

  await expect(
    page.getByRole('heading', {
      name: 'Album Filter Playground',
      exact: true,
    }),
  ).toBeVisible();
});
