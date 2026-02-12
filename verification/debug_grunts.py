from playwright.sync_api import sync_playwright
import time
import os
import math

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        cwd = os.getcwd()
        page.goto(f"file://{cwd}/loajf.html")

        # Capture console logs
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))

        # Check for errors
        errors = []
        page.on("pageerror", lambda exc: errors.append(exc))

        # Start game
        page.evaluate("window.startGame()")

        # Wait for physics to settle (enemies would fall if bug persisted)
        # Also wait long enough for FlyingEnemy to shoot (100 frames ~ 1.6s)
        print("Waiting 3 seconds for physics and events...")
        time.sleep(3)

        # Get Entity Data
        data = page.evaluate("""() => {
            return window.entities.map(e => ({
                type: e.constructor.name,
                x: e.x,
                y: e.y,
                w: e.w,
                h: e.h
            }));
        }""")

        level_height_px = 60 * 40

        nan_count = 0
        grunt_count = 0
        valid_grunts = 0
        fallen_grunts = 0

        print(f"Total Entities: {len(data)}")

        for e in data:
            if e['type'] == 'Enemy':
                grunt_count += 1
                if e['x'] is None or e['y'] is None or math.isnan(e['x']) or math.isnan(e['y']):
                    nan_count += 1
                    # print(f"NaN Grunt detected: {e}")
                elif e['y'] > level_height_px:
                    fallen_grunts += 1
                    # print(f"Grunt fell out of world: Y={e['y']}")
                else:
                    valid_grunts += 1

        print(f"Grunts: {grunt_count}")
        print(f"NaN Grunts: {nan_count}")
        print(f"Fallen Grunts: {fallen_grunts}")
        print(f"Valid Grunts: {valid_grunts}")

        if len(errors) > 0:
            print("CRITICAL: Javascript Errors Detected:")
            for e in errors:
                print(e)
        else:
            print("No JS Errors detected.")

        if valid_grunts > 0 and len(errors) == 0:
            print("VERIFICATION SUCCESS: Grunts exist, stay on ground, and no crashes.")
        else:
            print("VERIFICATION FAILED.")

        browser.close()

if __name__ == "__main__":
    run()
