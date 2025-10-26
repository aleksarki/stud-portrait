module.exports = {
    testEnvironment: 'node',
    testMatch: [
        '**/test/selenium/**/*.test.js'
    ],
    testTimeout: 30000,
    verbose: true,
    setupFilesAfterEnv: ['<rootDir>/test/selenium/setup.js']
};
