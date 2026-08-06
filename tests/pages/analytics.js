const { expect } = require('@playwright/test');

exports.Analytics = class Analytics {

    /**
     * @param {import('@playwright/test').Page} page
     */

    constructor(page) {
        this.page = page;
    }

    // Go to the Analytics section from the sidebar
    async open(){
        await this.page.locator('#tabmenu-analytics').click();
    }

    // Verify the Analytics page opened without any issues
    async verifyPageOpened(){
        await expect(this.page.locator('h3.tb-title')).toHaveText('Analytics');
    }

}
