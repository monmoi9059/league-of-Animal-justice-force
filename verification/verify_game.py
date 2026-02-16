from playwright.sync_api import sync_playwright
import time

def verify_game():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        print("Navigating to game...")
        page.goto("http://localhost:8080/loajf.html")

        # Wait for menu
        print("Waiting for menu...")
        page.wait_for_selector("#menuOverlay", state="visible")

        # Click Deploy Squad (using JS click because it's a game UI)
        print("Clicking Deploy Squad...")
        page.click("button:has-text('DEPLOY SQUAD')")

        # Wait for Lobby
        print("Waiting for Lobby...")
        page.wait_for_selector("#lobbyOverlay", state="visible")

        # Press Space to ready up Player 1 (with delay)
        print("Pressing Space...")
        page.keyboard.press("Space", delay=200)

        # Wait for Start Button
        print("Waiting for Start Button...")
        page.wait_for_selector("#lobbyStartBtn", state="visible")

        # Click Start
        print("Clicking Start...")
        page.click("#lobbyStartBtn")

        # Wait for Game UI (HUD)
        print("Waiting for Game UI...")
        page.wait_for_selector("#gameUI", state="visible")

        # Wait a few seconds for level generation and rendering
        print("Waiting for game render...")
        time.sleep(3)

        # Take screenshot
        print("Taking screenshot...")
        page.screenshot(path="verification/verification.png")

        browser.close()
        print("Done.")

if __name__ == "__main__":
    verify_game()
