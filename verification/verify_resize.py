
import os
from playwright.sync_api import sync_playwright

def verify_resize():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Emulate a mobile device or just small window
        context = browser.new_context(viewport={'width': 400, 'height': 800})
        page = context.new_page()

        file_path = os.path.abspath("loajf.html")
        page.goto(f"file://{file_path}")

        page.wait_for_timeout(1000)

        # Check Canvas Size
        width = page.evaluate("document.getElementById('gameCanvas').width")
        height = page.evaluate("document.getElementById('gameCanvas').height")

        print(f"Viewport: 400x800, Canvas: {width}x{height}")

        if width == 400 and height == 800:
            print("SUCCESS: Canvas matches mobile viewport.")
        else:
            print("FAILURE: Canvas does not match viewport.")

        # Resize Window
        page.set_viewport_size({'width': 1200, 'height': 600})
        page.evaluate("window.dispatchEvent(new Event('resize'));") # Trigger resize manually just in case playwright doesn't
        page.wait_for_timeout(500)

        width = page.evaluate("document.getElementById('gameCanvas').width")
        height = page.evaluate("document.getElementById('gameCanvas').height")

        print(f"Viewport: 1200x600, Canvas: {width}x{height}")

        if width == 1200 and height == 600:
             print("SUCCESS: Canvas resized correctly.")
        else:
             print("FAILURE: Canvas resize failed.")

        browser.close()

if __name__ == "__main__":
    verify_resize()
