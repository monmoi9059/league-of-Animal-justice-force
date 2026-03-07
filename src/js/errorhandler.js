export function setupErrorHandler() {
    window.onerror = function(message, source, lineno) {
        console.error("Global Error:", message, "at", lineno);
        var overlay = document.getElementById('errorOverlay');
        if (overlay) {
            overlay.style.display = 'block';
            var errorDiv = document.createElement('div');
            var strong = document.createElement('strong');
            strong.textContent = "Error:";
            errorDiv.appendChild(strong);
            errorDiv.appendChild(document.createTextNode(" " + message));
            errorDiv.appendChild(document.createElement('br'));
            var small = document.createElement('small');
            small.textContent = source + ":" + lineno;
            errorDiv.appendChild(small);
            overlay.appendChild(errorDiv);
            overlay.appendChild(document.createElement('hr'));
        }
    };
}
