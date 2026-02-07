import asyncio
from playwright.async_api import async_playwright
import os

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        file_path = os.path.abspath("loajf.html")
        url = f"file://{file_path}"

        print(f"Navigating to {url}")

        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
        page.on("pageerror", lambda err: print(f"PAGE ERROR: {err}"))
        page.on("dialog", lambda dialog: print(f"DIALOG: {dialog.message}")) # Catch alerts

        try:
            await page.goto(url)
            await page.wait_for_load_state("networkidle")

            # 1. Verify Main Menu
            print("Checking Main Menu...")
            deploy_btn = page.locator("button:has-text('DEPLOY SQUAD')")
            await deploy_btn.wait_for(state="visible", timeout=5000)

            # 2. Click "DEPLOY SQUAD"
            print("Clicking DEPLOY SQUAD...")
            await deploy_btn.click()

            # 3. Check for game start
            # The menu overlay should be hidden
            print("Checking Menu Overlay Hidden...")
            menu_overlay = page.locator("#menuOverlay")
            await menu_overlay.wait_for(state="hidden", timeout=5000)
            print("Menu Overlay Hidden.")

            # Verify game UI elements (HUD)
            print("Checking HUD visibility...")
            hud = page.locator("#gameUI")
            # Wait for HUD to become visible (display: flex)
            # Playwright check for visibility handles 'display: none'
            await hud.wait_for(state="visible", timeout=5000)
            print("HUD Visible.")

            await page.screenshot(path="verification/gameplay_start.png")
            print("VERIFICATION PASSED: Game started successfully.")

        except Exception as e:
            print(f"VERIFICATION FAILED: {e}")
            await page.screenshot(path="verification/gameplay_failure.png")
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
