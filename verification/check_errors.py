from playwright.sync_api import sync_playwright
import os

def test_game_loads():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Listen for console errors
        errors = []
        page.on("pageerror", lambda err: errors.append(err.message))
        page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)

        # Get the absolute path to loajf.html
        path = os.path.abspath("loajf.html")
        url = f"file://{path}"

        print(f"Loading {url}...")
        page.goto(url)

        # Wait a bit for any async errors
        page.wait_for_timeout(2000)

        if errors:
            print("Errors found:")
            for err in errors:
                print(f"  - {err}")
        else:
            print("No errors found on load.")

        page.screenshot(path="verification/load_test.png")
        browser.close()

if __name__ == "__main__":
    test_game_loads()
