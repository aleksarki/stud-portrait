const BaseTest = require('./BaseTest');
const { By } = require('selenium-webdriver');

describe('Student Report View', () => {
    let baseTest;

    beforeAll(async () => {
        baseTest = new BaseTest();
        await baseTest.setup();
    });

    afterAll(async () => {
        await baseTest.teardown();
    });

    it('should load report page', async () => {
        await baseTest.openApp('/student/123/report/profile');
        
        const pageLoaded = await baseTest.isElementDisplayed('.StudentReportView');
        expect(pageLoaded).toBe(true);
        
        const titleDisplayed = await baseTest.isElementDisplayed('.Title');
        expect(titleDisplayed).toBe(true);
    });

    it('should display report title', async () => {
        await baseTest.openApp('/student/123/report/profile');
        
        const titleElement = await baseTest.waitForElement('.Title h1');
        const titleText = await titleElement.getText();
        expect(titleText).toBeTruthy();
    });

    it('should have sidebar navigation', async () => {
        await baseTest.openApp('/student/123/report/profile');
        
        const sidebarDisplayed = await baseTest.isElementDisplayed('.Sidepanel');
        expect(sidebarDisplayed).toBe(true);
        
        const sidebarLinks = await baseTest.driver.findElements(By.css('.Sidepanel a'));
        expect(sidebarLinks.length).toBeGreaterThan(0);
    });

    it('should show either loading or table content', async () => {
        await baseTest.openApp('/student/123/report/profile');
        
        const isLoading = await baseTest.isElementDisplayed('.loading');
        const hasTable = await baseTest.isElementDisplayed('.ResultTable');
        
        // Должен быть либо индикатор загрузки, либо таблица
        expect(isLoading || hasTable).toBe(true);
    });
});
