const { expect } = require('@playwright/test');

exports.GlobalTags = class GlobalTags {

    /**
     * @param {import('@playwright/test').Page} page
     */

    constructor(page) {
        this.page = page;
    }

    // Go to the Global Tags section from the sidebar
    async open(){
        await this.page.locator('#tabmenu-global-macros').click();
    }

    // Verify the Global Tags page opened without any issues
    async verifyPageOpened(){
        await expect(this.page.locator('.tab-header h3')).toHaveText('Global Tags');
    }

}
