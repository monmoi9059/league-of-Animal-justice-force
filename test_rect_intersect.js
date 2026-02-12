const { rectIntersect } = require('./src/js/physics.js');

function runTests() {
    let passed = 0;
    let failed = 0;

    const testCases = [
        { name: "Partial overlap", args: [0, 0, 10, 10, 5, 5, 10, 10], expected: true },
        { name: "No overlap (separate)", args: [0, 0, 10, 10, 20, 20, 10, 10], expected: false },
        { name: "Touching edges (horizontal)", args: [0, 0, 10, 10, 10, 0, 10, 10], expected: false },
        { name: "Touching edges (vertical)", args: [0, 0, 10, 10, 0, 10, 10, 10], expected: false },
        { name: "One inside another", args: [0, 0, 20, 20, 5, 5, 5, 5], expected: true },
        { name: "Identical rectangles", args: [0, 0, 10, 10, 0, 0, 10, 10], expected: true },
        { name: "Negative coordinates overlap", args: [-10, -10, 5, 5, -7, -7, 5, 5], expected: true },
        { name: "Negative coordinates no overlap", args: [-10, -10, 5, 5, -20, -20, 5, 5], expected: false }
    ];

    testCases.forEach(tc => {
        const result = rectIntersect(...tc.args);
        if (result === tc.expected) {
            console.log(`PASS: ${tc.name}`);
            passed++;
        } else {
            console.error(`FAIL: ${tc.name} - Expected ${tc.expected}, got ${result}`);
            failed++;
        }
    });

    console.log(`\nTests completed: ${passed} passed, ${failed} failed.`);

    if (failed > 0) {
        process.exit(1);
    }
}

runTests();
