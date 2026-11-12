/* Rupee Desk engine. Pure functions, no DOM. Runs in the browser (window.FE) and in Node (tests).
   Indian resident individuals and HUFs. Amounts in rupees.
   Rules verified November 2026 for FY 2025-26 (Income-tax Act, 1961) and Tax Year 2026-27 (Income-tax Act, 2025). */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.FE = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const L = 1e5, CR = 1e7;
  const max0 = v => Math.max(0, +v || 0);
  const num = v => +v || 0;

  /* ---------- tax years ---------- */
  const YEARS = {
    "2026-27": { key: "2026-27", start: 2026, label: "Tax Year 2026-27", short: "TY 2026-27", sub: "1 April 2026 to 31 March 2027", act: 2025,
      metros: "Delhi, Mumbai, Kolkata, Chennai, Bengaluru, Hyderabad, Pune or Ahmedabad" },
    "2025-26": { key: "2025-26", start: 2025, label: "FY 2025-26 (AY 2026-27)", short: "FY 2025-26", sub: "1 April 2025 to 31 March 2026", act: 1961,
      metros: "Delhi, Mumbai, Kolkata or Chennai" }
  };
  const RULES_VERIFIED = "11 November 2026";
  function yearForDate(d) { const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1; const k = y + "-" + String((y + 1) % 100).padStart(2, "0"); return YEARS[k] ? k : "2026-27"; }
  /* familiar name first, new Act number second, only where the mapping is confirmed */
  const NEW_SEC = { "80C": "123", "80D": "126", "80G": "133", "80TTA": "153", "80TTB": "153", "87A": "156", "115BAC": "202", "111A": "196", "112": "197", "112A": "198", "44ADA": "58", "44AD": "58" };
  function sec(yearKey, old) { const y = YEARS[yearKey]; return y && y.act === 2025 && NEW_SEC[old] ? old + " (now s." + NEW_SEC[old] + ")" : old; }

  /* ---------- slabs, surcharge ---------- */
  const NEW_SLABS = [[4 * L, 0], [8 * L, .05], [12 * L, .10], [16 * L, .15], [20 * L, .20], [24 * L, .25], [Infinity, .30]];
  function oldSlabs(age, huf) { const b = huf ? 2.5 * L : age >= 80 ? 5 * L : age >= 60 ? 3 * L : 2.5 * L; return [[b, 0], [5 * L, .05], [10 * L, .20], [Infinity, .30]]; }
  function slabTax(inc, slabs) { let t = 0, lo = 0; for (const [hi, r] of slabs) { if (inc > lo) t += (Math.min(inc, hi) - lo) * r; lo = hi; } return t; }
  function surRate(x, regime) { return x > 5 * CR ? (regime === "new" ? .25 : .37) : x > 2 * CR ? .25 : x > CR ? .15 : x > 50 * L ? .10 : 0; }

  /* ---------- core tax on computed income ----------
     c: { normal: slab income after deductions (includes div), div: dividends inside normal,
          st: s.111A short-term equity gains (20%), lt: s.112A long-term equity gains before the ₹1.25L threshold (12.5%),
          lo: other long-term gains (12.5%, s.112), vda: crypto gains (30%), agri: agricultural income (exempt, used for rate) } */
  function taxOn(c, o) {
    const regime = o.regime === "old" ? "old" : "new", huf = !!o.huf, age = huf ? 40 : num(o.age) || 40;
    const slabs = regime === "new" ? NEW_SLABS : oldSlabs(age, huf), basic = slabs[0][0];
    const normal = max0(c.normal), st = max0(c.st), lt = max0(c.lt), lo = max0(c.lo), vda = max0(c.vda), agri = max0(c.agri);
    const div = Math.min(max0(c.div), normal);
    const TI = normal + st + lt + lo + vda;
    /* unused basic exemption absorbs special-rate gains (residents): highest rate first */
    let room = Math.max(0, basic - normal); const shift = room;
    const take = v => { const u = Math.min(room, v); room -= u; return v - u; };
    const stT = take(st), loT = take(lo), ltT = Math.max(0, take(lt) - 1.25 * L);
    const exemptUsed = shift - room;
    let tSlab = agri > 5000 && normal > basic ? slabTax(normal + agri, slabs) - slabTax(basic + agri, slabs) : slabTax(normal, slabs);
    const slabGross = tSlab;
    let tSt = stT * .20, tLo = loT * .125, tLt = ltT * .125, tVda = vda * .30;
    /* rebate: resident individuals only */
    let rebate = 0, marginalRebate = false;
    if (!huf) {
      if (regime === "new") {
        if (TI <= 12 * L) rebate = Math.min(60000, tSlab);
        else { const excess = TI - 12 * L, tot = tSlab + tSt + tLo + tLt + tVda; if (tot > excess && tSlab > 0) { rebate = Math.min(tSlab, tot - excess); marginalRebate = rebate > 0; } }
      } else if (TI <= 5 * L) rebate = Math.min(12500, tSlab + tSt + tLo + tVda); /* not against s.112A tax */
    }
    let r = rebate; let u = Math.min(r, tSlab); tSlab -= u; r -= u;
    u = Math.min(r, tSt); tSt -= u; r -= u; u = Math.min(r, tLo); tLo -= u; r -= u; u = Math.min(r, tVda); tVda -= u; r -= u;
    /* surcharge: capped at 15% on tax from s.111A, s.112, s.112A gains and dividends */
    const full = surRate(TI, regime), capInc = st + lt + lo + div, oth = TI - capInc;
    const rAll = Math.min(full, .15), rOth = full <= .15 ? full : Math.max(.15, surRate(oth, regime));
    const divShare = normal > 0 ? div / normal : 0;
    const taxOth = tSlab * (1 - divShare) + tVda, taxCap = tSlab * divShare + tSt + tLo + tLt;
    let sur = taxOth * rOth + taxCap * rAll, relief = 0;
    if (!o._noRelief && sur > 0) {
      const base = taxOth + taxCap;
      const T = TI > 5 * CR && regime === "old" ? 5 * CR : TI > 2 * CR ? 2 * CR : TI > CR ? CR : 50 * L;
      /* relief is measured on total income, as the Finance Act words it */
      const cap = taxOn(reduce(c, TI - T), o).pre + (TI - T);
      if (base + sur > cap) { relief = Math.min(sur, base + sur - cap); sur -= relief; }
    }
    const pre = taxOth + taxCap + sur, cess = pre * .04, exact = pre + cess;
    return { regime, TI, normal, basic, exemptUsed, slabTax: slabGross, rebate, marginalRebate, stTax: tSt, ltTax: tLo + tLt, vdaTax: tVda,
      specTax: tSt + tLo + tLt + tVda, surRate: full, surRateSlab: rOth, sur, relief, cess, pre, exact, tax: Math.round(exact / 10) * 10 };
  }
  /* take `amt` off the income: slab income first, then gains */
  function reduce(c, amt) {
    const d = { normal: max0(c.normal), div: Math.min(max0(c.div), max0(c.normal)), st: max0(c.st), lt: max0(c.lt), lo: max0(c.lo), vda: max0(c.vda), agri: max0(c.agri) };
    let u = Math.min(d.normal - d.div, amt); d.normal -= u; amt -= u;
    u = Math.min(d.vda, amt); d.vda -= u; amt -= u;
    u = Math.min(d.div, amt); d.div -= u; d.normal -= u; amt -= u;
    for (const k of ["st", "lo", "lt"]) { u = Math.min(d[k], amt); d[k] -= u; amt -= u; }
    return d;
  }

  /* ---------- one person, one regime ---------- */
  function computePerson(p, yearKey, regime) {
    const Y = YEARS[yearKey] || YEARS["2026-27"], t = p.t || {}, huf = p.kind === "huf", age = huf ? 40 : num(p.age) || 40, old = regime === "old";
    const n = k => max0(t[k]), raw = k => num(t[k]);
    const lines = [], notes = [];
    /* salary and pension */
    let sal = 0, hra = 0, sd = 0, pt = 0, exOther = 0, fp = 0;
    if (!huf) {
      const gross = n("salary"), pen = n("pension");
      if (old && n("hra") > 0 && n("rent") > 0) hra = Math.max(0, Math.min(n("hra"), n("rent") - .1 * n("basic"), (t.metro === "yes" ? .5 : .4) * n("basic")));
      exOther = old ? Math.min(n("exOther"), Math.max(0, gross - hra)) : 0;
      sd = Math.min(Math.max(0, gross - hra - exOther) + pen, old ? 50000 : 75000);
      pt = old ? Math.min(n("ptax"), 2500) : 0;
      const f = n("famPen"); fp = f - Math.min(f / 3, old ? 15000 : 25000);
      sal = Math.max(0, gross - hra - exOther + pen - sd - pt);
    }
    /* house property */
    const hpSelf = old ? -Math.min(n("hlSelf"), 2 * L) : 0;
    const hpLet = Math.max(0, n("rentRecv") - n("muni")) * .7 - n("hlLet");
    let hp = hpSelf + hpLet, hpLossLost = 0;
    if (hp < 0) { const lim = old ? -2 * L : 0; if (hp < lim) { hpLossLost = lim - hp; hp = lim; } }
    if (hpLossLost > 0) notes.push(old ? "House-property loss above ₹2 lakh (₹" + Math.round(hpLossLost).toLocaleString("en-IN") + ") is carried forward, not set off this year." : "In the new regime a house-property loss cannot be set off against other income.");
    /* business or profession */
    let biz = 0;
    if (t.bizMode === "44ada") biz = n("receipts") * Math.max(.5, Math.min(1, (n("profitPct") || 50) / 100));
    else if (t.bizMode === "44ad") biz = n("turnDigital") * .06 + n("turnCash") * .08;
    else if (t.bizMode === "actual") biz = n("profit");
    /* capital gains with set-off of losses */
    const g = { slab: raw("stSlab"), st: raw("st111A"), lo: raw("ltOther"), lt: raw("lt112A") };
    let stLoss = 0, ltLoss = 0;
    ["slab", "st"].forEach(k => { if (g[k] < 0) { stLoss -= g[k]; g[k] = 0; } });
    ["lo", "lt"].forEach(k => { if (g[k] < 0) { ltLoss -= g[k]; g[k] = 0; } });
    const eat = (loss, keys) => { keys.forEach(k => { const u = Math.min(loss, g[k]); g[k] -= u; loss -= u; }); return loss; };
    const stLossCF = eat(stLoss, ["slab", "st", "lo", "lt"]), ltLossCF = eat(ltLoss, ["lo", "lt"]);
    if (stLossCF + ltLossCF > 0) notes.push("Capital loss of ₹" + Math.round(stLossCF + ltLossCF).toLocaleString("en-IN") + " is not used this year. It can be carried forward for 8 years if the return is filed on time.");
    /* other sources */
    const div = n("div"), oth = n("savInt") + n("fdInt") + div + n("othInc") + fp;
    const gti = Math.max(0, sal + hp + biz + oth + g.slab);
    /* deductions */
    const dl = [];
    const add = (label, v) => { if (v > 0) dl.push([label, v]); };
    if (!huf) add("Employer NPS, 80CCD(2)", Math.min(n("empNps"), n("basic") * (old && t.govt !== "yes" ? .10 : .14)));
    if (old) {
      add(sec(yearKey, "80C"), Math.min(n("c80"), 1.5 * L));
      if (!huf) add("Own NPS, 80CCD(1B)", Math.min(n("nps1b"), 50000));
      add(sec(yearKey, "80D") + " self and family", Math.min(n("medSelf"), t.selfSenior === "yes" || (!huf && age >= 60) ? 50000 : 25000));
      if (!huf) add(sec(yearKey, "80D") + " parents", Math.min(n("medPar"), t.parSenior === "yes" ? 50000 : 25000));
      if (!huf) add("80E education-loan interest", n("d80e"));
      add(sec(yearKey, "80G") + " donations", n("d80g"));
      if (!huf && age >= 60) add(sec(yearKey, "80TTB") + " interest", Math.min(n("savInt") + n("fdInt"), 50000));
      else add(sec(yearKey, "80TTA") + " savings interest", Math.min(n("savInt"), 10000));
      add("Other deductions", n("dOther"));
    }
    let ded = dl.reduce((s, x) => s + x[1], 0); if (ded > gti) ded = gti;
    const normal = Math.max(0, gti - ded);
    const c = { normal, div: Math.min(div, normal), st: g.st, lt: g.lt, lo: g.lo, vda: n("vda"), agri: n("agri") };
    const tax = taxOn(c, { regime, age, huf });
    if (n("empNps") > 7.5 * L) notes.push("Employer contributions to NPS, EPF and superannuation above ₹7.5 lakh a year are taxed as a perquisite. Not modelled here.");
    if (t.bizMode === "44ada" && n("receipts") > 75 * L) notes.push("44ADA is available only up to ₹75 lakh of receipts (₹50 lakh if more than 5% is in cash).");
    if (t.bizMode === "44ad" && n("turnDigital") + n("turnCash") > 3 * CR) notes.push("44AD is available only up to ₹3 crore of turnover (₹2 crore if more than 5% is in cash).");
    if (tax.marginalRebate) notes.push("Income is just above ₹12 lakh: marginal relief limits the tax to the amount by which income exceeds ₹12 lakh.");
    if (regime === "new" && !huf && tax.TI > 12 * L && normal <= 12 * L && tax.slabTax > 0) notes.push("Capital gains pushed total income above ₹12 lakh, so the ₹60,000 rebate is lost.");
    return Object.assign({ year: Y.key, sal, hra, sd, pt, exOther, hp, biz, oth, stSlab: g.slab, gti, ded, dl, c, gainsGross: g.st + g.lt + g.lo + n("vda"), notes, stLossCF, ltLossCF }, tax);
  }
  function bestRegime(p, yearKey) {
    const nw = computePerson(p, yearKey, "new"), od = computePerson(p, yearKey, "old");
    const pick = p.regime === "new" || p.regime === "old" ? p.regime : (od.tax < nw.tax ? "old" : "new");
    return { nw, od, pick, r: pick === "new" ? nw : od, saving: Math.abs(nw.tax - od.tax), better: od.tax < nw.tax ? "old" : "new" };
  }
  /* tax on the next slice of each kind of income, for after-tax comparisons */
  function marginalRates(p, yearKey) {
    const b = bestRegime(p, yearKey), o = { regime: b.pick, age: p.age, huf: p.kind === "huf" }, c = b.r.c, d = 10000, base = taxOn(c, o).exact;
    const m = k => { const c2 = Object.assign({}, c); c2[k] = (c2[k] || 0) + d; return Math.max(0, (taxOn(c2, o).exact - base) / d); };
    /* long-term equity: rate on gains beyond the ₹1.25L threshold */
    const c3 = Object.assign({}, c, { lt: Math.max(c.lt, 1.25 * L) }), b3 = taxOn(c3, o).exact;
    const lt = Math.max(0, (taxOn(Object.assign({}, c3, { lt: c3.lt + d }), o).exact - b3) / d);
    return { int: m("normal"), stcg: m("st"), ltcg: lt, regime: b.pick };
  }

  /* ---------- advance tax, s.234C and s.234B ---------- */
  const INSTAL = [[5, 15, .15, .12], [8, 15, .45, .36], [11, 15, .75, .75], [14, 15, 1, 1]]; /* month index from January of start year */
  const floor100 = v => Math.floor(Math.max(0, v) / 100) * 100;
  function advanceTax(p, tax, yearKey, today) {
    const Y = YEARS[yearKey] || YEARS["2026-27"], t = p.t || {}, n = k => max0(t[k]), huf = p.kind === "huf";
    const credits = n("tds") + n("tcs"), net = Math.max(0, tax - credits);
    const paidEach = [n("adv1"), n("adv2"), n("adv3"), n("adv4")], cum = paidEach.map((_, i) => paidEach.slice(0, i + 1).reduce((a, b) => a + b, 0));
    const paid = cum[3], now = today || new Date();
    const yearEnd = new Date(Y.start + 1, 2, 31, 23, 59, 59), ended = now > yearEnd;
    const seniorExempt = !huf && num(p.age) >= 60 && (!t.bizMode || t.bizMode === "none");
    const presumptive = t.bizMode === "44ada" || t.bizMode === "44ad";
    const res = { net, credits, paid, seniorExempt, presumptive, ended, rows: [], c234: 0, c234Accrued: 0, b234: 0, required: false,
      refund: Math.max(0, credits + paid - tax), balance: Math.max(0, net - paid), next: null };
    if (net < 10000 || seniorExempt) return res;
    res.required = true;
    INSTAL.forEach(([m, d, f, safe], i) => {
      const due = new Date(Y.start, m, d, 23, 59, 59), past = now > due;
      const need = presumptive ? (i < 3 ? 0 : net) : net * f;
      const short = Math.max(0, need - cum[i]);
      let int = 0;
      if (presumptive) { if (i === 3) int = floor100(short) * .01; }
      else if (i < 3) { if (i === 2 || cum[i] < net * safe) int = floor100(short) * .01 * 3; }
      else int = floor100(short) * .01;
      const row = { i, due, past, need, paid: cum[i], short, int };
      res.rows.push(row); res.c234 += int; if (past) res.c234Accrued += int;
      if (!past && !res.next && need > 0) res.next = { due, amount: Math.max(0, need - paid), share: f, days: Math.ceil((due - now) / 864e5) };
    });
    if (paid < .9 * net) { const months = Math.max(1, Math.round(num(t.payMonth) || 4)); res.b234 = floor100(net - paid) * .01 * months; res.b234Months = months; }
    return res;
  }

  /* ---------- money maths ---------- */
  const fvLump = (P, r, n) => P * Math.pow(1 + r, n);
  /* monthly SIP of m, yearly return r, n years, raised by `step` each year; paid at the start of each month */
  function fvSip(m, r, n, step) { const mr = Math.pow(1 + r, 1 / 12) - 1; let v = 0, s = m; const months = Math.round(n * 12); for (let k = 0; k < months; k++) { if (k && k % 12 === 0) s *= 1 + (step || 0); v = (v + s) * (1 + mr); } return v; }
  function sipNeeded(target, r, n, step) { if (target <= 0 || n <= 0) return 0; const unit = fvSip(1, r, n, step); return unit > 0 ? target / unit : 0; }
  function emi(P, ratePct, months) { const r = ratePct / 1200; if (months <= 0) return 0; return r === 0 ? P / months : P * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1); }
  /* months to clear a loan at a given EMI, with an optional extra monthly payment and a one-time prepayment now */
  function loanPath(P, ratePct, emiAmt, extra, lump) {
    const r = ratePct / 1200; let bal = Math.max(0, P - (lump || 0)), months = 0, interest = 0; const pay = emiAmt + (extra || 0), series = [bal];
    if (bal > 0 && pay <= bal * r) return { months: Infinity, interest: Infinity, series };
    while (bal > 0.5 && months < 1200) { const i = bal * r; interest += i; bal = Math.max(0, bal + i - pay); months++; if (months % 12 === 0) series.push(bal); }
    if (series[series.length - 1] !== 0) series.push(0);
    return { months, interest, series };
  }
  function goalStatus(g, thisYear) {
    const yrs = Math.max(0, num(g.year) - thisYear), inf = num(g.infl) / 100, r = num(g.ret) / 100, step = num(g.step) / 100;
    const target = max0(g.cost) * Math.pow(1 + inf, yrs);
    const fromSaved = max0(g.saved) * Math.pow(1 + r, yrs), fromSip = fvSip(max0(g.sip), r, yrs, step);
    const projected = fromSaved + fromSip, gap = Math.max(0, target - projected);
    const need = yrs > 0 ? sipNeeded(Math.max(0, target - fromSaved), r, yrs, step) : 0;
    return { yrs, target, projected, fromSaved, fromSip, gap, need, funded: target > 0 ? Math.min(1, projected / target) : 1, onTrack: projected >= target * .999 };
  }
  function xirr(flows) { /* flows: [{t: Date|ms, v}], returns yearly rate or NaN */
    if (flows.length < 2 || !flows.some(f => f.v > 0) || !flows.some(f => f.v < 0)) return NaN;
    const t0 = +flows[0].t, f = r => flows.reduce((s, x) => s + x.v / Math.pow(1 + r, (+x.t - t0) / 31557600000), 0);
    let lo = -.99, hi = 10, flo = f(lo), fhi = f(hi); if (flo * fhi > 0) return NaN;
    for (let i = 0; i < 100; i++) { const mid = (lo + hi) / 2, fm = f(mid); if (flo * fm <= 0) { hi = mid; fhi = fm; } else { lo = mid; flo = fm; } }
    return (lo + hi) / 2;
  }
  function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  function gauss(r) { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  /* retirement: save until retAge, spend until endAge. Everything in today's rupees (real returns). */
  function retirementSim(q, runs, seed) {
    const age = num(q.age), ret = Math.max(age, num(q.retAge)), end = Math.max(ret + 1, num(q.endAge)), inf = num(q.infl) / 100;
    const eqMu = num(q.eqRet) / 100, eqSd = num(q.eqVol) / 100, dMu = num(q.debtRet) / 100, dSd = .02;
    const years = end - age, R = rng(seed || 7), N = runs || 500, paths = [], spend = max0(q.spend), pension = max0(q.pension);
    let ok = 0; const atRet = [];
    for (let k = 0; k < N; k++) {
      let v = max0(q.corpus), save = max0(q.saveMonthly) * 12, alive = true; const path = [v];
      for (let y = 0; y < years; y++) {
        const a = age + y, working = a < ret, w = (working ? num(q.eqPre) : num(q.eqPost)) / 100;
        const re = (1 + eqMu + eqSd * gauss(R)) / (1 + inf) - 1, rd = (1 + dMu + dSd * gauss(R)) / (1 + inf) - 1;
        const growth = w * re + (1 - w) * rd;
        if (working) { v = (v + save) * (1 + growth); save *= (1 + num(q.stepUp) / 100) / (1 + inf); }
        else { v = (v - Math.max(0, spend - pension)) * (1 + growth); if (v <= 0) { v = 0; alive = false; } }
        if (a + 1 === ret) atRet.push(v);
        path.push(v);
      }
      if (ret === age) atRet.push(max0(q.corpus));
      if (alive && path[path.length - 1] > 0) ok++; paths.push(path);
    }
    const pct = (arr, f) => { const s = arr.slice().sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(f * s.length))]; };
    const bands = { p10: [], p50: [], p90: [] };
    for (let y = 0; y <= years; y++) { const col = paths.map(p => p[y]); bands.p10.push(pct(col, .1)); bands.p50.push(pct(col, .5)); bands.p90.push(pct(col, .9)); }
    const netSpend = Math.max(0, spend - pension);
    return { success: ok / N, bands, ages: Array.from({ length: years + 1 }, (_, i) => age + i), medianAtRet: pct(atRet, .5), need30x: netSpend / .033, withdrawal: pct(atRet, .5) > 0 ? netSpend / pct(atRet, .5) : NaN, years };
  }

  /* ---------- investment options: rates for 1 October to 31 December 2026 ---------- */
  const RATES_ASOF = "1 October to 31 December 2026";
  const PROD = [
    { id: "sav", n: "Bank savings account", grp: "Deposits", r: 2.75, vol: 0, tax: "slab", lock: 0, liq: 5, safe: 4, by: "RBI; DICGC cover ₹5 lakh per bank", note: "Large banks pay about 2.5 to 3%." },
    { id: "fd", n: "Bank FD (SBI, best slab)", grp: "Deposits", r: 6.45, vol: 0, tax: "slab", lock: 0, liq: 4, safe: 4, by: "RBI; DICGC cover ₹5 lakh per bank", note: "SBI: up to 6.45% (444 days); 6.05% for 5 years. Exit costs 0.5 to 1%." },
    { id: "fds", n: "Senior citizen FD (SBI, 5 yr)", grp: "Deposits", r: 7.05, vol: 0, tax: "slab", lock: 0, liq: 4, safe: 4, by: "RBI; DICGC cover ₹5 lakh per bank", minAge: 60, note: "For those aged 60 and above." },
    { id: "potd", n: "Post Office Time Deposit, 5 yr", grp: "Small savings", r: 7.5, vol: 0, tax: "slab", lock: 5, liq: 3, safe: 5, by: "Government of India", c80: 1, note: "1, 2, 3 and 5 years at 6.9, 7.0, 7.1 and 7.5%." },
    { id: "pomis", n: "Post Office Monthly Income", grp: "Small savings", r: 7.4, vol: 0, tax: "slab", lock: 5, liq: 2, safe: 5, by: "Government of India", cap: 9 * L, capNote: "max ₹9 lakh single, ₹15 lakh joint", payout: 1, note: "Interest paid every month." },
    { id: "nsc", n: "National Savings Certificate", grp: "Small savings", r: 7.7, vol: 0, tax: "slab", lock: 5, liq: 1, safe: 5, by: "Government of India", c80: 1, note: "5 years, compounds, no TDS." },
    { id: "kvp", n: "Kisan Vikas Patra", grp: "Small savings", r: 7.5, vol: 0, tax: "slab", lock: 2.5, liq: 2, safe: 5, by: "Government of India", note: "Doubles in 115 months." },
    { id: "scss", n: "Senior Citizens' Savings Scheme", grp: "Small savings", r: 8.2, vol: 0, tax: "slab", lock: 5, liq: 2, safe: 5, by: "Government of India", cap: 30 * L, capNote: "max ₹30 lakh per person", payout: 1, minAge: 60, c80: 1, note: "Aged 60 and above. Interest paid every quarter." },
    { id: "frsb", n: "RBI Floating Rate Savings Bond", grp: "Government bonds", r: 8.05, vol: 0, tax: "slab", lock: 7, liq: 1, safe: 5, by: "Government of India", payout: 1, note: "8.05% for July to December 2026; resets every six months at NSC rate + 0.35%." },
    { id: "gsec", n: "Government bonds (7 yr)", grp: "Government bonds", r: 6.7, vol: 4, tax: "slab", lock: 0, liq: 3, safe: 5, by: "Government of India; RBI Retail Direct", payout: 1, note: "Price falls if rates rise before maturity." },
    { id: "ppf", n: "Public Provident Fund", grp: "Tax-free", r: 7.1, vol: 0, tax: "eee", lock: 15, liq: 1, safe: 5, by: "Government of India", cap: 1.5 * L, capNote: "max ₹1.5 lakh a year", yearly: 1, c80: 1, note: "Tax-free in both regimes. 15 years." },
    { id: "ssy", n: "Sukanya Samriddhi Yojana", grp: "Tax-free", r: 8.2, vol: 0, tax: "eee", lock: 21, liq: 1, safe: 5, by: "Government of India", cap: 1.5 * L, capNote: "max ₹1.5 lakh a year; girl under 10", yearly: 1, c80: 1, note: "For a daughter under 10." },
    { id: "epf", n: "EPF and VPF", grp: "Tax-free", r: 8.25, vol: 0, tax: "eee", lock: 30, liq: 1, safe: 5, by: "EPFO", cap: 2.5 * L, capNote: "interest on own contributions above ₹2.5 lakh a year is taxed; salaried only", yearly: 1, c80: 1, note: "8.25% declared for FY 2025-26." },
    { id: "liquid", n: "Liquid fund", grp: "Debt funds", r: 6.3, vol: .5, tax: "defer", lock: 0, liq: 5, safe: 4, by: "SEBI regulated; not guaranteed", note: "Taxed at slab, only when sold." },
    { id: "debtmf", n: "Short-duration or gilt fund", grp: "Debt funds", r: 6.75, vol: 3, tax: "defer", lock: 0, liq: 4, safe: 4, by: "SEBI regulated; not guaranteed", note: "Taxed at slab, only when sold." },
    { id: "arb", n: "Arbitrage fund", grp: "Hybrid funds", r: 6.6, vol: 1, tax: "equity", lock: 0, liq: 5, safe: 4, by: "SEBI regulated; not guaranteed", note: "Liquid-fund-like return, taxed as equity." },
    { id: "baf", n: "Balanced advantage fund", grp: "Hybrid funds", r: 9.5, vol: 12, tax: "equity", lock: 0, liq: 5, safe: 3, by: "SEBI regulated; not guaranteed", note: "Assumed return, not a promise." },
    { id: "index", n: "Nifty 50 index fund", grp: "Equity", r: 11, vol: 20, tax: "equity", lock: 0, liq: 5, safe: 2, by: "SEBI regulated; not guaranteed", note: "Assumed 11% a year; can fall 40 to 60% in a bad spell." },
    { id: "midsmall", n: "Mid and small-cap funds", grp: "Equity", r: 12.5, vol: 28, tax: "equity", lock: 0, liq: 5, safe: 1, by: "SEBI regulated; not guaranteed", note: "Higher assumed growth, deeper falls." },
    { id: "nps", n: "NPS Tier I (75% equity)", grp: "Pension", r: 10, vol: 15, tax: "nps", lock: 30, liq: 1, safe: 3, by: "PFRDA regulated; not guaranteed", note: "Locked till 60. 60% of the corpus is tax-free at exit; the rest is taxed at slab as lump sum or pension." },
    { id: "goldetf", n: "Gold ETF", grp: "Gold", r: 8.5, vol: 15, tax: "gold", lock: 0, liq: 5, safe: 3, by: "SEBI regulated; not guaranteed", note: "Slab rate within 12 months, 12.5% after." },
    { id: "reit", n: "REITs and InvITs", grp: "Property", r: 9, vol: 14, tax: "reit", lock: 0, liq: 4, safe: 3, by: "SEBI regulated; not guaranteed", note: "About 6% paid out, mostly taxed at slab." },
    { id: "endow", n: "Endowment insurance plan", grp: "Insurance", r: 5, vol: 0, tax: "eee", lock: 15, liq: 1, safe: 4, by: "IRDAI regulated", note: "Typical return 4 to 6%. Tax-free only if yearly premiums are ₹5 lakh or less." }
  ];
  /* value of a lump sum A after N years, after tax. e = {int, stcg, ltcg} marginal rates. */
  function growAfterTax(prod, A, N, e, harvest) {
    const r = prod.r / 100, g = A * Math.pow(1 + r, N);
    switch (prod.tax) {
      case "eee": return g;
      case "slab": {
        if (!prod.payout) return A * Math.pow(1 + r * (1 - e.int), N);
        /* interest is paid out: assume it is put into a bank FD and taxed there too */
        const net = A * r * (1 - e.int), rf = .0645 * (1 - e.int);
        return A + (rf > 0 ? net * (Math.pow(1 + rf, N) - 1) / rf : net * N);
      }
      case "defer": return A + (g - A) * (1 - e.int);
      case "equity": {
        if (N < 1) return A + (g - A) * (1 - e.stcg);
        if (!harvest) return g - Math.max(0, g - A - 1.25 * L) * e.ltcg;
        let v = A, cost = A; for (let t = 0; t < N; t++) { v *= 1 + r; if (t === N - 1) break; cost = Math.min(v, cost + 1.25 * L); }
        return v - Math.max(0, v - cost - 1.25 * L) * e.ltcg;
      }
      case "gold": return N < 1 ? A + (g - A) * (1 - e.int) : A + (g - A) * (1 - e.ltcg);
      case "nps": return g * .6 + g * .4 * (1 - e.int);
      case "reit": { const inc = .06, cap = r - inc; let u = A, p = 1, cost = A; for (let t = 0; t < N; t++) { p *= 1 + cap; const d = u * p * inc * (1 - .6 * e.int); u += d / p; cost += d; } const v = u * p; return v - Math.max(0, v - cost - 1.25 * L) * e.ltcg; }
      default: return g;
    }
  }
  const cagr = (a, b, n) => a > 0 && b > 0 && n > 0 ? Math.pow(b / a, 1 / n) - 1 : NaN;

  /* ---------- household: asset classes, totals and checks ---------- */
  const CLASSES = {
    savings: { n: "Savings account", grp: "cash", liquid: 1, bank: 1, ret: 2.75 },
    fd: { n: "Fixed deposit", grp: "debt", liquid: 1, bank: 1, ret: 6.5 },
    smallsav: { n: "Post office and small savings", grp: "debt", liquid: 0, ret: 7.5 },
    ppf: { n: "PPF", grp: "debt", liquid: 0, ret: 7.1 },
    epf: { n: "EPF", grp: "debt", liquid: 0, ret: 8.25 },
    bonds: { n: "Bonds and RBI bonds", grp: "debt", liquid: 0, ret: 7.5 },
    debtmf: { n: "Debt and liquid funds", grp: "debt", liquid: 1, ret: 6.5 },
    equitymf: { n: "Equity funds", grp: "equity", liquid: 1, ret: 11 },
    stocks: { n: "Shares", grp: "equity", liquid: 1, ret: 11 },
    nps: { n: "NPS", grp: "equity", liquid: 0, ret: 10 },
    gold: { n: "Gold and silver", grp: "gold", liquid: 1, ret: 8.5 },
    home: { n: "Home you live in", grp: "property", liquid: 0, ret: 5, personal: 1 },
    property: { n: "Other property", grp: "property", liquid: 0, ret: 7 },
    cash: { n: "Cash", grp: "cash", liquid: 1, ret: 0 },
    business: { n: "Business or practice value", grp: "other", liquid: 0, ret: 8, personal: 1 },
    other: { n: "Other", grp: "other", liquid: 0, ret: 6 }
  };
  const GROUPS = [["equity", "Equity"], ["debt", "Debt and deposits"], ["gold", "Gold"], ["property", "Property"], ["cash", "Cash"], ["other", "Other"]];
  const LIAB = { home: "Home loan", car: "Vehicle loan", personal: "Personal loan", education: "Education loan", card: "Credit card", gold: "Gold loan", other: "Other loan" };
  const perMonth = it => max0(it.amt) * (it.freq === "y" ? 1 / 12 : it.freq === "q" ? 1 / 3 : 1);
  function totals(S) {
    const assets = S.assets || [], liabs = S.liabs || [];
    const by = {}; GROUPS.forEach(([k]) => by[k] = 0);
    let total = 0, liquid = 0, invest = 0;
    assets.forEach(a => { const c = CLASSES[a.cls] || CLASSES.other, v = max0(a.value); total += v; by[c.grp] += v; if (c.liquid) liquid += v; if (!c.personal) invest += v; });
    const debt = liabs.reduce((s, l) => s + max0(l.balance), 0), emiTotal = liabs.reduce((s, l) => s + max0(l.emi), 0);
    const income = (S.income || []).reduce((s, x) => s + perMonth(x), 0), expense = (S.expense || []).reduce((s, x) => s + perMonth(x), 0);
    const emergency = assets.filter(a => ["savings", "fd", "debtmf", "cash"].includes(a.cls)).reduce((s, a) => s + max0(a.value), 0);
    return { total, liquid, invest, by, debt, net: total - debt, emiTotal, income, expense, outgo: expense + emiTotal, surplus: income - expense - emiTotal, emergency };
  }
  function insuredGaps(S) { /* deposits above the ₹5 lakh DICGC cover, per owner per bank */
    const m = {}; (S.assets || []).forEach(a => { const c = CLASSES[a.cls]; if (!c || !c.bank || !a.inst) return; const k = (a.owner || "") + "|" + a.inst.trim().toLowerCase(); (m[k] = m[k] || { owner: a.owner, inst: a.inst.trim(), sum: 0 }).sum += max0(a.value); });
    return Object.values(m).filter(x => x.sum > 5 * L).map(x => Object.assign(x, { over: x.sum - 5 * L }));
  }
  /* each check: {id, level: "ok"|"warn"|"bad"|"info", title, detail, go} */
  function healthChecks(S, yearKey, today) {
    const T = totals(S), out = [], inr = v => "₹" + Math.round(v).toLocaleString("en-IN"), lk = v => v >= CR ? "₹" + (v / CR).toFixed(2) + " crore" : v >= L ? "₹" + (v / L).toFixed(1) + " lakh" : inr(v);
    const push = (id, level, title, detail, go) => out.push({ id, level, title, detail, go });
    const people = (S.members || []).filter(m => m.on !== false);
    /* emergency fund */
    if (T.outgo > 0) { const mo = T.emergency / T.outgo; push("ef", mo >= 6 ? "ok" : mo >= 3 ? "warn" : "bad", "Emergency fund covers " + mo.toFixed(1) + " months", mo >= 6 ? "Savings, FDs and liquid funds cover six months of spending and EMIs." : "Aim for six months of spending and EMIs (" + lk(T.outgo * 6) + ") in savings, FDs or liquid funds. You hold " + lk(T.emergency) + ".", "wealth"); }
    /* savings rate */
    if (T.income > 0) { const sr = T.surplus / T.income; push("sr", sr >= .2 ? "ok" : sr >= .1 ? "warn" : "bad", "You save " + Math.round(sr * 100) + "% of income", sr >= .2 ? "A savings rate of 20% or more keeps long-term goals within reach." : "Under 20%. Look at the largest spending lines first.", "cash"); }
    /* loan burden */
    if (T.income > 0 && T.emiTotal > 0) { const b = T.emiTotal / T.income; push("emi", b <= .3 ? "ok" : b <= .4 ? "warn" : "bad", "EMIs take " + Math.round(b * 100) + "% of income", b <= .4 ? "Within the 40% that lenders treat as the ceiling." : "Above 40% of income. Prepay the costliest loan first.", "loans"); }
    const costly = (S.liabs || []).filter(l => num(l.rate) >= 14 && max0(l.balance) > 0);
    if (costly.length) push("costly", "bad", "Costly debt: " + costly.map(l => l.name || LIAB[l.type]).join(", "), "Loans at 14% or more cost more than any investment is likely to earn. Clear them before investing.", "loans");
    /* insurance */
    const pol = S.policies || [], term = pol.filter(x => x.type === "term").reduce((s, x) => s + max0(x.cover), 0), health = pol.filter(x => x.type === "health").reduce((s, x) => s + max0(x.cover), 0);
    const earned = (S.income || []).filter(x => x.kind !== "passive").reduce((s, x) => s + perMonth(x) * 12, 0);
    const dep = S.settings && S.settings.dependants !== "no";
    if (dep && earned > 0) { const need = Math.max(0, earned * 10 + T.debt - T.invest); if (need <= 0) push("term", "ok", "Investments already cover your family's needs", "Ten years of income plus loans is less than what you have invested. Term cover is optional.", "cover"); else push("term", term >= need ? "ok" : term >= need * .6 ? "warn" : "bad", term >= need ? "Term cover is adequate" : "Term cover is short by " + lk(need - term), "Rule of thumb: ten times yearly earned income plus loans, less investments, comes to " + lk(need) + ". You hold " + lk(term) + ".", "cover"); }
    push("health", health >= 10 * L ? "ok" : health > 0 ? "warn" : "bad", health > 0 ? "Health cover of " + lk(health) : "No health cover recorded", health >= 10 * L ? "Check that it is a personal policy that continues if you leave an employer." : "A family floater of at least ₹10 lakh with a super top-up is a common minimum.", "cover");
    /* deposit insurance */
    const gaps = insuredGaps(S); if (gaps.length) push("dicgc", "warn", lk(gaps.reduce((s, x) => s + x.over, 0)) + " of deposits is above the insured limit", gaps.map(x => x.inst + ": " + lk(x.sum)).join("; ") + ". DICGC insures ₹5 lakh per depositor per bank, interest included.", "wealth");
    /* allocation against target */
    const tgt = S.settings && S.settings.target; const fin = T.invest;
    if (tgt && fin > 0) { const eq = T.by.equity / fin * 100, d = eq - num(tgt.equity); push("alloc", Math.abs(d) <= 7 ? "ok" : "warn", "Equity is " + Math.round(eq) + "% of investments; your target is " + num(tgt.equity) + "%", Math.abs(d) <= 7 ? "Within seven points of target. Review once a year." : (d > 0 ? "Above target. Direct new savings to debt, or trim equity." : "Below target. Direct new savings to equity funds."), "wealth"); }
    const big = (S.assets || []).filter(a => !(CLASSES[a.cls] || {}).personal && fin > 0 && max0(a.value) / fin > .35);
    if (big.length) push("conc", "warn", big[0].name + " is " + Math.round(max0(big[0].value) / fin * 100) + "% of your investments", "A single holding above about a third of investments is a concentration risk.", "wealth");
    /* tax */
    people.forEach(m => {
      const b = bestRegime(m, yearKey);
      if (m.regime && m.regime !== "auto" && b.better !== m.regime && b.saving > 1000) push("reg-" + m.id, "warn", m.name + ": the " + b.better + " regime saves " + inr(b.saving), "You have chosen the " + m.regime + " regime.", "tax");
      const a = advanceTax(m, b.r.tax, yearKey, today);
      if (a.required && a.next && a.next.amount > 0) push("adv-" + m.id, a.next.days <= 21 ? "bad" : a.next.days <= 60 ? "warn" : "info", m.name + ": pay " + inr(a.next.amount) + " advance tax by " + a.next.due.toLocaleDateString("en-IN", { day: "numeric", month: "short" }), a.next.days + " days left. Late payment costs 1% a month.", "tax");
      const lt = num((m.t || {}).lt112A), hasEq = (S.assets || []).some(x => x.owner === m.id && ["equitymf", "stocks"].includes(x.cls) && max0(x.value) > 0);
      if (!a.ended && hasEq && lt < 1.25 * L) push("harv-" + m.id, "info", m.name + ": " + inr(1.25 * L - Math.max(0, lt)) + " of long-term equity gains can still be booked free of tax", "The ₹1.25 lakh yearly exemption lapses on 31 March if unused. Check that it does not push total income above ₹12 lakh.", "tax");
    });
    /* goals */
    const yr = (today || new Date()).getFullYear(); const behind = (S.goals || []).filter(g => !goalStatus(g, yr).onTrack);
    if ((S.goals || []).length) push("goals", behind.length ? "warn" : "ok", behind.length ? behind.length + " of " + S.goals.length + " goals need more saving" : "All goals are on track", behind.length ? behind.map(g => g.name).join(", ") + "." : "At your assumed returns.", "goals");
    const order = { bad: 0, warn: 1, info: 2, ok: 3 };
    return out.sort((a, b) => order[a.level] - order[b.level]);
  }

  /* ---------- money calendar ---------- */
  function calendar(S, today) {
    const now = today || new Date(), ev = [], y = now.getFullYear();
    const pensioner = (S.members || []).some(m => m.kind !== "huf" && (num(m.age) >= 58 || max0((m.t || {}).pension) > 0));
    const add = (d, title, detail, kind) => { if (d >= new Date(now.getFullYear(), now.getMonth(), now.getDate()) && d - now < 366 * 864e5) ev.push({ date: d, title, detail, kind, days: Math.ceil((d - now) / 864e5) }); };
    [y - 1, y, y + 1].forEach(Y => {
      const ty = Y + "-" + String((Y + 1) % 100).padStart(2, "0");
      add(new Date(Y, 5, 15), "Advance tax: 15% due", "First instalment for tax year " + ty + ".", "tax");
      add(new Date(Y, 8, 15), "Advance tax: 45% due", "Second instalment for tax year " + ty + ".", "tax");
      add(new Date(Y, 11, 15), "Advance tax: 75% due", "Third instalment for tax year " + ty + ".", "tax");
      add(new Date(Y + 1, 2, 15), "Advance tax: 100% due", "Last instalment for tax year " + ty + ". Presumptive-scheme taxpayers pay the whole amount by this date.", "tax");
      add(new Date(Y + 1, 2, 31), "Year-end: last day for this tax year", "Book up to ₹1.25 lakh of long-term equity gains tax-free. Old regime: finish 80C, NPS and health-insurance payments. Deposit at least ₹500 in PPF.", "plan");
      add(new Date(Y, 3, 5), "PPF: deposit by 5 April", "A deposit on or before the 5th earns interest for the whole year.", "invest");
      add(new Date(Y, 3, 15), "Give Form 15G or 15H to banks", "If your tax for the year will be nil, this stops TDS on interest.", "tax");
      add(new Date(Y, 5, 15), "Form 16 due from employer", "Check it against your AIS before filing.", "tax");
      add(new Date(Y, 6, 31), "Income-tax return due", "For salary, pension and investment income (ITR-1 and ITR-2).", "tax");
      add(new Date(Y, 7, 31), "Return due for business and profession", "Non-audit cases, including 44AD and 44ADA (ITR-3 and ITR-4).", "tax");
      add(new Date(Y, 9, 31), "Return due for audit cases", "Where accounts need a tax audit.", "tax");
      if (pensioner) add(new Date(Y, 10, 30), "Pensioners: life certificate", "Submit Jeevan Pramaan in November to keep the pension coming.", "plan");
      add(new Date(Y, 11, 31), "Last day for a belated return", "A late fee applies. A revised return can be filed later for a fee.", "tax");
      [0, 3, 6, 9].forEach(m => add(new Date(Y, m, 1), "Small savings rates reset", "The government sets PPF, SCSS, NSC and post-office rates for the new quarter.", "invest"));
    });
    (S.policies || []).forEach(p => { if (!p.renew) return; const d = new Date(p.renew); if (isNaN(d)) return; [y, y + 1].forEach(Y => add(new Date(Y, d.getMonth(), d.getDate()), "Renew " + (p.name || "insurance policy"), "Premium ₹" + Math.round(max0(p.premium)).toLocaleString("en-IN") + ".", "cover")); });
    (S.reminders || []).forEach(r => { const d = new Date(r.date); if (!isNaN(d)) add(d, r.title || "Reminder", r.note || "", "own"); });
    const seen = {}; return ev.sort((a, b) => a.date - b.date).filter(e => { const k = +e.date + e.title; if (seen[k]) return false; seen[k] = 1; return true; });
  }


  /* ---------- planner: occupations, life stages, an ordered plan ---------- */
  const OCC = {
    salaried: { n: "Salaried, private sector", ef: 6, earn: 1 },
    govt: { n: "Government employee", ef: 4, earn: 1 },
    professional: { n: "Self-employed professional", ef: 9, earn: 1, self: 1 },
    business: { n: "Business owner or trader", ef: 12, earn: 1, self: 1 },
    freelance: { n: "Freelancer or gig worker", ef: 9, earn: 1, self: 1 },
    farmer: { n: "Farmer", ef: 12, earn: 1, self: 1 },
    homemaker: { n: "Homemaker", ef: 6 },
    student: { n: "Student", ef: 3 },
    retired: { n: "Retired", ef: 18 },
    child: { n: "Child", ef: 0 }
  };
  const defaultOcc = age => { const a = num(age); return a && a < 18 ? "child" : a && a < 23 ? "student" : a >= 60 ? "retired" : "salaried"; };
  const occOf = m => OCC[m && m.occ] ? m.occ : defaultOcc(m && m.age);
  const STAGES = [
    { to: 17, n: "Childhood", focus: "Education fund and a saving habit", tip: "Income from a child's investments is added to the higher-earning parent's income until 18. For a daughter under 10, Sukanya Samriddhi pays 8.2% tax-free." },
    { to: 24, n: "Student or first job", focus: "Habits, skills and a small cushion", tip: "Start a monthly investment with the first salary, however small. Avoid credit-card debt and insurance sold as investment." },
    { to: 34, n: "Young earner", focus: "Emergency fund, cover, first big goals", tip: "Keep money for goals within three years out of equity. Buy term cover as soon as someone depends on you; it is cheapest now." },
    { to: 44, n: "Family building", focus: "Children's education, home loan, parents' care", tip: "Give each goal its own pot and date. Move each pot from equity to deposits over its last three years." },
    { to: 54, n: "Peak earning", focus: "Retirement catch-up and education payouts", tip: "This is usually your highest tax bracket: prefer tax-free and equity returns to taxable interest. Secure lifelong health cover before 50." },
    { to: 59, n: "Pre-retirement", focus: "Lock in the corpus and plan the income", tip: "Do the retirement arithmetic now. Build two to three years of spending in safe money before the last salary." },
    { to: 74, n: "Early retirement", focus: "Reliable income that keeps up with prices", tip: "Keep slab income and gains within the ₹12 lakh zero-tax line where you can. Keep some equity: retirement can last thirty years." },
    { to: 200, n: "Late retirement", focus: "Simplicity, health costs, passing things on", tip: "Fewer accounts, joint holdings, nominees everywhere and a will. From 70, the Ayushman Vay Vandana card gives ₹5 lakh of hospital cover whatever your income." }
  ];
  const lifeStage = age => STAGES.find(x => num(age) <= x.to) || STAGES[STAGES.length - 1];
  function leadOf(S) { const inds = (S.members || []).filter(m => m.kind !== "huf"), id = (S.settings || {}).lead; return inds.find(m => m.id === id) || inds.find(m => num(m.age) >= 18) || inds[0] || null; }
  function suggestMix(age, risk, retired) {
    const adj = risk === "cautious" ? -15 : risk === "growth" ? 10 : 0; let eq = Math.max(10, Math.min(80, 100 - (num(age) || 40) + adj));
    if (retired) eq = Math.min(eq, risk === "growth" ? 50 : 40);
    eq = Math.round(eq / 5) * 5; const gold = risk === "growth" ? 5 : 10; return { equity: eq, debt: 100 - eq - gold, gold };
  }
  const TIPS = {
    salaried: ["Compare both regimes every April and tell your employer. You can still switch when you file.", "Ask for employer NPS: up to 14% of basic pay is deductible even in the new regime.", "Voluntary PF earns the EPF rate, tax-free. Interest on your own contributions above ₹2.5 lakh a year is taxed.", "HRA, LTA and 80C count only in the old regime.", "Hold your own health cover. Employer cover ends with the job.", "Gratuity after five years of service is tax-free up to ₹20 lakh."],
    govt: ["Central staff under NPS could opt for the Unified Pension Scheme from April 2025. Know which one you are in and what it pays.", "The employer's NPS contribution is deductible up to 14% of basic pay in both regimes.", "A steady job needs a smaller emergency fund: about four months.", "Check which medical cover continues after retirement, and buy personal cover for what does not.", "A pension covers basics. Equity funds are still needed for growth beyond it."],
    professional: ["Under 44ADA, half of receipts up to ₹75 lakh is taken as profit with no books. Check it against your real margin on the Business page.", "Under the presumptive scheme, advance tax can be paid in one instalment by 15 March. Otherwise it is due in four.", "There is no EPF: build your own with PPF, NPS and index funds.", "Clients deduct 10% TDS on fees above ₹50,000 a year. Match it with your AIS before filing.", "Professional indemnity cover, and personal accident and disability cover, protect the income itself.", "GST registration is needed above ₹20 lakh of taxable services. Healthcare services by doctors and hospitals are exempt.", "Income is lumpy: keep nine to twelve months of costs within reach."],
    business: ["44AD takes 6% of bank and digital receipts and 8% of cash as profit, up to ₹3 crore of turnover (₹2 crore if more than 5% is cash). Compare it with your books on the Business page.", "If you leave 44AD you cannot return to it for five years.", "A tax audit applies above ₹1 crore of turnover, or ₹10 crore if cash is 5% or less of receipts and payments.", "GST registration is needed above ₹40 lakh for goods and ₹20 lakh for services in most states.", "Keep business and personal money in separate accounts and pay yourself a fixed amount each month.", "Hold six to twelve months of fixed costs as a business buffer, apart from the family emergency fund.", "Do not let the business be your only asset: move profits into personal investments regularly.", "Insure stock and premises. Loan-linked term cover stops a business loan landing on the family."],
    freelance: ["Listed professions can use 44ADA (half of receipts as profit, up to ₹75 lakh); other work can use 44AD.", "Clients deduct TDS: track it in your AIS and claim it.", "Pay advance tax: one instalment by 15 March under the presumptive scheme.", "Pay yourself a fixed monthly amount from a separate account to smooth uneven income.", "No employer benefits: buy your own health and accident cover, and build your own retirement fund.", "GST registration is needed above ₹20 lakh of services, and for some exports and platforms earlier."],
    farmer: ["Agricultural income is exempt, but it raises the tax rate on your other income. Enter it on the Tax page.", "PM-KISAN pays ₹6,000 a year to eligible landholding families.", "A Kisan Credit Card gives crop loans at subsidised interest; crop insurance is available under PMFBY.", "Income arrives with the harvest: keep twelve months of household costs within reach.", "Post-office schemes and PPF are close by and government-backed."],
    homemaker: ["Hold a bank account and investments in your own name, with nominees.", "Income from money gifted by a spouse is taxed in the spouse's hands. PPF in your name avoids the issue, because its interest is tax-free.", "Know where every account, policy and loan is. Ask for one written list.", "Term cover belongs on the earning spouse; health cover on everyone."],
    student: ["Start a small monthly investment as soon as you earn anything.", "Avoid credit-card debt: it costs 36 to 42% a year.", "Education-loan interest is deductible for eight years in the old regime.", "Stay on a parent's health policy until you have your own."],
    retired: ["The Senior Citizens' Savings Scheme takes ₹30 lakh per person at 8.2%, paid every quarter.", "In the new regime, income up to ₹12 lakh (₹12.75 lakh with a pension) bears no tax. Capital gains count towards that line.", "With no business income, advance tax is not required after 60. Give Form 15H to banks if your tax is nil.", "Keep two to three years of spending out of equity, and some equity for the decades ahead.", "From 70, the Ayushman Vay Vandana card gives ₹5 lakh of hospital cover whatever your income.", "Term insurance is rarely needed now. Health cover, nominees and a will matter more.", "Avoid long lock-ins and anything sold as guaranteed high return."],
    child: ["For a daughter under 10, Sukanya Samriddhi pays 8.2% tax-free.", "PPF in a child's name shares the parent's ₹1.5 lakh yearly limit.", "A child's investment income is taxed in the higher-earning parent's hands until 18."]
  };
  function incomeBand(y) {
    if (y <= 0) return null;
    if (y < 5 * L) return { n: "Under ₹5 lakh a year", text: "Tax is nil at this income, so tax-saving products add nothing. The basics cost very little: ₹436 a year buys ₹2 lakh of life cover (PMJJBY) and ₹20 a year buys ₹2 lakh of accident cover (PMSBY). Use a post-office or bank recurring deposit and PPF. Stay away from chit schemes and anyone promising 2% a month." };
    if (y < 15 * L) return { n: "₹5 to 15 lakh a year", text: "In the new regime tax is nil up to ₹12 lakh of taxable income, so the saving rate matters more than tax planning. Term and health cover first, then an index-fund SIP and PPF." };
    if (y < 50 * L) return { n: "₹15 to 50 lakh a year", text: "Each extra rupee of interest loses 20 to 31% to tax. Prefer tax-free returns (PPF, EPF and VPF) and equity funds, book ₹1.25 lakh of long-term gains each year, and use arbitrage funds rather than FDs for money parked over a year." };
    if (y < 2 * CR) return { n: "₹50 lakh to 2 crore a year", text: "Surcharge of 10 to 15% applies, so interest is taxed at 34 to 36% while long-term equity gains bear about 14 to 15%. Asset location matters: interest-bearing assets held by lower-taxed parents or adult children bear less tax, while income from money gifted to a spouse is still taxed in your hands. An HUF is a separate taxpayer with its own slabs." };
    return { n: "Above ₹2 crore a year", text: "Slab income above ₹2 crore bears 25% surcharge in the new regime (39% in all), while equity gains and dividends are capped at 15% surcharge. Watch the ₹2 crore and ₹5 crore steps when timing income. Estate planning (a will, and trusts where needed), liability cover and succession for a business or practice belong on the list." };
  }
  function schemes(S, incomeY, taxTotal) {
    const set = S.settings || {}, ms = (S.members || []).filter(m => m.kind !== "huf"), has = f => ms.some(f), occs = ms.map(occOf), out = [];
    const add = (n, what) => out.push({ n, what });
    if (incomeY < 10 * L && has(m => num(m.age) >= 18 && num(m.age) <= 50)) add("PM Jeevan Jyoti Bima (PMJJBY)", "₹2 lakh of life cover for ₹436 a year, through your bank. Join between 18 and 50.");
    if ((incomeY < 10 * L || occs.some(o => OCC[o].self)) && has(m => num(m.age) >= 18 && num(m.age) <= 70)) add("PM Suraksha Bima (PMSBY)", "₹2 lakh of accident cover for ₹20 a year, through your bank. Ages 18 to 70.");
    if (taxTotal <= 0 && has(m => num(m.age) >= 18 && num(m.age) <= 40)) add("Atal Pension Yojana", "A guaranteed pension of ₹1,000 to ₹5,000 a month from 60. Join between 18 and 40; not open to income-tax payers.");
    if (incomeY > 0 && incomeY < 3 * L) add("Ayushman Bharat PM-JAY", "₹5 lakh of hospital cover a year for eligible families. Check eligibility on the Ayushman app.");
    if (has(m => num(m.age) >= 70)) add("Ayushman Vay Vandana card", "₹5 lakh of hospital cover a year for everyone aged 70 or more, whatever the income. It can be held alongside private insurance.");
    if (has(m => num(m.age) >= 60)) add("Senior Citizens' Savings Scheme", "8.2%, government-backed, up to ₹30 lakh per person, interest paid quarterly.");
    if (set.daughter === "yes") add("Sukanya Samriddhi Yojana", "8.2% tax-free for a daughter under 10; up to ₹1.5 lakh a year.");
    if (num(set.kids) > 0 || has(m => num(m.age) > 0 && num(m.age) < 18)) add("NPS Vatsalya", "A pension account a parent opens for a child. It is for the child's retirement, not education: the money is locked.");
    if (occs.includes("salaried")) add("EPF and Voluntary PF", "8.25% tax-free (FY 2025-26). VPF lets you add more at the same rate.");
    if (occs.includes("govt")) add("Unified Pension Scheme or NPS", "Central government staff: an assured pension under UPS, or market-linked NPS.");
    if (occs.includes("farmer")) add("PM-KISAN and Kisan Credit Card", "₹6,000 a year for eligible landholding families, and subsidised crop loans.");
    if (occs.includes("business")) add("Mudra loans and Udyam registration", "Collateral-free loans up to ₹20 lakh for small businesses (the top band is for those who have repaid an earlier Mudra loan). Udyam registration opens MSME credit schemes.");
    add("Public Provident Fund", "7.1% tax-free, government-backed, up to ₹1.5 lakh a year. Open to everyone.");
    return out;
  }
  /* the plan: ordered steps, each with a status: done, todo, watch (partly there) or na */
  function plan(S, yearKey, today) {
    const now = today || new Date(), T = totals(S), set = S.settings || {}, lead = leadOf(S), age = lead ? num(lead.age) || 40 : 40, occ = lead ? occOf(lead) : "salaried";
    const adults = (S.members || []).filter(m => m.kind !== "huf" && m.on !== false && occOf(m) !== "child"), occs = adults.map(occOf).filter((o, i, a) => a.indexOf(o) === i);
    const retired = occ === "retired", stage = lifeStage(age), risk = set.risk || "balanced";
    const inr = v => "₹" + Math.round(v).toLocaleString("en-IN"), lk = v => v >= CR ? "₹" + (v / CR).toFixed(2) + " crore" : v >= L ? "₹" + (v / L).toFixed(1).replace(/\.0$/, "") + " lakh" : inr(v);
    const tx = (S.members || []).filter(m => m.on !== false).map(m => { const b = bestRegime(m, yearKey); return { m, b, a: advanceTax(m, b.r.tax, yearKey, now) }; });
    const taxTotal = tx.reduce((s, x) => s + x.b.r.tax, 0);
    const incomeY = T.income > 0 ? T.income * 12 : tx.reduce((s, x) => s + x.b.r.gti + x.b.r.gainsGross, 0);
    const kids = Math.max(num(set.kids), (S.members || []).filter(m => m.kind !== "huf" && num(m.age) > 0 && num(m.age) < 18).length);
    const steps = [], step = (id, status, title, detail, go) => steps.push({ id, status, title, detail, go });
    /* 1 numbers */
    const known = T.income > 0 && T.expense > 0;
    step("numbers", known ? "done" : "todo", known ? "You know what comes in and goes out" : "Write down a typical month", known ? lk(T.income) + " comes in each month, " + lk(T.outgo) + " goes out, " + lk(T.surplus) + " is left." : "Add take-home income and spending under Cash flow. Every other step is sized from them.", "cash");
    /* 2 emergency fund */
    const efM = Math.max(3, ...adults.map(m => OCC[occOf(m)].ef)), efT = T.outgo * efM, efGap = Math.max(0, efT - T.emergency);
    if (!(T.outgo > 0)) step("ef", "todo", "Build an emergency fund", "Aim for " + efM + " months of spending within reach. Add your spending under Cash flow to size it.", "cash");
    else step("ef", efGap <= 0 ? "done" : T.emergency >= efT * .5 ? "watch" : "todo", efGap <= 0 ? "Emergency fund is in place" : "Build the emergency fund to " + lk(efT), (occs.some(o => OCC[o].self) ? "With self-employed income, hold " : retired ? "In retirement, hold " : "Hold ") + efM + " months of spending and EMIs within reach. You have " + lk(T.emergency) + (efGap > 0 ? ", so " + lk(efGap) + " to go" : "") + ". Keep one month in savings and the rest in " + (age >= 60 ? "senior-citizen FDs that can be broken" : "a sweep FD or liquid fund") + ".", "wealth");
    /* 3 health */
    const pol = S.policies || [], health = pol.filter(x => x.type === "health").reduce((s, x) => s + max0(x.cover), 0), term = pol.filter(x => x.type === "term").reduce((s, x) => s + max0(x.cover), 0);
    const hNeed = incomeY < 5 * L ? 5 * L : incomeY < 15 * L ? 10 * L : incomeY < 50 * L ? 15 * L : 25 * L;
    step("health", health >= hNeed ? "done" : health > 0 ? "watch" : "todo", health >= hNeed ? "Health cover of " + lk(health) : "Raise health cover to " + lk(hNeed), (health > 0 ? "You hold " + lk(health) + ". " : "No health cover is recorded. ") + (incomeY < 5 * L ? "Check whether the family qualifies for Ayushman Bharat (₹5 lakh, free). " : "A family floater with a super top-up is the cheapest way to reach " + lk(hNeed) + ". ") + (age >= 55 ? "Buying gets harder and costlier after 60: settle lifelong cover now. " : "") + "Parents aged 70 or more qualify for the Ayushman Vay Vandana card.", "cover");
    /* 4 life cover */
    const earned = (S.income || []).filter(x => x.kind !== "passive").reduce((s, x) => s + perMonth(x) * 12, 0), dep = set.dependants !== "no";
    const lNeed = Math.max(0, earned * 10 + T.debt - T.invest);
    if (!dep || retired || earned <= 0) step("life", "na", "Life cover is not needed", retired ? "With no earned income to replace, term insurance is rarely needed. Check that loans, if any, are covered." : !dep ? "Nobody depends on your income. Buy term cover when that changes." : "Add earned income under Cash flow to size term cover.", "cover");
    else step("life", term >= lNeed ? "done" : term >= lNeed * .6 ? "watch" : "todo", term >= lNeed ? "Term cover is adequate" : "Buy term cover of " + lk(lNeed - term) + " more", "Ten times yearly earned income plus loans, less investments, comes to " + lk(lNeed) + "; you hold " + lk(term) + ". Pure term cover only, until loans are repaid and children are independent." + (incomeY < 5 * L ? " PMJJBY gives ₹2 lakh for ₹436 a year." : "") + (occs.some(o => OCC[o].self) ? " Add personal accident and disability cover: self-employed income stops if you cannot work." : ""), "cover");
    /* 5 costly debt */
    const costly = (S.liabs || []).filter(l => num(l.rate) >= 12 && max0(l.balance) > 0), costlySum = costly.reduce((s, l) => s + max0(l.balance), 0);
    step("debt", costly.length ? "todo" : "done", costly.length ? "Clear " + lk(costlySum) + " of costly debt" : "No costly debt", costly.length ? costly.map(l => (l.name || "Loan") + " at " + num(l.rate) + "%").join(", ") + ". Paying these off is a certain return higher than investments are likely to earn. Do it before investing beyond the emergency fund." : (T.debt > 0 ? "Your loans are below 12%. Prepay only if the rate beats what the money would earn after tax." : "You owe nothing."), "loans");
    /* 6 retirement */
    const q = S.retire || {}; let sim = null;
    if (max0(q.spend) > 0 && num(q.age) > 0 && num(q.endAge) > num(q.retAge) && num(q.retAge) >= num(q.age)) sim = retirementSim(q, 300, 11);
    const rVeh = occs.includes("salaried") ? "EPF and VPF, employer NPS and equity index funds" : occs.includes("govt") ? "your pension scheme, plus equity index funds for growth" : occs.some(o => OCC[o].self) ? "PPF, NPS and equity index funds, since there is no employer PF" : "PPF and equity index funds";
    if (!sim) step("retire", "todo", retired ? "Check how long the money lasts" : "Set a retirement target", "Enter your ages, investments and yearly spending under Retirement. Suitable vehicles: " + rVeh + ".", "retire");
    else step("retire", sim.success >= .85 ? "done" : sim.success >= .7 ? "watch" : "todo", retired ? "Money lasts to " + num(q.endAge) + " in " + Math.round(sim.success * 100) + "% of futures" : "Retirement plan holds in " + Math.round(sim.success * 100) + "% of futures", (sim.success >= .85 ? "On course. " : "Under 85% calls for more saving, a later retirement or lower spending. ") + (retired ? "A starting withdrawal near 3 to 3.5% of the corpus is the cautious rule; yours is " + (isFinite(sim.withdrawal) ? (sim.withdrawal * 100).toFixed(1) + "%" : "not set") + "." : "Use " + rVeh + "."), "retire");
    /* 7 goals */
    const yr = now.getFullYear(), gs = (S.goals || []).map(g => ({ g, s: goalStatus(g, yr) })), behind = gs.filter(x => !x.s.onTrack);
    const eduGoal = (S.goals || []).some(g => /educat|college|school|study|univers/i.test(g.name || ""));
    if (kids > 0 && !eduGoal) step("goals", "todo", "Add an education goal", "You have " + (kids === 1 ? "a child" : kids + " children") + " and no education goal. Education costs rise 8 to 10% a year, so the earlier it starts the smaller the monthly amount." + (set.daughter === "yes" ? " Sukanya Samriddhi suits the safe part for a daughter under 10." : ""), "goals");
    else if (!gs.length) step("goals", retired ? "na" : "todo", retired ? "No goals set" : "Name your goals", retired ? "Add any large planned spending, such as a wedding or travel, so it is kept out of equity." : "A home, a car, a wedding, a business: give each a date and a cost, and the app sizes the monthly amount.", "goals");
    else step("goals", behind.length ? "watch" : "done", behind.length ? behind.length + " of " + gs.length + " goals need more saving" : "All " + gs.length + " goals are on track", behind.length ? behind.map(x => x.g.name + ": " + inr(x.s.need) + " a month needed, " + inr(num(x.g.sip)) + " going in").join("; ") + "." : "At your assumed returns. Review once a year.", "goals");
    /* 8 tax */
    const tips = [];
    tx.forEach(x => { const m = x.m, t = m.t || {};
      if (m.regime && m.regime !== "auto" && x.b.better !== m.regime && x.b.saving > 1000) tips.push(m.name + ": the " + x.b.better + " regime saves " + inr(x.b.saving));
      if (x.a.required && x.a.next && x.a.next.amount > 0 && x.a.next.days <= 60) tips.push(m.name + ": pay " + inr(x.a.next.amount) + " advance tax by " + x.a.next.due.toLocaleDateString("en-IN", { day: "numeric", month: "short" }));
      if (x.a.c234Accrued > 0) tips.push(m.name + ": " + inr(x.a.c234Accrued) + " of interest has built up on missed instalments");
      if (["salaried", "govt"].includes(occOf(m)) && max0(t.salary) > 15 * L && !max0(t.empNps)) tips.push(m.name + ": ask the employer to route part of pay into NPS (deductible up to 14% of basic in the new regime)");
      if (occOf(m) === "professional" && (!t.bizMode || t.bizMode === "none") && !max0(t.salary)) tips.push(m.name + ": enter professional receipts on the Tax page and compare 44ADA on the Business page");
      if (occOf(m) === "business" && (!t.bizMode || t.bizMode === "none") && !max0(t.salary)) tips.push(m.name + ": enter turnover on the Tax page and compare 44AD on the Business page"); });
    step("tax", tips.length ? "watch" : taxTotal > 0 || incomeY > 0 ? "done" : "todo", tips.length ? tips.length + " tax " + (tips.length === 1 ? "move" : "moves") + " to make" : taxTotal > 0 ? "Tax is in order" : incomeY > 0 ? "No tax to pay" : "Enter income on the Tax page", tips.length ? tips.join(". ") + "." : taxTotal > 0 ? "Total tax for the year " + lk(taxTotal) + ", in the lower regime for each person, with nothing overdue." : incomeY > 0 ? "At this income the rebate and exemptions bring tax to nil." : "The app compares both regimes and works out advance tax once income is entered.", "tax");
    /* 9 mix */
    const mix = suggestMix(age, risk, retired), fin = Math.max(0, T.by.equity + T.by.debt + T.by.cash + T.by.gold), cur = fin > 0 ? { equity: T.by.equity / fin * 100, debt: (T.by.debt + T.by.cash) / fin * 100, gold: T.by.gold / fin * 100 } : null;
    if (cur) { const d = cur.equity - mix.equity; step("mix", Math.abs(d) <= 10 ? "done" : "watch", Math.abs(d) <= 10 ? "Investment mix suits your age and comfort" : (d > 0 ? "Equity is above" : "Equity is below") + " what suits your age and comfort", "Equity is " + Math.round(cur.equity) + "% of financial investments; about " + mix.equity + "% fits a " + risk + " investor aged " + age + (retired ? " in retirement" : "") + ". " + (Math.abs(d) <= 10 ? "Rebalance once a year." : d > 0 ? "Direct new money to deposits and debt funds rather than selling, which can trigger tax." : "Direct new money to equity index funds over the next year or two rather than in one go."), "wealth"); }
    else step("mix", "todo", "Start investing", "Once the emergency fund is in place, a mix near " + mix.equity + "% equity, " + mix.debt + "% debt and " + mix.gold + "% gold fits a " + risk + " investor aged " + age + ".", "wealth");
    /* 10 paperwork */
    const PAPERS = ["will", "nominee", "joint", "list", "health-own", "15h", "kyc", "poa"], ticked = PAPERS.filter(k => (S.checklist || {})[k]).length;
    step("paper", ticked >= PAPERS.length ? "done" : ticked >= 4 ? "watch" : "todo", ticked >= PAPERS.length ? "Paperwork is complete" : "Finish the family paperwork", ticked + " of " + PAPERS.length + " done. A will, nominees on every account and one written list of everything cost almost nothing and spare the family months of trouble.", "cover");
    /* where the monthly surplus goes */
    const split = []; let left = Math.max(0, T.surplus);
    const give = (label, amt, why, c) => { amt = Math.min(left, Math.max(0, amt)); if (amt >= 1) { split.push({ label, amt, why, c }); left -= amt; } };
    if (T.surplus > 0) {
      give("Emergency fund", Math.min(efGap / 12, T.surplus * .4), "Fills the gap in about a year", "c5");
      if (costly.length) give("Costly debt", Math.min(costlySum / 12, left * .6), "Clears it in about a year", "c2");
      give("Goals", gs.reduce((s, x) => s + Math.max(0, x.s.need - num(x.g.sip)), 0), "Tops up the goals that are short", "c4");
      const rest = left; give("Long-term equity funds", rest * mix.equity / 100, "For retirement and wealth: index funds, employer NPS", "c1"); give("Safe long-term money", rest * mix.debt / 100, "PPF, VPF, debt funds or deposits", "c3"); give("Gold", left, "A small hedge, through a gold ETF", "c4");
    }
    /* options that fit each purpose, with after-tax yield for the lead person */
    const e = lead ? marginalRates(lead, yearKey) : { int: 0, stcg: 0, ltcg: 0 }, P = id => PROD.find(x => x.id === id);
    const y = (id, n) => { const p = P(id); return { n: p.n, r: p.r, after: cagr(L, growAfterTax(p, L, n, e, false), n), safe: p.vol < 10, note: p.capNote || "" }; };
    const purposes = [{ n: "Emergency money", yrs: 1, ids: ["sav", "liquid", age >= 60 ? "fds" : "fd"] }, { n: "Goals within 3 years", yrs: 2, ids: [age >= 60 ? "fds" : "fd", "debtmf"].concat(e.int >= .2 ? ["arb"] : []) }, { n: "Goals 3 to 7 years away", yrs: 5, ids: ["nsc", "potd", "debtmf", "baf"] },
      { n: "Long term, 7 years or more", yrs: 15, ids: ["index", "ppf"].concat(occs.includes("salaried") ? ["epf"] : [], ["nps"], set.daughter === "yes" ? ["ssy"] : [], ["goldetf"]) }];
    if (age >= 55) purposes.push({ n: "Income in retirement", yrs: 5, ids: (age >= 60 ? ["scss"] : []).concat(["pomis", "frsb", "fds", "baf"]) });
    const shortlist = purposes.map(pp => ({ n: pp.n, yrs: pp.yrs, items: pp.ids.map(id => y(id, pp.yrs)) }));
    const next = steps.find(x => x.status === "todo") || steps.find(x => x.status === "watch") || null;
    return { lead, age, occ, occs, retired, stage, risk, incomeY, taxTotal, kids, steps, next, done: steps.filter(x => x.status === "done" || x.status === "na").length, mix, cur, split, surplus: T.surplus, shortlist, rates: e,
      tips: occs.map(o => ({ occ: o, n: OCC[o].n, who: adults.filter(m => occOf(m) === o).map(m => m.name), items: TIPS[o] || [] })), band: incomeBand(incomeY), schemes: schemes(S, incomeY, taxTotal) };
  }

  /* ---------- business and practice: presumptive scheme or books ---------- */
  function bizCompare(p, b, yearKey) {
    const prof = b.type === "profession", dig = max0(b.receipts), cash = max0(b.cash), total = dig + cash, cashShare = total > 0 ? cash / total : 0, exp = max0(b.expenses);
    const limit = prof ? (cashShare <= .05 ? 75 * L : 50 * L) : (cashShare <= .05 ? 3 * CR : 2 * CR), eligible = total > 0 && total <= limit;
    const presProfit = prof ? total * .5 : dig * .06 + cash * .08, booksProfit = Math.max(0, total - exp);
    const withBiz = (mode, f) => { const m = JSON.parse(JSON.stringify(p)); Object.assign(m.t, { bizMode: mode, receipts: 0, profitPct: "", turnDigital: 0, turnCash: 0, profit: 0 }, f); m.regime = p.regime; return bestRegime(m, yearKey); };
    const pres = withBiz(prof ? "44ada" : "44ad", prof ? { receipts: total } : { turnDigital: dig, turnCash: cash }), books = withBiz("actual", { profit: booksProfit });
    const basic = pres.r.basic;
    const auditBySize = prof ? total > 50 * L : total > (cashShare <= .05 ? 10 * CR : CR);
    const auditByLow = eligible && booksProfit < presProfit && books.r.TI > basic;
    const gstLimit = b.supply === "goods" ? 40 * L : 20 * L, gstExempt = b.supply === "exempt";
    const better = !eligible ? "books" : pres.r.tax <= books.r.tax ? "presumptive" : "books";
    const fixed = max0(b.fixed), reserve = max0(b.reserve);
    return { prof, total, cashShare, limit, eligible, margin: total > 0 ? booksProfit / total : 0, presProfit, booksProfit, presTax: pres.r.tax, booksTax: books.r.tax, presRegime: pres.pick, booksRegime: books.pick,
      audit: auditBySize || auditByLow, auditWhy: auditBySize ? (prof ? "Receipts are above ₹50 lakh" : "Turnover is above " + (cashShare <= .05 ? "₹10 crore" : "₹1 crore")) : auditByLow ? "Profit declared is below the presumptive rate and income is above the exemption limit" : "",
      better, saving: Math.abs(pres.r.tax - books.r.tax), gst: { limit: gstLimit, exempt: gstExempt, over: !gstExempt && total > gstLimit }, bufferMonths: fixed > 0 ? reserve / fixed : NaN, fixed, reserve };
  }

  return { L, CR, YEARS, RULES_VERIFIED, RATES_ASOF, yearForDate, sec, NEW_SLABS, oldSlabs, slabTax, surRate, taxOn, computePerson, bestRegime, marginalRates, advanceTax,
    fvLump, fvSip, sipNeeded, emi, loanPath, goalStatus, xirr, retirementSim, PROD, growAfterTax, cagr, CLASSES, GROUPS, LIAB, perMonth, totals, insuredGaps, healthChecks, calendar,
    OCC, occOf, defaultOcc, STAGES, lifeStage, leadOf, suggestMix, TIPS, incomeBand, schemes, plan, bizCompare };
});
