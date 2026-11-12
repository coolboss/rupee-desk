# Audit: Tax Desk and Rupee for Life

Checked 11 November 2026. Method: both calculation engines were lifted out of the HTML and run against an independent engine on 60,000 income combinations (both regimes, three age bands, HUF, gains of every kind). Both pages were also opened in headless Chrome at 390 px and 1280 px. Rates and rules were checked against current sources (Budget 2026, Income-tax Rules 2026, Finance Ministry and RBI notices).

Severity: **High** = wrong rupee figure a user could act on. **Medium** = wrong or misleading in a narrower case, or a real usability failure. **Low** = polish.

## What is right

- Slabs, the ₹60,000 rebate, the ₹75,000/₹50,000 standard deduction, cess, 20% / 12.5% equity gains with the ₹1.25 lakh threshold, and the basic-exemption set-off against gains all match the law. On slab-only income the two engines agree with the reference to the rupee at every level from ₹0 to ₹7 crore.
- Budget 2026 left slabs unchanged, so "same rates for FY 2025-26 and Tax Year 2026-27" holds.
- Section renumbering quoted (80C → 123, 87A → 156, 80D → 126) is correct.
- Every rate in Rupee for Life dated October to December 2026 checks out: PPF 7.1, SSY 8.2, SCSS 8.2, NSC 7.7, KVP 7.5 (115 months), POMIS 7.4, post-office TD 6.9/7.0/7.1/7.5, RD 6.7, EPF 8.25 (FY 2025-26), RBI floating bond 8.05, SBI up to 6.45 / 7.05 senior, repo 5.50% from 7 October 2026.
- Budget 2026 items are stated correctly: buybacks taxed as capital gains, SGB exemption only for original subscribers held to maturity, no interest deduction against dividends.
- NPS: 80% lump sum / 20% annuity above ₹12 lakh is right, and the caution that only 60% is tax-free is right. Budget 2026 did not extend the exemption.
- No console errors, no sideways scroll at phone width, in either page.

## Tax Desk

### Accuracy

| # | Sev | Finding | Fix |
|---|-----|---------|-----|
| T1 | High | **Surcharge above ₹2 crore when "other long-term gains" are present.** `exG=total-stcg-ltcg` leaves s.112 gains (property, gold, unlisted shares) inside the income that decides the 25% / 37% rate. The law excludes s.111A, s.112 **and** s.112A gains, and dividends. Example: slab income ₹4.995 crore, ₹1 crore property gain, old regime: the page charges 37% on slab tax, the law says 25%. Overstated by up to ₹18.5 lakh; 5,837 of 60,000 test cases differ. | `exG = total - stcg - ltcg - ltO - dividends` |
| T2 | Medium | **Dividends get no 15% surcharge cap.** Dividend income is taxed at slab but its surcharge is capped at 15%. Matters above ₹2 crore. | Apportion slab tax by dividend share and cap that part. |
| T3 | Medium | **Marginal relief uses a ₹5 crore threshold in the new regime**, where no such step exists (`T=total>5e7?5e7:…`). With gains present this hands out relief in some cases and not in comparable ones (gap up to ₹5.2 lakh in tests). | Use ₹5 crore only for the old regime. |
| T4 | Medium | **HRA city list is out of date for Tax Year 2026-27.** From 1 April 2026 the 50% cities are eight: Delhi, Mumbai, Kolkata, Chennai, Bengaluru, Hyderabad, Pune, Ahmedabad. The form asks about four. Right for FY 2025-26, wrong for the year the page also claims to cover. | Add a year selector, or reword the question by year. |
| T5 | Medium | **Regime-switch sentence is wrong.** It says a business taxpayer "can switch from the old to the new regime freely, but back to the old only once". The rule: having opted for the old regime, you may return to the new regime once, and then can never choose the old again while you have business income. | Reword. |
| T6 | Medium | **"FY 2025-26 and Tax Year 2026-27" reads as one year.** They are two different years (AY 2026-27 and AY 2027-28 in old terms). Advance-tax dates, TDS and "what is still to pay" belong to one of them, and the page never says which. | Year selector; show the due dates with their year. |
| T7 | Low | Old-regime rebate is not given against s.112 gains tax (only s.112A is barred). Understates the rebate by up to ₹12,500 for small taxpayers with property or gold gains. | Include `ltO` tax in the old-regime rebate base. |
| T8 | Low | Marginal relief near ₹12 lakh is cut off at ₹13 lakh (`total<13*L`). The Act has no such limit; with special-rate gains the relief can run a little past it (₹11,284 in one test). | Drop the guard. |
| T9 | Low | No capital-loss set-off, no 44AD, no crypto, no agricultural income. Stated in the footer for some, not all. | Model or state. |
| T10 | Low | 234C interest is charged on instalments that are not yet due, and 234B is always charged for 4 months, so in November the "still to pay" figure includes interest that has not arisen. | Use today's date; show accrued and projected interest separately. |
| T11 | Low | Tax is not rounded to the nearest ₹10 (s.288B). | `Math.round(tax/10)*10` |

