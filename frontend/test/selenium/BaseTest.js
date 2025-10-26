const { Builder, Browser, By, until } = require('selenium-webdriver');
require('chromedriver');

class BaseTest {
    constructor() {
        this.driver = null;
    }

    async setup() {
        this.driver = await new Builder()
            .forBrowser(Browser.CHROME)
            .build();
        
        // Увеличим таймаут для ожидания элементов
        await this.driver.manage().setTimeouts({
            implicit: 10000,
            pageLoad: 30000,
            script: 30000
        });
    }

    async teardown() {
        if (this.driver) {
            await this.driver.quit();
        }
    }

    async openApp(path = '/') {
        const appUrl = process.env.APP_URL || 'http://localhost:3000';
        console.log(`Opening: ${appUrl + path}`);
        await this.driver.get(appUrl + path);
        await this.driver.manage().window().maximize();
        
        // Дадим время для загрузки
        await this.driver.sleep(2000);
    }

    async waitForElement(selector, timeout = 15000) {
        try {
            return await this.driver.wait(
                until.elementLocated(By.css(selector)),
                timeout
            );
        } catch (error) {
            console.log(`Element not found: ${selector}`);
            throw error;
        }
    }

    async waitForElementToDisappear(selector, timeout = 15000) {
        return await this.driver.wait(
            async () => {
                const elements = await this.driver.findElements(By.css(selector));
                return elements.length === 0;
            },
            timeout
        );
    }

    async isElementDisplayed(selector) {
        try {
            const element = await this.waitForElement(selector, 5000);
            return await element.isDisplayed();
        } catch (error) {
            return false;
        }
    }

    async getElementText(selector) {
        const element = await this.waitForElement(selector);
        return await element.getText();
    }
}

module.exports = BaseTest;
