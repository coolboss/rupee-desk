/* Rupee Desk engine tests: hand-worked cases. Run: node tests/engine.test.js */
const FE = require("../src/engine.js");
const L = 1e5, CR = 1e7;
let pass = 0, fail = 0;
function eq(name, got, want, tol = 10) { if (Math.abs(got - want) <= tol) pass++; else { fail++; console.log("FAIL", name, "got", got, "want", want); } }
function ok(name, cond) { if (cond) pass++; else { fail++; console.log("FAIL", name); } }
const T = (c, o) => FE.taxOn(Object.assign({ normal: 0, div: 0, st: 0, lt: 0, lo: 0, vda: 0, agri: 0 }, c), Object.assign({ regime: "new", age: 40 }, o || {}));
const P = (t, extra) => Object.assign({ id: "a", name: "A", kind: "ind", age: 40, regime: "auto", t }, extra || {});

/* --- new regime slabs and rebate --- */
eq("new 12L nil", T({ normal: 12 * L }).tax, 0);
eq("new 12.25L marginal relief", T({ normal: 12.25 * L }).tax, 26000);
eq("new 12.75L past relief", T({ normal: 12.75 * L }).tax, 71250 * 1.04);
eq("new 16L", T({ normal: 16 * L }).tax, 120000 * 1.04);
eq("new 30L", T({ normal: 30 * L }).tax, 499200);
eq("new 24L", T({ normal: 24 * L }).tax, 300000 * 1.04);
/* --- old regime --- */
eq("old 5L nil", T({ normal: 5 * L }, { regime: "old" }).tax, 0);
eq("old 5.01L", T({ normal: 5.01 * L }, { regime: "old" }).tax, (12500 + 200) * 1.04);
eq("old 30L", T({ normal: 30 * L }, { regime: "old" }).tax, 741000);
eq("old senior 10L", T({ normal: 10 * L }, { regime: "old", age: 65 }).tax, 110000 * 1.04);
eq("old 80+ 10L", T({ normal: 10 * L }, { regime: "old", age: 82 }).tax, 100000 * 1.04);
eq("old HUF 5L no rebate", T({ normal: 5 * L }, { regime: "old", huf: true }).tax, 12500 * 1.04);
eq("new HUF 12L no rebate", T({ normal: 12 * L }, { huf: true }).tax, 60000 * 1.04);
/* --- surcharge and marginal relief --- */
eq("new 50L no surcharge", T({ normal: 50 * L }).tax, 1080000 * 1.04);
eq("new 50L+10 marginal relief", T({ normal: 50 * L + 10 }).exact, 1080010 * 1.04, 1);
eq("new 60L 10%", T({ normal: 60 * L }).tax, 1380000 * 1.1 * 1.04);
eq("new 1cr no jump", T({ normal: CR }).tax, 2580000 * 1.1 * 1.04);
eq("new 1cr+1000 relief", T({ normal: CR + 1000 }).exact, (2580000 * 1.1 + 1000) * 1.04, 1);
eq("new 2cr 15%", T({ normal: 2 * CR }).tax, 5580000 * 1.15 * 1.04);
eq("new 3cr 25%", T({ normal: 3 * CR }).tax, 8580000 * 1.25 * 1.04);
eq("new 6cr stays 25%", T({ normal: 6 * CR }).tax, 17580000 * 1.25 * 1.04);
eq("old 6cr 37%", T({ normal: 6 * CR }, { regime: "old" }).tax, (112500 + 17700000) * 1.37 * 1.04);
ok("relief never negative step", (() => { let prev = T({ normal: 49 * L - 37000 }, { regime: "old" }).exact; for (let x = 49 * L; x < 5.2 * CR; x += 37000) { const t = T({ normal: x }, { regime: "old" }).exact; if (t < prev - 1 || t - prev > 37000 * 1.04 + 1) return false; prev = t; } return true; })());
/* --- capital gains --- */
eq("rebate catch: 11L + 1L STCG", T({ normal: 11 * L, st: L }).tax, 20800);
eq("retiree 3L interest + 2L LTCG", T({ normal: 3 * L, lt: 2 * L }).tax, 0);
eq("LTCG 4L at 30L", T({ normal: 30 * L, lt: 4 * L }).tax - T({ normal: 30 * L }).tax, 35750);
eq("12L + 1.25L exempt LTCG loses rebate", T({ normal: 12 * L, lt: 1.25 * L }).tax, 62400);
eq("old 4L + 1L STCG rebate covers", T({ normal: 4 * L, st: L }, { regime: "old" }).tax, (7500 + 20000 - 12500) * 1.04);
eq("old 4L + 1L LTCG(112A) under threshold", T({ normal: 4 * L, lt: L }, { regime: "old" }).tax, 0);
eq("gains fill basic exemption", T({ normal: 0, st: 5 * L }).tax, 20000 * 1.04);
eq("crypto flat 30%", T({ normal: 0, vda: L }).tax, 31200);
/* surcharge cap on gains */
eq("2.5cr incl 1cr LTCG: 15% on all", T({ normal: 1.5 * CR, lt: CR }).tax, ((4080000) + (CR - 1.25 * L) * .125) * 1.15 * 1.04, 20);
eq("3cr slab + 1cr LTCG: 25% slab, 15% gains", T({ normal: 3 * CR, lt: CR }).tax, (8580000 * 1.25 + (CR - 1.25 * L) * .125 * 1.15) * 1.04, 20);
eq("other LTCG (s.112) also capped", T({ normal: 3 * CR, lo: CR }).tax, (8580000 * 1.25 + CR * .125 * 1.15) * 1.04, 20);
eq("dividend capped at 15%", T({ normal: 3 * CR, div: 3 * CR }).tax, 8580000 * 1.15 * 1.04, 20);
/* agricultural income: rate purposes only */
eq("agri integration", T({ normal: 10 * L, agri: 5 * L }, { regime: "old" }).tax, (FE.slabTax(15 * L, FE.oldSlabs(40)) - FE.slabTax(7.5 * L, FE.oldSlabs(40))) * 1.04);

