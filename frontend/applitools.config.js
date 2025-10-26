const { Configuration } = require('@applitools/eyes-selenium');

module.exports = {
    apiKey: process.env.APPLITOOLS_API_KEY,
    batch: {
        name: 'Student Portal Tests',
        id: process.env.APPLITOOLS_BATCH_ID || 'student-portal-batch'
    },
    concurrency: 5,
    browser: [
        { width: 1920, height: 1080, name: 'chrome' },
        { width: 768, height: 1024, name: 'chrome' },
        { width: 375, height: 667, name: 'chrome' }
    ]
};
