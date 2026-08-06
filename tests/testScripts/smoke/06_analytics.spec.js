const { test, expect } = require('@playwright/test');
const { Analytics } = require('../../pages/analytics');

test('Analytics page opens without any issues', async ({ page }) => {
    const analytics = new Analytics(page);

    await page.goto('/tags');
    // Make sure the app has finished hydrating before clicking a sidebar tab.
    await expect(page.locator('.tab-header h3')).toHaveText('Tag Library');
    await analytics.open();
    await analytics.verifyPageOpened();
});