### Bugs

| # | Sev | Finding |
|---|-----|---------|
| T12 | High | **HUF tab shows amounts under the wrong headings.** `data-sum` uses the index in the filtered section list, `renderOut` indexes the unfiltered one. Verified: ₹6 lakh of FD interest for the HUF appears beside "Capital gains". Also the "Tax already paid" section opens by index 7 and so never opens for an HUF. |
| T13 | Medium | **Markup in a name is rendered as HTML.** `renderTabs` writes `p.name` into `innerHTML` unescaped; the household table does too. Typing `A<b>x</b>` produces bold text in the tab. A saved file with a crafted name would run script. |
| T14 | Medium | **`step="1000"` on every number field.** "Months until you pay" (4) and professional tax (2,500) fail browser validation, and the spinner on the months field jumps from 4 to 1,000. |
| T15 | Medium | **"Clear this person" deletes with no confirmation and no undo.** |
| T16 | Low | Age select holds 30 / 65 / 82 but stored ages are 45 and 43, so no option is `selected`; it works only because the browser falls back to the first option. |
| T17 | Low | People are fixed at Self, Spouse, HUF. No way to add a parent or an adult child, or remove the HUF. |

### UI and UX

| # | Sev | Finding |
|---|-----|---------|
| T18 | High | **On a phone the answer is 3,700 px below the first field.** The tax sheet is sticky on desktop only. A phone user fills in a long form and sees no result until the very end. Needs a pinned summary bar (tax, regime, still to pay). |
| T19 | Medium | No export, import or print; data lives only in `localStorage`, which is not durable inside a hosted artifact frame. |
| T20 | Medium | Tabs carry `role="tab"` without tab panels or arrow-key support; the include checkbox sits inside the `tablist`. `<title>` and `<meta>` sit in `<body>`. |
| T21 | Low | The effective-rate line divides by gross income, the label says "taxable"; the two regimes then show different "taxable" figures with no explanation. |
| T22 | Low | No explanation when the rebate is lost because of capital gains, the most common surprise in the new regime. |

## Rupee for Life

### Accuracy

