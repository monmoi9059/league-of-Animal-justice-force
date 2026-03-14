
import { setupErrorHandler } from '../src/js/errorhandler.js';

// Mock the global window and document objects
global.window = {};
global.document = {
    getElementById: (id) => {
        if (id === 'errorOverlay') {
            return {
                style: {},
                appendChild: (child) => {
                    global.appendedChildren.push(child);
                }
            };
        }
        return null;
    },
    createElement: (tag) => {
        const element = {
            tagName: tag.toUpperCase(),
            textContent: '',
            children: [],
            appendChild: function(child) {
                this.children.push(child);
            }
        };
        return element;
    },
    createTextNode: (text) => {
        return { type: 'TEXT_NODE', textContent: text };
    }
};

global.appendedChildren = [];

// Initialize error handler
setupErrorHandler();

// Simulate an error with XSS payload
const maliciousMessage = '<img src=x onerror=alert(1)>';
const maliciousSource = '"><script>alert(2)</script>';
const lineno = 123;

console.log('Testing with malicious input...');
window.onerror(maliciousMessage, maliciousSource, lineno);

// Verify that the elements were created securely
console.log('Verifying created elements...');

const div = global.appendedChildren.find(c => c.tagName === 'DIV');
if (!div) {
    console.error('FAILED: DIV element not found in overlay');
    process.exit(1);
}

// Check for <strong>Error:</strong>
const strong = div.children.find(c => c.tagName === 'STRONG');
if (!strong || strong.textContent !== 'Error:') {
    console.error('FAILED: STRONG element not found or incorrect');
    process.exit(1);
}

// Check for the message text node
const messageNode = div.children.find(c => c.type === 'TEXT_NODE' && c.textContent === ' ' + maliciousMessage);
if (!messageNode) {
    console.error('FAILED: Malicious message not found as text node');
    process.exit(1);
}

// Check for <small>source:lineno</small>
const small = div.children.find(c => c.tagName === 'SMALL');
if (!small || small.textContent !== `${maliciousSource}:${lineno}`) {
    console.error('FAILED: SMALL element not found or incorrect source');
    process.exit(1);
}

console.log('SUCCESS: All security checks passed. Malicious input was handled as plain text.');
