const { expect } = require('@playwright/test');

// Some of these assertions run alongside heavier tests (persistent extension contexts),
// so they get a longer timeout to stay reliable under that extra resource contention.
const TIMEOUT = { timeout: 60000 };

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
        await expect(this.page.locator('.tab-header h3')).toHaveText('Tag Library', TIMEOUT);
    }

    // Click the New Tag button to start creating a tag
    async clickNewTag(){
        await this.page.locator('button.synctag-btn-primary', { hasText: 'New Tag' }).click();
    }

    // Switch the Create Tag form to a given type: Text, Form, AI, API, File, Authenticator or Browser
    async selectTagType(type){
        await this.page.locator('label.type-selector-label', { hasText: type }).click();
    }

    // Clear any lingering text selection. Filling inputs (and Ctrl+A in the rich-text
    // editor) can leave a selection that survives the SPA's client-side navigation and
    // re-triggers the extension's floating text-selection bubble on a later page,
    // intercepting clicks there.
    async clearSelection(){
        await this.page.evaluate(() => window.getSelection().removeAllRanges());
    }

    // Fill the Trigger and Description fields shared by every tag type
    async fillTriggerAndDescription(trigger, description){
        const triggerInput = this.page.locator('#macro-alias');
        const descriptionInput = this.page.locator('#macro-name');

        await triggerInput.fill(trigger);
        await expect(this.page.getByText('Trigger is available')).toBeVisible(TIMEOUT);
        await descriptionInput.fill(description);
    }

    // Save the tag, re-filling Trigger/Description first if a late async check reset them
    async saveTag(trigger, description){
        const triggerInput = this.page.locator('#macro-alias');
        const descriptionInput = this.page.locator('#macro-name');

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
        await this.clearSelection();
        await this.page.locator('#tageditor-save').click();
    }

    // Create a Text tag with rich-text content
    async createTextTag(trigger, description, content){
        await this.fillTriggerAndDescription(trigger, description);
        await this.page.locator('#macro-body-editor .ql-editor').click();
        await this.page.keyboard.type(content);
        await this.saveTag(trigger, description);
    }

    // Create an AI tag with a prompt template
    async createAiTag(trigger, description, promptData){
        await this.fillTriggerAndDescription(trigger, description);
        await this.selectTagType('AI');
        await this.page.locator('#macro-prompt-data-editor').fill(promptData);
        await this.saveTag(trigger, description);
    }

    // Create an API tag by calling a real endpoint and saving the tested response
    async createApiTag(trigger, description, method, url){
        await this.fillTriggerAndDescription(trigger, description);
        await this.selectTagType('API');
        await this.page.locator('#api-method').click();
        await this.page.locator('.api-method-option', { hasText: method }).click();
        await this.page.locator('#api-url').fill(url);
        await this.page.locator('#api-test-btn').click();
        await expect(this.page.locator('#api-response-preview')).toContainText('200 OK', TIMEOUT);
        await this.saveTag(trigger, description);
    }

    // Create a File tag by uploading a file from disk
    async createFileTag(trigger, description, filePath){
        await this.fillTriggerAndDescription(trigger, description);
        await this.selectTagType('File');
        await this.page.locator('#filetag-file-input-inline').setInputFiles(filePath);
        await this.saveTag(trigger, description);
    }

    // Verify the tag was created and its card is visible in the Tag Library, optionally
    // checking the type badge (Text, AI, API, File, ...) shown on the card
    async verifyTagCreated(trigger, type){
        const card = this.page.locator('.macro-card').filter({ hasText: `$${trigger}` });
        await expect(card).toBeVisible(TIMEOUT);
        if (type) {
            await expect(card.locator('.macro-type')).toHaveText(new RegExp(type, 'i'), TIMEOUT);
        }
    }

    // Open a tag's editor by clicking its name in the Tag Library. Reloads first, since a
    // freshly created card's click handler isn't reliably attached until after a reload.
    async openTagEditor(trigger){
        await this.page.reload({ waitUntil: 'domcontentloaded' });
        await this.verifyPageOpened();
        await this.page.locator('.macro-card').filter({ hasText: `$${trigger}` }).locator('h3.macro-name').click();
        await expect(this.page.locator('h2')).toHaveText('Edit Tag', TIMEOUT);
    }

    // Apply an edit and save it, confirming the card reflects the new description
    // afterwards. The app occasionally drops an update silently, so this reopens the
    // editor and retries the whole edit when the card doesn't reflect it in time.
    async editAndSave(trigger, description, applyEdit){
        const card = this.page.locator('.macro-card').filter({ hasText: `$${trigger}` });

        for (let attempt = 1; attempt <= 3; attempt++) {
            await applyEdit();
            await this.saveTag(trigger, description);
            try {
                await expect(card.locator('.macro-trigger-value')).toHaveText(description, { timeout: 20000 });
                return;
            } catch (error) {
                if (attempt === 3) {
                    throw error;
                }
                // A hard reload (not just an in-app navigation back to the editor) clears
                // whatever stuck state caused the update to silently not persist.
                await this.page.reload({ waitUntil: 'domcontentloaded' });
                await this.verifyPageOpened();
                await card.locator('h3.macro-name').click();
                await expect(this.page.locator('h2')).toHaveText('Edit Tag', TIMEOUT);
            }
        }
    }

    // Update a Text tag's description and content, then save
    async editTextTag(trigger, description, content){
        await this.editAndSave(trigger, description, async () => {
            await this.page.locator('#macro-name').fill(description);
            await this.page.locator('#macro-body-editor .ql-editor').click();
            await this.page.keyboard.press('Control+A');
            await this.page.keyboard.type(content);
            await this.clearSelection();
        });
    }

    // Update an AI tag's description and prompt data, then save
    async editAiTag(trigger, description, promptData){
        await this.editAndSave(trigger, description, async () => {
            await this.page.locator('#macro-name').fill(description);
            await this.page.locator('#macro-prompt-data-editor').fill(promptData);
        });
    }

    // Update an API tag's description and URL, re-run the test call, then save
    async editApiTag(trigger, description, url){
        await this.editAndSave(trigger, description, async () => {
            await this.page.locator('#macro-name').fill(description);
            await this.page.locator('#api-url').fill(url);
            await this.page.locator('#api-test-btn').click();
            await expect(this.page.locator('#api-response-preview')).toContainText('200 OK', TIMEOUT);
        });
    }

    // Update a File tag's description and attach another file, then save
    async editFileTag(trigger, description, filePath){
        await this.editAndSave(trigger, description, async () => {
            await this.page.locator('#macro-name').fill(description);
            await this.page.locator('#filetag-file-input-inline').setInputFiles(filePath);
        });
    }

    // Verify a tag's card reflects its updated description
    async verifyTagUpdated(trigger, description){
        const card = this.page.locator('.macro-card').filter({ hasText: `$${trigger}` });
        await expect(card.locator('.macro-trigger-value')).toHaveText(description, TIMEOUT);
    }

    // Delete a tag from its card (shift+click opens the delete confirmation)
    async deleteTag(trigger){
        await this.clearSelection();
        await this.page.locator('.macro-card').filter({ hasText: `$${trigger}` }).click({ modifiers: ['Shift'] });
        await this.page.locator('.synctag-global-modal__footer button', { hasText: 'Delete' }).click();
    }

    // Verify the tag no longer appears in the Tag Library
    async verifyTagDeleted(trigger){
        await expect(this.page.locator('.macro-card').filter({ hasText: `$${trigger}` })).toHaveCount(0, TIMEOUT);
    }

}
