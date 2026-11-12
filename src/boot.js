/* ---------- boot ---------- */
(function boot() { shell(); const h = location.hash.slice(1); route = VIEWS[h] ? h : "home"; render(); cloudInit(); })();