/* --- persons --- */
let r = FE.computePerson(P({ salary: 12.75 * L }), "2026-27", "new"); eq("salary 12.75L nil", r.tax, 0);
r = FE.computePerson(P({ salary: 20 * L, c80: 1.5 * L, nps1b: 50000, medSelf: 25000 }), "2026-27", "old"); eq("old 20L with deductions", r.tax, 343200);
r = FE.computePerson(P({ salary: 20 * L }), "2026-27", "new"); eq("new 20L", r.tax, 192400);
/* HRA: Pune is a 50% city only from TY 2026-27; the engine takes the user's yes/no */
r = FE.computePerson(P({ salary: 24 * L, basic: 10 * L, hra: 4 * L, rent: 3.6 * L, metro: "yes" }), "2026-27", "old"); eq("HRA least of three", r.hra, 2.6 * L);
r = FE.computePerson(P({ salary: 0, receipts: 30 * L, bizMode: "44ada" }), "2026-27", "new"); eq("44ADA 50%", r.biz, 15 * L);
r = FE.computePerson(P({ turnDigital: 1 * CR, turnCash: 10 * L, bizMode: "44ad" }), "2026-27", "new"); eq("44AD 6/8%", r.biz, 6 * L + 80000);
r = FE.computePerson(P({ rentRecv: 6 * L, muni: 20000, hlLet: 5 * L }), "2026-27", "new"); eq("let-out loss not set off in new", r.hp, 0);
r = FE.computePerson(P({ salary: 20 * L, hlSelf: 3 * L }), "2026-27", "old"); eq("self-occupied capped 2L", r.hp, -2 * L);
r = FE.computePerson(P({ st111A: -2 * L, lt112A: 5 * L, salary: 30 * L }), "2026-27", "new"); eq("ST loss set off against LT gain", r.c.lt, 3 * L);
r = FE.computePerson(P({ st111A: 2 * L, lt112A: -5 * L, salary: 30 * L }), "2026-27", "new"); eq("LT loss cannot reduce ST gain", r.c.st, 2 * L); eq("LT loss carried", r.ltLossCF, 5 * L);
r = FE.computePerson(P({ pension: 6 * L, fdInt: 5 * L, savInt: 20000 }, { age: 66 }), "2026-27", "old"); eq("80TTB 50k", r.dl.find(x => /80TTB/.test(x[0]))[1], 50000);
r = FE.computePerson({ kind: "huf", name: "HUF", t: { fdInt: 6 * L, c80: 1.5 * L } }, "2026-27", "old"); eq("HUF old", r.tax, (12500 + 0) * 1.04 - 0 + ((4.5 * L - 2.5 * L) * .05 - 12500 + 12500 - 10000) * 0, 5000);
ok("section label new Act", /s\.123/.test(FE.sec("2026-27", "80C")) && FE.sec("2025-26", "80C") === "80C");

