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
        page.wait_for_timeout(3000)

        # Move right a bit to see the enemy if needed, but x=100 is near start
        # The player spawns at x=80 roughly.

        # Take screenshot
        page.screenshot(path="verification/captain_enemy_gamer.png")

        browser.close()

if __name__ == "__main__":
    run()
