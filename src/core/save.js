// 存档：localStorage + 导出/导入 + 版本迁移。
window.G = window.G || {};
(function () {
  const KEY = "philoroa.save.v1";

  G.saveGame = function (state) {
    try {
      state.lastSeen = Date.now();
      localStorage.setItem(KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      console.warn("保存失败", e);
      return false;
    }
  };

  G.loadGame = function () {
    let raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { raw = null; }
    if (!raw) return null;
    try {
      const s = JSON.parse(raw);
      return G.migrate(s);
    } catch (e) {
      console.warn("读档失败", e);
      return null;
    }
  };

  G.hasSave = function () {
    try { return !!localStorage.getItem(KEY); } catch (e) { return false; }
  };

  G.clearSave = function () {
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
  };

  // 旧档补齐字段，永远不丢进度
  G.migrate = function (s) {
    const base = G.newState();
    const merged = Object.assign({}, base, s);
    merged.stats = Object.assign({}, base.stats, s.stats || {});
    merged.atlas = Object.assign({}, base.atlas, s.atlas || {});
    merged.settings = Object.assign({}, base.settings, s.settings || {});
    ["seeds", "berries", "products", "materials", "items", "recipes",
      "regulars", "talents", "dex", "orders"].forEach((k) => {
      merged[k] = Object.assign({}, s[k] || {});
    });
    merged.extraPlots = s.extraPlots || 0;
    merged.helpers = Array.isArray(s.helpers) ? s.helpers : [];
    merged.craftQueue = Array.isArray(s.craftQueue) ? s.craftQueue : [];
    merged.autoRecipe = s.autoRecipe || null;
    merged.autoTrade = !!s.autoTrade;
    merged.stallOn = s.stallOn !== false;
    merged.stallReserve = (typeof s.stallReserve === "number") ? s.stallReserve : 20;
    merged.plots = Array.isArray(s.plots) ? s.plots : [];
    merged.plots = merged.plots.map((p) => ({
      berry: p && p.berry ? p.berry : null,
      grown: (p && p.grown) || 0,
      watered: (p && p.watered) || 0,
      ripe: !!(p && p.ripe)
    }));
    merged.log = Array.isArray(s.log) ? s.log.slice(0, 120) : [];
    merged.v = G.VERSION;
    // 旧存档里可能残留小数库存（摊位按小数速率卖东西留下的），载入时抹平
    const dirty = ["berries", "seeds", "products", "materials"].some((bag) =>
      Object.keys(merged[bag] || {}).some((k) => merged[bag][k] % 1 !== 0));
    merged.needSanitize = true;
    G.syncPlots(merged);
    if (dirty) console.info("存档里有小数库存，已在开局抹平");
    return merged;
  };

  G.exportSave = function (state) {
    const json = JSON.stringify(state);
    return btoa(unescape(encodeURIComponent(json)));
  };

  G.importSave = function (code) {
    const json = decodeURIComponent(escape(atob(code.trim())));
    const s = JSON.parse(json);
    if (!s || typeof s !== "object" || !s.stats) throw new Error("存档格式不对");
    return G.migrate(s);
  };
})();
