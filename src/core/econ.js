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
      clickWater: 0, clickSell: 0, growSpeed: 0, yieldAdd: 0, sellBonus: 0,
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
        case "click": b.clickSell += v; b.clickWater += v; break;
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

  G.berrySellPrice = function (state, berry) {
    const b = G.bonuses(state);
    return Math.max(1, Math.floor(berry.basePrice * (1 + b.sellBonus) * (1 + b.allBonus)));
  };

  // 卖给特定常客：口味匹配决定倍率
  G.flavorMult = function (productFlavor, regular) {
    if (!regular) return 1;
    if (productFlavor === "混合") return 1.25;
    if (productFlavor === regular.flavor) return 1.5;
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
      v *= G.flavorMult(recipe.flavor, regular);
      v *= G.affinityMult(regular.aff);
    }
    return Math.max(1, Math.floor(v));
  };

  // 市场直接出货：略低于交给常客，但没有门槛
  G.marketPrice = function (state, recipe, berry) {
    return Math.max(1, Math.floor(G.productSellPrice(state, recipe, berry, null) * 0.85));
  };

  // 点击"叫卖"一次的收益。
  // 早期没有自动收益，按"手上最贵的树果的 1.5 倍"折算，所以一开始就有用；
  // 中后期自动收益起来以后，改成约 1/4 秒的产量，点一下仍然划算但不会取代挂机。
  G.clickSellValue = function (state) {
    const b = G.bonuses(state);
    const berry = G.bestAvailableBerry(state);
    const early = berry ? G.berrySellPrice(state, berry) * 1.5 : 3;
    const later = (state.rateEMA || 0) * 0.25;
    const base = Math.max(3, early, later);
    return Math.floor(base * (1 + b.clickSell) * (1 + b.allBonus));
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
