import { secureRandom } from '../src/js/math.js';
import assert from 'node:assert';

function runTests() {
    console.log('Running Math Tests...');

    // Test range
    console.log('Testing secureRandom range...');
    for (let i = 0; i < 1000; i++) {
        const val = secureRandom();
        assert.ok(val >= 0 && val < 1, `Value ${val} out of range [0, 1)`);
    }

    // Test that it doesn't use Math.random() (after we fix it)
    console.log('Testing secureRandom independence from Math.random()...');
    const originalRandom = Math.random;
    Math.random = () => {
        throw new Error('Math.random() should not be called!');
    };

    try {
        const val = secureRandom();
        assert.ok(val >= 0 && val < 1, `Value ${val} out of range [0, 1)`);
        console.log('secureRandom does not seem to use Math.random()');
    } catch (e) {
        if (e.message === 'Math.random() should not be called!') {
            console.log('Currently secureRandom() uses Math.random() as expected (failing test)');
            throw e;
        } else {
            throw e;
        }
    } finally {
        Math.random = originalRandom;
    }

    console.log('All Math Tests Passed!');
}

try {
    runTests();
} catch (error) {
    if (error.message === 'Math.random() should not be called!') {
        console.log('Vulnerability verified: secureRandom() is using Math.random()');
        // We exit with 0 here because this is the baseline check before the fix
        process.exit(0);
    } else {
        console.error('Tests Failed!');
        console.error(error);
        process.exit(1);
    }
}
