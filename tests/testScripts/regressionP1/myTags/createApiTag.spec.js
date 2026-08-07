const { test } = require('../../../fixtures/extensionFixture');
const { MyTags } = require('../../../pages/myTags');
const { verifyTagInExtension, verifyTagNotInExtension } = require('../../../utils/verifyInExtension');

test('Create, edit and delete an API tag', async ({ page, context, extensionId }) => {
    const myTags = new MyTags(page);
    const trigger = `apiTag${Date.now()}`;

    await test.step('Create the tag', async () => {
        await page.goto('/tags');
        await myTags.verifyPageOpened();
        await myTags.clickNewTag();
        await myTags.createApiTag(trigger, 'Regression API tag', 'GET', 'https://jsonplaceholder.typicode.com/todos/1');
        await myTags.verifyTagCreated(trigger, 'API');
    });

    await test.step('Verify the tag appears in the extension', async () => {
        await verifyTagInExtension(context, extensionId, trigger, 'Regression API tag');
    });

    await test.step('Edit the tag', async () => {
        await myTags.openTagEditor(trigger);
        await myTags.editApiTag(trigger, 'Regression API tag (edited)', 'https://jsonplaceholder.typicode.com/todos/2');
        await myTags.verifyTagUpdated(trigger, 'Regression API tag (edited)');
    });

    await test.step('Verify the edit appears in the extension', async () => {
        await verifyTagInExtension(context, extensionId, trigger, 'Regression API tag (edited)');
    });

    await test.step('Delete the tag', async () => {
        await myTags.deleteTag(trigger);
        await myTags.verifyTagDeleted(trigger);
    });

    await test.step('Verify the tag is gone from the extension', async () => {
        await verifyTagNotInExtension(context, extensionId, trigger);
    });
});
