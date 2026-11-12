/* Rupee Desk views: My plan, Business, two-minute setup, example households */
"use strict";
const OCC_OPTS = Object.entries(FE.OCC).filter(([k]) => k !== "child").map(([k, o]) => [k, o.n]);
const RISK_OPTS = [["cautious", "Cautious: I would move to safety"], ["balanced", "Balanced: I would wait it out"], ["growth", "Growth: I would buy more"]];
const STATUS = { done: ["ok", "Done"], watch: ["warn", "Partly"], todo: ["", "To do"], na: ["", "Not needed"] };
function replaceState(next, msg, dest) { const old = S; S = next; save(true); shell(); if (dest) go(dest); else render(true); toast(msg, () => { S = old; save(true); shell(); render(true); }); }

/* ---------- example households ---------- */
function examplesSheet() {
  openSheet("Example households", `<div class="stack">${SAMPLE_LIST.map(([k, n, d]) => `<button class="tile" type="button" data-ex="${k}"><div class="v" style="font-family:var(--sans);font-weight:600;font-size:1.05rem;margin:0">${n}</div><div class="s">${d}</div></button>`).join("")}<p class="small">Examples are made up. Loading one replaces what is on screen; you can undo it straight after.</p></div>`,
    root => root.addEventListener("click", e => { const b = e.target.closest("[data-ex]"); if (!b) return; closeSheet(); replaceState(sampleState(b.dataset.ex), "Example loaded", "home"); }));
}

