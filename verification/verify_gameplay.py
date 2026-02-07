
import os
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1200, "height": 800}) # Larger viewport to see more

        # Load local file
        path = os.path.abspath("loajf.html")
        page.goto(f"file://{path}")

        # Click start button
        page.click("text=DEPLOY SQUAD")

        # Wait for generation
        page.wait_for_timeout(2000)

        # Take screenshot
        page.screenshot(path="verification/gameplay_tunnels.png")
        print("Screenshot saved to verification/gameplay_tunnels.png")

        browser.close()

if __name__ == "__main__":
    run()
