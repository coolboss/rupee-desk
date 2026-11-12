/* Rupee Desk UI core: state, storage, shell, dialogs, charts. */
"use strict";
const L = FE.L, CR = FE.CR;
const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => [...(r || document).querySelectorAll(s)];
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const N = v => +v || 0;
const fmt = (v, d) => (isFinite(v) ? v : 0).toLocaleString("en-IN", { maximumFractionDigits: d || 0, minimumFractionDigits: d || 0 });
const inr = v => (v < 0 ? "−" : "") + "₹" + fmt(Math.abs(Math.round(v)));
/* compact rupees: ₹1.25 Cr, ₹12.5 L, ₹45,000 */
function sh(v) { if (!isFinite(v)) return "–"; const a = Math.abs(v), s = v < 0 ? "−" : ""; if (a >= CR) return s + "₹" + fmt(a / CR, a >= 100 * CR ? 0 : 2) + " Cr"; if (a >= L) return s + "₹" + fmt(a / L, a >= 100 * L ? 1 : 2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1") + " L"; return s + "₹" + fmt(Math.round(a)); }
const words = v => { v = N(v); if (!v) return ""; const a = Math.abs(v), s = v < 0 ? "loss of " : ""; return s + (a >= CR ? "₹" + fmt(a / CR, 2).replace(/\.?0+$/, "") + " crore" : a >= L ? "₹" + fmt(a / L, 2).replace(/\.?0+$/, "") + " lakh" : "₹" + fmt(a)); };
const pct = (v, d) => isFinite(v) ? (v * 100).toFixed(d == null ? 1 : d) + "%" : "–";
const uid = () => Math.random().toString(36).slice(2, 9);
const TODAY = new Date();
const dfmt = (d, o) => d.toLocaleDateString("en-IN", o || { day: "numeric", month: "short", year: "numeric" });
const iso = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");

/* ---------- state ---------- */
const KEY = "rupee-desk-v1";
function blankMember(kind, name) { return { id: uid(), kind: kind || "ind", name: name || (kind === "huf" ? "HUF" : "Me"), age: kind === "huf" ? "" : 40, occ: kind === "huf" ? "" : "salaried", regime: "auto", on: true, t: { metro: "no", govt: "no", bizMode: "none", selfSenior: "no", parSenior: "no", payMonth: 4 } }; }
function blankState() {
  return { v: 1, meta: { created: Date.now(), updated: Date.now(), sample: false }, year: FE.yearForDate(TODAY), members: [blankMember("ind", "Me")], assets: [], liabs: [], income: [], expense: [], goals: [], policies: [], reminders: [], history: [], biz: [], checklist: {},
    retire: { age: 40, retAge: 60, endAge: 90, corpus: 0, saveMonthly: 0, stepUp: 8, spend: 0, pension: 0, eqPre: 60, eqPost: 35, infl: 6, eqRet: 11.5, eqVol: 18, debtRet: 7 },
    compare: { amt: 10 * L, yrs: 10, who: "", harvest: true }, loan: { id: "", extra: 0, lump: 0, alt: 7 }, tools: { id: "sip" }, ui: { taxWho: "", biz: "" },
    settings: { infl: 6, dependants: "yes", kids: 0, daughter: "no", risk: "balanced", lead: "", target: { equity: 60 }, cloud: true } };
}
function sampleState(kind) {
  if (kind && SAMPLES[kind]) return SAMPLES[kind]();
  const S = blankState(); S.meta.sample = true; S.meta.example = "family";
  const a = blankMember("ind", "Asha"), v = blankMember("ind", "Vikram"); a.age = 45; v.age = 47;
  Object.assign(a.t, { salary: 2400000, basic: 1000000, hra: 400000, rent: 360000, metro: "yes", ptax: 2500, empNps: 100000, fdInt: 150000, savInt: 20000, c80: 150000, nps1b: 50000, medSelf: 25000, medPar: 50000, parSenior: "yes", lt112A: 250000, tds: 300000 });
  Object.assign(v.t, { bizMode: "44ada", receipts: 3000000, fdInt: 60000, lt112A: 100000, adv1: 30000, adv2: 60000 });
  S.members = [a, v];
  S.assets = [
    { id: uid(), name: "Savings account", cls: "savings", owner: a.id, inst: "HDFC Bank", value: 180000 },
    { id: uid(), name: "Fixed deposits", cls: "fd", owner: a.id, inst: "HDFC Bank", value: 900000 },
    { id: uid(), name: "Fixed deposit", cls: "fd", owner: v.id, inst: "State Bank of India", value: 450000 },
    { id: uid(), name: "EPF", cls: "epf", owner: a.id, inst: "", value: 2100000 },
    { id: uid(), name: "PPF", cls: "ppf", owner: v.id, inst: "", value: 1250000 },
    { id: uid(), name: "Nifty 50 index fund", cls: "equitymf", owner: a.id, inst: "", value: 3200000 },
    { id: uid(), name: "Flexi-cap fund", cls: "equitymf", owner: v.id, inst: "", value: 1800000 },
    { id: uid(), name: "NPS Tier I", cls: "nps", owner: a.id, inst: "", value: 950000 },
    { id: uid(), name: "Gold ETF", cls: "gold", owner: v.id, inst: "", value: 400000 },
    { id: uid(), name: "Flat, self-occupied", cls: "home", owner: a.id, inst: "", value: 11000000 }];
  S.liabs = [{ id: uid(), name: "Home loan", type: "home", owner: a.id, balance: 4200000, rate: 8.4, emi: 46000 }, { id: uid(), name: "Car loan", type: "car", owner: v.id, balance: 380000, rate: 9.5, emi: 14500 }];
  S.income = [{ id: uid(), name: "Asha, salary (take-home)", amt: 148000, freq: "m", kind: "earned" }, { id: uid(), name: "Vikram, consulting", amt: 250000, freq: "m", kind: "earned" }, { id: uid(), name: "Interest", amt: 210000, freq: "y", kind: "passive" }];
  S.expense = [["Rent", "Housing", 30000, "m"], ["Groceries and household", "Food", 32000, "m"], ["Electricity, phone, internet", "Utilities", 9000, "m"], ["Fuel and transport", "Transport", 11000, "m"], ["School fees", "Education", 360000, "y"], ["Household help", "Household help", 14000, "m"], ["Health insurance", "Insurance", 42000, "y"], ["Term insurance", "Insurance", 26000, "y"], ["Eating out and leisure", "Leisure", 18000, "m"], ["Travel", "Travel", 250000, "y"], ["Shopping", "Shopping", 12000, "m"], ["Income tax and advance tax", "Taxes", 62000, "m"]].map(x => ({ id: uid(), name: x[0], cat: x[1], amt: x[2], freq: x[3] }));
  const y = TODAY.getFullYear();
  S.goals = [{ id: uid(), name: "Daughter's college", year: y + 9, cost: 3000000, infl: 9, ret: 10, saved: 900000, sip: 20000, step: 5 }, { id: uid(), name: "Buy a home", year: y + 5, cost: 4000000, infl: 6, ret: 8, saved: 1200000, sip: 30000, step: 5 }, { id: uid(), name: "Car replacement", year: y + 4, cost: 1500000, infl: 5, ret: 7, saved: 300000, sip: 12000, step: 0 }];
  S.policies = [{ id: uid(), name: "Term plan, Asha", type: "term", owner: a.id, cover: 15000000, premium: 26000, renew: y + "-06-20" }, { id: uid(), name: "Family floater", type: "health", owner: a.id, cover: 1000000, premium: 42000, renew: (y + 1) + "-02-10" }];
  Object.assign(S.retire, { age: 45, retAge: 60, endAge: 90, corpus: 9700000, saveMonthly: 90000, spend: 1500000 });
  a.occ = "salaried"; v.occ = "professional"; Object.assign(S.settings, { kids: 1, daughter: "no", risk: "balanced", lead: a.id });
  S.biz = [{ id: uid(), name: "Vikram's consulting practice", owner: v.id, type: "profession", supply: "services", receipts: 3000000, cash: 0, expenses: 900000, fixed: 60000, reserve: 300000 }];
  S.compare.who = a.id; S.ui.taxWho = a.id;
  const net = FE.totals(S).net; S.history = [5, 4, 3, 2, 1, 0].map(k => { const d = new Date(TODAY.getFullYear(), TODAY.getMonth() - k, 1); return { m: iso(d).slice(0, 7), net: Math.round(net * (1 - k * .012)) }; });
  return S;
}
/* compact builder for the other example households */
function mkSample(key, o) {
  const S = blankState(); S.meta.sample = true; S.meta.example = key; const y = TODAY.getFullYear();
  S.members = o.people.map(p => { const m = blankMember("ind", p[0]); m.age = p[1]; m.occ = p[2]; Object.assign(m.t, p[3] || {}); return m; });
  const id = i => S.members[i || 0].id;
  S.assets = (o.assets || []).map(a => ({ id: uid(), name: a[0], cls: a[1], value: a[2], owner: id(a[3]), inst: a[4] || "" }));
  S.liabs = (o.liabs || []).map(l => ({ id: uid(), name: l[0], type: l[1], balance: l[2], rate: l[3], emi: l[4], owner: id(l[5]) }));
  S.income = (o.income || []).map(x => ({ id: uid(), name: x[0], amt: x[1], freq: x[2] || "m", kind: x[3] || "earned" }));
  S.expense = (o.expense || []).map(x => ({ id: uid(), name: x[0], cat: x[1], amt: x[2], freq: x[3] || "m" }));
  S.goals = (o.goals || []).map(g => ({ id: uid(), name: g[0], year: y + g[1], cost: g[2], infl: g[3], ret: g[4], saved: g[5], sip: g[6], step: g[7] || 0 }));
  S.policies = (o.policies || []).map(p => ({ id: uid(), name: p[0], type: p[1], cover: p[2], premium: p[3], owner: id(p[4]), renew: (y + 1) + "-0" + (1 + (p[2] % 9)) + "-15" }));
  S.biz = (o.biz || []).map(b => Object.assign({ id: uid(), owner: id(b.who) }, b));
  Object.assign(S.settings, o.settings || {}, { lead: id(0) }); Object.assign(S.retire, o.retire || {}); S.checklist = o.checklist || {};
  S.settings.target = { equity: FE.suggestMix(S.members[0].age, S.settings.risk, S.members[0].occ === "retired").equity };
  S.compare.who = id(0); S.ui.taxWho = id(0);
  const net = FE.totals(S).net; S.history = [5, 4, 3, 2, 1, 0].map(k => { const d = new Date(TODAY.getFullYear(), TODAY.getMonth() - k, 1); return { m: iso(d).slice(0, 7), net: Math.round(net * (1 - k * .01)) }; });
  return S;
}
const SAMPLE_LIST = [["family", "Salaried and consultant couple, 45", "Two incomes, a child, a home loan"], ["first", "First job, 24", "₹8 lakh salary, starting from zero"], ["doctor", "Doctor with her own clinic, 50", "High income, surcharge, a practice to run"], ["shop", "Shop owner, 38", "Trader on 44AD, two children, thin cover"], ["retired", "Retired couple, 67", "Pension, deposits and making it last"]];
const SAMPLES = {
  first: () => mkSample("first", { people: [["Riya", 24, "salaried", { salary: 800000, basic: 320000, tds: 0 }]],
    assets: [["Salary account", "savings", 60000, 0, "ICICI Bank"], ["EPF", "epf", 70000, 0], ["Index fund SIP", "equitymf", 40000, 0]],
    income: [["Salary, take-home", 55000]], expense: [["Rent, shared flat", "Housing", 14000], ["Food and groceries", "Food", 8000], ["Transport", "Transport", 3000], ["Phone and internet", "Utilities", 1200], ["Eating out and fun", "Leisure", 6000], ["Shopping", "Shopping", 4000]],
    goals: [["Master's degree", 4, 1500000, 8, 9, 0, 5000, 10]], settings: { dependants: "no", kids: 0, risk: "growth" },
    retire: { age: 24, retAge: 58, endAge: 90, corpus: 110000, saveMonthly: 8000, stepUp: 10, spend: 600000, eqPre: 75, eqPost: 40 } }),
  doctor: () => mkSample("doctor", { people: [["Dr Meera", 50, "professional", { bizMode: "actual", profit: 8500000, fdInt: 400000, lt112A: 300000, adv1: 350000, adv2: 700000 }], ["Sanjay", 52, "salaried", { salary: 1800000, basic: 720000, tds: 190000 }]],
    assets: [["Fixed deposits", "fd", 6000000, 0, "State Bank of India"], ["Savings and current accounts", "savings", 900000, 0, "State Bank of India"], ["PPF", "ppf", 3000000, 0], ["Equity mutual funds", "equitymf", 16000000, 0], ["EPF", "epf", 2800000, 1], ["Gold", "gold", 2000000, 1], ["Clinic premises", "property", 15000000, 0], ["Practice value", "business", 5000000, 0], ["Home", "home", 25000000, 0]],
    liabs: [["Equipment loan", "other", 2500000, 10.5, 55000, 0]],
    income: [["Clinic drawings", 550000], ["Sanjay, salary", 118000], ["Interest", 400000, "y", "passive"]],
    expense: [["Household", "Household", 90000], ["College fees, two children", "Education", 900000, "y"], ["Household help and driver", "Household help", 35000], ["Travel", "Travel", 600000, "y"], ["Insurance premiums", "Insurance", 140000, "y"], ["Income tax and advance tax", "Taxes", 190000], ["Leisure and shopping", "Leisure", 60000]],
    goals: [["Children's higher studies abroad", 3, 8000000, 8, 8, 4500000, 60000, 5], ["New ultrasound machine", 2, 3000000, 5, 7, 800000, 40000]],
    policies: [["Term plan", "term", 10000000, 38000, 0], ["Family floater with top-up", "health", 2000000, 62000, 0], ["Professional indemnity", "other", 10000000, 18000, 0]],
    biz: [{ who: 0, name: "Meera's clinic", type: "profession", supply: "exempt", receipts: 12000000, cash: 2000000, expenses: 5500000, fixed: 350000, reserve: 800000 }],
    settings: { dependants: "yes", kids: 0, risk: "balanced" }, checklist: { nominee: true, kyc: true, "health-own": true },
    retire: { age: 50, retAge: 65, endAge: 92, corpus: 27000000, saveMonthly: 200000, stepUp: 5, spend: 3000000, eqPre: 55, eqPost: 35 } }),
  shop: () => mkSample("shop", { people: [["Imran", 38, "business", { bizMode: "44ad", turnDigital: 8000000, turnCash: 4000000, savInt: 6000 }], ["Sana", 35, "homemaker", {}]],
    assets: [["Savings account", "savings", 120000, 0, "Bank of Baroda"], ["Fixed deposit", "fd", 300000, 1, "Bank of Baroda"], ["PPF", "ppf", 150000, 1], ["Gold jewellery", "gold", 600000, 1], ["Shop stock and fittings", "business", 1500000, 0], ["House", "home", 4500000, 0]],
    liabs: [["Business loan", "other", 600000, 14, 21000, 0]],
    income: [["Drawings from the shop", 70000]], expense: [["Household", "Household", 26000], ["School fees", "Education", 96000, "y"], ["Electricity, phone", "Utilities", 4500], ["Scooter and transport", "Transport", 3500], ["Festivals and family", "Giving", 60000, "y"]],
    biz: [{ who: 0, name: "Imran's garment shop", type: "business", supply: "goods", receipts: 8000000, cash: 4000000, expenses: 11000000, fixed: 60000, reserve: 100000 }],
    settings: { dependants: "yes", kids: 2, daughter: "yes", risk: "cautious" },
    retire: { age: 38, retAge: 62, endAge: 88, corpus: 750000, saveMonthly: 5000, stepUp: 5, spend: 420000, eqPre: 40, eqPost: 20 } }),
  retired: () => mkSample("retired", { people: [["Suresh", 67, "retired", { pension: 420000, fdInt: 620000, savInt: 18000, lt112A: 60000 }], ["Lata", 64, "retired", { fdInt: 246000 }]],
    assets: [["Senior citizen FDs", "fd", 2800000, 0, "State Bank of India"], ["Fixed deposits", "fd", 1700000, 0, "Bank of Baroda"], ["Savings account", "savings", 250000, 0, "State Bank of India"], ["SCSS", "smallsav", 3000000, 1], ["Balanced advantage fund", "equitymf", 2500000, 0], ["Flat", "home", 9000000, 0]],
    income: [["Pension", 35000, "m", "passive"], ["Interest from FDs and SCSS", 72000, "m", "passive"]],
    expense: [["Household", "Household", 32000], ["Medicines and doctor", "Health", 9000], ["Health insurance", "Insurance", 58000, "y"], ["Electricity, phone, society", "Utilities", 7000], ["Travel and family", "Travel", 120000, "y"], ["Help at home", "Household help", 6000]],
    goals: [["Granddaughter's wedding gift", 3, 500000, 6, 7, 200000, 5000]], policies: [["Senior health plan", "health", 500000, 58000, 0]],
    settings: { dependants: "no", kids: 0, risk: "cautious" }, checklist: { will: true, nominee: true, joint: true },
    retire: { age: 67, retAge: 67, endAge: 92, corpus: 10000000, saveMonthly: 0, stepUp: 0, spend: 840000, pension: 420000, eqPre: 25, eqPost: 25 } })
};
function migrate(o) { const b = blankState(); if (!o || typeof o !== "object" || !Array.isArray(o.members)) return null; const S = Object.assign(b, o); ["retire", "compare", "loan", "tools", "ui", "settings", "meta"].forEach(k => S[k] = Object.assign({}, blankState()[k], o[k] || {})); S.settings.target = Object.assign({ equity: 60 }, (o.settings || {}).target || {});
  ["members", "assets", "liabs", "income", "expense", "goals", "policies", "reminders", "history", "biz"].forEach(k => { if (!Array.isArray(S[k])) S[k] = []; S[k].forEach(x => { if (x && !x.id) x.id = uid(); }); });
  S.members.forEach(m => { m.t = Object.assign({}, blankMember(m.kind).t, m.t || {}); if (m.on == null) m.on = true; if (m.kind !== "huf" && !FE.OCC[m.occ]) m.occ = FE.defaultOcc(m.age); }); if (!S.members.length) S.members = [blankMember("ind", "Me")]; if (!FE.YEARS[S.year]) S.year = FE.yearForDate(TODAY); S.checklist = S.checklist || {}; return S; }
let S, storeOK = true;
try { S = migrate(JSON.parse(localStorage.getItem(KEY))); } catch (e) { storeOK = false; }
if (!S) S = sampleState();
const member = id => S.members.find(m => m.id === id);
const ownerName = id => { const m = member(id); return m ? m.name : "Joint"; };

/* ---------- saving: this device, plus a private copy in the viewer's Claude account where the page is hosted there ---------- */
let saveT = null, cloud = { ref: null, state: "off", busy: false, dirty: false, t: null };
function save(now) { S.meta.updated = Date.now(); snapshotMonth(); clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(S)); storeOK = true; } catch (e) { storeOK = false; } cloudQueue(); paintSave(); }, now ? 0 : 350); }
function snapshotMonth() { if (S.meta.sample) return; const m = iso(TODAY).slice(0, 7), net = Math.round(FE.totals(S).net), h = S.history, last = h[h.length - 1]; if (!S.assets.length && !S.liabs.length) return; if (last && last.m === m) last.net = net; else h.push({ m, net }); if (h.length > 120) h.shift(); }
function paintSave() { const el = $("#savestate"); if (!el) return; const c = cloud.state; if (S.meta.sample) { el.className = "savestate local"; el.innerHTML = "<i></i>Example"; el.title = "Example household. Choose Start with my own numbers on Home."; return; } el.className = "savestate" + (c === "ok" ? "" : " local"); el.innerHTML = "<i></i>" + (c === "ok" ? "Backed up" : c === "saving" ? "Saving…" : storeOK ? 'Saved<span class="wideonly"> on this device</span>' : "Not saved"); el.title = c === "ok" ? "Saved on this device and in your private Claude storage" : "Open Data to export a backup"; }
const timeout = (p, ms) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error("timeout")), ms))]);
async function cloudInit() {
  if (!(window.claude && typeof window.claude.use === "function") || S.settings.cloud === false) return;
  try {
    const [db, user] = await Promise.all([window.claude.use("db"), window.claude.use("user")]); if (!db || !user) return;
    const id = await user.id(); if (!id) return;
    cloud.ref = db.doc("data/users/" + id + "/household");
    const snap = await timeout(cloud.ref.get(), 10000);
    if (snap.exists) { let remote = null; try { remote = migrate(JSON.parse(snap.data().json)); } catch (e) { }
      if (remote && (S.meta.sample || N(remote.meta.updated) > N(S.meta.updated))) { S = remote; S.meta.sample = false; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } render(); toast("Loaded your saved household"); } }
    cloud.state = "ok"; if (!S.meta.sample && (!snap.exists || N(S.meta.updated) > 0)) cloudQueue();
  } catch (e) { cloud.state = "off"; }
  paintSave();
}
function cloudQueue() { if (!cloud.ref || S.meta.sample || S.settings.cloud === false) return; cloud.dirty = true; clearTimeout(cloud.t); cloud.t = setTimeout(cloudWrite, 1800); }
async function cloudWrite() { if (cloud.busy || !cloud.dirty || !cloud.ref) return; cloud.busy = true; cloud.dirty = false; cloud.state = "saving"; paintSave();
  try { await cloud.ref.set({ json: JSON.stringify(S), updated: S.meta.updated }); cloud.state = "ok"; } catch (e) { cloud.state = "off"; }
  cloud.busy = false; paintSave(); if (cloud.dirty) cloudQueue(); }

