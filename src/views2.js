/* Rupee Desk views: Goals, Retirement, Loans, Insurance, Compare options, Calculators, Calendar, Data */
"use strict";
const bound = (f, obj, base) => fieldHTML(f, obj[f.k], { bind: "data-path", prefix: base.replace(/\W/g, "-") + "-", keyOf: z => base + "." + z.k });
const ym = months => !isFinite(months) ? "never" : (months >= 12 ? Math.floor(months / 12) + " yr " : "") + (months % 12 ? (months % 12) + " mo" : months >= 12 ? "" : "0 mo");

/* ---------- Goals ---------- */
const GOAL_F = () => [{ k: "name", label: "Goal", type: "text", req: 1, wide: 1 }, { k: "year", label: "Year you need the money", type: "num", min: TODAY.getFullYear(), max: TODAY.getFullYear() + 60, req: 1 }, { k: "cost", label: "Cost in today's rupees (₹)", req: 1 }, { k: "infl", label: "Price rise for this goal (% a year)", type: "pct", max: 20, hint: "Education 8 to 10, general 5 to 6" }, { k: "saved", label: "Already set aside (₹)" }, { k: "sip", label: "Investing now (₹ a month)" }, { k: "step", label: "Raise the monthly amount by (% a year)", type: "pct", max: 30 }, { k: "ret", label: "Expected return (% a year)", type: "pct", max: 20, hint: "Under 3 years 6 to 7; 3 to 7 years 8 to 9; longer 10 to 11" }];
const GOAL_TPL = [["Child's education", 12, 2500000, 9, 10], ["Home down payment", 5, 3000000, 6, 8], ["Car", 4, 1200000, 5, 7], ["Wedding", 6, 2000000, 7, 8], ["Big trip", 2, 400000, 6, 6.5], ["Start a business", 3, 1500000, 6, 7], ["Parents' care fund", 5, 1000000, 10, 8]];
VIEWS.goals = {
  render() {
    const yr = TODAY.getFullYear(), T = FE.totals(S), st = S.goals.map(g => ({ g, s: FE.goalStatus(g, yr) })).sort((a, b) => N(a.g.year) - N(b.g.year));
    const now = S.goals.reduce((s, g) => s + N(g.sip), 0), need = st.reduce((s, x) => s + Math.max(N(x.g.sip), x.s.need), 0);
    return `<div class="ph"><div><h2>Goals</h2><p>Each goal gets its own cost, date and monthly amount. Costs are inflated to the year you need them.</p></div><div class="btns"><button class="btn pri" type="button" id="add-g">Add goal</button></div></div>
    <div class="pills" style="margin-bottom:12px" aria-label="Quick add">${GOAL_TPL.map((t, i) => `<button class="btn sm ghost" type="button" data-tpl="${i}">+ ${t[0]}</button>`).join("")}</div>
    <div class="stack">${S.goals.length ? `<div class="tiles"><div class="tile"><div class="k">Investing now</div><div class="v">${sh(now)}</div><div class="s">a month, all goals</div></div><div class="tile ${need > now * 1.001 ? "warn" : "good"}"><div class="k">Needed</div><div class="v">${sh(need)}</div><div class="s">a month to fund every goal</div></div><div class="tile ${T.surplus >= need - now ? "good" : "bad"}"><div class="k">Monthly surplus</div><div class="v">${sh(T.surplus)}</div><div class="s">${need > now ? (T.surplus >= need - now ? "covers the extra " + sh(need - now) : "short of the extra " + sh(need - now)) : "from Cash flow"}</div></div></div>` : ""}
    ${st.map(({ g, s }) => `<button class="card" type="button" data-goal="${g.id}" style="text-align:left;width:100%"><div class="row" style="padding:0;border:0"><span><span class="n" style="font-size:1.08rem">${esc(g.name)}</span><span class="m" style="display:block">${esc(g.year)} · ${s.yrs} ${s.yrs === 1 ? "year" : "years"} away · ${sh(N(g.cost))} today becomes ${sh(s.target)}</span></span><span class="tag ${s.onTrack ? "ok" : "warn"}">${s.onTrack ? "On track" : "Short " + sh(s.gap)}</span></div>
      <div class="meter ${s.onTrack ? "" : "warn"}"><i style="width:${Math.round(s.funded * 100)}%"></i></div>
      <div class="small" style="margin-top:8px">Projected ${sh(s.projected)} (${Math.round(s.funded * 100)}%). You invest ${inr(N(g.sip))} a month${N(g.step) ? ", rising " + N(g.step) + "% a year" : ""}; ${s.yrs === 0 ? "the goal is due this year." : s.onTrack ? inr(s.need) + " would be enough." : "<b style='color:var(--ink)'>" + inr(s.need) + " a month is needed</b>."}${s.yrs > 0 && s.yrs <= 3 && N(g.ret) > 8 ? " With under three years to go, keep this money out of equity." : ""}</div></button>`).join("") || '<div class="card"><p class="empty">No goals yet. Add a child\'s education, a home, a car or a big trip.</p></div>'}
    <p class="small">Projections use one steady return. Markets do not move steadily: move each goal's money to deposits or debt funds over its last three years.</p></div>`;
  },
  mount(v) {
    $("#add-g", v).onclick = () => editItem({ title: "Add a goal", isNew: 1, fields: GOAL_F(), item: { id: uid(), year: TODAY.getFullYear() + 5, infl: N(S.settings.infl) || 6, ret: 9, step: 5 }, onSave: d => upsert(S.goals, d) });
    v.addEventListener("click", e => { const t = e.target.closest("[data-tpl]"); if (t) { const g = GOAL_TPL[+t.dataset.tpl]; editItem({ title: "Add a goal", isNew: 1, fields: GOAL_F(), item: { id: uid(), name: g[0], year: TODAY.getFullYear() + g[1], cost: g[2], infl: g[3], ret: g[4], step: 5 }, onSave: d => upsert(S.goals, d) }); return; }
      const b = e.target.closest("[data-goal]"); if (!b) return; const it = S.goals.find(x => x.id === b.dataset.goal); editItem({ title: "Edit goal", fields: GOAL_F(), item: it, onSave: d => upsert(S.goals, d), onDelete: () => removeItem(S.goals, it.id, it.name) }); });
  }
};

