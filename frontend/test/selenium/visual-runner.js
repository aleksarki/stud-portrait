const { exec } = require('child_process');

// Проверяем наличие API ключа
if (!process.env.APPLITOOLS_API_KEY) {
    console.error('APPLITOOLS_API_KEY is required!');
    console.log('Get your API key from: https://applitools.com/');
    console.log('Then run:');
    console.log('export APPLITOOLS_API_KEY=your_api_key_here');
    console.log('or on Windows:');
    console.log('set APPLITOOLS_API_KEY=your_api_key_here');
    process.exit(1);
}

process.env.APP_URL = process.env.APP_URL || 'http://localhost:3000';

console.log('Starting AI Visual Tests with Applitools...');
console.log('App URL:', process.env.APP_URL);
console.log('Batch ID:', process.env.CI_COMMIT_SHA || `local-${Date.now()}`);
console.log('');

// Увеличиваем общий таймаут для Jest
const command = 'npx jest test/selenium/VisualTests.test.js --config=jest.config.js --verbose --testTimeout=120000';

console.log('Running command:', command);
console.log('');

exec(command, (error, stdout, stderr) => {
    console.log('=== TEST OUTPUT ===');
    console.log(stdout);
    
    if (stderr) {
        console.error('=== ERRORS ===');
        console.error(stderr);
    }
    
    console.log('');
    console.log('=== NEXT STEPS ===');
    
    if (error) {
        console.log('Some tests failed, but check Applitools dashboard for visual results');
    } else {
        console.log('All tests completed!');
    }
    
    console.log('Check AI results at: https://eyes.applitools.com');
    console.log('Note: First run creates baselines - you need to approve them');
    console.log('');
    
    process.exit(error ? 1 : 0);
});
