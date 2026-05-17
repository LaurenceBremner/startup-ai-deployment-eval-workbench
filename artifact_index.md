# Artifact Index

| Path | Type | Verification command | Pass status | Blocker |
| --- | --- | --- | --- | --- |
| `README.md` | Project overview | `test -s README.md` | Pass | None |
| `index.html` / `src/App.tsx` | Demo page | `npm run build` | Pass | None |
| `src/data/startup_workflow_cases.json` | Synthetic eval data | `node -e "console.log(require('./src/data/startup_workflow_cases.json').length)"` | Pass: 24 cases | None |
| `src/data/model_runs.json` | Synthetic model outputs | `node -e "console.log(require('./src/data/model_runs.json').map(r=>r.outcomes.length))"` | Pass: 2 runs, 24 outcomes each | None |
| `src/data/eval_results.json` | Decision notes | `test -s src/data/eval_results.json` | Pass | None |
| `src/eval/scoring.ts` | Scoring logic | `npm test` | Pass: 6/6 tests | None |
| `src/eval/scoring.test.ts` | Test coverage | `npm test` | Pass: 6/6 tests | None |
| `screenshots/desktop.png` | Desktop visual QA | `test -s screenshots/desktop.png` | Pass | None |
| `screenshots/mobile.png` | Mobile visual QA | `test -s screenshots/mobile.png` | Pass | None |
