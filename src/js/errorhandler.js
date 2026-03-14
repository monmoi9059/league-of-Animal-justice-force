export function setupErrorHandler() {
    window.onerror = function(message, source, lineno) {
        console.error("Global Error:", message, "at", lineno);
        var overlay = document.getElementById('errorOverlay');
        if (overlay) {
            overlay.style.display = 'block';
            var div = document.createElement('div');
            var strong = document.createElement('strong');
            strong.textContent = 'Error:';
            div.appendChild(strong);
            div.appendChild(document.createTextNode(' ' + message));
            div.appendChild(document.createElement('br'));
            var small = document.createElement('small');
            small.textContent = source + ':' + lineno;
            div.appendChild(small);
            overlay.appendChild(div);
            overlay.appendChild(document.createElement('hr'));
        }
    };
}
