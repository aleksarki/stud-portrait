const { Builder, Browser, By, until } = require('selenium-webdriver');
const { Eyes, ClassicRunner, Target, Configuration } = require('@applitools/eyes-selenium');
require('chromedriver');

class BaseTest {
    constructor() {
        this.driver = null;
        this.runner = new ClassicRunner();
        this.eyes = new Eyes(this.runner);
    }

    async setup() {
        console.log('Setting up browser and Applitools...');
        
        this.driver = await new Builder()
            .forBrowser(Browser.CHROME)
            .build();

        // Конфигурация Applitools
        const config = new Configuration();
        config.setApiKey(process.env.APPLITOOLS_API_KEY);
        config.setBatch({
            name: 'Student Portal AI Tests',
            id: process.env.CI_COMMIT_SHA || `local-${Date.now()}`
        });
        config.setMatchLevel('Layout');
        config.setIgnoreDisplacements(true);
        config.setIgnoreCaret(true); // Игнорировать мигающий курсор
        config.setWaitBeforeScreenshots(1000); // Ждать 1 сек перед скриншотом
        
        this.eyes.setConfiguration(config);
        
        // Увеличиваем таймауты
        await this.driver.manage().setTimeouts({
            implicit: 15000,
            pageLoad: 60000,
            script: 60000
        });

        console.log('Setup completed');
    }

    async teardown() {
        console.log('Cleaning up...');
        
        // Закрываем Applitools
        try {
            await this.eyes.abortAsync();
        } catch (e) {
            console.log('Applitools abort error:', e.message);
        }
        
        // Закрываем драйвер
        if (this.driver) {
            await this.driver.quit();
        }
        
        // Получаем результаты тестов
        try {
            const allTestResults = await this.runner.getAllTestResults(false);
            console.log('Applitools Test Results Summary:');
            allTestResults.forEach((result, index) => {
                console.log(`Test ${index + 1}: ${result.getTestResults().getName()} - ${result.getTestResults().getStatus()}`);
            });
        } catch (e) {
            console.log('Note: New tests need approval in Applitools dashboard');
            console.log('Check results at: https://eyes.applitools.com');
        }
    }

    async openApp(path = '/') {
        const appUrl = process.env.APP_URL || 'http://localhost:3000';
        const fullUrl = appUrl + path;
        console.log(`Opening: ${fullUrl}`);
        
        await this.driver.get(fullUrl);
        await this.driver.manage().window().maximize();
        
        // Ждем загрузки
        await this.driver.sleep(3000);
        
        // Проверяем, что страница загрузилась
        try {
            await this.driver.wait(until.elementLocated(By.css('body')), 10000);
            console.log('Page loaded successfully');
        } catch (error) {
            console.log('Page load might be slow, continuing...');
        }
    }

    async startVisualTest(testName) {
        console.log(`Starting visual test: ${testName}`);
        await this.eyes.open(this.driver, 'Student Portal', testName);
    }

    async takeVisualSnapshot(snapshotName) {
        console.log(`Taking snapshot: ${snapshotName}`);
        await this.eyes.check(Target.window().fully().withName(snapshotName));
    }

    async takeRegionSnapshot(snapshotName, selector) {
        console.log(`Taking region snapshot: ${snapshotName}`);
        try {
            const element = await this.driver.findElement(By.css(selector));
            await this.eyes.check(Target.region(element).withName(snapshotName));
        } catch (error) {
            console.log(`Could not find element for snapshot ${snapshotName}: ${selector}`);
            throw error;
        }
    }

    async endVisualTest() {
        console.log('Ending visual test');
        await this.eyes.closeAsync();
    }

    async waitForElement(selector, timeout = 20000) {
        return await this.driver.wait(
            until.elementLocated(By.css(selector)),
            timeout,
            `Element ${selector} not found within ${timeout}ms`
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

    async setViewport(width, height) {
        await this.driver.manage().window().setRect({ width, height });
        await this.driver.sleep(1000); // Ждем применения размера
        console.log(`Viewport set to: ${width}x${height}`);
    }
}

module.exports = BaseTest;
