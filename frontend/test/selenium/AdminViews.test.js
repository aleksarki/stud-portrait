const BaseTest = require('./BaseTest');
const { By } = require('selenium-webdriver');

describe('Admin Views - New Frontend', () => {
    let baseTest;

    beforeAll(async () => {
        baseTest = new BaseTest();
        await baseTest.setup();
    });

    afterAll(async () => {
        await baseTest.teardown();
    });

    it('should load admin main page', async () => {
        await baseTest.openApp('/admin/');
        
        const adminViewDisplayed = await baseTest.isElementDisplayed('.AdminMainView');
        expect(adminViewDisplayed).toBe(true);
        
        const headerDisplayed = await baseTest.isElementDisplayed('.Header');
        expect(headerDisplayed).toBe(true);
        
        const sidebarDisplayed = await baseTest.isElementDisplayed('.Sidepanel');
        expect(sidebarDisplayed).toBe(true);
    });

    it('should load admin results page with table', async () => {
        await baseTest.openApp('/admin/results');
        await baseTest.waitForDataLoad();
        
        const resultsViewDisplayed = await baseTest.isElementDisplayed('.AdminResultsView');
        expect(resultsViewDisplayed).toBe(true);
        
        const tableContainer = await baseTest.isElementDisplayed('.table-scroll-container');
        expect(tableContainer).toBe(true);
        
        // Проверяем заголовок
        const headerElement = await baseTest.waitForElement('.results-header h2');
        const headerText = await headerElement.getText();
        expect(headerText).toContain('Результаты тестирования');
    });

    it('should load admin stats page with charts', async () => {
        await baseTest.openApp('/admin/stats');
        await baseTest.waitForDataLoad();
        
        const statsViewDisplayed = await baseTest.isElementDisplayed('.AdminStatsView');
        expect(statsViewDisplayed).toBe(true);
        
        const statsCards = await baseTest.isElementDisplayed('.stats-cards');
        expect(statsCards).toBe(true);
        
        const tabs = await baseTest.isElementDisplayed('.stats-tabs');
        expect(tabs).toBe(true);
    });

    it('should load admin courses page', async () => {
        await baseTest.openApp('/admin/courses');
        await baseTest.waitForDataLoad();
        
        const coursesViewDisplayed = await baseTest.isElementDisplayed('.AdminCoursesView');
        expect(coursesViewDisplayed).toBe(true);
        
        const coursesTable = await baseTest.isElementDisplayed('.courses-table');
        expect(coursesTable).toBe(true);
    });

    it('should maintain visual consistency on admin pages', async () => {
        await baseTest.openApp('/admin/results');
        await baseTest.waitForDataLoad();
        
        await baseTest.startVisualTest('Admin Results Page - New Layout');
        await baseTest.takeVisualSnapshot('Admin Results - Full Page');
        await baseTest.endVisualTest();
    });
});
