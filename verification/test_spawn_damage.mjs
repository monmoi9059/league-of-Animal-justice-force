import assert from 'assert';

// Mocks
const localStorageMock = {
    getItem: () => '1',
    setItem: () => {}
};

global.localStorage = localStorageMock;
global.window = {
    AudioContext: class {
        constructor() {
            this.currentTime = 0;
        }
        createGain() { return { connect: () => {}, gain: { value: 0 } }; }
        createOscillator() { return { connect: () => {}, frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }, start: () => {}, stop: () => {} }; }
    },
    webkitAudioContext: class {},
    localStorage: localStorageMock
};

global.document = {
    getElementById: (id) => {
        if (id === 'gameCanvas') {
            return {
                getContext: () => ({
                    createLinearGradient: () => ({ addColorStop: () => {} })
                })
            };
        }
        return { innerText: '', style: {}, appendChild: () => {}, textContent: '' };
    }
};

async function runTests() {
    // Dynamic import to ensure globals are set first
    const { damageNumbers } = await import('../src/js/state.js');
    const { spawnDamageNumber } = await import('../src/js/utils.js');

    console.log("Testing spawnDamageNumber...");

    // Test Case 1: Default color
    const initialLength = damageNumbers.length;
    spawnDamageNumber(100, 200, "10");

    assert.strictEqual(damageNumbers.length, initialLength + 1, "Should push to damageNumbers array");
    const lastDamage = damageNumbers[damageNumbers.length - 1];
    assert.strictEqual(lastDamage.x, 100);
    assert.strictEqual(lastDamage.y, 200);
    assert.strictEqual(lastDamage.text, "10");
    assert.strictEqual(lastDamage.life, 60);
    assert.strictEqual(lastDamage.vy, -2);
    assert.strictEqual(lastDamage.color, "white", "Default color should be white");

    // Test Case 2: Custom color
    spawnDamageNumber(300, 400, "50", "red");
    const redDamage = damageNumbers[damageNumbers.length - 1];
    assert.strictEqual(redDamage.color, "red", "Should use custom color");

    console.log("✅ All tests passed!");
}

runTests().catch(err => {
    console.error("❌ Tests failed:");
    console.error(err);
    process.exit(1);
});
