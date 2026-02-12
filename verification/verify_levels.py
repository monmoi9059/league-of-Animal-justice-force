import os
from playwright.sync_api import sync_playwright

def verify_game_levels():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Load the local HTML file
        file_path = os.path.abspath("loajf.html")
        page.goto(f"file://{file_path}")

        # Start Game
        page.click("text=DEPLOY SQUAD")

        # Force the UI to be visible if it isn't (JS hack to debug Playwright issue)
        page.evaluate("document.getElementById('gameUI').style.display = 'flex';")

        page.wait_for_selector("#gameUI", state="visible")
        page.wait_for_timeout(2000)

        # Take screenshot of Level 1
        page.screenshot(path="verification/level1.png")
        print("Level 1 screenshot taken.")

        # Hack to advance level (execute JS in browser)
        page.evaluate("window.nextLevel()")
        page.wait_for_timeout(1000)
        page.screenshot(path="verification/level2.png")
        print("Level 2 screenshot taken.")

        page.evaluate("window.nextLevel()")
        page.wait_for_timeout(1000)
        page.screenshot(path="verification/level3.png") # City biome expected
        print("Level 3 screenshot taken.")

        browser.close()

if __name__ == "__main__":
    verify_game_levels()
