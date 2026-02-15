import os
import shutil
import subprocess
import json

def read_file(filepath):
    with open(filepath, 'r') as f:
        return f.read()

def main():
    print("Building JS bundle...")
    # Run npm build
    try:
        subprocess.check_call(["npm", "run", "build"])
    except subprocess.CalledProcessError as e:
        print(f"Error building JS: {e}")
        return

    html_template = read_file('src/html/index.html')
    css_content = read_file('src/css/style.css')

    # Read the bundled JS
    bundled_js = read_file('dist/game.bundle.js')

    # Construct the final HTML
    final_html = html_template.replace(
        '<!-- CSS_INJECTION_POINT -->',
        f'<style>\n{css_content}\n</style>'
    )

    js_injection = f"""
<script>
{bundled_js}
</script>
"""

    final_html = final_html.replace('<!-- JS_INJECTION_POINT -->', js_injection)

    with open('loajf.html', 'w') as f:
        f.write(final_html)

    print("loajf.html updated.")

    # Capacitor Build Step: Create www directory
    if not os.path.exists('www'):
        os.makedirs('www')

    # Copy loajf.html to www/index.html
    shutil.copy('loajf.html', 'www/index.html')
    print("Copied loajf.html to www/index.html")

    # Handle Manifest
    if os.path.exists('src/manifest.json'):
        # Copy to root
        shutil.copy('src/manifest.json', 'manifest.json')
        print("Copied manifest.json to root")

        # Copy to www and update start_url
        with open('src/manifest.json', 'r') as f:
            manifest_data = json.load(f)

        manifest_data['start_url'] = './index.html'

        with open('www/manifest.json', 'w') as f:
            json.dump(manifest_data, f, indent=2)
        print("Created www/manifest.json with updated start_url")

    # Copy icon if available
    if os.path.exists('assets/icon.png'):
        shutil.copy('assets/icon.png', 'www/image.png')
        print("Copied assets/icon.png to www/image.png")

    print("Build complete.")

if __name__ == "__main__":
    main()