/* ---------- Retirement ---------- */
const RET_F = [{ k: "age", label: "Your age now", type: "num", max: 100 }, { k: "retAge", label: "Age you stop working", type: "num", max: 100 }, { k: "endAge", label: "Plan until age", type: "num", max: 110, hint: "For a couple, use the younger partner's 90 to 95" }, { k: "corpus", label: "Retirement investments today (₹)" }, { k: "saveMonthly", label: "Adding (₹ a month)" }, { k: "stepUp", label: "Raise that by (% a year)", type: "pct", max: 30 }, { k: "spend", label: "Yearly spending in retirement, today's rupees (₹)" }, { k: "pension", label: "Pension or rent in retirement, a year (₹)", hint: "Today's rupees; assumed to keep up with prices" }, { k: "eqPre", label: "Equity share while working (%)", type: "pct", max: 100 }, { k: "eqPost", label: "Equity share in retirement (%)", type: "pct", max: 100 }];
const RET_ADV = [{ k: "infl", label: "Inflation (% a year)", type: "pct", max: 15 }, { k: "eqRet", label: "Equity return (% a year)", type: "pct", max: 20 }, { k: "eqVol", label: "Equity swings (% a year)", type: "pct", max: 40 }, { k: "debtRet", label: "Debt return (% a year)", type: "pct", max: 12 }];
VIEWS.retire = {
  render() {
    return `<div class="ph"><div><h2>Retirement</h2><p>Will the money last? 500 possible futures for your plan, in today's rupees.</p></div><div class="btns"><button class="btn" type="button" id="rt-use">Use my investments total</button></div></div>
    <div class="cols"><div class="stack"><section class="card"><h3><span>Your plan</span></h3><div class="fields">${RET_F.map(f => bound(f, S.retire, "retire")).join("")}</div></section>
      <details class="fold card"><summary style="padding:0">Return and inflation assumptions</summary><div class="fields" style="margin-top:12px">${RET_ADV.map(f => bound(f, S.retire, "retire")).join("")}</div><p class="small" style="margin-top:10px">Defaults: equity 11.5% a year with 18% swings, debt 7%, inflation 6%. Returns are after costs and before tax, so keep some margin.</p></details></div>
      <div class="stack sticky" id="rt-out"></div></div>`;
  },
  mount(v) { $("#rt-use", v).onclick = () => { S.retire.corpus = Math.round(FE.totals(S).invest); const m = S.members.find(x => x.kind !== "huf"); if (m && N(m.age)) S.retire.age = N(m.age); save(); render(); toast("Taken from Assets and loans"); }; this.refresh(v); },
  refresh(v) {
    const q = S.retire, age = N(q.age), ret = N(q.retAge), end = N(q.endAge), out = $("#rt-out", v);
    if (!(age > 0 && ret >= age && end > ret)) { out.innerHTML = '<div class="note gold">Check the three ages: now, when you stop working, and how long to plan for.</div>'; return; }
    if (!(N(q.spend) > 0)) { out.innerHTML = '<div class="note gold">Enter your yearly spending in retirement to run the plan.</div>'; return; }
    const r = FE.retirementSim(q, 500, 11), p = r.success, wr = r.withdrawal, net = Math.max(0, N(q.spend) - N(q.pension));
    const tips = r.ages.map((a, i) => "Age " + a + ": typical " + sh(r.bands.p50[i]) + "; poor markets " + sh(r.bands.p10[i]) + "; good markets " + sh(r.bands.p90[i]));
    out.innerHTML = `<div class="tiles"><div class="tile ${p >= .9 ? "good" : p >= .75 ? "warn" : "bad"}"><div class="k">Money lasts to ${end}</div><div class="v">${Math.round(p * 100)}%</div><div class="s">of 500 futures</div></div><div class="tile"><div class="k">At ${ret}, typically</div><div class="v">${sh(r.medianAtRet)}</div><div class="s">today's rupees</div></div><div class="tile ${wr <= .035 ? "good" : wr <= .045 ? "warn" : "bad"}"><div class="k">First-year withdrawal</div><div class="v">${isFinite(wr) ? pct(wr) : "–"}</div><div class="s">of the corpus</div></div></div>
      <section class="card"><h3><span>Your investments by age</span><span>today's rupees</span></h3>${lineChart({ x: r.ages.map(String), y: r.bands.p50, lo: r.bands.p10, hi: r.bands.p90, tips, markX: ret - age, markLabel: "stop work", label: "Projected investments by age" })}<div class="legend"><span><i style="background:var(--accent)"></i>Typical outcome</span><span><i style="background:var(--accent);opacity:.25"></i>Middle 80% of outcomes</span></div></section>
      <div class="note ${p >= .9 ? "ok" : p >= .75 ? "gold" : "bad"}">${p >= .9 ? "<b>The plan holds in nine futures out of ten.</b>" : p >= .75 ? "<b>The plan holds in most futures, with little room.</b>" : "<b>The plan runs out in many futures.</b>"} Spending ${sh(net)} a year from investments needs about <b>${sh(net / .033)}</b> at a 3.3% starting withdrawal, the cautious Indian rule of thumb. ${r.medianAtRet >= net / .033 ? "You are projected to pass that." : "You are projected to reach " + sh(r.medianAtRet) + ". Saving more, working longer or spending less each help."}</div>
      <p class="small">A simple model: one person, steady spending in real terms, no tax on withdrawals, no large one-off costs. Health costs usually rise faster than prices. Treat a result under 85% as a plan to strengthen.</p>`;
  }
};

