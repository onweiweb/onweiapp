import { expect, test } from "@playwright/test";

// 960 = 150% zoom on a 1440 screen, 1280 = 150% on 1920, 1024/768 = tablet range.
const WIDTHS = [
  320, 360, 390, 430, 600, 768, 960, 1024, 1280, 1440, 1920, 2560,
];
const PAGES = [
  "/ontheway",
  "/about",
  "/",
  "/collection/pickleball",
  "/collection/pilates",
];
const TAG = process.env.SHOT_TAG ?? "after";

for (const width of WIDTHS) {
  for (const path of PAGES) {
    test(`${path} @ ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: width < 768 ? 800 : 900 });
      await page.goto(path, { waitUntil: "networkidle" });
      // Redirected by the WAITLIST gate: nothing to measure for this page.
      test.skip(
        path !== "/ontheway" && page.url().endsWith("/ontheway"),
        "gated by site mode",
      );
      // Lazy images below the fold only load once scrolled near, so walk the page first.
      await page.evaluate(async () => {
        for (
          let y = 0;
          y < document.body.scrollHeight;
          y += window.innerHeight / 2
        ) {
          window.scrollTo({ top: y, behavior: "instant" });
          await new Promise((r) => setTimeout(r, 60));
        }
        window.scrollTo({ top: 0, behavior: "instant" });
        await new Promise((r) => setTimeout(r, 300));
      });
      await page.screenshot({
        path: `e2e/shots/${TAG}/${path.replace(/\W+/g, "_") || "home"}_${width}.png`,
        fullPage: true,
      });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow, "horizontal overflow (px)").toBeLessThanOrEqual(0);
      // body clips overflow-x, which can hide real overflow from scrollWidth,
      // so also check element edges outside any scroll/clip container.
      const offenders = await page.evaluate(() => {
        const out: string[] = [];
        document.querySelectorAll("body *").forEach((el) => {
          const b = el.getBoundingClientRect();
          if (
            b.width === 0 ||
            (b.right <= window.innerWidth + 1 && b.left >= -24)
          )
            return;
          const style = getComputedStyle(el);
          if (
            style.position === "fixed" ||
            style.visibility === "hidden" ||
            style.display === "none"
          )
            return;
          let p = el.parentElement;
          while (p && p !== document.body) {
            const o = getComputedStyle(p).overflowX;
            if (
              o === "auto" ||
              o === "scroll" ||
              o === "hidden" ||
              o === "clip"
            )
              return;
            p = p.parentElement;
          }
          out.push(
            `${el.tagName}.${String(el.className).slice(0, 80)} [${Math.round(b.left)},${Math.round(b.right)}]`,
          );
        });
        return out.slice(0, 8);
      });
      expect(offenders, "elements outside the viewport").toEqual([]);
    });
  }
}
