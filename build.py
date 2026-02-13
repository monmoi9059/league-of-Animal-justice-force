import os
import shutil

def read_file(filepath):
    with open(filepath, 'r') as f:
        return f.read()

def main():
    html_template = read_file('src/html/index.html')
    css_content = read_file('src/css/style.css')

    # Scripts to be included individually
    physics_js = read_file('src/js/physics.js')
    errorhandler_js = read_file('src/js/errorhandler.js')

    # Scripts to be concatenated inside the IIFE
    js_files = [
        'src/js/constants.js',
        'src/js/sound.js',
        'src/js/state.js',
        'src/js/utils.js',
        'src/js/input.js',
        'src/js/classes/particles.js',
        'src/js/classes/projectiles.js',
        'src/js/classes/items.js',
        'src/js/classes/enemies.js',
        'src/js/classes/player.js',
        'src/js/level.js',
        'src/js/render.js',
        'src/js/main.js'
    ]

    concatenated_js = ""
    for js_file in js_files:
        concatenated_js += f"// --- {os.path.basename(js_file)} ---\n"
        concatenated_js += read_file(js_file) + "\n\n"

    # Construct the final HTML
    final_html = html_template.replace(
        '<!-- CSS_INJECTION_POINT -->',
        f'<style>\n{css_content}\n</style>'
    )

    js_injection = f"""
<script>
{physics_js}
</script>

<script>
{errorhandler_js}
</script>

<script>
(function() {{
{concatenated_js}
}})();
</script>
"""

    final_html = final_html.replace('<!-- JS_INJECTION_POINT -->', js_injection)

    with open('loajf.html', 'w') as f:
        f.write(final_html)

    # Copy manifest
    if os.path.exists('src/manifest.json'):
        shutil.copy('src/manifest.json', 'manifest.json')
        print("Copied manifest.json")

    print("Build complete: loajf.html updated.")

if __name__ == "__main__":
    main()
