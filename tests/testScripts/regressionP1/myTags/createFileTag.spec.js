const path = require('path');
const { test } = require('../../../fixtures/extensionFixture');
const { MyTags } = require('../../../pages/myTags');
const { verifyTagInExtension, verifyTagNotInExtension } = require('../../../utils/verifyInExtension');

const FILE_TAG_PATH = path.join(__dirname, '../../../utils/uploadfiles/testPdf.pdf');
const SECOND_FILE_TAG_PATH = path.join(__dirname, '../../../utils/uploadfiles/testCsv.csv');

test('Create, edit and delete a File tag', async ({ page, context, extensionId }) => {
    const myTags = new MyTags(page);
    const trigger = `fileTag${Date.now()}`;

    await test.step('Create the tag', async () => {
        await page.goto('/tags');
        await myTags.verifyPageOpened();
        await myTags.clickNewTag();
        await myTags.createFileTag(trigger, 'Regression File tag', FILE_TAG_PATH);
        await myTags.verifyTagCreated(trigger, 'File');
    });

    await test.step('Verify the tag appears in the extension', async () => {
        await verifyTagInExtension(context, extensionId, trigger, 'Regression File tag');
    });

    await test.step('Edit the tag', async () => {
        await myTags.openTagEditor(trigger);
        await myTags.editFileTag(trigger, 'Regression File tag (edited)', SECOND_FILE_TAG_PATH);
        await myTags.verifyTagUpdated(trigger, 'Regression File tag (edited)');
    });

    await test.step('Verify the edit appears in the extension', async () => {
        await verifyTagInExtension(context, extensionId, trigger, 'Regression File tag (edited)');
    });

    await test.step('Delete the tag', async () => {
        await myTags.deleteTag(trigger);
        await myTags.verifyTagDeleted(trigger);
    });

    await test.step('Verify the tag is gone from the extension', async () => {
        await verifyTagNotInExtension(context, extensionId, trigger);
    });
});
