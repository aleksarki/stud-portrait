module.exports = {
    testEnvironment: 'node',
    testMatch: [
        '**/test/selenium/**/*.test.js'
    ],
    testTimeout: 120000, // 2 минуты
    verbose: true,
    setupFilesAfterEnv: ['<rootDir>/test/selenium/setup.js']
};