/* --- advance tax --- */
const nov = new Date(2026, 10, 11);
let p = P({ othInc: 30 * L }); let a = FE.advanceTax(p, 499200, "2026-27", nov);
ok("advance required", a.required); eq("June need", a.rows[0].need, 74880); eq("Dec need", a.rows[2].need, 374400);
eq("234C nothing paid", a.c234, (74800 * 3 + 224600 * 3 + 374400 * 3 + 499200) * .01);
eq("accrued so far = first two", a.c234Accrued, (74800 + 224600) * .03);
eq("next is December", a.next.amount, 374400); eq("days to 15 Dec", a.next.days, 35, 1);
eq("234B 4 months", a.b234, 499200 * .04);
p = P({ othInc: 30 * L, adv1: 60000, adv2: 120000 }); a = FE.advanceTax(p, 499200, "2026-27", nov);
eq("12% safe harbour", a.rows[0].int, 0); eq("36% safe harbour", a.rows[1].int, 0);
p = P({ othInc: 30 * L }, { age: 62 }); a = FE.advanceTax(p, 499200, "2026-27", nov); ok("senior exempt", !a.required && a.balance === 499200);
p = P({ receipts: 60 * L, bizMode: "44ada" }); a = FE.advanceTax(p, 499200, "2026-27", nov); eq("presumptive one instalment", a.c234, 4992); eq("presumptive next March", a.next.due.getMonth(), 2);
p = P({ othInc: 30 * L, tds: 495000 }); a = FE.advanceTax(p, 499200, "2026-27", nov); ok("below 10k not required", !a.required);
a = FE.advanceTax(P({ othInc: 30 * L }), 499200, "2025-26", nov); ok("FY 2025-26 ended", a.ended && !a.next);

/* --- money maths --- */
eq("EMI 50L 8.5% 20y", FE.emi(50 * L, 8.5, 240), 43391, 2);
eq("SIP 10k 12% 10y", FE.fvSip(10000, .12, 10, 0), 2240359, 60000);
eq("sipNeeded inverse", FE.fvSip(FE.sipNeeded(1e7, .11, 15, .05), .11, 15, .05), 1e7, 1);
const lp = FE.loanPath(50 * L, 8.5, 43391, 0, 0); eq("loan months", lp.months, 240, 1);
ok("prepay shortens", FE.loanPath(50 * L, 8.5, 43391, 5000, 0).months < 215);
eq("xirr doubling in a year", FE.xirr([{ t: new Date(2025, 0, 1), v: -100 }, { t: new Date(2026, 0, 1), v: 200 }]), 1, .01);
const gs = FE.goalStatus({ year: 2041, cost: 25 * L, infl: 8, ret: 10, saved: 0, sip: 0 }, 2026); eq("goal target", gs.target, 25 * L * Math.pow(1.08, 15), 1);
const sim = FE.retirementSim({ age: 60, retAge: 60, endAge: 90, corpus: 1.5 * CR, spend: 4.5 * L, pension: 0, saveMonthly: 0, eqPre: 35, eqPost: 35, infl: 6, eqRet: 11.5, eqVol: 18, debtRet: 7, stepUp: 0 }, 400, 5);
ok("3% withdrawal mostly survives", sim.success > .8); ok("bands ordered", sim.bands.p10[10] <= sim.bands.p50[10] && sim.bands.p50[10] <= sim.bands.p90[10]);
const sim2 = FE.retirementSim({ age: 60, retAge: 60, endAge: 90, corpus: 1.5 * CR, spend: 12 * L, pension: 0, saveMonthly: 0, eqPre: 35, eqPost: 35, infl: 6, eqRet: 11.5, eqVol: 18, debtRet: 7, stepUp: 0 }, 400, 5);
ok("8% withdrawal fails", sim2.success < .1);
/* products */
const e = { int: .312, stcg: .208, ltcg: .13 }, ppf = FE.PROD.find(x => x.id === "ppf"), fd = FE.PROD.find(x => x.id === "fd"), ix = FE.PROD.find(x => x.id === "index");
eq("PPF untaxed", FE.growAfterTax(ppf, L, 15, e), L * Math.pow(1.071, 15), 1);
eq("FD taxed yearly", FE.growAfterTax(fd, L, 5, e), L * Math.pow(1 + .0645 * .688, 5), 1);
ok("harvest beats hold", FE.growAfterTax(ix, 5 * L, 20, e, true) > FE.growAfterTax(ix, 5 * L, 20, e, false));
/* household */
const S = { members: [P({ salary: 24 * L }, { on: true })], assets: [{ name: "SBI FD", cls: "fd", owner: "a", inst: "SBI", value: 8 * L }, { name: "Index", cls: "equitymf", owner: "a", value: 20 * L }, { name: "Flat", cls: "home", owner: "a", value: 90 * L }],
  liabs: [{ name: "Home loan", type: "home", balance: 30 * L, rate: 8.5, emi: 30000 }], income: [{ name: "Salary", amt: 150000, freq: "m" }], expense: [{ name: "Living", amt: 70000, freq: "m" }], policies: [], goals: [], settings: { target: { equity: 60 } } };