/* ---------- two-minute setup ---------- */
const QS = [
  ["You", [{ k: "name", label: "Your name", type: "text" }, { k: "age", label: "Age", type: "num", max: 110 }, { k: "occ", label: "What you do", type: "select", opts: OCC_OPTS }, { k: "gross", label: "Yearly income before tax (₹)", hint: "Salary, professional receipts, turnover or pension" }]],
  ["Spouse or partner, if any", [{ k: "pname", label: "Name", type: "text" }, { k: "page", label: "Age", type: "num", max: 110 }, { k: "pocc", label: "What they do", type: "select", opts: OCC_OPTS }, { k: "pgross", label: "Yearly income before tax (₹)" }]],
  ["Family", [{ k: "dependants", label: "Does anyone depend on your income?", type: "select", opts: [["yes", "Yes"], ["no", "No"]] }, { k: "kids", label: "Children under 18", type: "num", max: 12 }, { k: "daughter", label: "A daughter under 10?", type: "select", opts: [["no", "No"], ["yes", "Yes"]] }]],
  ["A typical month", [{ k: "takehome", label: "Take-home income, whole household (₹)" }, { k: "spend", label: "Spending, without EMIs (₹)" }]],
  ["What you have", [{ k: "bank", label: "Bank balances and FDs (₹)" }, { k: "pf", label: "PF, PPF and small savings (₹)" }, { k: "equity", label: "Mutual funds and shares (₹)" }, { k: "gold", label: "Gold (₹)" }, { k: "home", label: "Home you live in (₹)" }, { k: "prop", label: "Other property (₹)" }]],
  ["What you owe", [{ k: "hl", label: "Home loan outstanding (₹)" }, { k: "hlEmi", label: "Home loan EMI a month (₹)" }, { k: "ol", label: "Other loans outstanding (₹)" }, { k: "olEmi", label: "Other EMIs a month (₹)" }, { k: "olRate", label: "Rate on other loans (% a year)", type: "pct", max: 60 }]],
  ["Cover and comfort", [{ k: "term", label: "Term life cover (₹)" }, { k: "health", label: "Health cover (₹)" }, { k: "risk", label: "If your investments fell 30% in a year", type: "select", opts: RISK_OPTS, wide: 1 }]]
];
function taxFromGross(m, gross) {
  const g = Math.max(0, N(gross)), t = m.t; if (!g) return;
  if (m.occ === "salaried" || m.occ === "govt") { t.salary = g; t.basic = Math.round(g * .4); if (m.occ === "govt") t.govt = "yes"; }
  else if (m.occ === "professional" || m.occ === "freelance") { if (g <= 75 * L) { t.bizMode = "44ada"; t.receipts = g; } else { t.bizMode = "actual"; t.profit = Math.round(g * .5); } }
  else if (m.occ === "business") { if (g <= 3 * CR) { t.bizMode = "44ad"; t.turnDigital = g; } else { t.bizMode = "actual"; t.profit = Math.round(g * .08); } }
  else if (m.occ === "farmer") t.agri = g; else if (m.occ === "retired") t.pension = g; else t.othInc = g;
}
function buildFromSetup(d) {
  const n = k => Math.max(0, N(d[k])), St = blankState(), me = blankMember("ind", (d.name || "").trim() || "Me");
  me.age = n("age") || 40; me.occ = d.occ || FE.defaultOcc(me.age); taxFromGross(me, d.gross); St.members = [me];
  let sp = null; if ((d.pname || "").trim() || n("page") || n("pgross")) { sp = blankMember("ind", (d.pname || "").trim() || "Partner"); sp.age = n("page") || me.age; sp.occ = d.pocc || FE.defaultOcc(sp.age); taxFromGross(sp, d.pgross); St.members.push(sp); }
  const asset = (name, cls, v) => { if (v > 0) St.assets.push({ id: uid(), name, cls, owner: me.id, inst: "", value: v }); };
  asset("Bank balances and FDs", "fd", n("bank")); asset(me.occ === "salaried" ? "EPF, PPF and small savings" : "PPF and small savings", me.occ === "salaried" ? "epf" : "ppf", n("pf")); asset("Mutual funds and shares", "equitymf", n("equity")); asset("Gold", "gold", n("gold")); asset("Home", "home", n("home")); asset("Other property", "property", n("prop"));
  if (n("hl") > 0) St.liabs.push({ id: uid(), name: "Home loan", type: "home", owner: me.id, balance: n("hl"), rate: 8.5, emi: n("hlEmi") });
  if (n("ol") > 0) St.liabs.push({ id: uid(), name: "Other loans", type: "personal", owner: me.id, balance: n("ol"), rate: n("olRate") || 14, emi: n("olEmi") });
  const retired = me.occ === "retired";
  if (n("takehome") > 0) St.income.push({ id: uid(), name: "Household take-home income", amt: n("takehome"), freq: "m", kind: retired ? "passive" : "earned" });
  if (n("spend") > 0) St.expense.push({ id: uid(), name: "Household spending", cat: "Household", amt: n("spend"), freq: "m" });
  if (n("term") > 0) St.policies.push({ id: uid(), name: "Term cover", type: "term", owner: me.id, cover: n("term"), premium: 0 });
  if (n("health") > 0) St.policies.push({ id: uid(), name: "Health cover", type: "health", owner: me.id, cover: n("health"), premium: 0 });
  [me, sp].forEach(m => { if (m && (m.occ === "professional" || m.occ === "business" || m.occ === "freelance")) { const g = Math.max(0, N(m === me ? d.gross : d.pgross)); if (g > 0) St.biz.push({ id: uid(), name: m.name + (m.occ === "business" ? "'s business" : "'s practice"), owner: m.id, type: m.occ === "business" ? "business" : "profession", supply: m.occ === "business" ? "goods" : "services", receipts: g, cash: 0, expenses: "", fixed: "", reserve: "" }); } });
  Object.assign(St.settings, { dependants: d.dependants === "no" ? "no" : "yes", kids: n("kids"), daughter: d.daughter === "yes" ? "yes" : "no", risk: d.risk || "balanced", lead: me.id });
  const mix = FE.suggestMix(me.age, St.settings.risk, retired); St.settings.target = { equity: mix.equity };
  const emis = n("hlEmi") + n("olEmi"), surplus = Math.max(0, n("takehome") - n("spend") - emis), cushion = Math.min(n("bank"), (n("spend") + emis) * 6);
  Object.assign(St.retire, { age: me.age, retAge: retired ? me.age : Math.max(me.age + 1, 60), endAge: Math.max(90, me.age + 20), corpus: Math.max(0, n("bank") - cushion) + n("pf") + n("equity") + n("gold"), saveMonthly: Math.round(surplus * .6), spend: Math.round(n("spend") * 12 * (retired ? 1 : .8)), pension: retired ? n("gross") : 0, eqPre: mix.equity, eqPost: FE.suggestMix(65, St.settings.risk, true).equity });
  St.compare.who = me.id; St.ui.taxWho = me.id; return St;
}
function quickSetup() {
  const d = { occ: "salaried", pocc: "salaried", dependants: "yes", daughter: "no", risk: "balanced", age: 35 };
  openSheet("Two-minute setup", `<form id="qs" class="qs" novalidate><p class="small" style="margin-bottom:14px">Round numbers are fine. Leave blank what does not apply. You can refine everything afterwards.</p>${QS.map(([h, fs]) => `<h3>${h}</h3><div class="fields">${fs.map(f => fieldHTML(f, d[f.k], { bind: "data-k", prefix: "q-" })).join("")}</div>`).join("")}
    <div class="btns"><button class="btn" type="button" data-close>Cancel</button><button class="btn pri" type="submit">Build my plan</button></div></form>`, root => {
    root.addEventListener("input", e => { const el = e.target.closest("[data-k]"); if (!el) return; d[el.dataset.k] = readField(el); paintHint(root, el); });
    $("#qs", root).addEventListener("submit", e => { e.preventDefault(); closeSheet(); replaceState(buildFromSetup(d), "Your plan is ready. Refine the details any time.", "plan"); });
  });
}

