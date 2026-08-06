const { expect } = require('@playwright/test');

exports.Pipelines = class Pipelines {

    /**
     * @param {import('@playwright/test').Page} page
     */

    constructor(page) {
        this.page = page;
    }

    // Go to the Pipelines section from the sidebar
    async open(){
        await this.page.locator('#tabmenu-pipelines').click();
    }

    // Verify the Pipeline Library page opened without any issues
    async verifyPageOpened(){
        await expect(this.page.locator('.tab-header h3')).toHaveText('Pipeline Library');
    }

}
