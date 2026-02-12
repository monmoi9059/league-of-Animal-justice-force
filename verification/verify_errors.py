
import os
from playwright.sync_api import sync_playwright

def verify_errors():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Listen for errors
        page.on("console", lambda msg: print(f"Console: {msg.text}"))
        page.on("pageerror", lambda err: print(f"PageError: {err}"))

        file_path = os.path.abspath("loajf.html")
        page.goto(f"file://{file_path}")

        # Wait for potential errors on load
        page.wait_for_timeout(1000)

        # Start Game
        try:
            page.click("text=DEPLOY SQUAD")
        except Exception as e:
            print(f"Could not click DEPLOY SQUAD: {e}")

        page.wait_for_timeout(3000)

        # Simulate some basic gameplay (move, shoot) to trigger loops
        page.keyboard.press("ArrowRight")
        page.wait_for_timeout(500)
        page.keyboard.press("z") # Shoot
        page.wait_for_timeout(500)
        page.keyboard.press("ArrowLeft")
        page.wait_for_timeout(500)

        browser.close()

if __name__ == "__main__":
    verify_errors()
