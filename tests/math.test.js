import assert from 'node:assert';
import { test, describe, it } from 'node:test';
import { secureRandom } from '../src/js/math.js';

describe('secureRandom', () => {
    it('should return a number between 0 and 1', () => {
        const result = secureRandom();
        assert.strictEqual(typeof result, 'number');
        assert.ok(result >= 0 && result < 1);
    });

    it('should use window.crypto.getRandomValues if available', () => {
        let called = false;
        const mockGetRandomValues = (array) => {
            called = true;
            array[0] = 1073741824; // 1/4 of 4294967296
            return array;
        };

        global.window = {
            crypto: {
                getRandomValues: mockGetRandomValues
            }
        };

        const result = secureRandom();
        assert.strictEqual(called, true);
        assert.strictEqual(result, 0.25);

        // Cleanup
        delete global.window;
    });

    it('should use window.msCrypto.getRandomValues if window.crypto is not available', () => {
        let called = false;
        const mockGetRandomValues = (array) => {
            called = true;
            array[0] = 2147483648; // 1/2 of 4294967296
            return array;
        };

        global.window = {
            msCrypto: {
                getRandomValues: mockGetRandomValues
            }
        };

        const result = secureRandom();
        assert.strictEqual(called, true);
        assert.strictEqual(result, 0.5);

        // Cleanup
        delete global.window;
    });

    it('should fallback to Math.random if crypto is not available', () => {
        global.window = {}; // No crypto or msCrypto

        const originalMathRandom = Math.random;
        Math.random = () => 0.75;

        const result = secureRandom();
        assert.strictEqual(result, 0.75);

        // Cleanup
        Math.random = originalMathRandom;
        delete global.window;
    });

    it('should fallback to Math.random if getRandomValues throws', () => {
        global.window = {
            crypto: {
                getRandomValues: () => {
                    throw new Error('Crypto error');
                }
            }
        };

        const originalMathRandom = Math.random;
        Math.random = () => 0.33;

        const result = secureRandom();
        assert.strictEqual(result, 0.33);

        // Cleanup
        Math.random = originalMathRandom;
        delete global.window;
    });
});