| # | Sev | Finding | Fix |
|---|-----|---------|-----|
| R1 | High | **Same surcharge error as T1** in `taxCalc` (`exGains` leaves `ltcgOther` in). Same size of error; 4,937 of 60,000 cases. | As T1. |
| R2 | High | **The grand comparator ranks products for sums they cannot take.** PPF and SSY accept ₹1.5 lakh a year, SCSS ₹30 lakh a person, POMIS ₹9 lakh, EPF only salary contributions. The slider goes to ₹1 crore and 30 years and shows all of them compounding the full sum with no warning. | Flag or grey rows above the limit; show the limit. |
| R3 | Medium | **Payout products are compounded.** SCSS, POMIS and the RBI bond pay interest out; `grow` reinvests it at the product's own rate for up to 30 years (SCSS runs 5 + 3). Overstates them against PPF. | Reinvest payouts at an FD rate, or say so. |
| R4 | Medium | **NPS maths contradicts the NPS chapter.** The text teaches 80% lump sum and 20% annuity; `grow` uses 60% tax-free and 40% taxed at slab on day one. | One model, stated. |
| R5 | Medium | **"0% bracket" still taxes equity at 13% and 20.8%.** `effRates(0)` returns full special rates, though the gains chapter teaches that unused basic exemption absorbs them. Low-income retirees see equity penalised. | Zero the gains rates in the 0% bracket, or model the exemption. |
| R6 | Medium | **Bank FD at 6.45% for any term.** 6.45% is SBI's 444-day special. Two to three years pays 6.40%, five years 6.05%. | Use the rate for the chosen term. |
| R7 | Low | Clubbing: the ₹1,500 per child exemption exists only in the old regime. Text presents it as general. | Add "old regime". |
| R8 | Low | T7 and T8 apply here too (old-regime rebate against s.112; ₹13 lakh guard). | |
| R9 | Low | "80CCD(1B) (now s.124(4))": could not confirm the sub-section; the confirmed mapping is s.124. Franklin Templeton AUM figure of ₹25,648 crore differs from the ₹25,215 crore usually cited with the 109% recovery. | Check both. |
| R10 | Low | Quick tax calculator compares regimes on the same taxable income; it says so, but the green "better" badge still invites a wrong conclusion. | Drop the badge. |
| R11 | Low | DICGC: still ₹5 lakh, but a rise to ₹7.5 lakh has been proposed. Worth a line. | |

### Bugs

| # | Sev | Finding |
|---|-----|---------|
| R12 | Medium | `aria-live="polite"` on the whole article: a screen reader re-reads the full chapter on every chapter change. |
| R13 | Medium | Dialogs have no focus trap and do not return focus to the button that opened them. |
| R14 | Low | Stray attribute `class2=""` and a duplicated `class` in `waterfall`; unused `lo` in `slabRate`; `brSeg` builds a slider, not a segmented control. |
| R15 | Low | `updateStrip` calls `getBoundingClientRect` once per chip on every resize. |
| R16 | Low | Retirement simulation is fixed at 400 runs with one seed and gives no range; the tax panel assumes 45% of each SWP is gain, unexplained in the control. |

### UI and UX

| # | Sev | Finding |
|---|-----|---------|
| R17 | Medium | **Risk map labels collide and are cut at 24 characters** on desktop: "National Savings Certifi", "Balanced advantage / hyb", "Bank FD" under a dot. Crypto is drawn at 0% return though it is never eligible. |
| R18 | Medium | Chapter chips are 22 px, well under a comfortable 44 px target. 27 of 37 controls on desktop are under 36 px in one dimension. |
| R19 | Medium | Nothing is personal. The reader picks a bracket by hand in each chapter; the trainer never learns their income, age or regime, so the two tools cannot inform each other. |
| R20 | Low | The guided tour auto-advances into the next chapter and scrolls the page on a phone. |
| R21 | Low | Progress is kept only in `localStorage`. |

## What the new app does about these

Rupee Desk uses one engine for everything. It fixes T1 to T3, T7, T8, T10, T11 and R1; adds a year selector with the right HRA cities and due dates (T4, T6); models loss set-off, 44AD, crypto and agricultural income (T9); pins the result on phones (T18); escapes all user text (T13); lets you add and remove people (T17); backs data up and exports it (T19); flags investment limits and uses each person's own marginal rates in the comparator (R2, R5, R19). The engine ships with 115 hand-worked tests.

One judgement call to know about: where slab income sits just above ₹2 crore or ₹5 crore and there are also large capital gains, the Finance Act words marginal relief on total income only, so the surcharge on slab tax can step up sharply. Rupee Desk follows the Act's wording, which is the cautious reading. Ask your CA if you are near that edge.
