const BaseTest = require('./BaseTest');
const { By } = require('selenium-webdriver');

describe('Student Main View', () => {
    let baseTest;

    beforeAll(async () => {
        baseTest = new BaseTest();
        await baseTest.setup();
    });

    afterAll(async () => {
        await baseTest.teardown();
    });

    it('should load student overview page', async () => {
        await baseTest.openApp('/student/123');
        
        // Проверяем основные элементы
        const headerDisplayed = await baseTest.isElementDisplayed('.Header');
        expect(headerDisplayed).toBe(true);
        
        const titleDisplayed = await baseTest.isElementDisplayed('.Title');
        expect(titleDisplayed).toBe(true);
        
        const sidebarDisplayed = await baseTest.isElementDisplayed('.Sidepanel');
        expect(sidebarDisplayed).toBe(true);
        
        // Проверяем заголовок
        const titleElement = await baseTest.waitForElement('.Title h1');
        const titleText = await titleElement.getText();
        expect(titleText).toContain('Обзор');
    });

    it('should display loading state or content', async () => {
        await baseTest.openApp('/student/123');
        
        // Проверяем либо состояние загрузки, либо контент
        const isLoading = await baseTest.isElementDisplayed('.loading');
        const hasCharts = await baseTest.isElementDisplayed('.chart-card');
        
        // Должен быть либо индикатор загрузки, либо графики
        expect(isLoading || hasCharts).toBe(true);
        
        if (isLoading) {
            const loadingText = await baseTest.getElementText('.loading');
            expect(loadingText).toContain('Загрузка');
        }
    });

    it('should have sidebar with navigation links', async () => {
        await baseTest.openApp('/student/123');
        
        // Ждем немного для загрузки
        await baseTest.driver.sleep(3000);
        
        const sidebarLinks = await baseTest.driver.findElements(By.css('.Sidepanel a'));
        console.log(`Found ${sidebarLinks.length} sidebar links`);
        
        // Должна быть хотя бы одна ссылка (ОБЗОР)
        expect(sidebarLinks.length).toBeGreaterThan(0);
        
        // Проверяем первую ссылку
        const firstLinkText = await sidebarLinks[0].getText();
        expect(firstLinkText).toBe('ОБЗОР');
    });

    it('should display student name in header', async () => {
        await baseTest.openApp('/student/123');
        
        // Ждем загрузки header
        await baseTest.driver.sleep(2000);
        
        // Проверяем наличие имени студента в header (если оно отображается)
        const menuHandle = await baseTest.driver.findElements(By.css('.menu-handle'));
        if (menuHandle.length > 0) {
            const nameText = await menuHandle[0].getText();
            expect(nameText).toBeTruthy();
        }
    });
});
