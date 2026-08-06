const { test, expect } = require('@playwright/test');
const { ReportIssue } = require('../../pages/reportIssue');

test('Report an issue page opens without any issues', async ({ page }) => {
    const reportIssue = new ReportIssue(page);

    await page.goto('/tags');
    // Make sure the app has finished hydrating before clicking a sidebar tab.
    await expect(page.locator('.tab-header h3')).toHaveText('Tag Library');
    await reportIssue.open();
    await reportIssue.verifyPageOpened();
});
