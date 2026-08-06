const { test, expect } = require('@playwright/test');
const { SecureTags } = require('../../pages/secureTags');

test('Secured Tags page opens without any issues', async ({ page }) => {
    const secureTags = new SecureTags(page);

    await page.goto('/tags');
    // Make sure the app has finished hydrating before clicking a sidebar tab.
    await expect(page.locator('.tab-header h3')).toHaveText('Tag Library');
    await secureTags.open();
    await secureTags.verifyPageOpened();
});
