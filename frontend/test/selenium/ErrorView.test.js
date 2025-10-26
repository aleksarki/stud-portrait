const BaseTest = require('./BaseTest');

describe('Error View', () => {
    let baseTest;

    beforeAll(async () => {
        baseTest = new BaseTest();
        await baseTest.setup();
    });

    afterAll(async () => {
        await baseTest.teardown();
    });

    it('should display error page for non-existent route', async () => {
        await baseTest.openApp('/non-existent-route');
        
        const errorViewDisplayed = await baseTest.isElementDisplayed('.ErrorView');
        expect(errorViewDisplayed).toBe(true);
        
        const headerDisplayed = await baseTest.isElementDisplayed('.Header');
        expect(headerDisplayed).toBe(true);
        
        const titleDisplayed = await baseTest.isElementDisplayed('.Title');
        expect(titleDisplayed).toBe(true);
        
        // Проверяем заголовок ошибки
        const titleElement = await baseTest.waitForElement('.Title h1');
        const titleText = await titleElement.getText();
        expect(titleText).toContain('Несуществующая страница');
    });
});
