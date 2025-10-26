const BaseTest = require('./BaseTest');
const { By } = require('selenium-webdriver');

describe('Responsive Design', () => {
    let baseTest;

    beforeAll(async () => {
        baseTest = new BaseTest();
        await baseTest.setup();
    });

    afterAll(async () => {
        await baseTest.teardown();
    });

    const viewports = [
        { width: 1920, height: 1080, name: 'Desktop' },
        { width: 768, height: 1024, name: 'Tablet' },
        { width: 375, height: 667, name: 'Mobile' }
    ];

    viewports.forEach(viewport => {
        it(`should render correctly on ${viewport.name}`, async () => {
            await baseTest.driver.manage().window().setRect({
                width: viewport.width,
                height: viewport.height
            });
            
            await baseTest.openApp('/student/123');
            await baseTest.driver.sleep(3000);
            
            await baseTest.takeScreenshot(`Student Main Page - ${viewport.name}`);
            
            // Проверка адаптивности сетки графиков
            if (viewport.width < 768) {
                const charts = await baseTest.driver.findElements(By.css('.chart-card'));
                for (let chart of charts) {
                    const rect = await chart.getRect();
                    expect(rect.width).toBeLessThan(viewport.width);
                }
            }
        });
    });
});