/* ---------- Loans ---------- */
VIEWS.loans = {
  render() {
    if (!S.liabs.length) return `<div class="ph"><div><h2>Loans</h2><p>See when each loan ends and what prepaying saves.</p></div></div><div class="card"><p class="empty">No loans recorded. Add one under Assets and loans.</p><button class="btn pri" type="button" data-go="wealth">Go to Assets and loans</button></div>`;
    const cur = S.liabs.find(l => l.id === S.loan.id) || S.liabs.slice().sort((a, b) => N(b.rate) - N(a.rate))[0]; S.loan.id = cur.id;
    return `<div class="ph"><div><h2>Loans</h2><p>See when each loan ends and what prepaying saves. Clear the costliest loan first.</p></div></div>
    <div class="pills" style="margin-bottom:12px">${S.liabs.slice().sort((a, b) => N(b.rate) - N(a.rate)).map(l => `<button class="pill" type="button" data-loan="${l.id}" aria-pressed="${l.id === cur.id}">${esc(l.name)} · ${N(l.rate)}%</button>`).join("")}</div>
    <div class="cols"><div class="stack"><section class="card"><h3><span>${esc(cur.name)}</span><span>${sh(N(cur.balance))} at ${N(cur.rate)}%</span></h3><div class="fields">${bound({ k: "extra", label: "Pay extra every month (₹)" }, S.loan, "loan")}${bound({ k: "lump", label: "Prepay a lump sum now (₹)" }, S.loan, "loan")}${bound({ k: "alt", label: "What the money would earn instead, after tax (% a year)", type: "pct", max: 20, wide: 1, hint: "A bank FD after tax in the 30% slab earns about 4.4%; equity over ten years perhaps 9 to 10%, not guaranteed" }, S.loan, "loan")}</div>
      <p class="small" style="margin-top:10px">Change the balance, rate or EMI under Assets and loans.</p></section></div><div class="stack sticky" id="ln-out"></div></div>`;
  },
  mount(v) { v.addEventListener("click", e => { const b = e.target.closest("[data-loan]"); if (b) { S.loan.id = b.dataset.loan; save(); render(); } }); if (S.liabs.length) this.refresh(v); },
  refresh(v) {
    const l = S.liabs.find(x => x.id === S.loan.id), out = $("#ln-out", v); if (!l || !out) return;
    const P = N(l.balance), rate = N(l.rate), e = N(l.emi), extra = Math.max(0, N(S.loan.extra)), lump = Math.min(P, Math.max(0, N(S.loan.lump)));
    if (!(P > 0 && e > 0)) { out.innerHTML = '<div class="note gold">This loan needs a balance and an EMI. Edit it under Assets and loans.</div>'; return; }
    const a = FE.loanPath(P, rate, e, 0, 0);
    if (!isFinite(a.months)) { out.innerHTML = `<div class="note bad"><b>The EMI does not cover the interest.</b> At ${rate}% the interest alone is ${inr(P * rate / 1200)} a month, so this loan never ends. Check the figures.</div>`; return; }
    const b = FE.loanPath(P, rate, e, extra, lump), changed = extra > 0 || lump > 0, alt = N(S.loan.alt), n = Math.max(a.series.length, b.series.length), pad = s => Array.from({ length: n }, (_, i) => s[i] == null ? 0 : s[i]);
    const saved = a.interest - b.interest, altGain = changed ? (lump * Math.pow(1 + alt / 100, b.months / 12) - lump) + (FE.fvSip(extra, alt / 100, b.months / 12, 0) - extra * b.months) : 0;
    out.innerHTML = `<div class="tiles"><div class="tile"><div class="k">Ends in</div><div class="v">${ym(a.months)}</div><div class="s">${dfmt(new Date(TODAY.getFullYear(), TODAY.getMonth() + a.months, 1), { month: "short", year: "numeric" })}</div></div><div class="tile"><div class="k">Interest still to pay</div><div class="v">${sh(a.interest)}</div></div>${changed ? `<div class="tile good"><div class="k">With prepayment</div><div class="v">${ym(b.months)}</div><div class="s">${ym(a.months - b.months)} sooner</div></div><div class="tile good"><div class="k">Interest saved</div><div class="v">${sh(saved)}</div></div>` : ""}</div>
      <section class="card"><h3><span>Balance by year</span><span>₹</span></h3>${lineChart({ x: pad(a.series).map((_, i) => "Yr " + i), y: pad(changed ? b.series : a.series), y2: changed ? pad(a.series) : null, tips: pad(a.series).map((val, i) => "After year " + i + ": " + sh(val) + (changed ? " as planned, " + sh(pad(b.series)[i]) + " with prepayment" : "")), label: "Loan balance by year" })}${changed ? '<div class="legend"><span><i style="background:var(--accent)"></i>With prepayment</span><span><i style="background:var(--gold)"></i>As planned</span></div>' : ""}</section>
      ${changed ? `<div class="note ${rate >= alt ? "ok" : "gold"}"><b>${rate >= alt ? "Prepaying wins." : "Investing is expected to earn more, with risk."}</b> Prepaying saves ${sh(saved)} of interest for certain, a return of ${rate}%. The same money invested at ${alt}% after tax would earn about ${sh(altGain)} over the same ${ym(b.months)}. ${l.type === "home" ? "On a home loan in the old regime, the interest deduction (up to ₹2 lakh on a home you live in) lowers the true cost of the loan." : rate >= 12 ? "Above 12%, prepaying is almost always right." : ""}</div>` : '<p class="small">Enter an extra monthly amount or a lump sum to see what it saves.</p>'}`;
  }
};

