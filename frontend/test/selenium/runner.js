const { exec } = require('child_process');

// Установите переменные окружения
process.env.APP_URL = process.env.APP_URL || 'http://localhost:3000';

console.log('Starting Selenium tests...');
console.log('App URL:', process.env.APP_URL);

// Запуск тестов
exec('npx jest --config=jest.config.js --verbose --no-cache', (error, stdout, stderr) => {
    console.log('STDOUT:', stdout);
    if (stderr) {
        console.error('STDERR:', stderr);
    }
    if (error) {
        console.error('Test execution failed:', error);
        process.exit(1);
    }
    console.log('Tests completed successfully!');
    process.exit(0);
});