/* ---------- toast, tooltip, sheet ---------- */
let toastT = null;
function toast(msg, undo) { const t = $("#toast"); t.innerHTML = "<span>" + esc(msg) + "</span>" + (undo ? '<button type="button">Undo</button>' : ""); t.hidden = false; if (undo) $("button", t).onclick = () => { undo(); t.hidden = true; }; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, undo ? 7000 : 2600); }
function tipShow(el, x, y) { const t = $("#tip"); t.textContent = el.getAttribute("data-tip"); t.hidden = false; const w = t.offsetWidth, h = t.offsetHeight; t.style.left = Math.max(8, Math.min(innerWidth - w - 8, x - w / 2)) + "px"; t.style.top = (y - h - 12 < 8 ? y + 16 : y - h - 12) + "px"; }
document.addEventListener("pointermove", e => { const el = e.target.closest && e.target.closest("[data-tip]"); if (el) tipShow(el, e.clientX, e.clientY); else $("#tip").hidden = true; });
document.addEventListener("pointerdown", e => { const el = e.target.closest && e.target.closest("[data-tip]"); if (el) tipShow(el, e.clientX, e.clientY); else $("#tip").hidden = true; });
document.addEventListener("focusin", e => { const el = e.target.closest && e.target.closest("[data-tip]"); if (el) { const r = el.getBoundingClientRect(); tipShow(el, r.left + r.width / 2, r.top); } });
addEventListener("scroll", () => { $("#tip").hidden = true; }, true);