/* ---------- Insurance ---------- */
const POL_F = () => [{ k: "name", label: "Policy", type: "text", req: 1, wide: 1 }, { k: "type", label: "Kind", type: "select", opts: [["term", "Term life"], ["health", "Health"], ["accident", "Accident or disability"], ["other", "Other (endowment, ULIP, home, vehicle)"]] }, { k: "owner", label: "Who is covered", type: "select", opts: ownerOpts() }, { k: "cover", label: "Cover (₹)", req: 1 }, { k: "premium", label: "Premium a year (₹)" }, { k: "renew", label: "Next renewal", type: "date" }];
const PAPER = [["will", "A signed will, and the family knows where it is"], ["nominee", "Nominees on every bank account, deposit, demat, fund folio, PF and policy"], ["joint", "Main accounts held jointly, either-or-survivor"], ["list", "One list of all accounts, policies and loans that your spouse can find"], ["health-own", "Health cover that does not depend on an employer"], ["15h", "Form 15G or 15H given to banks where your tax is nil"], ["kyc", "PAN, Aadhaar and KYC up to date on every folio"], ["poa", "Someone trusted can operate things if you cannot"]];
VIEWS.cover = {
  render() {
    const kinds = { term: "Term life", health: "Health", accident: "Accident", other: "Other" };
    return `<div class="ph"><div><h2>Insurance</h2><p>Protect first. Cover is for disasters you could not afford, not for returns.</p></div><div class="btns"><button class="btn pri" type="button" id="add-p">Add policy</button></div></div>
    <div class="cols"><div class="stack"><section class="card"><h3><span>Policies</span><span>${S.policies.length}</span></h3><div class="rows">${S.policies.map(p => `<button class="row" type="button" data-pol="${p.id}"><span><span class="n">${esc(p.name)}</span><span class="m" style="display:block">${kinds[p.type] || "Other"} · ${esc(ownerName(p.owner))} · ${inr(N(p.premium))} a year${p.renew ? " · renews " + dfmt(new Date(p.renew), { day: "numeric", month: "short" }) : ""}</span></span><span class="a">${sh(N(p.cover))}</span></button>`).join("") || '<p class="empty">No policies recorded.</p>'}</div></section>
      <section class="card"><h3><span>Does anyone depend on your income?</span></h3><div class="fields">${bound({ k: "dependants", label: "Dependants", type: "select", opts: [["yes", "Yes: spouse, children or parents"], ["no", "No one"]] }, S.settings, "settings")}</div></section></div>
      <div class="stack"><section class="card"><h3><span>Is it enough?</span></h3><div class="checks" id="cv-checks"></div><p class="small" style="margin-top:8px">Rules of thumb. Term cover should run until loans are repaid and children are independent. Endowment and money-back plans typically return 4 to 6%: count them as savings, not as cover.</p></section>
      <section class="card"><h3><span>Paperwork that protects the family</span><span id="cv-n"></span></h3><div>${PAPER.map(([k, l]) => `<label class="checkline"><input type="checkbox" data-paper="${k}" ${S.checklist[k] ? "checked" : ""}><span>${l}</span></label>`).join("")}</div></section></div></div>`;
  },
  mount(v) {
    $("#add-p", v).onclick = () => editItem({ title: "Add a policy", isNew: 1, fields: POL_F(), item: { id: uid(), type: "term", owner: S.members[0].id }, onSave: d => upsert(S.policies, d) });
    v.addEventListener("click", e => { const b = e.target.closest("[data-pol]"); if (!b) return; const it = S.policies.find(x => x.id === b.dataset.pol); editItem({ title: "Edit policy", fields: POL_F(), item: it, onSave: d => upsert(S.policies, d), onDelete: () => removeItem(S.policies, it.id, it.name) }); });
    v.addEventListener("change", e => { const c = e.target.closest("[data-paper]"); if (!c) return; S.checklist[c.dataset.paper] = c.checked; save(); this.refresh(v); });
    this.refresh(v);
  },
  refresh(v) { const c = FE.healthChecks(S, S.year, TODAY).filter(x => x.id === "term" || x.id === "health"); $("#cv-checks", v).innerHTML = c.map(x => checkHTML(Object.assign({}, x, { go: "cover" }))).join("") || '<p class="empty">Add your income under Cash flow to size term cover.</p>'; $("#cv-n", v).textContent = PAPER.filter(p => S.checklist[p[0]]).length + " of " + PAPER.length; }
};

