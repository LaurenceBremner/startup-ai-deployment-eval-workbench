# Visual QA

Surface: AI support-agent deployment risk console
Target: http://127.0.0.1:8788/startup-ai-deployment-eval-workbench/

## Viewports Tested
- desktop-1440: 1440x900
- desktop-1366: 1366x768
- mobile: 390x900

## Screenshots
- desktop-1440: qa/desktop-1440.png
- desktop-1366: qa/desktop-1366.png
- mobile: qa/mobile.png

## Content Checks
- Scenario, synthetic eval set, baseline/revised comparison, code proof, result, recommendation, and rollout-gate language are required.

## Layout Checks
- desktop-1440: no horizontal overflow detected
- desktop-1366: no horizontal overflow detected
- mobile: no horizontal overflow detected
- desktop-1440: no desktop page-level vertical scroll
- desktop-1366: no desktop page-level vertical scroll

## Accessibility Checks
- Main page has a concrete case-study heading.
- Navigation and source links are keyboard-focusable.
- Eval rows use readable status labels rather than color alone.
