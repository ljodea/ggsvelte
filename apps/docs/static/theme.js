// Blocking theme and visual-regression bootstrap. This file intentionally loads
// without defer so the document theme is set before first paint.
(function () {
  var params = new URLSearchParams(location.search);
  var vr = params.has("vr");
  var theme = params.get("theme");
  var root = document.documentElement;
  if (vr) root.dataset.vr = "";
  if (theme !== "dark" && theme !== "light") {
    var stored = null;
    if (!vr) {
      try {
        stored = localStorage.getItem("ggsvelte-theme");
      } catch {
        stored = null;
      }
    }
    theme =
      stored === "dark" || stored === "light"
        ? stored
        : !vr &&
            typeof window.matchMedia === "function" &&
            window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
  }
  root.dataset.theme = theme;
})();