/* ---------- Compare options ---------- */
const BRK = [["r:0:0", "No tax to pay"], ["r:.05:0", "5% slab"], ["r:.1:0", "10% slab"], ["r:.2:0", "20% slab"], ["r:.3:0", "30% slab"], ["r:.3:.1", "30% slab + 10% surcharge"], ["r:.3:.15", "30% slab + 15% surcharge"], ["r:.3:.25", "30% slab + 25% surcharge"]];
function ratesFor(who) { const m = member(who); if (m) { const r = FE.marginalRates(m, S.year); return Object.assign(r, { label: m.name + "'s rates", age: m.kind === "huf" ? 40 : N(m.age) || 40 }); } const [, s, c] = (who || "r:.3:0").split(":").map(Number); if (!s) return { int: 0, stcg: 0, ltcg: 0, label: "no tax", age: 40 }; return { int: s * (1 + c) * 1.04, stcg: .2 * (1 + Math.min(c, .15)) * 1.04, ltcg: .125 * (1 + Math.min(c, .15)) * 1.04, label: BRK.find(b => b[0] === who)[1], age: 40 }; }
const KIND = p => p.tax === "eee" ? ["c3", "Tax-free"] : p.vol >= 10 || p.tax === "equity" ? ["c2", "Equity-taxed or market-linked"] : p.tax === "slab" ? ["c1", "Fixed, interest taxed yearly"] : ["c4", "Other, taxed when sold"];
VIEWS.invest = {
  render() {
    if (!member(S.compare.who) && !/^r:/.test(S.compare.who || "")) S.compare.who = S.members[0] ? S.members[0].id : "r:.3:0";
    const who = S.members.map(m => [m.id, m.name + ", from the Tax page"]).concat(BRK);
    return `<div class="ph"><div><h2>Compare options</h2><p>What a lump sum becomes after tax in each mainstream Indian option. Rates as of ${FE.RATES_ASOF}.</p></div></div>
    <div class="cols"><div class="stack"><section class="card"><h3><span>Your case</span></h3><div class="fields">${bound({ k: "amt", label: "Amount (₹)" }, S.compare, "compare")}${bound({ k: "yrs", label: "For how many years", type: "num", min: 1, max: 40 }, S.compare, "compare")}${bound({ k: "who", label: "Whose tax rates", type: "select", opts: who }, S.compare, "compare")}${bound({ k: "harvest", label: "Book ₹1.25 lakh of equity gains each year", type: "select", opts: [["yes", "Yes"], ["no", "No"]] }, Object.assign({}, S.compare, { harvest: S.compare.harvest === false || S.compare.harvest === "no" ? "no" : "yes" }), "compare")}</div><div id="iv-rates" style="margin-top:10px"></div></section></div>
      <div class="stack sticky" id="iv-out"></div></div>
    <details class="fold card" style="margin-top:14px"><summary style="padding:0">The options, their rates and who stands behind them</summary><div style="margin-top:12px"><div class="tw"><table><tr><th>Option</th><th>Rate</th><th>Lock-in</th></tr>${FE.PROD.map(p => `<tr><td>${esc(p.n)}<div class="small">${esc(p.by)}. ${esc(p.note)}</div></td><td>${p.r}%${p.vol >= 10 ? "*" : ""}</td><td>${p.lock ? p.lock + " yr" : "none"}</td></tr>`).join("")}</table></div><p class="small" style="margin-top:8px">* Assumed long-run return, not a rate anyone promises. Small-savings rates are reset every quarter.</p></div></details>`;
  },
  mount(v) { this.refresh(v); },
  refresh(v) {
    const c = S.compare, A = Math.max(0, N(c.amt)), yrs = Math.max(1, Math.min(40, Math.round(N(c.yrs) || 1))), e = ratesFor(c.who), harvest = !(c.harvest === false || c.harvest === "no"), inf = N(S.settings.infl) / 100;
    $("#iv-rates", v).innerHTML = `<p class="small">Using ${esc(e.label)}: interest taxed at ${pct(e.int)}, short-term equity gains ${pct(e.stcg)}, long-term ${pct(e.ltcg)}. Inflation ${N(S.settings.infl)}% (change it under Data).</p>`;
    if (!A) { $("#iv-out", v).innerHTML = '<div class="note gold">Enter an amount.</div>'; return; }
    const all = FE.PROD.map(p => { const val = FE.growAfterTax(p, A, yrs, e, harvest), g = FE.cagr(A, val, yrs); let why = ""; if (p.minAge && e.age < p.minAge) why = "From age " + p.minAge; else if (p.cap && A > p.cap) why = "Limit: " + p.capNote; else if (p.lock > yrs) why = "Locked for " + p.lock + " years"; return { p, val, g, why }; }).sort((a, b) => b.val - a.val);
    const fit = all.filter(x => !x.why), not = all.filter(x => x.why);
    const rows = list => list.map(x => ({ label: esc(x.p.n), v: x.val, text: sh(x.val) + " · " + pct(x.g), c: KIND(x.p)[0], dim: !!x.why, tip: x.p.n + ": " + inr(x.val) + " after tax, " + pct(x.g) + " a year, " + pct(x.g - inf) + " after inflation", extra: (x.why ? x.why + ". " : "") + (x.p.vol >= 10 ? "Value can fall sharply along the way." : x.p.payout ? "Interest is paid out; assumed re-deposited in a bank FD." : "") }));
    const best = fit.find(x => x.p.vol < 10), bestAny = fit[0];
    $("#iv-out", v).innerHTML = `<section class="card"><h3><span>${sh(A)} for ${yrs} ${yrs === 1 ? "year" : "years"}, after tax</span><span>value · yearly return</span></h3>${fit.length ? hbars(rows(fit)) : '<p class="empty">No option fits this amount and period.</p>'}
        <div class="legend">${[["c1", "Fixed, interest taxed yearly"], ["c3", "Tax-free"], ["c2", "Equity-taxed or market-linked"], ["c4", "Other, taxed when sold"]].map(([k, l]) => `<span><i style="background:var(--${k})"></i>${l}</span>`).join("")}</div></section>
      ${best && bestAny ? `<div class="note">${yrs < 5 ? `<b>Under five years, safety matters more than rank.</b> The best steady option here is ${esc(best.p.n)} at ${pct(best.g)} after tax.` : `<b>Highest expected:</b> ${esc(bestAny.p.n)} at ${pct(bestAny.g)} after tax, with large swings. <b>Best steady option:</b> ${esc(best.p.n)} at ${pct(best.g)}.`} After ${N(S.settings.infl)}% inflation the steady option gains ${pct(best.g - inf)} a year in buying power.</div>` : ""}
      ${not.length ? `<section class="card"><h3><span>Does not fit this amount, period or age</span><span>${not.length}</span></h3>${hbars(rows(not))}</section>` : ""}
      <p class="small">A lesson in tax and compounding, not a forecast. Equity will not deliver a smooth return; guaranteed rates can be cut for new deposits. Each row assumes the whole sum goes into that one option.</p>`;
  }
};

