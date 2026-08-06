const { expect } = require('@playwright/test');

exports.HelpSupport = class HelpSupport {

    /**
     * @param {import('@playwright/test').Page} page
     */

    constructor(page) {
        this.page = page;
    }

    // Go to the Help & Support section from the sidebar
    async open(){
        await this.page.locator('#tabmenu-help-support').click();
    }

    // Verify the Help & Support page opened without any issues
    async verifyPageOpened(){
        await expect(this.page.locator('.tab-header h3')).toHaveText('Help & Support');
    }

}