const tt = FE.totals(S); eq("net worth", tt.net, 88 * L); eq("surplus", tt.surplus, 50000); eq("investable excludes home", tt.invest, 28 * L);
eq("DICGC gap", FE.insuredGaps(S)[0].over, 3 * L);
const hc = FE.healthChecks(S, "2026-27", nov); ok("checks produced", hc.length >= 5 && hc.some(c => c.id === "dicgc") && hc.some(c => c.id === "health" && c.level === "bad"));
const cal = FE.calendar(S, nov); ok("calendar next is advance tax Dec", cal.some(x => /75%/.test(x.title) && x.days === 34 || x.days === 35)); ok("calendar sorted", cal.every((x, i) => !i || cal[i - 1].date <= x.date));
eq("year for date", FE.yearForDate(nov) === "2026-27" ? 1 : 0, 1, 0);


/* --- planner --- */
eq("mix young growth", FE.suggestMix(25, "growth", false).equity, 80, 0);
eq("mix retired balanced capped", FE.suggestMix(62, "balanced", true).equity, 40, 0);
ok("mix sums to 100", [20, 45, 70].every(a => { const m = FE.suggestMix(a, "cautious", false); return m.equity + m.debt + m.gold === 100; }));
ok("life stage", FE.lifeStage(8).n === "Childhood" && FE.lifeStage(45).n === "Peak earning" && FE.lifeStage(80).n === "Late retirement");
ok("default occupation by age", FE.defaultOcc(10) === "child" && FE.defaultOcc(20) === "student" && FE.defaultOcc(40) === "salaried" && FE.defaultOcc(66) === "retired");
const H = () => ({ members: [P({ salary: 24 * L }, { on: true, occ: "salaried", age: 40 })], assets: [{ name: "FD", cls: "fd", owner: "a", inst: "SBI", value: 2 * L }], liabs: [{ name: "Card", type: "card", balance: 1.5 * L, rate: 38, emi: 10000 }],
  income: [{ name: "Salary", amt: 150000, freq: "m", kind: "earned" }], expense: [{ name: "Living", amt: 80000, freq: "m" }], policies: [], goals: [], checklist: {}, settings: { dependants: "yes", kids: 1, risk: "balanced" }, retire: {} });