/* ---------- Calculators ---------- */
const TOOLS = {
  sip: { n: "SIP", f: [["m", "Monthly investment (₹)", 25000], ["y", "Years", 15, "num"], ["r", "Return (% a year)", 11, "pct"], ["s", "Raise it by (% a year)", 0, "pct"]], calc: t => { const fv = FE.fvSip(t.m, t.r / 100, t.y, t.s / 100); let inv = 0, s = t.m; for (let k = 0; k < t.y; k++) { inv += s * 12; s *= 1 + t.s / 100; } return [["Value at the end", sh(fv), 1], ["You put in", sh(inv)], ["Growth", sh(fv - inv)]]; } },
  lump: { n: "Lump sum", f: [["a", "Amount (₹)", 1000000], ["y", "Years", 10, "num"], ["r", "Return (% a year)", 9, "pct"], ["i", "Inflation (% a year)", 6, "pct"]], calc: t => { const fv = FE.fvLump(t.a, t.r / 100, t.y); return [["Value at the end", sh(fv), 1], ["In today's rupees", sh(fv / Math.pow(1 + t.i / 100, t.y))], ["Real return a year", pct((1 + t.r / 100) / (1 + t.i / 100) - 1)]]; } },
  swp: { n: "Monthly withdrawal", f: [["c", "Starting amount (₹)", 10000000], ["w", "Withdraw each month (₹)", 50000], ["r", "Return (% a year)", 8, "pct"], ["i", "Raise withdrawal by (% a year)", 6, "pct"]], calc: t => { let v = t.c, w = t.w, m = 0; const mr = Math.pow(1 + t.r / 100, 1 / 12) - 1; while (v > 0 && m < 720) { if (m && m % 12 === 0) w *= 1 + t.i / 100; v = (v - w) * (1 + mr); m++; } return [["Money lasts", m >= 720 ? "60 years or more" : ym(m), 1], ["First-year withdrawal rate", pct(t.c > 0 ? t.w * 12 / t.c : 0)], ["Withdrawal in year 20", inr(t.w * Math.pow(1 + t.i / 100, 19)) + " a month"]]; } },
  fd: { n: "Fixed deposit", f: [["a", "Deposit (₹)", 500000], ["r", "Rate (% a year)", 6.45, "pct"], ["y", "Years", 3, "num"], ["t", "Your tax on interest (%)", 31.2, "pct"]], calc: t => { const fv = t.a * Math.pow(1 + t.r / 400, 4 * t.y), eff = Math.pow(1 + t.r / 400, 4) - 1, at = t.a * Math.pow(1 + eff * (1 - t.t / 100), t.y); return [["Maturity value", inr(fv), 1], ["After tax paid each year", inr(at)], ["Return after tax", pct(FE.cagr(t.a, at, t.y), 2) + " a year"]]; } },
  emi: { n: "EMI", f: [["a", "Loan (₹)", 5000000], ["r", "Rate (% a year)", 8.5, "pct"], ["y", "Years", 20, "num"]], calc: t => { const e = FE.emi(t.a, t.r, t.y * 12); return [["EMI", inr(e) + " a month", 1], ["Total interest", sh(e * t.y * 12 - t.a)], ["Total paid", sh(e * t.y * 12)]]; } },
  hra: { n: "HRA exemption", f: [["b", "Basic pay plus DA, a year (₹)", 1000000], ["h", "HRA received, a year (₹)", 400000], ["rent", "Rent paid, a year (₹)", 360000], ["metro", "Live in a 50% city?", "1", "select", [["1", "Yes"], ["0", "No"]]]], calc: t => { const x = [t.h, Math.max(0, t.rent - .1 * t.b), (t.metro ? .5 : .4) * t.b], ex = Math.max(0, Math.min(...x)); return [["Exempt HRA, old regime", inr(ex), 1], ["Taxable HRA", inr(Math.max(0, t.h - ex))], ["Least of", "HRA " + sh(x[0]) + "; rent less 10% of basic " + sh(x[1]) + "; " + (t.metro ? "50" : "40") + "% of basic " + sh(x[2])]]; }, note: () => "50% cities for " + FE.YEARS[S.year].short + ": " + FE.YEARS[S.year].metros.replace(" or ", ", ") + ". The new regime gives no HRA exemption." },
  cagr: { n: "Growth rate", f: [["a", "Value at the start (₹)", 100000], ["b", "Value at the end (₹)", 250000], ["y", "Years between", 7, "num"]], calc: t => { const g = FE.cagr(t.a, t.b, t.y); return [["Growth a year (CAGR)", pct(g, 2), 1], ["Multiple", (t.a > 0 ? t.b / t.a : 0).toFixed(2) + "×"], ["Years to double at this rate", g > 0 ? (Math.log(2) / Math.log(1 + g)).toFixed(1) : "–"]]; } },
  ppf: { n: "PPF", f: [["d", "Deposit each year (₹)", 150000], ["y", "Years", 15, "num"], ["r", "Rate (% a year)", 7.1, "pct"]], calc: t => { const d = Math.min(t.d, 150000); let v = 0; for (let k = 0; k < t.y; k++) v = (v + d) * (1 + t.r / 100); return [["Maturity value, tax-free", sh(v), 1], ["You put in", sh(d * t.y)], ["Interest earned", sh(v - d * t.y)]]; }, note: () => "Deposits are capped at ₹1.5 lakh a year, made by 5 April to earn the full year's interest." }
};
VIEWS.tools = {
  render() {
    const id = TOOLS[S.tools.id] ? S.tools.id : "sip", T = TOOLS[id]; S.tools.id = id; const st = S.tools[id] = S.tools[id] || {}; T.f.forEach(([k, , d]) => { if (st[k] == null) st[k] = d; });
    return `<div class="ph"><div><h2>Calculators</h2><p>Quick sums that do not touch your saved household.</p></div></div>
    <div class="pills" style="margin-bottom:12px">${Object.entries(TOOLS).map(([k, t]) => `<button class="pill" type="button" data-tool="${k}" aria-pressed="${k === id}">${t.n}</button>`).join("")}</div>
    <div class="cols"><section class="card"><h3><span>${T.n}</span></h3><div class="fields">${T.f.map(([k, label, , type, opts]) => bound({ k, label, type: type || "money", opts, max: type === "pct" ? 100 : undefined }, st, "tools." + id)).join("")}</div></section><div class="stack sticky" id="tl-out"></div></div>`;
  },
  mount(v) { v.addEventListener("click", e => { const b = e.target.closest("[data-tool]"); if (b) { S.tools.id = b.dataset.tool; save(); render(); } }); this.refresh(v); },
  refresh(v) { const T = TOOLS[S.tools.id], st = S.tools[S.tools.id], t = {}; T.f.forEach(([k]) => t[k] = Math.max(0, N(st[k]))); let out; try { out = T.calc(t); } catch (e) { out = [["Check the inputs", "–", 1]]; }
    $("#tl-out", v).innerHTML = `<div class="tiles">${out.filter(o => o[2]).map(o => `<div class="tile"><div class="k">${o[0]}</div><div class="v" style="font-size:1.5rem">${o[1]}</div></div>`).join("")}</div><section class="card"><div class="tw"><table>${out.filter(o => !o[2]).map(o => `<tr><td>${o[0]}</td><td style="white-space:normal">${o[1]}</td></tr>`).join("")}</table></div>${T.note ? `<p class="small" style="margin-top:8px">${esc(T.note())}</p>` : ""}</section>`; }
};

