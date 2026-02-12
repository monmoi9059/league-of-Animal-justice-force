from playwright.sync_api import sync_playwright
import time
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.set_viewport_size({"width": 800, "height": 600})
        cwd = os.getcwd()
        page.goto(f"file://{cwd}/loajf.html")

        # Start game
        page.evaluate("window.startGame()")

        # Wait for physics
        time.sleep(2)

        # Take screenshot
        page.screenshot(path="verification/gameplay_visual.png")
        print("Screenshot saved to verification/gameplay_visual.png")

        browser.close()

if __name__ == "__main__":
    run()
