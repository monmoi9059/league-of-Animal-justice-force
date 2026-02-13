export function secureRandom() {
    try {
        const array = new Uint32Array(1);
        // Fallback for secure random
        let cryptoObj = window.crypto || window.msCrypto;
        if (cryptoObj && cryptoObj.getRandomValues) {
             cryptoObj.getRandomValues(array);
             return array[0] / 4294967296;
        }
        return Math.random();
    } catch (e) {
        return Math.random();
    }
}
