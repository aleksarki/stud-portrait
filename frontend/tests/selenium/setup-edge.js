const { Builder, By, until } = require('selenium-webdriver');
const edge = require('selenium-webdriver/edge');

class EdgeTestSetup {
    constructor() {
        this.driver = null;
    }

    async setup() {
        try {
            const options = new edge.Options();
            options.addArguments(
                '--no-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--remote-allow-origins=*'
            );

            this.driver = await new Builder()
                .forBrowser('MicrosoftEdge')
                .setEdgeOptions(options)
                .build();

            await this.driver.manage().window().maximize();
            await this.driver.manage().setTimeouts({ 
                implicit: 10000, 
                pageLoad: 30000 
            });
            
            return this.driver;
            
        } catch (error) {
            throw error;
        }
    }

    async teardown() {
        if (this.driver) {
            await this.driver.quit();
        }
    }
}

module.exports = EdgeTestSetup;