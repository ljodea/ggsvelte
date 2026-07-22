// Recover from post-deploy hashed-chunk misses. Cloudflare Pages serves one
// deployment at a time: a new activate retires prior `/_app/immutable/*`
// hashes. A tab that still has the previous shell (or hits an edge mid-flip)
// then fails dynamic imports and SvelteKit surfaces "500 Internal Error".
// Vite emits `vite:preloadError` for those misses; one guarded reload pulls
// the current HTML + matching chunks. Guarded so a real missing asset cannot
// loop. When sessionStorage is blocked, a query flag still limits to one reload.
(function () {
  var STORAGE_KEY = "ggsvelte-deploy-recovery-at";
  var QUERY_FLAG = "ggsvelte_deploy_recovery";
  var COOLDOWN_MS = 15000;

  function recentlyReloaded() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw !== null) {
        var previous = Number(raw);
        if (Number.isFinite(previous) && Date.now() - previous < COOLDOWN_MS) return true;
      }
    } catch {
      // Storage blocked — fall through to query-flag guard.
    }
    try {
      return new URLSearchParams(location.search).get(QUERY_FLAG) === "1";
    } catch {
      return false;
    }
  }

  function markReload() {
    try {
      sessionStorage.setItem(STORAGE_KEY, String(Date.now()));
      return "storage";
    } catch {
      return "query";
    }
  }

  function shouldRecover(error) {
    // String(TypeError) includes the message text without property access that
    // type-aware oxlint treats as unsafe any under --deny-warnings.
    var message = typeof error === "string" ? error : String(error);
    return (
      message.includes("Failed to fetch dynamically imported module") ||
      message.includes("error loading dynamically imported module") ||
      message.includes("Importing a module script failed")
    );
  }

  /**
   * @returns {boolean} true when a reload was initiated
   */
  function recover() {
    if (recentlyReloaded()) return false;
    var mark = markReload();
    if (mark === "storage") {
      location.reload();
      return true;
    }
    // Storage blocked: one reload via query flag (survives without sessionStorage).
    try {
      var url = new URL(location.href);
      url.searchParams.set(QUERY_FLAG, "1");
      location.replace(url.toString());
      return true;
    } catch {
      return false;
    }
  }

  window.addEventListener("vite:preloadError", function (event) {
    // Only swallow the error when we actually recover; otherwise let Vite/
    // SvelteKit surface a real missing chunk during the cooldown window.
    if (recentlyReloaded()) return;
    try {
      event.preventDefault();
    } catch {
      // Older engines may not expose preventDefault on this event.
    }
    recover();
  });

  window.addEventListener("unhandledrejection", function (event) {
    if (!shouldRecover(event.reason)) return;
    recover();
  });
})();
