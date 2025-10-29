module.exports = {
    apiKey: process.env.APPLITOOLS_API_KEY,
    batch: {
        name: 'Student Portal AI Tests',
        id: process.env.CI_COMMIT_SHA || Date.now().toString()
    },
    browser: [
        { width: 1920, height: 1080, name: 'chrome' },
        { width: 768, height: 1024, name: 'chrome' },
        { width: 375, height: 667, name: 'chrome' }
    ],
    concurrency: 5,
    // AI настройки
    matchLevel: 'Layout', // Strict, Content, Layout, Exact
    ignoreDisplacements: true,
    saveNewTests: true,
    saveFailedTests: false
};
