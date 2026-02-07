from playwright.sync_api import sync_playwright
import time
import os

def verify_frontend():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Load the game
        page.goto(f"file://{os.getcwd()}/loajf.html")
        time.sleep(1)

        # 1. Check Main Menu
        if not page.locator("#menuOverlay").is_visible():
            print("ERROR: Menu not visible on load.")
            return

        # 2. Go to Roster (Verify UI change 1)
        print("Clicking VIEW TEAM...")
        page.click("text=VIEW TEAM")
        time.sleep(1)

        if not page.locator("#rosterOverlay").is_visible():
            print("ERROR: Roster overlay not visible.")
            return

        # Take screenshot of Roster
        page.screenshot(path="verification/roster_view.png")
        print("Screenshot of Roster saved.")

        # 3. Back to Menu
        print("Clicking BACK...")
        page.click("#rosterOverlay button:has-text('BACK')")
        time.sleep(1)

        # 4. Start Game (Verify Grey Screen Fix)
        print("Clicking DEPLOY SQUAD...")
        page.click("text=DEPLOY SQUAD")
        page.wait_for_selector("#gameUI")

        if not page.locator("#gameUI").is_visible():
            print("ERROR: Game UI not visible.")
            return

        # Take screenshot of Game
        page.screenshot(path="verification/game_view.png")
        print("Screenshot of Game saved.")

        browser.close()

if __name__ == "__main__":
    verify_frontend()
