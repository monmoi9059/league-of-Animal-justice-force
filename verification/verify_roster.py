import asyncio
from playwright.async_api import async_playwright
import os

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Open the file
        file_path = os.path.abspath("loajf.html")
        url = f"file://{file_path}"

        print(f"Navigating to {url}")

        # Listen for console errors
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
        page.on("pageerror", lambda err: print(f"PAGE ERROR: {err}"))

        try:
            await page.goto(url)
            await page.wait_for_load_state("networkidle")

            # 1. Verify Main Menu is visible
            print("Checking Main Menu visibility...")
            deploy_btn = page.locator("button:has-text('DEPLOY SQUAD')")
            view_team_btn = page.locator("button:has-text('VIEW TEAM')")

            await deploy_btn.wait_for(state="visible", timeout=5000)
            await view_team_btn.wait_for(state="visible", timeout=5000)
            print("Main Menu buttons found.")

            await page.screenshot(path="verification/1_main_menu.png")

            # 2. Click "VIEW TEAM"
            print("Clicking VIEW TEAM...")
            await view_team_btn.click()

            # 3. Verify Roster UI
            print("Checking Roster UI visibility...")
            # Check for "ROSTER STATUS" text drawn on canvas? Or verify overlay?
            # Canvas text is hard to verify via locator. Verify the overlay buttons.
            back_btn = page.locator("#rosterOverlay button:has-text('BACK')")
            await back_btn.wait_for(state="visible", timeout=5000)
            print("Roster 'BACK' button found.")

            # Verify Main Menu buttons are hidden
            if await deploy_btn.is_visible():
                print("ERROR: Main Menu buttons still visible!")
            else:
                print("Main Menu buttons successfully hidden.")

            await page.screenshot(path="verification/2_roster_screen.png")

            # 4. Click "BACK"
            print("Clicking BACK...")
            await back_btn.click()

            # 5. Verify Main Menu again
            print("Checking Main Menu visibility again...")
            await deploy_btn.wait_for(state="visible", timeout=5000)
            print("Returned to Main Menu successfully.")

            await page.screenshot(path="verification/3_back_to_menu.png")

            print("VERIFICATION PASSED!")

        except Exception as e:
            print(f"VERIFICATION FAILED: {e}")
            await page.screenshot(path="verification/failure.png")
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