let sheetBack = null;
function openSheet(title, bodyHTML, onMount) {
  sheetBack = document.activeElement; const w = $("#sheet");
  w.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-t"><div class="sheet-h"><h2 id="sheet-t">${esc(title)}</h2><button class="btn sm" type="button" data-close>Close</button></div><div id="sheet-b">${bodyHTML}</div></div>`;
  w.hidden = false; document.body.style.overflow = "hidden"; if (onMount) onMount($("#sheet-b"));
  const first = $("#sheet-b input, #sheet-b select, #sheet-b button", w) || $("[data-close]", w); first && first.focus();
}
function closeSheet() { const w = $("#sheet"); if (w.hidden) return; w.hidden = true; w.innerHTML = ""; document.body.style.overflow = ""; if (sheetBack && sheetBack.focus) try { sheetBack.focus(); } catch (e) { } }
document.addEventListener("click", e => { if (e.target.id === "sheet" || e.target.closest("[data-close]")) closeSheet(); });
document.addEventListener("keydown", e => {
  const w = $("#sheet"); if (w.hidden) return;
  if (e.key === "Escape") { closeSheet(); return; }
  if (e.key === "Tab") { const f = $$("button,input,select,textarea,a[href]", w).filter(x => !x.disabled && x.offsetParent !== null); if (!f.length) return; const a = f[0], z = f[f.length - 1]; if (e.shiftKey && document.activeElement === a) { z.focus(); e.preventDefault(); } else if (!e.shiftKey && document.activeElement === z) { a.focus(); e.preventDefault(); } }
});

