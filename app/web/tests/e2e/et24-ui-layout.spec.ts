import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { THEME_LIST } from "./themes";

test.use({ locale: "pt-BR" });
for (const theme of THEME_LIST)
  for (const language of ["pt-BR", "en"]) {
    test(`AU-U01/U02 home ${theme} ${language}: font-aware composition around breakpoints`, async ({
      page,
    }, info) => {
      test.setTimeout(120000);
      await page.goto("/");
      await page.locator("header.app-header select").nth(1).selectOption(theme);
      await page.locator("header.app-header select").first().selectOption(language);
      await page.evaluate(() => document.fonts.ready);
      for (const width of [375, 599, 600, 601, 799, 800, 801, 899, 900, 901, 1064, 1200, 1920]) {
        await page.setViewportSize({ width, height: 892 });
        for (const scale of [1, 2]) {
          await page.evaluate(
            (s) => (document.documentElement.style.fontSize = `${16 * s}px`),
            scale,
          );
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
            `${theme}/${language} ${width}/${scale}`,
          ).toBe(true);
          expect(
            await page.locator(".home-grid").evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
            `home ${width}/${scale}`,
          ).toBe(true);
          expect(
            await page.locator(".choice-card").evaluateAll((cards) => {
              const canvas = document.createElement("canvas");
              const context = canvas.getContext("2d");
              if (!context) throw new Error("No text measurement context");
              return cards
                .flatMap((card) => [...card.querySelectorAll<HTMLElement>(".choice-title,button")])
                .filter((el) => {
                  const style = getComputedStyle(el);
                  context.font = style.font;
                  const maxWord = Math.max(
                    ...(el.textContent ?? "")
                      .trim()
                      .split(/\s+/)
                      .map((word) => context.measureText(word).width),
                  );
                  const available =
                    el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
                  return maxWord > available + 1;
                })
                .map((el) => el.textContent);
            }),
            `whole words ${width}/${scale}`,
          ).toEqual([]);
          const button = page.getByTestId("objective-start");
          const box = await button.boundingBox();
          expect(box?.height ?? 0).toBeGreaterThanOrEqual(40 - 0.01);
          expect(
            await button.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
            `button ${width}/${scale}`,
          ).toBe(true);
        }
      }
      await page.setViewportSize({ width: 1064, height: 892 });
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.screenshot({
        path: info.outputPath(`home-${theme}-${language}-1064-200.png`),
        fullPage: true,
      });
      await page.evaluate(() => (document.documentElement.style.fontSize = "16px"));
      await page.setViewportSize({ width: 1200, height: 892 });
      await page.screenshot({
        path: info.outputPath(`home-${theme}-${language}-1200.png`),
        fullPage: true,
      });
    });
  }
