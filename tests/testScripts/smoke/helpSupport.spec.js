const { test, expect } = require('@playwright/test');
const { HelpSupport } = require('../../pages/helpSupport');

test('Help & Support page opens without any issues', async ({ page }) => {
    const helpSupport = new HelpSupport(page);

    await page.goto('/tags');
    // Make sure the app has finished hydrating before clicking a sidebar tab.
    await expect(page.locator('.tab-header h3')).toHaveText('Tag Library');
    await helpSupport.open();
    await helpSupport.verifyPageOpened();
});
