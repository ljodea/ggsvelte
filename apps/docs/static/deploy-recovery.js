// Recover from post-deploy hashed-chunk misses. Cloudflare Pages serves one
// deployment at a time: a new activate retires prior `/_app/immutable/*`
// hashes. A tab that still has the previous shell (or hits an edge mid-flip)
// then fails dynamic imports and SvelteKit surfaces "500 Internal Error".
// Vite emits `vite:preloadError` for those misses; one guarded reload pulls
// the current HTML + matching chunks. Guarded so a real missing asset cannot
// loop. When sessionStorage is blocked, a timestamped query flag still limits
// to one reload within COOLDOWN_MS (not forever).
(function () {
  var STORAGE_KEY = "ggsvelte-deploy-recovery-at";
  var QUERY_FLAG = "ggsvelte_deploy_recovery";
  var COOLDOWN_MS = 15000;

  function withinCooldown(previous) {
    return Number.isFinite(previous) && Date.now() - previous < COOLDOWN_MS;
  }

  function recentlyReloaded() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw !== null) {
        var previous = Number(raw);
        if (withinCooldown(previous)) return true;
      }
    } catch {
      // Storage blocked — fall through to query-flag guard.
    }
    try {
      var flagged = new URLSearchParams(location.search).get(QUERY_FLAG);
      if (flagged === null) return false;
      return withinCooldown(Number(flagged));
    } catch {
      return false;
    }
  }

  function markReload() {
    var now = String(Date.now());
    try {
      sessionStorage.setItem(STORAGE_KEY, now);
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
    // Storage blocked: one reload via timestamped query flag.
    try {
      var url = new URL(location.href);
      url.searchParams.set(QUERY_FLAG, String(Date.now()));
      location.replace(url.toString());
      return true;
    } catch {
      return false;
    }
  }

  // Drop expired recovery flags so bookmarks/history do not suppress future
  // deploys forever after the cooldown window.
  try {
    var bootUrl = new URL(location.href);
    var bootFlag = bootUrl.searchParams.get(QUERY_FLAG);
    if (bootFlag !== null && !withinCooldown(Number(bootFlag))) {
      bootUrl.searchParams.delete(QUERY_FLAG);
      history.replaceState(null, "", bootUrl.toString());
    }
  } catch {
    // history / URL may be unavailable in exotic embeds.
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
