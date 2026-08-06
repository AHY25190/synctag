const { expect } = require('@playwright/test');

exports.ProfileDetails = class ProfileDetails {

    /**
     * @param {import('@playwright/test').Page} page
     */

    constructor(page) {
        this.page = page;
    }

    // Go to the Profile Details page via the user menu at the bottom of the sidebar
    async open(){
        await this.page.locator('button.user-select').click();
        await this.page.locator('button.user-dropdown-option', { hasText: 'Profile Details' }).click();
    }

    // Verify the Profile Details page opened without any issues
    async verifyPageOpened(){
        await expect(this.page.locator('.tab-item.active')).toHaveText('Profile Details');
        await expect(this.page.locator('.pd-avatar-name')).toBeVisible();
    }

}
