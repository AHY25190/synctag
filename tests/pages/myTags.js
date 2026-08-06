const { expect } = require('@playwright/test');

exports.MyTags = class MyTags {

    /**
     * @param {import('@playwright/test').Page} page
     */

    constructor(page) {
        this.page = page;
    }

    // Go to the My Tags section from the sidebar
    async open(){
        await this.page.locator('#tabmenu-macros').click();
    }

    // Verify the My Tags (Tag Library) page opened without any issues
    async verifyPageOpened(){
        await expect(this.page.locator('.tab-header h3')).toHaveText('Tag Library');
    }

    // Click the New Tag button to start creating a tag
    async clickNewTag(){
        await this.page.locator('button.synctag-btn-primary', { hasText: 'New Tag' }).click();
    }

    // Fill in the Create Tag form and save it
    async createTag(trigger, description, content){
        const triggerInput = this.page.locator('#macro-alias');
        const descriptionInput = this.page.locator('#macro-name');

        await triggerInput.fill(trigger);
        await expect(this.page.getByText('Trigger is available')).toBeVisible();
        await descriptionInput.fill(description);
        await this.page.locator('#macro-body-editor .ql-editor').click();
        await this.page.keyboard.type(content);

        // The async trigger-availability check can resolve late and reset whichever field
        // was filled before it settled, so re-fill anything that drifted right before saving.
        for (let attempt = 0; attempt < 3; attempt++) {
            const [triggerValue, descriptionValue] = await Promise.all([
                triggerInput.inputValue(),
                descriptionInput.inputValue(),
            ]);
            if (triggerValue === trigger && descriptionValue === description) {
                break;
            }
            if (triggerValue !== trigger) {
                await triggerInput.fill(trigger);
            }
            if (descriptionValue !== description) {
                await descriptionInput.fill(description);
            }
            await this.page.waitForTimeout(500);
        }
        await this.page.locator('#tageditor-save').click();
    }

    // Verify the tag was created and its card is visible in the Tag Library
    async verifyTagCreated(trigger){
        await expect(this.page.locator('.macro-card').filter({ hasText: `$${trigger}` })).toBeVisible();
    }

    // Delete a tag from its card (shift+click opens the delete confirmation)
    async deleteTag(trigger){
        await this.page.locator('.macro-card').filter({ hasText: `$${trigger}` }).click({ modifiers: ['Shift'] });
        await this.page.locator('.synctag-global-modal__footer button', { hasText: 'Delete' }).click();
    }

    // Verify the tag no longer appears in the Tag Library
    async verifyTagDeleted(trigger){
        await expect(this.page.locator('.macro-card').filter({ hasText: `$${trigger}` })).toHaveCount(0);
    }

}