let pl = FE.plan(H(), "2026-27", nov);
ok("plan has ten steps in order", pl.steps.length === 10 && pl.steps[0].id === "numbers" && pl.steps[1].id === "ef" && pl.steps[9].id === "paper");
ok("emergency fund is the next step", pl.next.id === "ef");
ok("costly debt flagged", pl.steps.find(x => x.id === "debt").status === "todo");
ok("education goal prompted for a child", pl.steps.find(x => x.id === "goals").title === "Add an education goal");
ok("term cover sized", /crore/.test(pl.steps.find(x => x.id === "life").title));
eq("surplus fully allocated", pl.split.reduce((s2, x) => s2 + x.amt, 0), 60000, 1);
ok("emergency and debt get the first share", pl.split[0].label === "Emergency fund" && pl.split[1].label === "Costly debt");
ok("salaried tips and EPF scheme", pl.tips[0].occ === "salaried" && pl.schemes.some(x => /EPF/.test(x.n)) && !pl.schemes.some(x => /Atal/.test(x.n)));
ok("income band 15 to 50 lakh", /15 to 50/.test(pl.band.n));
ok("shortlist has four purposes under 55", pl.shortlist.length === 4 && pl.shortlist[3].items.some(x => /EPF/.test(x.n)));
/* low income, self-employed */
const low = H(); low.members = [P({ othInc: 3 * L }, { on: true, occ: "freelance", age: 30 })]; low.income = [{ name: "Work", amt: 25000, freq: "m", kind: "earned" }]; low.expense = [{ name: "Living", amt: 20000, freq: "m" }]; low.liabs = []; low.settings.kids = 0;
pl = FE.plan(low, "2026-27", nov);
ok("low income sees Jan Suraksha and APY", ["PMJJBY", "PMSBY", "Atal"].every(k => pl.schemes.some(x => x.n.includes(k))));
ok("self-employed holds nine months", /9 months/.test(pl.steps.find(x => x.id === "ef").detail));
ok("low-income band", /Under ₹5 lakh/.test(pl.band.n));
/* retired */
const old = H(); old.members = [P({ pension: 6 * L, fdInt: 4 * L }, { on: true, occ: "retired", age: 72 })]; old.income = [{ name: "Pension", amt: 50000, freq: "m", kind: "passive" }]; old.liabs = []; old.settings.kids = 0; old.assets = [{ name: "FD", cls: "fd", owner: "a", inst: "SBI", value: 60 * L }, { name: "Funds", cls: "equitymf", owner: "a", value: 30 * L }];
old.retire = { age: 72, retAge: 72, endAge: 95, corpus: 90 * L, spend: 9.6 * L, pension: 6 * L, saveMonthly: 0, eqPre: 30, eqPost: 30, infl: 6, eqRet: 11.5, eqVol: 18, debtRet: 7, stepUp: 0 };
pl = FE.plan(old, "2026-27", nov);
ok("retired: no life cover, 18 months, senior schemes", pl.steps.find(x => x.id === "life").status === "na" && /18 months/.test(pl.steps.find(x => x.id === "ef").detail) && pl.schemes.some(x => /Vay Vandana/.test(x.n)) && pl.schemes.some(x => /Senior Citizens/.test(x.n)));
ok("retired shortlist has income options", pl.shortlist.some(x => x.n === "Income in retirement" && x.items.some(i => /Senior Citizens/.test(i.n))));
ok("retirement step uses the simulation", /futures/.test(pl.steps.find(x => x.id === "retire").title));
ok("empty household still plans", FE.plan({ members: [P({}, { on: true })], settings: {} }, "2026-27", nov).steps.length === 10);
/* business */
let bc = FE.bizCompare(P({}, { on: true }), { type: "profession", receipts: 40 * L, cash: 0, expenses: 10 * L, supply: "services" }, "2026-27");
ok("44ADA wins at a 75% margin", bc.eligible && bc.better === "presumptive" && bc.presProfit === 20 * L && bc.booksProfit === 30 * L && bc.presTax < bc.booksTax);
ok("GST flagged above 20 lakh of services", bc.gst.over);
bc = FE.bizCompare(P({}, { on: true }), { type: "profession", receipts: 40 * L, cash: 0, expenses: 30 * L, supply: "exempt" }, "2026-27");
ok("books win at a 25% margin, with audit", bc.better === "books" && bc.audit && !bc.gst.over);
bc = FE.bizCompare(P({}, { on: true }), { type: "profession", receipts: 90 * L, cash: 0, expenses: 30 * L, supply: "exempt" }, "2026-27");
ok("above 75 lakh: not eligible, audit by size", !bc.eligible && bc.better === "books" && bc.audit);
bc = FE.bizCompare(P({}, { on: true }), { type: "business", receipts: 1.5 * CR, cash: 20 * L, expenses: 1.55 * CR, supply: "goods", fixed: 2 * L, reserve: 9 * L }, "2026-27");
eq("44AD profit 6% and 8%", bc.presProfit, 1.5 * CR * .06 + 20 * L * .08, 1); ok("cash over 5%: 2 crore limit", bc.limit === 2 * CR && bc.eligible); eq("business buffer months", bc.bufferMonths, 4.5, .01);

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
