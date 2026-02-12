// Global Scope Function
function rectIntersect(x1, y1, w1, h1, x2, y2, w2, h2) {
    return x2 < x1 + w1 && x2 + w2 > x1 && y2 < y1 + h1 && y2 + h2 > y1;
}

function checkRectOverlap(r1, r2) {
    if (!r1 || !r2) return false;
    return rectIntersect(r1.x, r1.y, r1.w, r1.h, r2.x, r2.y, r2.w, r2.h);
}

// For Node.js testing environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { rectIntersect, checkRectOverlap };
}
