import os
from playwright.sync_api import sync_playwright

def verify_boss_placement():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        file_path = os.path.abspath("loajf.html")
        page.goto(f"file://{file_path}")

        # Start Game
        page.wait_for_selector("text=DEPLOY SQUAD")
        page.click("text=DEPLOY SQUAD")
        page.wait_for_timeout(2000)

        # Check Level 1 Boss
        boss_x = page.evaluate("""
            () => {
                let boss = entities.find(e => e.constructor.name === 'Boss' || e.constructor.name === 'HelicopterBoss');
                return boss ? boss.x : -1;
            }
        """)

        level_width_tiles = page.evaluate("LEVEL_WIDTH")
        tile_size = page.evaluate("TILE_SIZE")
        level_width = level_width_tiles * tile_size

        print(f"Level 1 Boss X: {boss_x} (Level Width: {level_width})")

        if boss_x == -1:
            print("ERROR: No Boss found in Level 1!")
        elif boss_x > level_width - (25 * tile_size):
            print("INFO: Boss is near the end in Level 1 (could be random).")
        else:
            print("SUCCESS: Boss is spawned within the level (before the end arena).")

        # Set Level to 20 and Restart Level
        page.evaluate("gameState.currentLevel = 20; window.startGame();")
        page.wait_for_timeout(2000)

        # Check Level 20 Boss
        boss_x_20 = page.evaluate("""
            () => {
                let boss = entities.find(e => e.constructor.name === 'Boss' || e.constructor.name === 'HelicopterBoss');
                return boss ? boss.x : -1;
            }
        """)

        print(f"Level 20 Boss X: {boss_x_20}")

        expected_x = (level_width_tiles - 20) * tile_size

        if boss_x_20 == -1:
             print("ERROR: No Boss found in Level 20!")
        elif abs(boss_x_20 - expected_x) < 200: # Within margin
             print("SUCCESS: Boss is correctly placed in the end arena for Level 20.")
        else:
             print(f"FAILURE: Boss in Level 20 is at {boss_x_20}, expected ~{expected_x}")

        browser.close()

if __name__ == "__main__":
    verify_boss_placement()
