import { rectIntersect, checkRectOverlap } from '../src/js/physics.js';
import assert from 'node:assert';

function runTests() {
    console.log('Running Physics Tests...');

    // Test rectIntersect
    console.log('Testing rectIntersect...');

    // Overlapping
    assert.strictEqual(rectIntersect(0, 0, 10, 10, 5, 5, 10, 10), true, 'Overlapping rectangles should return true');

    // Non-overlapping
    assert.strictEqual(rectIntersect(0, 0, 10, 10, 20, 20, 10, 10), false, 'Non-overlapping rectangles should return false');

    // Touching edges (should be false based on < and > operators in rectIntersect)
    assert.strictEqual(rectIntersect(0, 0, 10, 10, 10, 0, 10, 10), false, 'Touching edges should return false');
    assert.strictEqual(rectIntersect(0, 0, 10, 10, 0, 10, 10, 10), false, 'Touching edges should return false');

    // Zero width/height
    assert.strictEqual(rectIntersect(0, 0, 0, 0, 0, 0, 0, 0), false, 'Zero dimension rectangles should return false');

    // Test checkRectOverlap
    console.log('Testing checkRectOverlap...');

    const r1 = { x: 0, y: 0, w: 10, h: 10 };
    const r2 = { x: 5, y: 5, w: 10, h: 10 };
    const r3 = { x: 20, y: 20, w: 10, h: 10 };

    // Happy paths
    assert.strictEqual(checkRectOverlap(r1, r2), true, 'Should overlap');
    assert.strictEqual(checkRectOverlap(r1, r3), false, 'Should not overlap');

    // Edge cases: null/undefined
    console.log('Testing checkRectOverlap null/undefined edge cases...');
    assert.strictEqual(checkRectOverlap(null, r2), false, 'r1 is null should return false');
    assert.strictEqual(checkRectOverlap(r1, null), false, 'r2 is null should return false');
    assert.strictEqual(checkRectOverlap(null, null), false, 'both null should return false');
    assert.strictEqual(checkRectOverlap(undefined, r2), false, 'r1 is undefined should return false');
    assert.strictEqual(checkRectOverlap(r1, undefined), false, 'r2 is undefined should return false');

    console.log('All Physics Tests Passed!');
}

try {
    runTests();
} catch (error) {
    console.error('Tests Failed!');
    console.error(error);
    process.exit(1);
}
