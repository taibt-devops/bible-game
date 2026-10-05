// Định tuyến bằng hash: #/, #/play/fill?topic=love&level=2, #/review?tab=library
let routes = {};
let cleanup = null;
let root, deco;

export function parse() {
  const raw = location.hash.replace(/^#\/?/, "");
  const [path, query = ""] = raw.split("?");
  return { path, params: Object.fromEntries(new URLSearchParams(query)) };
}

export function render() {
  cleanup?.();
  cleanup = null;
  document.querySelectorAll(".overlay").forEach((o) => o.remove());
  const { path, params } = parse();
  const screen = routes[path] ?? routes[""];
  document.body.dataset.route = path.split("/")[0] || "home";
  root.innerHTML = "";
  deco.innerHTML = "";
  scrollTo(0, 0);
  cleanup = screen(root, params, deco) || null;
}

export function go(path, params = {}) {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")).toString();
  const hash = `#/${path}${qs ? `?${qs}` : ""}`;
  if (location.hash === hash || (!location.hash && hash === "#/")) render();
  else location.hash = hash;
}

export function startRouter(table, appEl, decoEl) {
  routes = table;
  root = appEl;
  deco = decoEl;
  addEventListener("hashchange", render);
  render();
}
