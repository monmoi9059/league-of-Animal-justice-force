from playwright.sync_api import sync_playwright
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Load the HTML file
        cwd = os.getcwd()
        page.goto(f"file://{cwd}/loajf.html")

        # Wait for "DEPLOY SQUAD" button
        page.wait_for_selector("button:has-text('DEPLOY SQUAD')")

        # Click it
        page.click("button:has-text('DEPLOY SQUAD')")

        # Wait a bit for game to start and character to fall
        # The intro heli takes some time. Wait 3 seconds.
        page.wait_for_timeout(3000)

        # Take screenshot
        page.screenshot(path="verification/captain_gamer.png")

        browser.close()

if __name__ == "__main__":
    run()