/* ---------- fields ---------- */
/* f: {k, label, type: money|num|pct|text|select|date|year, opts:[[v,label]], hint, neg, wide, min, max} */
function fieldHTML(f, val, attr) {
  const key = attr.keyOf ? attr.keyOf(f) : f.k, id = "f-" + (attr.prefix || "") + f.k.replace(/\W/g, "_"), common = `id="${id}" ${attr.bind}="${esc(key)}" data-type="${f.type || "money"}"`;
  let ctl, hint = f.hint || "";
  if (f.type === "select") ctl = `<select ${common}>${f.opts.map(([v, l]) => `<option value="${esc(v)}" ${String(val == null ? "" : val) === String(v) ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>`;
  else if (f.type === "text") ctl = `<input ${common} type="text" value="${esc(val == null ? "" : val)}" maxlength="60" autocomplete="off">`;
  else if (f.type === "date") ctl = `<input ${common} type="date" value="${esc(val || "")}">`;
  else { const money = !f.type || f.type === "money"; ctl = `<input ${common} type="${f.neg ? "text" : "number"}" inputmode="${f.neg ? "text" : "decimal"}" ${f.neg ? 'pattern="-?[0-9.]*"' : `min="${f.min == null ? 0 : f.min}"`} ${f.max != null ? `max="${f.max}"` : ""} step="any" value="${val == null || val === "" ? "" : esc(val)}" placeholder="0" autocomplete="off">`; if (money) hint = words(val) || hint; }
  return `<div class="f${f.wide ? " wide" : ""}"><label for="${id}">${esc(f.label)}</label>${ctl}<small data-hint="${esc(key)}" data-base="${esc(f.hint || "")}">${esc(hint)}</small></div>`;
}
function readField(el) { const t = el.dataset.type; if (t === "select" || t === "text" || t === "date") return el.value; if (el.value === "" || el.value === "-") return ""; const v = parseFloat(el.value); return isFinite(v) ? v : ""; }
function paintHint(root, el) { const k = el.getAttribute("data-path") || el.getAttribute("data-k"), h = root.querySelector(`[data-hint="${CSS.escape(k)}"]`); if (h && el.dataset.type === "money") h.textContent = words(readField(el)) || h.dataset.base || ""; }
const getPath = (o, p) => p.split(".").reduce((a, k) => a == null ? a : a[k], o);
function setPath(o, p, v) { const ks = p.split("."), last = ks.pop(); const t = ks.reduce((a, k) => a[k] == null ? (a[k] = {}) : a[k], o); t[last] = v; }

/* generic add/edit form in a sheet */
function editItem(o) { /* {title, fields, item, isNew, onSave(item), onDelete()} */
  const d = Object.assign({}, o.item);
  openSheet(o.title, `<form id="ef" novalidate><div class="fields">${o.fields.map(f => fieldHTML(f, d[f.k], { bind: "data-k", prefix: "e-" })).join("")}</div>
    <div class="btns"><span>${o.isNew || !o.onDelete ? "" : '<button class="btn danger" type="button" id="ef-del">Delete</button>'}</span><span class="btns"><button class="btn" type="button" data-close>Cancel</button><button class="btn pri" type="submit">${o.isNew ? "Add" : "Save"}</button></span></div></form>`, root => {
    root.addEventListener("input", e => { const el = e.target.closest("[data-k]"); if (!el) return; d[el.dataset.k] = readField(el); paintHint(root, el); });
    $("#ef", root).addEventListener("submit", e => { e.preventDefault(); const miss = o.fields.find(f => f.req && (d[f.k] === "" || d[f.k] == null)); if (miss) { const el = $(`[data-k="${miss.k}"]`, root); el.focus(); el.setAttribute("aria-invalid", "true"); toast(miss.label + " is needed"); return; } closeSheet(); o.onSave(d); });
    const del = $("#ef-del", root); if (del) del.addEventListener("click", () => { closeSheet(); o.onDelete(); });
  });
}
/* list helpers with undo */
function upsert(list, item) { const i = list.findIndex(x => x.id === item.id); if (i >= 0) list[i] = item; else list.push(item); save(); render(); }
function removeItem(list, id, label) { const i = list.findIndex(x => x.id === id); if (i < 0) return; const [old] = list.splice(i, 1); save(); render(); toast(label + " deleted", () => { list.splice(i, 0, old); save(); render(); }); }

/* ---------- charts ---------- */
const NARROW = matchMedia("(max-width:640px)");
NARROW.addEventListener && NARROW.addEventListener("change", () => { if ($("#page")) render(); });
const GCOL = { equity: "c1", property: "c2", debt: "c3", gold: "c4", cash: "c5", other: "c6" };
const GORDER = ["equity", "property", "debt", "gold", "cash", "other"], GNAME = Object.fromEntries(FE.GROUPS);
function segBar(parts, total) { /* parts: [{k,label,v,c}] */
  const p = parts.filter(x => x.v > 0); if (!p.length || total <= 0) return '<p class="empty">Nothing to show yet.</p>';
  return `<div class="segbar" role="img" aria-label="${esc(p.map(x => x.label + " " + Math.round(x.v / total * 100) + "%").join(", "))}">${p.map(x => `<i style="flex:${x.v} 1 0;background:var(--${x.c})" data-tip="${esc(x.label)}: ${sh(x.v)} (${Math.round(x.v / total * 100)}%)" tabindex="0"></i>`).join("")}</div>
  <div class="legend">${p.map(x => `<span><i style="background:var(--${x.c})"></i>${esc(x.label)}<b>${Math.round(x.v / total * 100)}%</b></span>`).join("")}</div>`;
}
function hbars(rows, o) { /* rows: [{label, v, text, c, dim, extra}] */
  o = o || {}; const mx = Math.max(...rows.map(r => r.v), 1);
  return `<div class="hbars">${rows.map(r => `<div class="hb${r.dim ? " dim" : ""}"><div class="l"><span>${r.label}</span><span>${r.text}</span></div><div class="b" style="width:${Math.max(.5, r.v / mx * 100)}%;background:var(--${r.c || "c1"})" data-tip="${esc(r.tip || "")}"></div>${r.extra ? `<div class="x">${r.extra}</div>` : ""}</div>`).join("")}</div>`;
}
function niceMax(v) { if (v <= 0) return 1; const m = Math.pow(10, Math.floor(Math.log10(v))); return [1, 2, 2.5, 5, 10].map(k => k * m).find(k => k >= v) || 10 * m; }
/* line chart with optional band and second line; hover column shows the tip for each x */
function lineChart(o) { /* {x:[labels], y:[...], y2, lo, hi, tips:[...], markX, markLabel, label} */
  const nar = NARROW.matches, W = nar ? 360 : 640, H = nar ? 220 : 240, Lm = 58, R = 14, T = 12, B = 26, n = o.x.length; if (n < 2) return '<p class="empty">Not enough points yet.</p>';
  const all = [].concat(o.y, o.y2 || [], o.hi || []).filter(isFinite), top = niceMax(Math.max(...all, 1));
  const X = i => Lm + i * (W - Lm - R) / (n - 1), Y = v => T + (1 - Math.max(0, v) / top) * (H - T - B);
  const path = a => a.map((v, i) => (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(v).toFixed(1)).join("");
  let g = `<svg class="ch" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.label || "chart")}">`;
  [0, .25, .5, .75, 1].forEach(f => { const y = Y(top * f); g += `<line class="gl" x1="${Lm}" x2="${W - R}" y1="${y}" y2="${y}"/><text x="${Lm - 8}" y="${y + 4}" text-anchor="end">${sh(top * f)}</text>`; });
  const every = Math.max(1, Math.ceil(n / (nar ? 5 : 7))); o.x.forEach((l, i) => { if (i % every === 0 || i === n - 1) g += `<text x="${X(i)}" y="${H - 6}" text-anchor="${i === n - 1 ? "end" : i === 0 ? "start" : "middle"}">${esc(l)}</text>`; });
  if (o.lo && o.hi) g += `<path class="band" d="${path(o.hi)}${o.lo.map((v, i) => "L" + X(i).toFixed(1) + " " + Y(v).toFixed(1)).reverse().join("")}Z"/>`;
  if (o.markX != null && o.markX > 0 && o.markX < n) g += `<line class="mark" x1="${X(o.markX)}" x2="${X(o.markX)}" y1="${T}" y2="${H - B}"/><text x="${X(o.markX) + 5}" y="${T + 10}">${esc(o.markLabel || "")}</text>`;
  if (o.y2) g += `<path class="ln2" d="${path(o.y2)}"/>`;
  g += `<path class="ln" d="${path(o.y)}"/><circle class="dot" cx="${X(n - 1)}" cy="${Y(o.y[n - 1])}" r="5"/>`;
  const cw = (W - Lm - R) / (n - 1); o.x.forEach((l, i) => { g += `<rect class="hit" x="${X(i) - cw / 2}" y="${T}" width="${cw}" height="${H - T - B}" data-tip="${esc((o.tips && o.tips[i]) || l + ": " + sh(o.y[i]))}" tabindex="-1"/>`; });
  return g + "</svg>";
}

