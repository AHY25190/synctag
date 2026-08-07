const { expect } = require('@playwright/test');

// The popup runs inside a heavier persistent-context browser alongside other such tests,
// so its assertions get a longer timeout to stay reliable under that resource contention.
const TIMEOUT = { timeout: 60000 };

exports.SynctagExtension = class SynctagExtension {

    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} extensionId
     */

    constructor(page, extensionId) {
        this.page = page;
        this.extensionId = extensionId;
    }

    // Open the extension's popup UI directly
    async open(){
        await this.page.goto(`chrome-extension://${this.extensionId}/popup/popup.html`);
    }

    // Switch to the My Tags tab in the popup
    async openMyTagsTab(){
        await this.page.locator('.popup-tab', { hasText: 'My Tags' }).click();
    }

    // Search for a tag by trigger or text in the popup's search box
    async searchTag(query){
        await this.page.locator('.search-input').fill(query);
    }

    // Verify a tag with the given trigger is visible, optionally checking its description
    async verifyTagVisible(trigger, description, timeout = TIMEOUT){
        const item = this.page.locator('.macro-item').filter({ hasText: `$${trigger}` });
        await expect(item).toBeVisible(timeout);
        if (description) {
            await expect(item.locator('.macro-name')).toHaveText(description, timeout);
        }
    }

    // Verify a tag with the given trigger is no longer present
    async verifyTagNotVisible(trigger, timeout = TIMEOUT){
        await expect(this.page.locator('.macro-item').filter({ hasText: `$${trigger}` })).toHaveCount(0, timeout);
    }

}
