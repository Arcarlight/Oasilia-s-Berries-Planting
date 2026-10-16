// 收益计算：所有加成在这里汇总，UI 与引擎都只从这里取值。
window.G = window.G || {};
(function () {
  const MOD_KEYS = ["clickWater", "clickSell", "growSpeed", "yieldAdd", "sellBonus",
    "affinity", "offlineBonus", "offlineCap", "craftSpeed", "craftOutput",
    "idleRate", "helperSlot", "seedDiscount", "allBonus"];

  const ALIAS = {
    sell: "sellBonus", offline: "offline", all: "allBonus", click: "clickSell"
  };

  // 汇总一次，缓存 250ms（tick 里每帧调用会很浪费）
  let cache = null;
  let cacheKey = "";
  let cacheAt = 0;

  function keyOf(state) {
    // 只把影响加成的部分编进 key
    return state.region + "|" + JSON.stringify(state.items) + "|" +
      JSON.stringify(state.talents) + "|" + Object.keys(state.regulars).length;
  }

  G.bonuses = function (state) {
    const k = keyOf(state);
    const now = Date.now();
    if (cache && cacheKey === k && now - cacheAt < 250) return cache;

    const b = {
      click: 0, clickWater: 0, clickSell: 0, growSpeed: 0, yieldAdd: 0, sellBonus: 0,
      affinity: 0, offline: 0, offlineCap: 0, craftSpeed: 0, craftOutput: 0,
      idleRate: 0, helperSlot: 0, seedDiscount: 0, allBonus: 0,
      moveDiscount: 0, keepMoney: 0, plots: 0, rareSeed: 0, flavorSell: null, flavorBonus: 0
    };

    // 区域加成
    const region = G.regionOf(state);
    const rb = region.bonus || {};
    if (rb.growSpeed) b.growSpeed += rb.growSpeed;
    if (rb.sell) b.sellBonus += rb.sell;
    if (rb.craftSpeed) b.craftSpeed += rb.craftSpeed;
    if (rb.offline) b.offline += rb.offline;
    if (rb.offlineCap) b.offlineCap += rb.offlineCap;
    if (rb.all) b.allBonus += rb.all;
    if (rb.rareSeed) b.rareSeed += rb.rareSeed;
    if (rb.flavorSell) { b.flavorSell = rb.flavorSell; b.flavorBonus = rb.flavorBonus || 0; }

    // 道具（每级）
    const items = (G.ITEMS || []);
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const lv = state.items[it.id] || 0;
      if (!lv) continue;
      const eff = it.effects[Math.min(lv, it.effects.length) - 1];
      if (!eff || !eff.mod) continue;
      Object.keys(eff.mod).forEach((mk) => {
        const target = MOD_KEYS.indexOf(mk) >= 0 ? mk : (ALIAS[mk] || null);
        if (!target) return;
        b[target] += eff.mod[mk];
      });
    }

    // 天赋
    (G.TALENTS || []).forEach((t) => {
      const lv = state.talents[t.id] || 0;
      if (!lv) return;
      const v = t.per * lv;
      switch (t.mod) {
        case "growSpeed": b.growSpeed += v; break;
        case "sell": b.sellBonus += v; break;
        // 掌力：既提高单次叫卖的价钱，也让你一次能吆喝动更多货
        case "click": b.click += v; b.clickSell += v; b.clickWater += v; break;
        case "offline": b.offline += v; b.offlineCap += 7200 * lv; break;
        case "plots": b.plots += v; break;
        case "seedDiscount": b.seedDiscount += v; break;
        case "affinity": b.affinity += v; break;
        case "craftSpeed": b.craftSpeed += v; break;
        case "helper": b.idleRate += v * 0.5; break;
        case "moveDiscount": b.moveDiscount += v; break;
        case "keepMoney": b.keepMoney += v; break;
        case "all": b.allBonus += v; break;
        default: break;
      }
    });

    // 常客满好感给全局小加成（每满 5 位 +2%）
    let maxed = 0;
    Object.keys(state.regulars).forEach((dex) => {
      if ((state.regulars[dex].aff || 0) >= 5) maxed++;
    });
    b.allBonus += Math.min(0.5, maxed * 0.02);
    b.maxedRegulars = maxed;

    // 彩蛋：欧亚西莉亚最爱文柚果（No.10）。手上有它，她心情好，全线 +3%。
    if (state.dex && state.dex[10]) {
      b.allBonus += 0.03;
      b.olyviaHappy = true;
    }

    cache = b; cacheKey = k; cacheAt = now;
    return b;
  };

  G.clearBonusCache = function () { cache = null; cacheKey = ""; };

  // —— 价格 ——

  G.seedPrice = function (state, berry) {
    const b = G.bonuses(state);
    return Math.max(1, Math.round(berry.seedCost * (1 - Math.min(0.85, b.seedDiscount))));
  };

  // 种子回收价：买回来是 seedCost（打掉折扣之后），回收只给四成 —— 就是「折损」。
  // 收获时那三成回种的种子是白来的，卖掉算白赚，所以这个价不能再高。
  G.SEED_SELL_RATIO = 0.4;
  G.seedSellPrice = function (state, berry) {
    return Math.max(1, Math.floor(berry.seedCost * G.SEED_SELL_RATIO));
  };

  G.berrySellPrice = function (state, berry) {
    const b = G.bonuses(state);
    return Math.max(1, Math.floor(berry.basePrice * (1 + b.sellBonus) * (1 + b.allBonus)));
  };

  // 卖给特定常客：口味对上就有加成，而且**味道越浓加成越高**
  // （以前是死板的 ×1.5，淡淡的一口和浓得发苦的一个价，说不过去）。
  G.flavorMult = function (productFlavor, regular, peak) {
    if (!regular) return 1;
    // 55 分以下 = 1.40，满 99 分 = 1.75；平均下来和原来的 1.5 差不多
    const t = Math.max(0, Math.min(1, ((peak || 0) - 55) / 44));
    const kick = 1.40 + 0.35 * t;
    if (productFlavor === "混合") return 1 + (kick - 1) * 0.5;
    if (productFlavor === regular.flavor) return kick;
    if (productFlavor === regular.dislike) return 0.8;
    return 1.0;
  };

  G.affinityMult = function (aff) { return 1 + 0.12 * (aff || 0); };

  G.productSellPrice = function (state, recipe, berry, regular) {
    const b = G.bonuses(state);
    let v = G.productValue(recipe, berry);
    v *= (1 + b.sellBonus) * (1 + b.allBonus);
    if (b.flavorSell && recipe.flavor === b.flavorSell) v *= (1 + b.flavorBonus);
    if (regular) {
      v *= G.flavorMult(recipe.flavor, regular, G.flavorIntensity(recipe, berry));
      v *= G.affinityMult(regular.aff);
    }
    return Math.max(1, Math.floor(v));
  };

  // 市场直接出货：略低于交给常客，但没有门槛
  G.marketPrice = function (state, recipe, berry) {
    return Math.max(1, Math.floor(G.productSellPrice(state, recipe, berry, null) * 0.85));
  };

  // ── 叫卖 ────────────────────────────────────────────────────────────────
  // 叫卖是"吆喝一声把手上的货出手"，不是凭空生钱：
  // 一次卖掉摊上最贵的若干个生果，价钱比自动出货高（主动叫卖有溢价）。
  // 手上没果子就卖不动 —— 这是它和挂机收益的分工。
  //   之前它直接 S.money += 一个按进度折算出来的数，不消耗任何库存，
  //   和"叫卖"这个动作本身对不上。
  G.CLICK_SELL_PREMIUM = 1.25;    // 主动叫卖比摊位出货贵两成半

  // 一次能吆喝动几个：底 2 个，掌力天赋每级 +1（满级 14 个）
  G.clickSellBatch = function (state) {
    const b = G.bonuses(state);
    const lv = Math.max(0, Math.round((b.click || 0) / 0.25));
    return Math.max(2, 2 + lv);
  };

  G.clickSellPrice = function (state, berry) {
    const b = G.bonuses(state);
    return Math.max(1, Math.floor(
      G.berrySellPrice(state, berry) * (G.CLICK_SELL_PREMIUM + (b.clickSell || 0)) * (1 + b.allBonus)
    ));
  };

  // 叫卖能卖谁：手上最贵的先吆喝出去
  G.clickSellStock = function (state) {
    return Object.keys(state.berries || {}).map(Number)
      .filter((id) => state.berries[id] >= 1 && G.BERRY_BY_ID[id])
      .sort((a, c) => G.BERRY_BY_ID[c].basePrice - G.BERRY_BY_ID[a].basePrice);
  };

  // 按钮上显示"点一下能拿多少"：按现在的库存实算，不是估算
  G.clickSellValue = function (state) {
    const ids = G.clickSellStock(state);
    let left = G.clickSellBatch(state);
    let total = 0;
    for (let i = 0; i < ids.length && left > 0; i++) {
      const id = ids[i];
      const take = Math.min(Math.floor(state.berries[id]), left);
      if (take <= 0) continue;
      total += G.clickSellPrice(state, G.BERRY_BY_ID[id]) * take;
      left -= take;
    }
    return total;
  };

  // 浇水一次推进的生长比例
  G.waterAmount = function (state) {
    const b = G.bonuses(state);
    return 0.05 * (1 + b.clickWater);
  };

  // 自动出货（摊位）每秒能卖掉的生果数量
  G.stallRate = function (state) {
    const lv = G.engine ? G.engine.modLevel(state, "idleRate") : 0;
    if (!lv) return 0;
    const b = G.bonuses(state);
    return (0.6 + 0.4 * lv) * (1 + b.idleRate);
  };

  // 自动收益（每秒）：摊位出货。数值来自实际能卖的东西，UI 显示的是实测值。
  G.idleRate = function (state) {
    const rate = G.stallRate(state);
    if (!rate) return 0;
    const b = G.bonuses(state);
    const berry = G.bestAvailableBerry(state);
    if (!berry) return 0;
    return rate * berry.basePrice * (1 + b.sellBonus) * (1 + b.allBonus);
  };

  // 当前可买到种子的树果里最贵的（用于估算）
  G.bestAvailableBerry = function (state) {
    const maxR = state.maxRegion || state.region || 1;
    const list = G.BERRIES.filter((x) => x.region <= maxR);
    let best = list[0];
    list.forEach((x) => { if (x.basePrice > best.basePrice) best = x; });
    return best;
  };

  // 兼容旧调用
  G.bestBerryOfRegion = function (regionId) {
    const list = G.BERRIES.filter((x) => x.region <= regionId);
    let best = list[0];
    list.forEach((x) => { if (x.basePrice > best.basePrice) best = x; });
    return best;
  };

  G.offlineCapSeconds = function (state) {
    const b = G.bonuses(state);
    return 4 * 3600 + b.offlineCap;
  };
})();