/* ---------- shell and router ---------- */
const ROUTES = [
  { id: "home", name: "Home", grp: "home" },
  { id: "wealth", name: "Assets and loans", grp: "money" }, { id: "cash", name: "Cash flow", grp: "money" }, { id: "business", name: "Business", grp: "money" },
  { id: "tax", name: "Tax", grp: "tax" },
  { id: "plan", name: "My plan", grp: "plan" }, { id: "goals", name: "Goals", grp: "plan" }, { id: "retire", name: "Retirement", grp: "plan" }, { id: "loans", name: "Loans", grp: "plan" }, { id: "cover", name: "Insurance", grp: "plan" },
  { id: "invest", name: "Compare options", grp: "more" }, { id: "tools", name: "Calculators", grp: "more" }, { id: "calendar", name: "Calendar", grp: "more" }, { id: "data", name: "Data and backup", grp: "more" }];
const TABS = [["home", "Home", "M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"], ["money", "Money", "M4 7h16v11H4z M4 10h16 M15.5 14.5h1.5"], ["tax", "Tax", "M7 3h10v18l-2.5-1.5L12 21l-2.5-1.5L7 21z M10 8h4 M10 12h4"], ["plan", "Plan", "M4 19h16 M6 16l4-5 3 3 5-7"], ["more", "More", "M5 12h.01 M12 12h.01 M19 12h.01"]];
const VIEWS = {};
let route = "home";
function go(id) { if (!VIEWS[id]) id = "home"; if (location.hash.slice(1) !== id) { try { location.hash = id; } catch (e) { } } route = id; render(true); }
addEventListener("hashchange", () => { const id = location.hash.slice(1); if (VIEWS[id] && id !== route) { route = id; render(true); } });
function shell() {
  const y = FE.YEARS[S.year];
  $("#app").innerHTML = `<header class="top"><div class="brand">Rupee <em>Desk</em></div><div class="top-r"><span id="savestate" class="savestate local"></span><button class="chip" id="yearbtn" type="button" aria-label="Change tax year">${esc(y.short)} ▾</button></div></header>
  <div class="layout"><nav class="side" id="side" aria-label="Sections"></nav><main id="view" tabindex="-1"></main></div>
  <nav class="tabbar" id="tabbar" aria-label="Sections">${TABS.map(([g, n, d]) => `<button type="button" data-grp="${g}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>${n}</button>`).join("")}</nav>`;
  const labels = { home: "", money: "Money", tax: "", plan: "Plan", more: "More" }; let h = "", last = "";
  ROUTES.forEach(r => { if (r.grp !== last && labels[r.grp]) h += `<h2>${labels[r.grp]}</h2>`; last = r.grp; h += `<button type="button" data-go="${r.id}">${r.name}</button>`; });
  $("#side").innerHTML = h;
  $("#yearbtn").addEventListener("click", yearSheet);
  $("#tabbar").addEventListener("click", e => { const b = e.target.closest("[data-grp]"); if (!b) return; const first = ROUTES.find(r => r.grp === b.dataset.grp); const cur = ROUTES.find(r => r.id === route); go(cur.grp === b.dataset.grp && cur.id !== first.id ? first.id : (lastIn[b.dataset.grp] || first.id)); });
  paintSave();
}
const lastIn = {};
function yearSheet() {
  openSheet("Which tax year?", `<div class="stack">${Object.values(FE.YEARS).map(y => `<button class="tile" type="button" data-year="${y.key}"><div class="k">${S.year === y.key ? "Selected" : "Switch to"}</div><div class="v" style="font-family:var(--sans);font-weight:600">${esc(y.label)}</div><div class="s">${esc(y.sub)}. Income-tax Act, ${y.act}.</div></button>`).join("")}
  <p class="small">Slabs and rates are the same in both years. The years differ in due dates, in which cities count for the higher HRA limit, and in section numbers. Tax figures you enter are kept as one set, so check them when you switch.</p></div>`, root => root.addEventListener("click", e => { const b = e.target.closest("[data-year]"); if (!b) return; S.year = b.dataset.year; save(); closeSheet(); shell(); render(); }));
}
function subnav() { const cur = ROUTES.find(r => r.id === route), sib = ROUTES.filter(r => r.grp === cur.grp); return sib.length < 2 ? "" : `<div class="subnav" role="navigation" aria-label="${cur.grp}">${sib.map(r => `<button type="button" data-go="${r.id}" ${r.id === route ? 'aria-current="page"' : ""}>${r.name}</button>`).join("")}</div>`; }
function render(scrollTop) {
  const cur = ROUTES.find(r => r.id === route); lastIn[cur.grp] = route;
  $$("#side [data-go]").forEach(b => { if (b.dataset.go === route) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
  $$("#tabbar [data-grp]").forEach(b => b.dataset.grp === cur.grp ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current"));
  const v = $("#view"); let html; try { html = VIEWS[route].render(); } catch (e) { console.error(e); html = `<div class="note bad">This page could not be drawn. Your data is safe. Try Data and backup, then export.</div>`; }
  v.innerHTML = subnav() + '<div id="page">' + html + "</div>";
  try { VIEWS[route].mount && VIEWS[route].mount($("#page")); } catch (e) { console.error(e); }
  if (scrollTop) { scrollTo(0, 0); }
}
function refresh() { const V = VIEWS[route]; if (V.refresh) { try { V.refresh($("#page")); } catch (e) { console.error(e); } } }
/* delegated behaviour for every view */
document.addEventListener("click", e => { const g = e.target.closest("[data-go]"); if (g) { go(g.dataset.go); return; } });
document.addEventListener("input", e => { const el = e.target.closest("[data-path]"); if (!el || !el.closest("#view")) return; setPath(S, el.dataset.path, readField(el)); paintHint($("#view"), el); save(); refresh(); });
