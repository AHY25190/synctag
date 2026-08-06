const { test, expect } = require('@playwright/test');
const { ProfileDetails } = require('../../pages/profileDetails');

test('Profile Details page opens without any issues', async ({ page }) => {
    const profileDetails = new ProfileDetails(page);

    await page.goto('/tags');
    // Make sure the app has finished hydrating before opening the user menu.
    await expect(page.locator('.tab-header h3')).toHaveText('Tag Library');
    await profileDetails.open();
    await profileDetails.verifyPageOpened();
});
