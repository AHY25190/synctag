const { expect } = require('@playwright/test');

exports.ReportIssue = class ReportIssue {

    /**
     * @param {import('@playwright/test').Page} page
     */

    constructor(page) {
        this.page = page;
    }

    // Go to the Report an issue section from the sidebar
    async open(){
        await this.page.locator('#tabmenu-report-issue').click();
    }

    // Verify the Report an issue page opened without any issues
    async verifyPageOpened(){
        await expect(this.page.locator('.tab-header h3')).toHaveText('Report an issue');
    }

}
