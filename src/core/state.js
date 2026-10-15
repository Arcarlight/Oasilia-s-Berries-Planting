// 存档结构（state）与初始化。所有系统都读写这一个对象。
window.G = window.G || {};
(function () {
  const VERSION = 1;

  function newPlots(n) {
    const arr = [];
    for (let i = 0; i < n; i++) arr.push({ berry: null, grown: 0, watered: 0, ripe: false });
    return arr;
  }

  G.plotCount = function (state) {
    const region = G.regionOf(state);
    const talentPlots = (state.talents && state.talents.plots) || 0;
    const bought = state.extraPlots || 0;
    return region.plots + talentPlots + bought;
  };

  G.newState = function () {
    const s = {
      v: VERSION,
      createdAt: Date.now(),
      lastSeen: Date.now(),
      // 游戏内时钟（毫秒）。所有计时都走它，这样离线结算和无头模拟用同一条时间线。
      clock: Date.now(),
      playTime: 0,
      money: 0,
      region: 1,
      maxRegion: 1,
      plots: [],
      extraPlots: 0,
      seeds: { 1: 3 },
      berries: {},
      products: {},
      materials: {},
      finds: {},          // 素材库存（只能靠阿特拉斯出门带回来）
      waste: 0,           // 研发失败的产物
      pot: { level: 1, inPot: [], stir: null, pending: null, last: null },   // 研发用的大锅
      items: {},
      recipes: {},
      regulars: {},
      helpers: [],
      craftQueue: [],
      autoRecipe: null,   // 自动加工的配方 id（null = 关闭）
      autoTrade: false,   // 自动交付：把商品交给对味的常客
      stallOn: true,      // 摊位自动出货开关
      stallReserve: 20,   // 摊位每个品种至少留多少个不卖（留给加工）
      orders: {},
      talents: {},
      talentPoints: 0,
      talentSpent: 0,
      dex: {},
      stats: {
        harvested: 0, crafted: 0, sold: 0, clicks: 0, trips: 0, researched: 0,
        revenueRegion: 0, revenueTotal: 0, prestige: 0, orders: 0
      },
      atlas: { trip: null, craft: null, seen: {}, report: null },
      log: [],
      settings: { numberStyle: "short" },
      regionEnteredAt: Date.now()
    };
    s.plots = newPlots(G.plotCount(s));
    return s;
  };

  // 游戏内"现在"。模拟时它会跟着 dt 走，不依赖真实时钟。
  G.now = function (state) { return state && state.clock ? state.clock : Date.now(); };

  G.addLog = function (state, text, kind) {
    state.log.unshift({ t: Date.now(), text: text, kind: kind || "info" });
    if (state.log.length > 120) state.log.length = 120;
  };

  // 保证 plots 数组长度与当前区域需求一致（移民/买地/天赋变化后调用）
  G.syncPlots = function (state) {
    const want = G.plotCount(state);
    while (state.plots.length < want) state.plots.push({ berry: null, grown: 0, watered: 0, ripe: false });
    // 缩短时只裁掉空地，避免把作物直接删掉
    while (state.plots.length > want) {
      const idx = state.plots.map((p, i) => (p.berry ? -1 : i)).filter((i) => i >= 0).pop();
      if (idx === undefined) break;
      state.plots.splice(idx, 1);
    }
  };

  G.VERSION = VERSION;
})();
