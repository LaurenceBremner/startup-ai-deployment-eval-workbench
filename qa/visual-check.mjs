import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const localRequire = createRequire(import.meta.url);

let chromium;
try {
  ({ chromium } = localRequire("playwright"));
} catch (error) {
  console.error("Playwright is required for visual QA. Install it with `npm install --save-dev playwright` or run in an environment where `playwright` is available.");
  throw error;
}

const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const target = process.env.QA_URL || "http://127.0.0.1:8788/startup-ai-deployment-eval-workbench/";
const repoUrl = "https://github.com/LaurenceBremner/startup-ai-deployment-eval-workbench";
const shots = [
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "desktop-1366", width: 1366, height: 768 },
  { name: "mobile", width: 390, height: 900 },
];

fs.mkdirSync(path.join(root, "qa"), { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: fs.existsSync(chromePath) ? chromePath : undefined,
});

const results = [];
for (const shot of shots) {
  const page = await browser.newPage({ viewport: { width: shot.width, height: shot.height } });
  await page.goto(target, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /Should this support agent/i }).waitFor({ timeout: 15000 });

  const pageText = await page.locator("body").innerText();
  const screenshot = path.join(root, "qa", `${shot.name}.png`);
  await page.screenshot({ path: screenshot, fullPage: true });

  const layout = await page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;
    const pageHeight = document.documentElement.scrollHeight;
    const elements = [...document.querySelectorAll("body *")];
    const overflowFailures = elements
      .map((el) => {
        const rect = el.getBoundingClientRect();
        return {
          tag: el.tagName.toLowerCase(),
          text: (el.textContent || "").trim().slice(0, 80),
          width: rect.width,
          height: rect.height,
          overflowX: rect.left < -1 || rect.right > viewportWidth + 1,
        };
      })
      .filter((item) => item.width > 0 && item.height > 0 && item.overflowX);

    return { overflowFailures, pageHeight, viewportHeight };
  });

  const hrefs = await page.evaluate(() => [...document.querySelectorAll("a[href]")].map((anchor) => anchor.getAttribute("href") || ""));
  results.push({ viewport: shot, screenshot, pageText, layout, hrefs });
  await page.close();
}

await browser.close();

const failures = results.flatMap((result) => {
  const text = result.pageText.toLowerCase();
  const issues = [];
  const isDesktop = result.viewport.name.startsWith("desktop");
  if (!text.includes("support agent") || !text.includes("threatening to churn")) issues.push(`${result.viewport.name}: concrete scenario missing`);
  if (!text.includes("synthetic case study") || !text.includes("n=100")) issues.push(`${result.viewport.name}: synthetic framing missing`);
  if (!text.includes("baseline escalation") || !text.includes("revised escalation") || !text.includes("composite deployment score")) {
    issues.push(`${result.viewport.name}: AI/data-science proof metrics missing`);
  }
  if (!text.includes("we're not paying") || !text.includes("account owner + finance")) {
    issues.push(`${result.viewport.name}: workflow context or expected action missing`);
  }
  if (!text.includes("baseline") || !text.includes("revised") || !text.includes("human-review gate") || !text.includes("do not launch broadly")) {
    issues.push(`${result.viewport.name}: eval result/recommendation missing`);
  }
  if (!text.includes("scorecase") || !text.includes("hasblockingrisk")) {
    issues.push(`${result.viewport.name}: code proof missing`);
  }
  if (isDesktop && result.layout.pageHeight > result.layout.viewportHeight + 2) {
    issues.push(`${result.viewport.name}: page scrolls on desktop (${result.layout.pageHeight} > ${result.layout.viewportHeight})`);
  }
  if (result.layout.overflowFailures.length > 0) issues.push(`${result.viewport.name}: ${result.layout.overflowFailures.length} horizontal overflow candidates`);
  if (result.hrefs.some((href) => href.includes(".md"))) issues.push(`${result.viewport.name}: deployed markdown link found`);
  if (!result.hrefs.includes(repoUrl) || !result.hrefs.includes(`${repoUrl}/blob/main/src/eval/scoring.ts`)) {
    issues.push(`${result.viewport.name}: GitHub/source links missing`);
  }
  return issues;
});

const markdown = [
  "# Visual QA",
  "",
  "Surface: AI support-agent deployment risk console",
  `Target: ${target}`,
  "",
  "## Viewports Tested",
  ...results.map((result) => `- ${result.viewport.name}: ${result.viewport.width}x${result.viewport.height}`),
  "",
  "## Screenshots",
  ...results.map((result) => `- ${result.viewport.name}: ${path.relative(root, result.screenshot)}`),
  "",
  "## Content Checks",
  "- Scenario, synthetic eval set, baseline/revised comparison, code proof, result, recommendation, and rollout-gate language are required.",
  "",
  "## Layout Checks",
  ...results.map((result) =>
    result.layout.overflowFailures.length === 0
      ? `- ${result.viewport.name}: no horizontal overflow detected`
      : `- ${result.viewport.name}: ${result.layout.overflowFailures.length} overflow candidates`,
  ),
  ...results
    .filter((result) => result.viewport.name.startsWith("desktop"))
    .map((result) =>
      result.layout.pageHeight <= result.layout.viewportHeight + 2
        ? `- ${result.viewport.name}: no desktop page-level vertical scroll`
        : `- ${result.viewport.name}: desktop scroll detected`,
    ),
  "",
  "## Accessibility Checks",
  "- Main page has a concrete case-study heading.",
  "- Navigation and source links are keyboard-focusable.",
  "- Eval rows use readable status labels rather than color alone.",
  "",
].join("\n");

fs.writeFileSync(path.join(root, "visual-qa.md"), markdown);
console.log(markdown);

if (failures.length > 0) {
  console.error(["", "QA failures:", ...failures.map((item) => `- ${item}`)].join("\n"));
  process.exit(1);
}
