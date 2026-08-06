const { test, expect } = require('@playwright/test');
const { GlobalTags } = require('../../pages/globalTags');

test('Global Tags page opens without any issues', async ({ page }) => {
    const globalTags = new GlobalTags(page);

    await page.goto('/tags');
    // Make sure the app has finished hydrating before clicking a sidebar tab.
    await expect(page.locator('.tab-header h3')).toHaveText('Tag Library');
    await globalTags.open();
    await globalTags.verifyPageOpened();
});