/* ---------- My plan ---------- */
function mixBar(m) { return `<div class="segbar">${[["equity", "c1"], ["debt", "c3"], ["gold", "c4"]].map(([k, c]) => m[k] > 0 ? `<i style="flex:${m[k]} 1 0;background:var(--${c})" data-tip="${k[0].toUpperCase() + k.slice(1)} ${Math.round(m[k])}%" tabindex="0"></i>` : "").join("")}</div>`; }
function planText(pl) {
  const out = ["# Household plan" + (pl.lead ? " for " + pl.lead.name : ""), dfmt(TODAY) + " · " + FE.YEARS[S.year].label, "", (pl.lead ? pl.lead.name + ", " + pl.age + " · " + FE.OCC[pl.occ].n + " · " : "") + pl.stage.n + " · " + pl.done + " of " + pl.steps.length + " steps in place", "", "## Steps, in order"];
  pl.steps.forEach((s, i) => out.push((i + 1) + ". [" + STATUS[s.status][1] + "] " + s.title + ". " + s.detail));
  if (pl.split.length) { out.push("", "## Where next month's " + inr(pl.surplus) + " goes"); pl.split.forEach(x => out.push("- " + x.label + ": " + inr(x.amt) + " (" + x.why + ")")); }
  out.push("", "## Suggested mix", "Equity " + pl.mix.equity + "%, debt and deposits " + pl.mix.debt + "%, gold " + pl.mix.gold + "%" + (pl.cur ? ". Now: equity " + Math.round(pl.cur.equity) + "%, debt " + Math.round(pl.cur.debt) + "%, gold " + Math.round(pl.cur.gold) + "%." : "."));
  out.push("", "## Options that fit each purpose (after tax, for " + (pl.lead ? pl.lead.name : "you") + ")"); pl.shortlist.forEach(p => out.push("- " + p.n + ": " + p.items.map(i => i.n + " " + pct(i.after)).join("; ")));
  pl.tips.forEach(t => { out.push("", "## " + t.n + (t.who.length ? " (" + t.who.join(", ") + ")" : "")); t.items.forEach(i => out.push("- " + i)); });
  if (pl.band) out.push("", "## At your income: " + pl.band.n, pl.band.text);
  out.push("", "## Schemes to look at"); pl.schemes.forEach(s => out.push("- " + s.n + ": " + s.what));
  out.push("", "Made with Rupee Desk. A planning aid built on rules of thumb, not investment or tax advice. Tax rules verified " + FE.RULES_VERIFIED + "; rates as of " + FE.RATES_ASOF + ".");
  return out.join("\n");
}
async function saveText(name, text) {
  if (window.claude && typeof window.claude.use === "function") { toast("Preparing the file…"); try { const d = await window.claude.use("downloads"); if (d) { await d.save({ filename: name, data: text }); toast("File saved"); return; } } catch (e) { if (e && e.code === "declined") return; } toast("Saving a file is not available here. Use Copy instead."); return; }
  try { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "text/markdown" })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); toast("File downloaded"); } catch (e) { toast("Download failed. Use Copy instead."); }
}
VIEWS.plan = {
  render() {
    const pl = FE.plan(S, S.year, TODAY), who = pl.lead ? esc(pl.lead.name) + ", " + pl.age + " · " + esc(FE.OCC[pl.occ].n) + " · " : "";
    const nextId = pl.next ? pl.next.id : "";
    return `<div class="ph"><div><h2>My plan</h2><p>${who}${esc(pl.stage.n)} · ${esc(pl.risk)} investor. ${pl.done} of ${pl.steps.length} steps in place.</p></div><div class="btns"><button class="btn" type="button" id="pl-prof">Edit profile</button><button class="btn" type="button" id="pl-copy">Copy plan</button><button class="btn" type="button" id="pl-save">Save as a file</button></div></div>
    <div class="cols"><div class="stack">
      <section class="card"><h3><span>Do these in order</span><span>${pl.done}/${pl.steps.length}</span></h3><div class="meter" style="margin:0 0 6px"><i style="width:${Math.round(pl.done / pl.steps.length * 100)}%"></i></div>
        <div class="steps">${pl.steps.map(s => `<button class="step ${s.status}${s.id === nextId ? " next" : ""}" type="button" data-go="${s.go}"><span class="ic" aria-hidden="true"></span><span><span class="t">${esc(s.title)}</span><span class="d">${esc(s.detail)}</span></span><span class="tag ${s.id === nextId ? "acc" : STATUS[s.status][0]}">${s.id === nextId ? "Start here" : STATUS[s.status][1]}</span></button>`).join("")}</div>
        <p class="small" style="margin-top:10px">The order matters: safety before growth. A later step is not wrong to work on, but an earlier gap can undo it.</p></section>
      <section class="card"><h3><span>This stage of life: ${esc(pl.stage.n)}</span></h3><p style="font-size:.95rem"><b>${esc(pl.stage.focus)}.</b> ${esc(pl.stage.tip)}</p></section>
      ${pl.tips.map(t => `<section class="card"><h3><span>${esc(t.n)}</span><span>${esc(t.who.join(", "))}</span></h3><ul class="tips">${t.items.map(i => `<li>${esc(i)}</li>`).join("")}</ul></section>`).join("")}
    </div><div class="stack">
      <section class="card"><h3><span>Where next month's surplus goes</span><span>${inr(Math.max(0, pl.surplus))}</span></h3>${pl.split.length ? hbars(pl.split.map(x => ({ label: esc(x.label), v: x.amt, text: inr(x.amt), c: x.c, extra: esc(x.why), tip: x.label + ": " + inr(x.amt) + " a month" }))) : `<p class="empty">${pl.surplus < 0 ? "Spending and EMIs are above income by " + inr(-pl.surplus) + " a month. Closing that gap comes before everything else." : "Add income and spending under Cash flow to see a monthly split."}</p>`}</section>
      <section class="card"><h3><span>A mix that fits</span><span>financial investments</span></h3>
        ${pl.cur ? `<div class="mixrow"><span>Now</span>${mixBar(pl.cur)}</div>` : ""}<div class="mixrow"><span>Suggested</span>${mixBar(pl.mix)}</div>
        <div class="legend"><span><i style="background:var(--c1)"></i>Equity<b>${pl.cur ? Math.round(pl.cur.equity) + "% → " : ""}${pl.mix.equity}%</b></span><span><i style="background:var(--c3)"></i>Debt and deposits<b>${pl.cur ? Math.round(pl.cur.debt) + "% → " : ""}${pl.mix.debt}%</b></span><span><i style="background:var(--c4)"></i>Gold<b>${pl.cur ? Math.round(pl.cur.gold) + "% → " : ""}${pl.mix.gold}%</b></span></div>
        <p class="small" style="margin-top:10px">A starting point from age ${pl.age} and a ${esc(pl.risk)} temperament${pl.retired ? ", capped in retirement" : ""}. Your home and business are left out. Money needed within three years stays out of equity whatever the mix.</p>
        ${N(S.settings.target.equity) !== pl.mix.equity ? `<div class="btns" style="margin-top:8px"><button class="btn sm" type="button" id="pl-target">Use ${pl.mix.equity}% as my equity target</button></div>` : ""}</section>
      <section class="card"><h3><span>Options that fit each purpose</span><span>after tax, a year</span></h3><div class="tw"><table>${pl.shortlist.map(p => `<tr><th colspan="2" style="text-align:left;padding-top:10px">${esc(p.n)}</th></tr>${p.items.map(i => `<tr><td>${esc(i.n)}${i.safe ? "" : " *"}${i.note ? `<div class="small">${esc(i.note)}</div>` : ""}</td><td>${pct(i.after)}</td></tr>`).join("")}`).join("")}</table></div>
        <p class="small" style="margin-top:8px">Yields use ${pl.lead ? esc(pl.lead.name) + "'s" : "your"} tax rates (interest ${pct(pl.rates.int)}). * Assumed long-run return; the value can fall sharply along the way. Categories, not specific funds: choose low-cost direct plans.</p></section>
      ${pl.band ? `<section class="card"><h3><span>At your income</span><span>${esc(pl.band.n)}</span></h3><p style="font-size:.95rem">${esc(pl.band.text)}</p></section>` : ""}
      <section class="card"><h3><span>Schemes to look at</span><span>${pl.schemes.length}</span></h3><div class="rows">${pl.schemes.map(x => `<div class="row"><span><span class="n">${esc(x.n)}</span><span class="m" style="display:block">${esc(x.what)}</span></span><span></span></div>`).join("")}</div></section>
    </div></div>
    <footer class="fine">This plan is built from rules of thumb that Indian planners commonly use, applied to the numbers you entered. It is not personal investment advice, and Rupee Desk is not a SEBI-registered investment adviser. It names categories, never specific securities. Confirm tax matters with a chartered accountant. Rules verified ${FE.RULES_VERIFIED}; rates as of ${FE.RATES_ASOF}.</footer>`;
  },
  mount(v) {
    $("#pl-copy", v).onclick = async () => { try { await navigator.clipboard.writeText(planText(FE.plan(S, S.year, TODAY))); toast("Plan copied"); } catch (e) { toast("Copy was blocked by the browser"); } };
    $("#pl-save", v).onclick = () => saveText("rupee-desk-plan-" + iso(TODAY) + ".md", planText(FE.plan(S, S.year, TODAY)));
    const tg = $("#pl-target", v); if (tg) tg.onclick = () => { S.settings.target.equity = FE.plan(S, S.year, TODAY).mix.equity; save(); render(); toast("Equity target updated"); };
    $("#pl-prof", v).onclick = () => {
      const inds = S.members.filter(m => m.kind !== "huf"), lead = FE.leadOf(S), item = { lead: lead ? lead.id : "", risk: S.settings.risk || "balanced", dependants: S.settings.dependants === "no" ? "no" : "yes", kids: S.settings.kids, daughter: S.settings.daughter === "yes" ? "yes" : "no" };
      const fields = [{ k: "lead", label: "Plan around", type: "select", opts: inds.map(m => [m.id, m.name]) }, { k: "risk", label: "If investments fell 30% in a year", type: "select", opts: RISK_OPTS }, { k: "dependants", label: "Does anyone depend on your income?", type: "select", opts: [["yes", "Yes"], ["no", "No"]] }, { k: "kids", label: "Children under 18", type: "num", max: 12 }, { k: "daughter", label: "A daughter under 10?", type: "select", opts: [["no", "No"], ["yes", "Yes"]] }];
      inds.forEach(m => { item["occ_" + m.id] = FE.occOf(m); item["age_" + m.id] = m.age; fields.push({ k: "age_" + m.id, label: m.name + ": age", type: "num", max: 120 }, { k: "occ_" + m.id, label: m.name + ": occupation", type: "select", opts: Object.entries(FE.OCC).map(([k, o]) => [k, o.n]) }); });
      editItem({ title: "Your profile", fields, item, onSave: d => { Object.assign(S.settings, { lead: d.lead, risk: d.risk, dependants: d.dependants, kids: N(d.kids), daughter: d.daughter }); inds.forEach(m => { m.occ = d["occ_" + m.id]; if (N(d["age_" + m.id]) > 0) m.age = N(d["age_" + m.id]); }); save(); render(); } });
    };
  }
};

