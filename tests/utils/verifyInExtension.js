const { SynctagExtension } = require('../pages/synctagExtension');

// Popup fetches can come back stale/empty under heavy resource contention (several
// extension-loaded browsers running at once), so a plain wait on one popup instance
// isn't enough - each retry opens a brand new popup page to force a fresh fetch.
async function withFreshPopupRetries(context, extensionId, trigger, check, { retries = 5, perAttemptTimeout = 12000 } = {}) {
    let lastError;
    for (let attempt = 1; attempt <= retries; attempt++) {
        const popupPage = await context.newPage();
        const extension = new SynctagExtension(popupPage, extensionId);
        try {
            await extension.open();
            await extension.openMyTagsTab();
            await extension.searchTag(trigger);
            await check(extension, { timeout: perAttemptTimeout });
            return;
        } catch (error) {
            lastError = error;
        } finally {
            await popupPage.close();
        }
    }
    throw lastError;
}

// Verify a tag is visible under My Tags in the extension popup
exports.verifyTagInExtension = async function verifyTagInExtension(context, extensionId, trigger, description){
    await withFreshPopupRetries(context, extensionId, trigger, (extension, timeout) =>
        extension.verifyTagVisible(trigger, description, timeout));
};

// Verify a tag is no longer visible under My Tags in the extension popup
exports.verifyTagNotInExtension = async function verifyTagNotInExtension(context, extensionId, trigger){
    await withFreshPopupRetries(context, extensionId, trigger, (extension, timeout) =>
        extension.verifyTagNotVisible(trigger, timeout));
};
