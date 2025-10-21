const EdgeTestSetup = require('../setup-edge');
const { By, until } = require('selenium-webdriver');
const assert = require('assert');

describe('Навигация - Edge', function() {
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

    it('должна переходить на страницу 404 для несуществующих маршрутов', async function() {
        await driver.get('http://localhost:3000/non-existent-route');
        
        const errorMessage = await driver.wait(
            until.elementLocated(By.css('.page-title span')),
            10000
        );
        const messageText = await errorMessage.getText();
        
        assert.strictEqual(messageText, 'Несуществующая страница', 'Должно отображаться сообщение об ошибке 404');
    });

    it('должна сохранять навигацию при перезагрузке', async function() {
        await driver.get('http://localhost:3000/stud-report/1');
        
        // Проверяем текущий URL
        let currentUrl = await driver.getCurrentUrl();
        assert.ok(currentUrl.includes('/stud-report/1'), 'URL должен содержать ID студента');
        
        // Перезагружаем страницу
        await driver.navigate().refresh();
        
        // Ждем перезагрузки
        await driver.wait(until.elementLocated(By.css('.page-title')), 15000);
        
        // Проверяем, что остались на той же странице
        currentUrl = await driver.getCurrentUrl();
        assert.ok(currentUrl.includes('/stud-report/1'), 'После перезагрузки должны остаться на той же странице');
    });
});
