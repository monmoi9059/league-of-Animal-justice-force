import asyncio
import os
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context()
        page = await context.new_page()

        # Load the local HTML file
        file_path = os.path.abspath("loajf.html")
        await page.goto(f"file://{file_path}")

        # Define the XSS payload
        # We use a payload that would set a global variable if executed
        xss_payload = "<img src=x onerror='window.xss_executed=true'>"

        # Inject the payload via window.onerror
        await page.evaluate(f"""
            window.xss_executed = false;
            if (typeof window.onerror === 'function') {{
                window.onerror("{xss_payload}", "test.js", 1, 1);
            }} else {{
                console.error("window.onerror is not a function");
            }}
        """)

        # Check if the error overlay is visible
        overlay_visible = await page.is_visible("#errorOverlay")
        print(f"Error overlay visible: {overlay_visible}")

        # Check if the XSS was executed
        xss_executed = await page.evaluate("window.xss_executed")
        print(f"XSS executed: {xss_executed}")

        # Check the text content of the overlay
        overlay_text = await page.inner_text("#errorOverlay")
        # print(f"Overlay text: {overlay_text}")
        print(f"Overlay text contains payload: {xss_payload in overlay_text}")

        assert overlay_visible == True
        assert xss_executed == False
        assert xss_payload in overlay_text

        print("Verification successful: XSS payload was treated as text.")

        # Take a screenshot for visual confirmation
        await page.screenshot(path="verification/xss_fix_verification.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