/* ---------- Calendar ---------- */
const REM_F = [{ k: "title", label: "Reminder", type: "text", req: 1, wide: 1 }, { k: "date", label: "Date", type: "date", req: 1 }, { k: "note", label: "Note", type: "text" }];
VIEWS.calendar = {
  render() {
    const ev = FE.calendar(S, TODAY); let last = "", h = "";
    ev.forEach(e => { const m = e.date.toLocaleDateString("en-IN", { month: "long", year: "numeric" }); if (m !== last) { if (last) h += "</div>"; h += `<h3 class="cal-m">${m}</h3><div class="rows">`; last = m; }
      const own = e.kind === "own" ? S.reminders.find(r => r.title === e.title) : null;
      h += `<${own ? "button" : "div"} class="row" ${own ? `type="button" data-rem="${own.id}"` : ""}><span><span class="n">${esc(e.title)}</span><span class="m" style="display:block">${dfmt(e.date, { weekday: "short", day: "numeric", month: "short" })}${e.detail ? " · " + esc(e.detail) : ""}</span></span><span class="days ${e.days <= 14 ? "soon" : ""}">${e.days <= 0 ? "today" : e.days + " d"}</span></${own ? "button" : "div"}>`; });
    return `<div class="ph"><div><h2>Calendar</h2><p>Tax and money dates for the next twelve months, with your policy renewals and your own reminders.</p></div><div class="btns"><button class="btn pri" type="button" id="add-r">Add reminder</button></div></div><div class="card">${h ? h + "</div>" : '<p class="empty">Nothing ahead.</p>'}</div>
    <p class="small" style="margin-top:10px">Return due dates are the standard ones. The government sometimes extends them; check the income-tax portal near the date.</p>`;
  },
  mount(v) {
    $("#add-r", v).onclick = () => editItem({ title: "Add a reminder", isNew: 1, fields: REM_F, item: { id: uid(), date: iso(new Date(+TODAY + 7 * 864e5)) }, onSave: d => upsert(S.reminders, d) });
    v.addEventListener("click", e => { const b = e.target.closest("[data-rem]"); if (!b) return; const it = S.reminders.find(x => x.id === b.dataset.rem); editItem({ title: "Edit reminder", fields: REM_F, item: it, onSave: d => upsert(S.reminders, d), onDelete: () => removeItem(S.reminders, it.id, it.title) }); });
  }
};

