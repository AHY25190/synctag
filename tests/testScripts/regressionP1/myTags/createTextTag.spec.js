const { test } = require('../../../fixtures/extensionFixture');
const { MyTags } = require('../../../pages/myTags');
const { verifyTagInExtension, verifyTagNotInExtension } = require('../../../utils/verifyInExtension');

test('Create, edit and delete a Text tag', async ({ page, context, extensionId }) => {
    const myTags = new MyTags(page);
    const trigger = `textTag${Date.now()}`;

    await test.step('Create the tag', async () => {
        await page.goto('/tags');
        await myTags.verifyPageOpened();
        await myTags.clickNewTag();
        await myTags.createTextTag(trigger, 'Regression Text tag', 'This is a Text tag created by regression automation.');
        await myTags.verifyTagCreated(trigger, 'Text');
    });

    await test.step('Verify the tag appears in the extension', async () => {
        await verifyTagInExtension(context, extensionId, trigger, 'Regression Text tag');
    });

    await test.step('Edit the tag', async () => {
        await myTags.openTagEditor(trigger);
        await myTags.editTextTag(trigger, 'Regression Text tag (edited)', 'This Text tag content was updated by regression automation.');
        await myTags.verifyTagUpdated(trigger, 'Regression Text tag (edited)');
    });

    await test.step('Verify the edit appears in the extension', async () => {
        await verifyTagInExtension(context, extensionId, trigger, 'Regression Text tag (edited)');
    });

    await test.step('Delete the tag', async () => {
        await myTags.deleteTag(trigger);
        await myTags.verifyTagDeleted(trigger);
    });

    await test.step('Verify the tag is gone from the extension', async () => {
        await verifyTagNotInExtension(context, extensionId, trigger);
    });
});