/* ---------- Business and practice ---------- */
const BIZ_F = () => [{ k: "name", label: "Name", type: "text", req: 1, wide: 1 }, { k: "owner", label: "Owner", type: "select", opts: S.members.filter(m => m.kind !== "huf").map(m => [m.id, m.name]) }, { k: "type", label: "Kind", type: "select", opts: [["profession", "Profession: doctor, CA, lawyer, architect, consultant"], ["business", "Business: trading, manufacturing, services"]] },
  { k: "supply", label: "What it supplies", type: "select", opts: [["services", "Taxable services"], ["goods", "Goods only"], ["both", "Goods and services"], ["exempt", "Exempt services: healthcare, education"]] }, { k: "receipts", label: "Received by bank or digital, a year (₹)", req: 1 }, { k: "cash", label: "Received in cash, a year (₹)" }, { k: "expenses", label: "Business expenses, a year (₹)", hint: "Rent, salaries, materials, depreciation, loan interest" }, { k: "fixed", label: "Fixed costs a month (₹)", hint: "Costs that continue if income stops" }, { k: "reserve", label: "Cash kept for the business (₹)" }];
const BIZ_GUARD = { profession: ["Professional indemnity cover sized to the largest claim you could face", "Personal accident and disability cover for the person the income depends on", "Insurance for premises and equipment", "Records and logins that a trusted person can reach", "A written plan for patients or clients, staff and dues if you cannot work"], business: ["Insurance for stock, premises and fire", "Term cover at least equal to business loans, so they do not fall on the family", "Business and personal money in separate accounts", "A partnership deed or succession note that says who runs it and who owns what", "Supplier and customer dues written down, not held in memory"] };
VIEWS.business = {
  render() {
    const add = `<button class="btn pri" type="button" id="bz-add">Add a business or practice</button>`;
    if (!S.biz.length) return `<div class="ph"><div><h2>Business and practice</h2><p>For professionals, traders and business owners: presumptive scheme or books, the limits that matter, and the buffer the business needs.</p></div><div class="btns">${add}</div></div>
      <div class="card"><p class="empty">Nothing here yet. Add your practice or business with a year's receipts and expenses. Salaried and retired households can skip this page.</p></div>`;
    const b = S.biz.find(x => x.id === S.ui.biz) || S.biz[0]; S.ui.biz = b.id; const owner = member(b.owner) || S.members[0];
    return `<div class="ph"><div><h2>Business and practice</h2><p>Presumptive scheme or books, the limits that matter, and the buffer the business needs.</p></div><div class="btns">${add}</div></div>
    <div class="pills" style="margin-bottom:12px">${S.biz.map(x => `<button class="pill" type="button" data-biz="${x.id}" aria-pressed="${x.id === b.id}">${esc(x.name)}</button>`).join("")}</div>
    <div class="cols"><div class="stack"><section class="card"><h3><span>${esc(b.name)}</span><span>${esc(owner.name)}</span></h3><div class="rows">
        <div class="row"><span class="n">Receipts for the year</span><span class="a">${sh(N(b.receipts) + N(b.cash))}<small>${N(b.cash) > 0 ? sh(N(b.cash)) + " in cash" : "none in cash"}</small></span></div>
        <div class="row"><span class="n">Expenses</span><span class="a">${N(b.expenses) > 0 ? sh(N(b.expenses)) : "not entered"}</span></div>
        <div class="row"><span class="n">Fixed costs a month</span><span class="a">${N(b.fixed) > 0 ? sh(N(b.fixed)) : "not entered"}</span></div>
        <div class="row"><span class="n">Cash kept for the business</span><span class="a">${sh(N(b.reserve))}</span></div></div>
        <div class="btns" style="margin-top:12px"><button class="btn" type="button" id="bz-edit">Edit</button></div></section>
      <section class="card"><h3><span>Protect it</span></h3><ul class="tips">${BIZ_GUARD[b.type === "business" ? "business" : "profession"].map(x => `<li>${x}</li>`).join("")}</ul></section></div>
      <div class="stack sticky" id="bz-out"></div></div>
    <footer class="fine">The comparison taxes the owner's whole income under each choice, using the lower regime. It leaves out accountant and audit fees, depreciation choices, partner remuneration and GST itself. The five-year rule: leave 44AD and you cannot return to it for five years. Take these figures to your chartered accountant.</footer>`;
  },
  mount(v) {
    const edit = (it, isNew) => editItem({ title: isNew ? "Add a business or practice" : "Edit " + it.name, isNew, fields: BIZ_F(), item: it, onSave: d => { S.ui.biz = d.id; upsert(S.biz, d); }, onDelete: isNew ? null : () => removeItem(S.biz, it.id, it.name) });
    $("#bz-add", v).onclick = () => { const o = S.members.find(m => ["professional", "business", "freelance"].includes(FE.occOf(m))) || S.members[0]; edit({ id: uid(), owner: o.id, type: FE.occOf(o) === "business" ? "business" : "profession", supply: FE.occOf(o) === "business" ? "goods" : "services" }, 1); };
    if (!S.biz.length) return;
    $("#bz-edit", v).onclick = () => edit(S.biz.find(x => x.id === S.ui.biz));
    v.addEventListener("click", e => {
      const p = e.target.closest("[data-biz]"); if (p) { S.ui.biz = p.dataset.biz; save(); render(); return; }
      const a = e.target.closest("[data-apply]"); if (!a) return;
      const b = S.biz.find(x => x.id === S.ui.biz), o = member(b.owner); if (!o) return; const old = Object.assign({}, o.t), c = FE.bizCompare(o, b, S.year);
      Object.assign(o.t, { receipts: "", profitPct: "", turnDigital: "", turnCash: "", profit: "" });
      if (a.dataset.apply === "pres") Object.assign(o.t, c.prof ? { bizMode: "44ada", receipts: c.total } : { bizMode: "44ad", turnDigital: N(b.receipts), turnCash: N(b.cash) }); else Object.assign(o.t, { bizMode: "actual", profit: Math.round(c.booksProfit) });
      save(); render(); toast(o.name + "'s Tax page updated", () => { o.t = old; save(); render(); });
    });
    this.refresh(v);
  },
  refresh(v) {
    const b = S.biz.find(x => x.id === S.ui.biz), out = $("#bz-out", v); if (!b || !out) return; const o = member(b.owner) || S.members[0], c = FE.bizCompare(o, b, S.year), hasExp = N(b.expenses) > 0;
    if (!(c.total > 0)) { out.innerHTML = '<div class="note gold">Enter the year\'s receipts to compare.</div>'; return; }
    const sch = c.prof ? "44ADA" : "44AD", line = (lvl, t, d) => `<div class="check ${lvl}"><span class="ic" aria-hidden="true">${lvl === "ok" ? "✓" : lvl === "info" ? "i" : "!"}</span><span><span class="t">${t}</span><span class="d" style="display:block">${d}</span></span><span></span></div>`;
    const cur = o.t.bizMode || "none", using = cur === "44ada" || cur === "44ad" ? "pres" : cur === "actual" ? "books" : "";
    out.innerHTML = `<div class="tiles"><div class="tile"><div class="k">Receipts</div><div class="v">${sh(c.total)}</div><div class="s">${Math.round(c.cashShare * 100)}% in cash</div></div><div class="tile"><div class="k">Real margin</div><div class="v">${hasExp ? pct(c.margin, 0) : "–"}</div><div class="s">${hasExp ? sh(c.booksProfit) + " profit" : "add expenses"}</div></div><div class="tile"><div class="k">${sch} assumes</div><div class="v">${pct(c.total > 0 ? c.presProfit / c.total : 0, 0)}</div><div class="s">${sh(c.presProfit)} profit</div></div></div>
      <section class="card"><h3><span>Presumptive scheme or books</span><span>${esc(o.name)}'s whole tax</span></h3><div class="tw"><table><tr><th></th><th>${sch}</th><th>Books</th></tr>
        <tr><td>Profit taxed</td><td>${c.eligible ? inr(c.presProfit) : "–"}</td><td>${hasExp ? inr(c.booksProfit) : "–"}</td></tr>
        <tr class="tot"><td>Tax for the year</td><td>${c.eligible ? inr(c.presTax) : "not open"}</td><td>${hasExp ? inr(c.booksTax) : "–"}</td></tr>
        <tr class="sub"><td>Books of account</td><td>not needed</td><td>needed</td></tr><tr class="sub"><td>Tax audit</td><td>no</td><td>${c.audit ? "yes" : "no"}</td></tr><tr class="sub"><td>Advance tax</td><td>one instalment, 15 March</td><td>four instalments</td></tr></table></div>
        <div class="note ${c.better === "presumptive" ? "ok" : "gold"}" style="margin-top:10px">${!c.eligible ? `<b>${sch} is not open:</b> receipts are above the ${sh(c.limit)} limit${c.cashShare > .05 ? " that applies when more than 5% is cash" : ""}. Books and, at this size, ${c.audit ? "a tax audit are" : "regular accounts are"} required.` : !hasExp ? `<b>${sch} is open to you.</b> Add your real expenses to see whether books would be cheaper.` : c.better === "presumptive" ? `<b>${sch} costs ${inr(c.saving)} less</b> and needs no books. Your real margin of ${pct(c.margin, 0)} is above the ${pct(c.presProfit / c.total, 0)} the scheme assumes.` : `<b>Books cost ${inr(c.saving)} less in tax,</b> because your real margin of ${pct(c.margin, 0)} is below the ${pct(c.presProfit / c.total, 0)} the scheme assumes. ${c.audit ? "That route needs books and a tax audit: " + c.auditWhy.toLowerCase() + ". Set the fees against the saving." : "It needs proper books."}`}</div>
        <div class="btns" style="margin-top:10px">${c.eligible ? `<button class="btn ${using === "pres" ? "pri" : ""}" type="button" data-apply="pres">${using === "pres" ? "Using" : "Use"} ${sch} on the Tax page</button>` : ""}${hasExp ? `<button class="btn ${using === "books" ? "pri" : ""}" type="button" data-apply="books">${using === "books" ? "Using" : "Use"} books profit on the Tax page</button>` : ""}</div></section>
      <section class="card"><h3><span>Limits that matter</span></h3><div class="checks">
        ${line(c.eligible ? "ok" : "warn", c.eligible ? "Within the " + sch + " limit of " + sh(c.limit) : "Above the " + sch + " limit of " + sh(c.limit), c.prof ? "₹75 lakh if cash is 5% or less of receipts, otherwise ₹50 lakh." : "₹3 crore if cash is 5% or less of receipts, otherwise ₹2 crore.")}
        ${line(c.audit ? "warn" : "ok", c.audit ? "Tax audit applies if you keep books" : "No tax audit at this size", c.audit ? c.auditWhy + "." : c.prof ? "For professions an audit starts above ₹50 lakh of receipts when books are kept." : "For business an audit starts above ₹1 crore of turnover, or ₹10 crore when cash is 5% or less.")}
        ${line(c.gst.exempt ? "ok" : c.gst.over ? "warn" : "ok", c.gst.exempt ? "GST: exempt services need no registration" : c.gst.over ? "GST registration is required" : "Below the GST registration limit", c.gst.exempt ? "Healthcare and education services are exempt. Taxable side income, such as rent from commercial property, still counts towards the ₹20 lakh limit." : "The limit is " + sh(c.gst.limit) + " a year in most states (lower in some north-eastern and hill states). Selling to other states or through online marketplaces can require it earlier.")}
        ${isFinite(c.bufferMonths) ? line(c.bufferMonths >= 6 ? "ok" : c.bufferMonths >= 3 ? "warn" : "bad", "Business buffer covers " + c.bufferMonths.toFixed(1) + " months of fixed costs", c.bufferMonths >= 6 ? "Six months or more lets the business ride out a slow spell without touching family savings." : "Aim for six months (" + sh(c.fixed * 6) + "), kept apart from the family emergency fund. You hold " + sh(c.reserve) + ".") : line("info", "Add fixed monthly costs to size a buffer", "Rent, salaries and loan EMIs that continue when income stops.")}
      </div></section>`;
  }
};