/* ---------- Data and backup ---------- */
async function exportData() {
  const json = JSON.stringify(S, null, 1), name = "rupee-desk-backup-" + iso(TODAY) + ".json";
  if (window.claude && typeof window.claude.use === "function") { toast("Preparing backup…"); try { const d = await window.claude.use("downloads"); if (d) { await d.save({ filename: name, data: json }); toast("Backup saved"); return; } } catch (e) { if (e && e.code === "declined") return; } toast("Saving a file is not available here. Use Copy backup text."); return; }
  try { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([json], { type: "application/json" })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); toast("Backup downloaded"); } catch (e) { toast("Download failed. Use Copy backup text."); }
}
function importData(text) { let o = null; try { o = migrate(JSON.parse(text)); } catch (e) { } if (!o) { toast("That is not a Rupee Desk backup"); return; } const old = S; o.meta.sample = false; S = o; save(true); shell(); render(true); toast("Backup loaded", () => { S = old; save(true); shell(); render(); }); }
VIEWS.data = {
  render() {
    const c = cloud.state, kb = Math.round(JSON.stringify(S).length / 1024);
    return `<div class="ph"><div><h2>Data and backup</h2><p>Your numbers stay private. Nothing is sent to any server other than your own Claude storage, and only if that is switched on.</p></div></div>
    <div class="cols"><div class="stack">
      <section class="card"><h3><span>Where your data lives</span><span>${kb} KB</span></h3><div class="note ${c === "ok" ? "ok" : storeOK ? "" : "bad"}">${c === "ok" ? "<b>Saved on this device and in your private Claude storage.</b> It follows you to other devices where you open this page signed in. Nobody else who opens the page can read it." : storeOK ? "<b>Saved in this browser on this device.</b> Clearing browser data removes it. Export a backup now and then." : "<b>This browser is not letting the page save.</b> Export a backup before you close it."}${S.meta.sample ? " You are looking at the example household, which is never backed up." : ""}</div>
        <div class="fields" style="margin-top:12px">${bound({ k: "cloud", label: "Keep a private copy in my Claude account", type: "select", opts: [["yes", "Yes, when available"], ["no", "No, this device only"]] }, { cloud: S.settings.cloud === false || S.settings.cloud === "no" ? "no" : "yes" }, "settings")}</div></section>
      <section class="card"><h3><span>Backup</span></h3><div class="btns"><button class="btn pri" type="button" id="d-exp">Save a backup file</button><button class="btn" type="button" id="d-copy">Copy backup text</button></div>
        <div class="f" style="margin-top:14px"><label for="d-file">Load a backup file</label><input id="d-file" type="file" accept=".json,application/json"></div>
        <div class="f" style="margin-top:12px"><label for="d-paste">Or paste backup text</label><textarea id="d-paste" rows="3" placeholder='{"v":1, …}'></textarea></div><div class="btns" style="margin-top:8px"><button class="btn" type="button" id="d-load">Load pasted backup</button></div></section>
      <section class="card"><h3><span>Start over</span></h3><div class="btns"><button class="btn pri" type="button" id="d-setup">Two-minute setup</button><button class="btn" type="button" id="d-sample">See an example household</button><button class="btn danger" type="button" id="d-fresh">Clear everything</button></div><p class="small" style="margin-top:8px">Each replaces what is here now, and can be undone for a few seconds afterwards.</p></section>
    </div><div class="stack">
      <section class="card"><h3><span>Household assumptions</span></h3><div class="fields">${bound({ k: "infl", label: "Inflation used across the app (% a year)", type: "pct", max: 15 }, S.settings, "settings")}${fieldHTML({ k: "settings.target.equity", label: "Target for equity (% of investments)", type: "pct", max: 100 }, S.settings.target.equity, { bind: "data-path" })}</div></section>
      <section class="card"><h3><span>People</span><span>${S.members.length}</span></h3><div class="rows">${S.members.map(m => `<div class="row"><span><span class="n">${esc(m.name)}</span><span class="m" style="display:block">${m.kind === "huf" ? "HUF" : "Individual, age " + (N(m.age) || "–")}${m.on === false ? " · not counted" : ""}</span></span><span></span></div>`).join("")}</div><div class="btns" style="margin-top:8px"><button class="btn sm" type="button" data-go="tax">Add or edit people under Tax</button></div></section>
      <section class="card"><h3><span>What this app rests on</span></h3><p class="small">Tax rules verified ${FE.RULES_VERIFIED} for ${Object.values(FE.YEARS).map(y => y.label).join(" and ")}. Investment rates as of ${FE.RATES_ASOF}. The engine is checked by 115 worked cases. Rupee Desk is not a SEBI-registered investment adviser: it works with categories and rules of thumb, not specific securities.</p>
        <ul class="small" style="padding-left:1.1em;margin:8px 0 0"><li><a href="https://www.business-standard.com/finance/personal-finance/what-changes-for-taxpayers-in-budget-2026-10-major-tax-changes-explained-126020200387_1.html">Budget 2026: what changed for taxpayers</a> (Business Standard)</li><li><a href="https://www.moneylife.in/article/new-income-tax-rules-from-1st-april-hra-exemption-extended-to-8-cities-fewer-forms-but-landlord-disclosure-now-mandatory/79998.html">Income-tax Rules 2026: HRA in eight cities</a> (Moneylife)</li><li><a href="https://cleartax.in/s/income-tax-act-2025">Income-tax Act, 2025: section mapping</a> (ClearTax)</li><li><a href="https://www.outlookmoney.com/retirement/pension/small-savings-rates-unchanged-ppf-at-710-per-cent-nsc-at-770-per-cent">Small-savings rates, October to December 2026</a> (Outlook Money)</li><li><a href="https://www.forbesindia.com/article/news/rbi-mpc-meeting-live-rate-hike-in-focus-as-inflation-oil-rise-liveblog/2999124/1">RBI repo rate 5.50% from 7 October 2026</a> (Forbes India)</li></ul>
        <p class="small" style="margin-top:8px">A planning aid, not advice. Rules and rates change; confirm with your chartered accountant before you file or invest.</p></section>
    </div></div>`;
  },
  mount(v) {
    $("#d-exp", v).onclick = exportData;
    $("#d-copy", v).onclick = async () => { try { await navigator.clipboard.writeText(JSON.stringify(S)); toast("Backup text copied"); } catch (e) { $("#d-paste", v).value = JSON.stringify(S); toast("Copy was blocked. The text is in the box below: select and copy it."); } };
    $("#d-file", v).onchange = e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => importData(String(r.result)); r.readAsText(f); };
    $("#d-load", v).onclick = () => importData($("#d-paste", v).value);
    $("#d-sample", v).onclick = examplesSheet;
    $("#d-setup", v).onclick = quickSetup;
    $("#d-fresh", v).onclick = () => { const old = S; S = blankState(); save(true); shell(); render(true); toast("Everything cleared", () => { S = old; save(true); shell(); render(); }); };
    v.addEventListener("change", e => { const el = e.target.closest('[data-path="settings.cloud"]'); if (!el) return; S.settings.cloud = el.value !== "no"; save(true); if (S.settings.cloud) cloudInit(); else { cloud.state = "off"; paintSave(); } render(); });
  }
};
