# Rupee Desk

A private household finance planner for India, in one HTML file, for every age, income and occupation. A two-minute setup builds a ten-step plan that adapts to life stage, income band and occupation (salaried, government, professional, business owner, freelancer, farmer, homemaker, student, retired). Also: net worth, cash flow, income tax under both regimes with advance tax and interest, a business and practice page (presumptive scheme or books, audit and GST limits), goals, retirement, loans, insurance, after-tax comparison of investment options, calculators and a money calendar.

- `index.html` is the whole app. Open it, or turn on GitHub Pages for this repo (Settings, Pages, branch `main`, folder `/`).
- `src/engine.js` holds every calculation and has no DOM code. `src/core.js`, `views1.js`, `views2.js`, `views3.js` and `boot.js` are the interface.
- `node build.js` rebuilds `index.html` from `src/`.
- `node tests/engine.test.js` runs 115 hand-worked cases. `node tests/ui.js`, `tests/flows.js` and `tests/flows2.js` drive the built page in headless Chrome through Playwright (`npm i playwright`) (every page at phone and desktop size, light and dark; 160 interaction checks across five example households).
- `AUDIT.md` is the review of Tax Desk and Rupee for Life that led to this app.

Tax rules verified 11 November 2026 for FY 2025-26 and Tax Year 2026-27. Investment rates as of 1 October to 31 December 2026. A planning aid, not advice.

Data stays in the browser (`localStorage`). When the page runs as a Claude artifact it also keeps a private per-viewer copy in the artifact's store. Export a backup from Data and backup.

Rupee Desk is not a SEBI-registered investment adviser. The plan applies common rules of thumb to the numbers entered and names categories, never specific securities.
