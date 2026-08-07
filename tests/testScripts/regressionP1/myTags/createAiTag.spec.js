const { test } = require('../../../fixtures/extensionFixture');
const { MyTags } = require('../../../pages/myTags');
const { verifyTagInExtension, verifyTagNotInExtension } = require('../../../utils/verifyInExtension');

test('Create, edit and delete an AI tag', async ({ page, context, extensionId }) => {
    const myTags = new MyTags(page);
    const trigger = `aiTag${Date.now()}`;

    await test.step('Create the tag', async () => {
        await page.goto('/tags');
        await myTags.verifyPageOpened();
        await myTags.clickNewTag();
        await myTags.createAiTag(trigger, 'Regression AI tag', 'Summarize the selected text in one sentence.');
        await myTags.verifyTagCreated(trigger, 'AI');
    });

    await test.step('Verify the tag appears in the extension', async () => {
        await verifyTagInExtension(context, extensionId, trigger, 'Regression AI tag');
    });

    await test.step('Edit the tag', async () => {
        await myTags.openTagEditor(trigger);
        await myTags.editAiTag(trigger, 'Regression AI tag (edited)', 'Translate the selected text into French.');
        await myTags.verifyTagUpdated(trigger, 'Regression AI tag (edited)');
    });

    await test.step('Verify the edit appears in the extension', async () => {
        await verifyTagInExtension(context, extensionId, trigger, 'Regression AI tag (edited)');
    });

    await test.step('Delete the tag', async () => {
        await myTags.deleteTag(trigger);
        await myTags.verifyTagDeleted(trigger);
    });

    await test.step('Verify the tag is gone from the extension', async () => {
        await verifyTagNotInExtension(context, extensionId, trigger);
    });
});
