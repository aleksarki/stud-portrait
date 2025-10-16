const EdgeTestSetup = require('../setup-edge');
const { By, until } = require('selenium-webdriver');
const assert = require('assert');

describe('Страница отчета студента - Edge', function() {
    this.timeout(60000);
    
    let setup;
    let driver;

    before(async function() {
        setup = new EdgeTestSetup();
        driver = await setup.setup();
    });

    after(async function() {
        await setup.teardown();
    });

    it('должна загружать данные студента по ID', async function() {
        await driver.get('http://localhost:3000/stud-report/1');
        
        // Ждём загрузки заголовка страницы
        await driver.wait(until.elementLocated(By.css('.page-title')), 15000);
        
        const pageTitle = await driver.findElement(By.css('.page-title span'));
        const titleText = await pageTitle.getText();
        
        assert.ok(titleText.includes('Результаты студента'), 'Заголовок должен содержать имя студента');
    });

    it('должна отображать radar charts', async function() {
        await driver.get('http://localhost:3000/stud-report/1');
        
        // Ждём загрузки хотя бы одного графика
        await driver.wait(until.elementLocated(By.css('.apexcharts-radar-series')), 20000);
        
        const charts = await driver.findElements(By.css('.apexcharts-radar-series'));
        assert.ok(charts.length > 0, 'Должен отображаться хотя бы один график');
        
        // Проверяем, что график видимый
        const firstChart = charts[0];
        const isChartVisible = await firstChart.isDisplayed();
        assert.strictEqual(isChartVisible, true, 'График должен быть видимым');
    });

    it('должна отображать разделы профиля', async function() {
        await driver.get('http://localhost:3000/stud-report/1');
        
        const expectedSections = [
            'Универсальный личностный опросник',
            'Жизнестойкость',
        ];

        // Ждём загрузки контента
        await driver.wait(until.elementLocated(By.css('.report-area')), 15000);

        for (const sectionTitle of expectedSections) {
            const sectionElement = await driver.wait(
                until.elementLocated(By.xpath(`//*[contains(text(), '${sectionTitle}')]`)),
                10000
            );
            const isSectionVisible = await sectionElement.isDisplayed();
            assert.strictEqual(isSectionVisible, true, `Раздел '${sectionTitle}' должен быть видимым`);
        }
    });
});
