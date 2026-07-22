// Recover from post-deploy hashed-chunk misses. Cloudflare Pages serves one
// deployment at a time: a new activate retires prior `/_app/immutable/*`
// hashes. A tab that still has the previous shell (or hits an edge mid-flip)
// then fails dynamic imports and SvelteKit surfaces "500 Internal Error".
// Vite emits `vite:preloadError` for those misses; one guarded reload pulls
// the current HTML + matching chunks. Guarded so a real missing asset cannot
// loop.
(function () {
  var STORAGE_KEY = "ggsvelte-deploy-recovery-at";
  var COOLDOWN_MS = 15000;

  function recentlyReloaded() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw === null) return false;
      var previous = Number(raw);
      if (!Number.isFinite(previous)) return false;
      return Date.now() - previous < COOLDOWN_MS;
    } catch {
      return false;
    }
  }

  function markReload() {
    try {
      sessionStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      // Private mode / blocked storage: still attempt a single reload.
    }
  }

  function shouldRecover(error) {
    if (error === null || error === undefined) return false;
    var message = typeof error === "string" ? error : error.message;
    if (typeof message !== "string") return false;
    return (
      message.indexOf("Failed to fetch dynamically imported module") !== -1 ||
      message.indexOf("error loading dynamically imported module") !== -1 ||
      message.indexOf("Importing a module script failed") !== -1
    );
  }

  function recover() {
    if (recentlyReloaded()) return;
    markReload();
    location.reload();
  }

  window.addEventListener("vite:preloadError", function (event) {
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
