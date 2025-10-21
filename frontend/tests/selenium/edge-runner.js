const Mocha = require('mocha');
const { join } = require('path');

const mocha = new Mocha({
    timeout: 60000,
    reporter: 'spec',
    slow: 3000
});

// Добавляем тесты
// mocha.addFile(join(__dirname, 'edge/homepage-edge.test.js'));
mocha.addFile(join(__dirname, 'edge/student-report-edge.test.js'));
mocha.addFile(join(__dirname, 'edge/navigation-edge.test.js'));

// Запускаем тесты
mocha.run(failures => {
    process.exit(failures ? 1 : 0);
});
