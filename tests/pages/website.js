const { expect } = require('@playwright/test');

exports.website = class website {

    /**
     * @param {import('@playwright/test').Page} page
     */

    constructor(page) {
        this.page = page;
    }

    // Verifying Website is opened sucessfully
    async verifyWebite(){
        await expect(this.page.locator("//div[@id='webapp-root']//img[contains(@src,'synctag-logo')]").nth(0)).toBeVisible();
    }

    // Click Get Started for free button
    async clickGetStarted(){
        await this.page.getByText("GET STARTED FOR FREE").click();
    }

}