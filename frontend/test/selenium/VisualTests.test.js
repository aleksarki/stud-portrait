const BaseTest = require('./BaseTest');

describe('Student Portal - AI Visual Tests', () => {
    let baseTest;

    beforeAll(async () => {
        baseTest = new BaseTest();
        await baseTest.setup();
    });

    afterAll(async () => {
        await baseTest.teardown();
    });

    it('should have correct visual appearance on student main page', async () => {
        console.log('Test 1: Student Main Page');
        await baseTest.openApp('/student/123');
        
        await baseTest.startVisualTest('Student Main Page Layout');
        await baseTest.takeVisualSnapshot('Student Main Page - Full Page');
        await baseTest.endVisualTest();
    }, 60000); // 60 секунд таймаут для этого теста

    it('should maintain visual consistency on report page', async () => {
        console.log('Test 2: Report Page');
        await baseTest.openApp('/student/123/report/profile');
        
        await baseTest.startVisualTest('Student Report Page Layout');
        await baseTest.takeVisualSnapshot('Report Page - Full Page');
        await baseTest.endVisualTest();
    }, 60000);

    it('should display loading states correctly', async () => {
        console.log('Test 3: Loading States');
        await baseTest.openApp('/student/123');
        
        await baseTest.startVisualTest('Loading States Visual Test');
        await baseTest.takeVisualSnapshot('Initial Page Load');
        await baseTest.endVisualTest();
    }, 60000);

    it('should handle error page visually correctly', async () => {
        console.log('Test 4: Error Page');
        await baseTest.openApp('/non-existent-route');
        
        await baseTest.startVisualTest('Error Page Visual Test');
        await baseTest.takeVisualSnapshot('404 Error Page');
        await baseTest.endVisualTest();
    }, 60000);

    it('should maintain responsive design - desktop', async () => {
        console.log('Test 5: Desktop View');
        await baseTest.openApp('/student/123');
        await baseTest.setViewport(1920, 1080);
        
        await baseTest.startVisualTest('Responsive Layout - Desktop');
        await baseTest.takeVisualSnapshot('Student Page - Desktop View');
        await baseTest.endVisualTest();
    }, 60000);

    it('should maintain responsive design - tablet', async () => {
        console.log('Test 6: Tablet View');
        await baseTest.openApp('/student/123');
        await baseTest.setViewport(768, 1024);
        
        await baseTest.startVisualTest('Responsive Layout - Tablet');
        await baseTest.takeVisualSnapshot('Student Page - Tablet View');
        await baseTest.endVisualTest();
    }, 60000);

    it('should maintain responsive design - mobile', async () => {
        console.log('Test 7: Mobile View');
        await baseTest.openApp('/student/123');
        await baseTest.setViewport(375, 667);
        
        await baseTest.startVisualTest('Responsive Layout - Mobile');
        await baseTest.takeVisualSnapshot('Student Page - Mobile View');
        await baseTest.endVisualTest();
    }, 60000);
});
