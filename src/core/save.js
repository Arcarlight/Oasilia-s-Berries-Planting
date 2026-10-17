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

  // ── 本地存档槽位 ────────────────────────────────────────────────────────
  // 放在另一个 key 里，和主存档互不影响。用途：新版本想开新档时先存一个，
  // 玩崩了或者想回去看看旧进度，随时读回来。最多 4 个槽。
  const SLOT_KEY = "philoroa.slots.v1";
  const SLOT_MAX = 4;

  G.listSlots = function () {
    let raw = null;
    try { raw = localStorage.getItem(SLOT_KEY); } catch (e) { raw = null; }
    if (!raw) return [];
    try {
      const list = JSON.parse(raw);
      return Array.isArray(list) ? list : [];
    } catch (e) { return []; }
  };

  function writeSlots(list) {
    try { localStorage.setItem(SLOT_KEY, JSON.stringify(list.slice(0, SLOT_MAX))); return true; }
    catch (e) { return false; }
  }

  // 存一个快照。name 不填就用「区域 + 日期」当名字。
  G.saveSlot = function (state, name) {
    const list = G.listSlots();
    if (list.length >= SLOT_MAX && !list.some((x) => x.name === name)) {
      return { ok: false, why: "槽位满了（最多 " + SLOT_MAX + " 个），先删掉一个。" };
    }
    const region = G.regionOf ? G.regionOf(state).name : "";
    const entry = {
      name: name || (region + " " + new Date().toLocaleString("zh-CN", { hour12: false }).slice(0, 16)),
      at: Date.now(),
      region: region,
      money: state.money,
      region2: state.region,
      code: G.exportSave(state)
    };
    const at = list.findIndex((x) => x.name === entry.name);
    if (at >= 0) list[at] = entry; else list.push(entry);
    if (!writeSlots(list)) return { ok: false, why: "写不进去（浏览器存储满了或者被禁用了）" };
    return { ok: true, entry: entry };
  };

  G.loadSlot = function (name) {
    const e = G.listSlots().filter((x) => x.name === name)[0];
    if (!e) return null;
    return G.importSave(e.code);
  };

  G.deleteSlot = function (name) {
    const list = G.listSlots().filter((x) => x.name !== name);
    return writeSlots(list);
  };

  G.SLOT_MAX = SLOT_MAX;

  G.clearSave = function () {
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
  };

  // 旧档补齐字段，永远不丢进度
  G.migrate = function (s) {
    const base = G.newState();
    const merged = Object.assign({}, base, s);
    // 门槛从「累计加工次数」改成「累计加工时长」。老档只有次数，
    // 按 8 秒/次 折一下 —— 这就是原来"全做果酱"口径的进度，换算后不丢。
    if (merged.stats && !merged.stats.craftSeconds) {
      merged.stats.craftSeconds = (merged.stats.crafted || 0) * 8;
    }
    merged.stats = Object.assign({}, base.stats, s.stats || {});
    merged.atlas = Object.assign({}, base.atlas, s.atlas || {});
    merged.atlas.report = (s.atlas && s.atlas.report) || null;
    merged.settings = Object.assign({}, base.settings, s.settings || {});
    ["seeds", "berries", "products", "materials", "finds", "items", "recipes",
      "regulars", "talents", "dex", "madeProducts", "orders"].forEach((k) => {
      merged[k] = Object.assign({}, s[k] || {});
    });
    merged.extraPlots = s.extraPlots || 0;
    merged.helpers = Array.isArray(s.helpers) ? s.helpers : [];
    merged.craftQueue = Array.isArray(s.craftQueue) ? s.craftQueue : [];
    merged.autoRecipe = s.autoRecipe || null;
    merged.autoTrade = !!s.autoTrade;
    merged.stallOn = s.stallOn !== false;
    merged.stallReserve = (typeof s.stallReserve === "number") ? s.stallReserve : 20;
    merged.waste = s.waste || 0;
    // 老存档没有锅，或者在搅拌中途被关掉过 —— 补一个完整的结构
    const bp = base.pot;
    const sp = s.pot || {};
    merged.pot = {
      level: Math.min(G.POT_LEVELS.length, Math.max(1, sp.level || 1)),
      inPot: Array.isArray(sp.inPot) ? sp.inPot.filter((x) => x && x.kind && x.id !== undefined).slice(0, 12) : [],
      stir: sp.stir && sp.stir.until ? sp.stir : null,
      pending: sp.pending || null,
      last: sp.last || null
    };
    if (!merged.pot.inPot.length && !merged.pot.stir) merged.pot.inPot = [];
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
    const dirty = ["berries", "seeds", "products", "materials", "finds"].some((bag) =>
      Object.keys(merged[bag] || {}).some((k) => merged[bag][k] % 1 !== 0));
    merged.needSanitize = true;
    G.syncPlots(merged);
    // 研发出来的配方存档里只存了 id，这里按 id 把它们重新造回配方表
    if (G.hydrateResearch) G.hydrateResearch(merged);
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
