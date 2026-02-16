import os
import shutil
import subprocess

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

    # Copy manifest
    if os.path.exists('src/manifest.json'):
        shutil.copy('src/manifest.json', 'manifest.json')
        print("Copied manifest.json")

    print("Build complete: loajf.html updated.")

    # Prepare www directory for Capacitor
    print("Preparing www directory for Capacitor...")
    if not os.path.exists('www'):
        os.makedirs('www')

    shutil.copy('loajf.html', 'www/index.html')

    # Read manifest.json and update start_url
    if os.path.exists('manifest.json'):
        manifest_content = read_file('manifest.json')
        manifest_content = manifest_content.replace('"start_url": "./loajf.html"', '"start_url": "./index.html"')
        with open('www/manifest.json', 'w') as f:
            f.write(manifest_content)

    if os.path.exists('assets/icon.png'):
        shutil.copy('assets/icon.png', 'www/image.png')

    print("www directory prepared.")

if __name__ == "__main__":
    main()
