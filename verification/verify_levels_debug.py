import os
from playwright.sync_api import sync_playwright

def verify_game_levels():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Capture console logs
        page.on("console", lambda msg: print(f"Browser Console: {msg.text}"))
        page.on("pageerror", lambda err: print(f"Browser Error: {err}"))

        # Load the local HTML file
        file_path = os.path.abspath("loajf.html")
        page.goto(f"file://{file_path}")

        # Start Game
        print("Clicking Deploy Squad...")
        page.click("text=DEPLOY SQUAD")

        # Wait a bit
        page.wait_for_timeout(2000)

        # Take screenshot of Level 1
        page.screenshot(path="verification/level1_debug.png")
        print("Level 1 screenshot taken.")

        # Check if we are in game
        is_game = page.evaluate("gameState.screen === 'GAME'")
        print(f"Game State Screen: {page.evaluate('gameState.screen')}")

        if not is_game:
            print("Failed to start game.")
            browser.close()
            return

        # Hack to advance level
        print("Advancing to Level 2...")
        page.evaluate("window.nextLevel()")
        page.wait_for_timeout(1000)
        print(f"Game State Screen (Lvl 2): {page.evaluate('gameState.screen')}")

        print("Advancing to Level 3...")
        page.evaluate("window.nextLevel()")
        page.wait_for_timeout(1000)
        print(f"Game State Screen (Lvl 3): {page.evaluate('gameState.screen')}")

        browser.close()

if __name__ == "__main__":
    verify_game_levels()
