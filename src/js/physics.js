// Global Scope Function
function rectIntersect(x1, y1, w1, h1, x2, y2, w2, h2) {
    return x2 < x1 + w1 && x2 + w2 > x1 && y2 < y1 + h1 && y2 + h2 > y1;
}

// For Node.js testing environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { rectIntersect };
}
