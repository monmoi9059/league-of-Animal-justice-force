export function setupErrorHandler() {
    window.onerror = function(message, source, lineno, colno, error) {
        console.error("Global Error:", message, "at", lineno, ":", colno);
        const overlay = document.getElementById('errorOverlay');
        if (overlay) {
            overlay.style.display = 'block';
            overlay.innerHTML += `<div><strong>Error:</strong> ${message} <br><small>${source}:${lineno}</small></div><hr>`;
        }
    };
}
