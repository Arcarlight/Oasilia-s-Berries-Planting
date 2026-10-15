// 引擎：所有游戏动作与时间推进都在这里。UI 只调用这里的函数。
window.G = window.G || {};
(function () {
  const A = {};

  // ---------- 查询工具 ----------

  A.unlockedRecipes = function (state) {
    return G.RECIPES.filter((r) => state.recipes[r.id]);
  };

  A.ownedItems = function (state) {
    return (G.ITEMS || []).filter((it) => (state.items[it.id] || 0) > 0);
  };

  A.hasMod = function (state, mod) {
    return A.ownedItems(state).some((it) => {
      const lv = state.items[it.id];
      const eff = it.effects[Math.min(lv, it.effects.length) - 1];
      return eff && eff.mod && eff.mod[mod] !== undefined;
    });
  };

  A.modLevel = function (state, mod) {
    let sum = 0;
    A.ownedItems(state).forEach((it) => {
      const lv = state.items[it.id];
      const eff = it.effects[Math.min(lv, it.effects.length) - 1];
      if (eff && eff.mod && eff.mod[mod] !== undefined) sum += lv;
    });
    return sum;
  };

  // 加工台工位数
  // 加工台工位 = 2 个基础 + 工坊类道具等级总和 ÷ 2（向下取整），上限 12。
  // 规则写死在这里，UI 直接展示下面这个明细，玩家不用猜。
  A.craftSlotInfo = function (state) {
    const detail = [];
    A.ownedItems(state).forEach((it) => {
      const lv = state.items[it.id];
      const eff = it.effects[Math.min(lv, it.effects.length) - 1];
      if (eff && eff.mod && eff.mod.craftSpeed !== undefined) {
        detail.push({ name: it.name, level: lv });
      }
    });
    const total = detail.reduce((a, x) => a + x.level, 0);
    const slots = Math.min(12, 2 + Math.floor(total / 2));
    return { slots: slots, total: total, detail: detail, cap: 12 };
  };

  A.craftSlots = function (state) {
    return A.craftSlotInfo(state).slots;
  };

  // 自动加工：解锁条件是手上有工坊类道具（第一个是区域 2 的石磨）
  A.autoUnlocked = function (state) {
    return A.modLevel(state, "craftSpeed") > 0;
  };

  // 帮手槽位数（由道具提供）
  A.helperSlots = function (state) {
    const b = G.bonuses(state);
    return Math.floor(b.helperSlot || 0);
  };

  A.regionRegulars = function (regionId) {
    return (G.REGULARS || []).filter((r) => r.region === regionId);
  };

  A.regularByDex = function (dex) {
    return (G.REGULARS || []).filter((r) => r.dex === dex)[0];
  };

  A.regState = function (state, dex) {
    if (!state.regulars[dex]) {
      state.regulars[dex] = { aff: 0, exp: 0, unlocked: false, orders: 0 };
    }
    return state.regulars[dex];
  };

  A.unlockDone = function (state, reg) {
    const s = A.regState(state, reg.dex);
    if (s.unlocked) return true;
    const u = reg.unlock || { type: "harvest", value: 100 };
    const st = state.stats;
    switch (u.type) {
      case "harvest": return st.harvested >= u.value;
      case "species": return Object.keys(state.dex).length >= u.value;
      case "crafted": return st.crafted >= u.value;
      case "revenue": return st.revenueRegion >= u.value;
      case "affinity": {
        return Object.keys(state.regulars).some((d) => (state.regulars[d].aff || 0) >= u.value);
      }
      default: return false;
    }
  };

  A.regionProgress = function (state, regionId) {
    const list = A.regionRegulars(regionId);
    const done = list.filter((r) => A.regState(state, r.dex).unlocked).length;
    return { done: done, total: list.length };
  };

  // 所有已解锁常客里最高的口味需求（用于 UI 提示）
  A.checkUnlocks = function (state) {
    let changed = [];
    A.regionRegulars(state.region).forEach((reg) => {
      const s = A.regState(state, reg.dex);
      if (!s.unlocked && A.unlockDone(state, reg)) {
        s.unlocked = true;
        s.aff = Math.max(s.aff, 0);
        changed.push(reg);
        G.addLog(state, "【新常客】" + reg.name + "（" + reg.title + "）成了你的常客。", "good");
      }
    });
    if (changed.length) G.clearBonusCache();
    return changed;
  };

  // ---------- 田地 ----------

  A.plant = function (state, idx, berryId) {
    const plot = state.plots[idx];
    if (!plot || plot.berry) return false;
    if ((state.seeds[berryId] || 0) <= 0) return false;
    state.seeds[berryId]--;
    plot.berry = berryId;
    plot.grown = 0;
    plot.watered = 0;
    plot.ripe = false;
    state.dex[berryId] = true;
    return true;
  };

  A.plantAll = function (state, berryId) {
    let n = 0;
    for (let i = 0; i < state.plots.length; i++) {
      if ((state.seeds[berryId] || 0) <= 0) break;
      if (!state.plots[i].berry) { A.plant(state, i, berryId); n++; }
    }
    return n;
  };

  A.waterPlot = function (state, idx) {
    const plot = state.plots[idx];
    if (!plot || !plot.berry || plot.ripe) return 0;
    const amount = G.waterAmount(state);
    plot.grown = Math.min(1, plot.grown + amount);
    plot.watered++;
    state.stats.clicks++;
    if (plot.grown >= 1) plot.ripe = true;
    return amount;
  };

  A.waterAll = function (state) {
    let n = 0;
    for (let i = 0; i < state.plots.length; i++) {
      if (state.plots[i].berry && !state.plots[i].ripe) { A.waterPlot(state, i); n++; }
    }
    if (n) state.stats.clicks++;
    return n;
  };

  A.harvestPlot = function (state, idx) {
    const plot = state.plots[idx];
    if (!plot || !plot.berry || !plot.ripe) return 0;
    const berry = G.BERRY_BY_ID[plot.berry];
    const b = G.bonuses(state);
    const amount = berry.yield + Math.floor(b.yieldAdd || 0);
    state.berries[berry.id] = (state.berries[berry.id] || 0) + amount;
    state.stats.harvested += amount;
    // 回种：有一定概率收回一颗种子
    const seedChance = 0.3;
    if (Math.random() < seedChance) state.seeds[berry.id] = (state.seeds[berry.id] || 0) + 1;
    plot.berry = null; plot.grown = 0; plot.watered = 0; plot.ripe = false;
    state.stats.lastHarvest = { berry: berry.id, amount: amount, at: G.now(state) };
    A.checkUnlocks(state);
    return amount;
  };

  A.harvestAll = function (state) {
    let total = 0;
    for (let i = 0; i < state.plots.length; i++) {
      if (state.plots[i].ripe) total += A.harvestPlot(state, i);
    }
    return total;
  };

  // ---------- 商店 ----------

  A.buySeed = function (state, berryId, count) {
    count = count || 1;
    const berry = G.BERRY_BY_ID[berryId];
    const price = G.seedPrice(state, berry) * count;
    if (state.money < price) return false;
    state.money -= price;
    state.seeds[berryId] = (state.seeds[berryId] || 0) + count;
    state.dex[berryId] = true;
    return true;
  };

  A.buyRecipe = function (state, recipeId) {
    const r = G.RECIPE_BY_ID[recipeId];
    if (!r || state.recipes[recipeId]) return false;
    // 研发专属配方不在商店出售，只能靠研发拿到（它们 cost 是 0，不拦住就能白嫖）
    if (r.research) return false;
    if ((r.region || 1) > state.maxRegion) return false;
    if (state.money < r.cost) return false;
    state.money -= r.cost;
    state.recipes[recipeId] = true;
    G.addLog(state, "学会了配方：" + r.name + "。", "good");
    return true;
  };

  A.buyMaterial = function (state, matId, count) {
    count = count || 1;
    const m = (G.MATERIALS || []).filter((x) => x.id === matId)[0];
    if (!m) return false;
    const price = Math.round(m.price * 2.6) * count; // 杂货铺代购价：贵
    if (state.money < price) return false;
    state.money -= price;
    state.materials[matId] = (state.materials[matId] || 0) + count;
    return true;
  };

  A.materialCount = function (state, id) { return state.materials[id] || 0; };

  A.canCraft = function (state, item) {
    return Object.keys(item.materials || {}).every(
      (mid) => A.materialCount(state, mid) >= item.materials[mid]);
  };

  // 交货给阿特拉斯制作
  A.orderCraft = function (state, itemId) {
    const item = (G.ITEMS || []).filter((x) => x.id === itemId)[0];
    if (!item) return { ok: false, why: "没有这件道具" };
    const lv = state.items[itemId] || 0;
    if (lv >= item.effects.length) return { ok: false, why: "已经做到最高级了" };
    if (state.atlas.craft) return { ok: false, why: "阿特拉斯手里还有一件没做完" };
    if (!A.canCraft(state, item)) return { ok: false, why: "材料不够" };
    Object.keys(item.materials).forEach((mid) => {
      state.materials[mid] -= item.materials[mid];
    });
    const speed = 1 + G.bonuses(state).craftSpeed;
    const secs = Math.max(4, item.craftTime / speed);
    state.atlas.craft = { itemId: itemId, until: G.now(state) + secs * 1000, level: lv + 1,
      secs: secs, startedAt: G.now(state) };
    G.addLog(state, "阿特拉斯开始做「" + item.name + "」了（" + G.time(secs) + "）。", "atlas");
    return { ok: true, secs: secs };
  };

  A.collectCraft = function (state) {
    const c = state.atlas.craft;
    if (!c || G.now(state) < c.until) return null;
    state.items[c.itemId] = (state.items[c.itemId] || 0) + 1;
    state.atlas.craft = null;
    G.clearBonusCache();
    const item = (G.ITEMS || []).filter((x) => x.id === c.itemId)[0];
    G.addLog(state, "阿特拉斯把「" + (item ? item.name : c.itemId) + "」拍在你面前：做好了。", "atlas");
    return c;
  };

  // 阿特拉斯出门采购
  A.startTrip = function (state, wants) {
    if (state.atlas.trip) return { ok: false, why: "他已经出门了" };
    const mats = wants || {};
    let value = 0;
    Object.keys(mats).forEach((mid) => {
      const m = (G.MATERIALS || []).filter((x) => x.id === mid)[0];
      if (m) value += m.price * mats[mid];
    });
    const secs = Math.max(45, Math.min(900, value / 120));
    state.atlas.trip = { want: mats, until: G.now(state) + secs * 1000, startedAt: G.now(state) };
    state.stats.trips++;
    G.addLog(state, "阿特拉斯出门了，走之前把清单咬在嘴里：" +
      Object.keys(mats).map((mid) => {
        const m = (G.MATERIALS || []).filter((x) => x.id === mid)[0];
        return (m ? m.name : mid) + "×" + mats[mid];
      }).join("、") + "。", "atlas");
    return { ok: true, secs: secs };
  };

  A.finishTrip = function (state) {
    const trip = state.atlas.trip;
    if (!trip || G.now(state) < trip.until) return null;
    state.atlas.trip = null;
    const got = {};
    Object.keys(trip.want || {}).forEach((mid) => {
      got[mid] = trip.want[mid];
      state.materials[mid] = (state.materials[mid] || 0) + trip.want[mid];
    });
    // 带回来的素材：基础食材每次出门大概率有，特产素材要看运气。
    // 这两条是独立判定的，所以偶尔会两样都带回来。
    const finds = [];
    (function rollFinds() {
      const pool = (G.FINDS || []).filter((f) => f.region <= state.maxRegion);
      if (!pool.length) return;
      const drop = G.FIND_DROP || { stapleChance: 0.55, rareChance: 0.22 };
      [["staple", drop.stapleChance], ["rare", drop.rareChance]].forEach(([tier, chance]) => {
        const cand = pool.filter((f) => (f.tier || "staple") === tier);
        if (!cand.length || Math.random() > chance) return;
        // 越靠后的区域越倾向掉新的（按 id 顺序排在后面的）素材
        const f = cand[Math.floor(Math.random() * cand.length)];
        const n = tier === "staple" ? 1 + Math.floor(Math.random() * 3) : 1;
        state.finds[f.id] = (state.finds[f.id] || 0) + n;
        finds.push({ id: f.id, name: f.name, count: n });
        G.addLog(state, "他带回来：" + f.name + "×" + n + "（" + f.use + "）", "atlas");
      });
    })();

    // 随机事件
    const events = G.ATLAS_EVENTS || [];
    let ev = null;
    if (events.length) {
      const total = events.reduce((a, e) => a + (e.weight || 10), 0);
      let roll = Math.random() * total;
      for (let i = 0; i < events.length; i++) {
        roll -= events[i].weight || 10;
        if (roll <= 0) { ev = events[i]; break; }
      }
    }
    let extra = null;
    if (ev) {
      G.addLog(state, ev.text, "atlas");
      const eff = ev.effect || {};
      if (eff.material) {
        state.materials[eff.material] = (state.materials[eff.material] || 0) + (eff.count || 1);
        const m = (G.MATERIALS || []).filter((x) => x.id === eff.material)[0];
        extra = { material: eff.material, count: eff.count || 1 };
        G.addLog(state, "多带回来：" + (m ? m.name : eff.material) + "×" + (eff.count || 1), "atlas");
      }
      if (eff.seed) {
        const pool = G.BERRIES.filter((b) => b.region <= state.maxRegion && b.tier >= 2);
        const b = pool[Math.floor(Math.random() * pool.length)];
        if (b) {
          const n = eff.count || 1;
          state.seeds[b.id] = (state.seeds[b.id] || 0) + n;
          state.dex[b.id] = true;
          extra = extra || {};
          extra.seed = { id: b.id, count: n };
          G.addLog(state, "他在包袱底摸出一把种子：" + b.zh + "×" + n + "。", "good");
        }
      }
      state.atlas.seen[ev.id] = (state.atlas.seen[ev.id] || 0) + 1;
    }
    return { got: got, event: ev, extra: extra, finds: finds };
  };

  // ---------- 加工 ----------

  A.eligibleBerries = function (state, recipe) {
    if (recipe.needBerry) return (state.berries[recipe.needBerry] || 0) >= recipe.needCount
      ? [G.BERRY_BY_ID[recipe.needBerry]] : [];
    return G.BERRIES.filter((b) => (state.berries[b.id] || 0) >= recipe.needCount &&
      b.flavor === recipe.needFlavor && b.tier >= (recipe.minTier || 1) &&
      b.region <= state.maxRegion);
  };

  // 这个配方理论上能用哪些树果（不管库存），用于"该种什么"的提示
  A.berryHint = function (state, recipe) {
    if (recipe.needBerry) {
      const b = G.BERRY_BY_ID[recipe.needBerry];
      return b ? [b] : [];
    }
    return G.BERRIES.filter((b) => b.flavor === recipe.needFlavor &&
      b.tier >= (recipe.minTier || 1) && b.region <= state.maxRegion);
  };

  // 库存取整：旧存档里可能出现 4.6591 这种小数，统一抹平
  A.sanitize = function (state) {
    ["berries", "seeds", "products", "materials"].forEach((bag) => {
      Object.keys(state[bag] || {}).forEach((k) => {
        const v = Math.floor(state[bag][k]);
        if (!(v > 0)) delete state[bag][k];
        else state[bag][k] = v;
      });
    });
    state.stallCarry = Math.max(0, state.stallCarry || 0);
  };

  A.craft = function (state, recipeId, berryId) {
    const recipe = G.RECIPE_BY_ID[recipeId];
    const berry = G.BERRY_BY_ID[berryId];
    if (!recipe || !berry) return { ok: false, why: "配方或树果不存在" };
    if (!state.recipes[recipeId]) return { ok: false, why: "还没学会这个配方" };
    if (recipe.needBerry && recipe.needBerry !== berryId) return { ok: false, why: "这个配方要的是别的树果" };
    if (recipe.needFlavor && berry.flavor !== recipe.needFlavor) return { ok: false, why: "口味不对" };
    if ((state.berries[berryId] || 0) < recipe.needCount) return { ok: false, why: "树果不够" };
    if (recipe.fromFind && (state.finds[recipe.fromFind] || 0) < (recipe.findCount || 1)) {
      const f = G.FIND_BY_ID[recipe.fromFind];
      return { ok: false, why: "缺素材：" + (f ? f.name : recipe.fromFind) };
    }
    if (state.craftQueue.length >= A.craftSlots(state)) return { ok: false, why: "加工台满了" };
    if (recipe.fromFind) {
      state.finds[recipe.fromFind] -= (recipe.findCount || 1);
      if (state.finds[recipe.fromFind] <= 0) delete state.finds[recipe.fromFind];
    }
    state.berries[berryId] -= recipe.needCount;
    if (state.berries[berryId] <= 0) delete state.berries[berryId];
    const b = G.bonuses(state);
    const secs = Math.max(1, recipe.time / (1 + b.craftSpeed));
    const key = G.productKey(recipeId, berryId);
    state.craftQueue.push({
      recipeId: recipeId, berryId: berryId, key: key,
      until: G.now(state) + secs * 1000, secs: secs, value: G.productValue(recipe, berry)
    });
    state.stats.crafted++;
    A.checkUnlocks(state);
    return { ok: true, secs: secs };
  };

  function stepCraftQueue(state) {
    if (!state.craftQueue.length) return;
    const now = G.now(state);
    const b = G.bonuses(state);
    const extraChance = b.craftOutput || 0;
    for (let i = state.craftQueue.length - 1; i >= 0; i--) {
      const j = state.craftQueue[i];
      if (now < j.until) continue;
      let n = 1;
      if (extraChance > 0 && Math.random() < Math.min(0.75, extraChance)) n++;
      state.products[j.key] = (state.products[j.key] || 0) + n;
      state.craftQueue.splice(i, 1);
      state.stats.lastCraft = { key: j.key, n: n, at: now };
    }
  }

  // 自动加工：优先做玩家指定的那个配方；指定的原料不够时，自动换一个"现在能做、而且最值钱"的。
  // 不这么做的话，玩家选了招牌配方而原料断了，工位就会一直空转。
  function autoCraftCandidate(state, recipeId) {
    const recipe = G.RECIPE_BY_ID[recipeId];
    if (!recipe || !state.recipes[recipeId]) return null;
    const elig = A.eligibleBerries(state, recipe);
    if (!elig.length) return null;
    elig.sort((a, b) => b.basePrice - a.basePrice);
    return { recipe: recipe, berry: elig[0] };
  }

  function stepAutoCraft(state) {
    if (!G.engine.autoUnlocked(state)) return;
    const slots = A.craftSlots(state);
    if (state.craftQueue.length >= slots) return;
    const pickOrder = [];
    if (state.autoRecipe) pickOrder.push(state.autoRecipe);
    // 备选：其余已解锁配方，按倍率从高到低
    A.unlockedRecipes(state)
      .slice()
      .sort((a, b) => b.mult - a.mult)
      .forEach((r) => { if (r.id !== state.autoRecipe) pickOrder.push(r.id); });
    // 没有指定配方时，说明玩家没开自动加工，不要擅自替他做
    if (!state.autoRecipe) return;
    let guard = 0;
    while (state.craftQueue.length < slots && guard++ < 40) {
      let chosen = null;
      for (let i = 0; i < pickOrder.length; i++) {
        const c = autoCraftCandidate(state, pickOrder[i]);
        if (c) { chosen = c; break; }
      }
      if (!chosen) break;
      if (!A.craft(state, chosen.recipe.id, chosen.berry.id).ok) break;
    }
  }

  // ---------- 自动交付（把商品交给对味的常客，顺便交订单） ----------

  // 解锁条件：手上有会加售价的商铺道具（第一个是区域 2 的「木质招牌」）
  A.autoTradeUnlocked = function (state) {
    return A.modLevel(state, "sellBonus") > 0;
  };

  function stepAutoTrade(state, dt) {
    if (!state.autoTrade) return;
    if (!A.autoTradeUnlocked(state)) return;
    state.autoTradeCd = (state.autoTradeCd || 0) + dt;
    if (state.autoTradeCd < 2) return;
    state.autoTradeCd = 0;
    const friends = A.regionRegulars(state.region)
      .filter((r) => A.regState(state, r.dex).unlocked);
    // 先把能交的订单交掉
    Object.keys(state.orders).forEach((dex) => { A.deliverOrder(state, +dex); });
    // 再把商品一件一件交给喜欢这个口味的常客（没常客收就按市场价出）
    Object.keys(state.products).forEach((k) => {
      const parts = k.split("|");
      const recipe = G.RECIPE_BY_ID[parts[0]];
      if (!recipe) return;
      const stock = Math.floor(state.products[k] || 0);
      if (stock <= 0) return;
      const same = friends.filter((r) => r.flavor === recipe.flavor);
      const target = (same.length ? same : friends.filter((r) => recipe.flavor === "混合"))
        .sort((a, b) => A.regState(state, b.dex).aff - A.regState(state, a.dex).aff)[0];
      A.sellProduct(state, k, Math.min(stock, 5), target ? target.dex : null);
    });
  }

  // ---------- 素材与研发 ----------

  // 卖素材：它是仓库里唯一一样"卖了就没了"的东西
  A.sellFind = function (state, id, n) {
    const f = G.FIND_BY_ID[id];
    const have = Math.floor(state.finds[id] || 0);
    if (!f || !have) return { ok: false, why: "没有这个素材" };
    const cnt = Math.max(1, Math.min(Math.floor(n || 1), have));
    state.finds[id] = have - cnt;
    if (state.finds[id] <= 0) delete state.finds[id];
    const earned = f.price * cnt;
    state.money += earned;
    state.stats.sold += cnt;
    state.stats.revenueTotal += earned;
    state.stats.revenueRegion += earned;
    G.addLog(state, "把 " + cnt + " 份" + f.name + "卖了，拿到 ₽" + G.fmt(earned) + "。", "sell");
    A.checkUnlocks(state);
    return { ok: true, earned: earned, count: cnt };
  };

  // 丢素材：不换钱，纯粹腾地方
  A.dropFind = function (state, id, n) {
    const f = G.FIND_BY_ID[id];
    const have = Math.floor(state.finds[id] || 0);
    if (!f || !have) return { ok: false, why: "没有这个素材" };
    const cnt = Math.max(1, Math.min(Math.floor(n || 1), have));
    state.finds[id] = have - cnt;
    if (state.finds[id] <= 0) delete state.finds[id];
    G.addLog(state, "扔掉了 " + cnt + " 份" + f.name + "。", "atlas");
    return { ok: true, count: cnt };
  };

  // 失败品：能卖，但基本不值钱
  A.sellWaste = function (state, n) {
    const have = Math.floor(state.waste || 0);
    if (!have) return { ok: false, why: "没有失败品" };
    const cnt = Math.max(1, Math.min(Math.floor(n || 1), have));
    state.waste = have - cnt;
    const earned = G.WASTE.price * cnt;
    state.money += earned;
    state.stats.revenueTotal += earned;
    state.stats.revenueRegion += earned;
    G.addLog(state, "把 " + cnt + " 份失败品卖了，拿到 ₽" + G.fmt(earned) + "。", "sell");
    return { ok: true, earned: earned };
  };

  A.dropWaste = function (state, n) {
    const have = Math.floor(state.waste || 0);
    if (!have) return { ok: false, why: "没有失败品" };
    const cnt = Math.max(1, Math.min(Math.floor(n || 1), have));
    state.waste = have - cnt;
    G.addLog(state, "倒掉了 " + cnt + " 份失败品。", "atlas");
    return { ok: true };
  };

  // ---------- 大锅（研发） ----------
  // 往锅里丢树果 + 素材，搅拌，出来就是成品。锅越大能丢越多，成品越值钱。
  A.potSlots = function (state) { return G.potLevel(state.pot && state.pot.level).slots; };
  A.potStirSecs = function (state) { return G.potLevel(state.pot && state.pot.level).stir; };
  A.potLevelInfo = function (state) {
    const lv = (state.pot && state.pot.level) || 1;
    return { now: G.potLevel(lv), next: lv < G.POT_LEVELS.length ? G.potLevel(lv + 1) : null, level: lv };
  };

  function potBag(state, kind) {
    return kind === "berry" ? state.berries : state.finds;
  }

  A.potAdd = function (state, kind, id) {
    const pot = state.pot;
    if (!pot) return { ok: false, why: "锅不见了" };
    if (pot.stir) return { ok: false, why: "正在搅拌，等它转完" };
    if (pot.inPot.length >= A.potSlots(state)) return { ok: false, why: "锅满了" };
    const bag = potBag(state, kind);
    const have = Math.floor(bag[id] || 0);
    const used = pot.inPot.filter((x) => x.kind === kind && String(x.id) === String(id)).length;
    if (have - used <= 0) return { ok: false, why: "手上没有这样东西了" };
    pot.inPot.push({ kind: kind, id: kind === "berry" ? +id : id });
    return { ok: true };
  };

  A.potRemove = function (state, index) {
    const pot = state.pot;
    if (!pot || pot.stir) return { ok: false, why: "正在搅拌" };
    if (index < 0 || index >= pot.inPot.length) return { ok: false, why: "这里没有东西" };
    pot.inPot.splice(index, 1);
    return { ok: true };
  };

  A.potClear = function (state) {
    if (!state.pot || state.pot.stir) return { ok: false, why: "正在搅拌" };
    state.pot.inPot = [];
    return { ok: true };
  };

  // 锅里现在这样丢，会煮出什么？
  A.potCheck = function (state) {
    const pot = state.pot;
    if (!pot) return { kind: "invalid", why: "锅不见了" };
    if (pot.stir) return { kind: "stirring", why: "正在搅拌…" };
    const items = pot.inPot || [];
    if (!items.length) return { kind: "invalid", why: "锅里还什么都没有。" };

    const berries = items.filter((x) => x.kind === "berry");
    const finds = items.filter((x) => x.kind === "find");
    if (!berries.length) return { kind: "invalid", why: "得放一颗树果，不然煮出来没味道。" };
    if (!finds.length) return { kind: "invalid", why: "光放树果煮不出花样，再丢点素材。" };

    // 口味取锅里占多数的那种树果（一样多就按先放的）
    const tally = {};
    berries.forEach((b) => {
      const f = G.BERRY_BY_ID[b.id].flavor;
      tally[f] = (tally[f] || 0) + 1;
    });
    let flavor = null, best = -1;
    berries.forEach((b) => {
      const f = G.BERRY_BY_ID[b.id].flavor;
      if (tally[f] > best) { best = tally[f]; flavor = f; }
    });

    const n = items.length;
    const ev = G.evaluateResearch(state, finds.map((x) => x.id), flavor, n);
    const out = Object.assign({}, ev);
    out.flavor = flavor;
    out.n = n;
    out.berryId = berries[0].id;
    out.items = items.slice();
    out.cost = ev.kind === "invalid" ? 0 : G.researchCost(ev.combo ? ev.combo.cat : (ev.cat && ev.cat.id) || "cake", flavor, n, !!ev.spice);
    return out;
  };

  // 搅拌：先扣料扣钱，转完再出货
  A.potStir = function (state) {
    const chk = A.potCheck(state);
    if (chk.kind === "invalid" || chk.kind === "stirring") return { ok: false, why: chk.why };
    if (chk.kind === "known") return { ok: false, why: "这个搭配已经会做了，换个料试试。" };
    if (state.money < chk.cost) return { ok: false, why: "研发费 ₽" + G.fmt(chk.cost) + "，钱不够" };

    // 扣料
    chk.items.forEach((x) => {
      const bag = potBag(state, x.kind);
      bag[x.id] -= 1;
      if (bag[x.id] <= 0) delete bag[x.id];
    });
    state.money -= chk.cost;
    const secs = A.potStirSecs(state);
    state.pot.stir = { until: G.now(state) + secs * 1000, secs: secs, chk: chk, flavor: chk.flavor };
    state.pot.inPot = [];
    state.stats.researched = (state.stats.researched || 0) + 1;
    return { ok: true, secs: secs, preview: chk };
  };

  // 搅拌结束：出货
  A.stepPot = function (state) {
    const pot = state.pot;
    if (!pot || !pot.stir) return null;
    if (G.now(state) < pot.stir.until) return null;
    const chk = pot.stir.chk;
    pot.stir = null;

    if (chk.kind === "waste") {
      state.waste = (state.waste || 0) + 1;
      G.addLog(state, "研发失败：" + chk.why + "（得到 1 份失败品）", "order");
      pot.pending = { ok: false, name: G.WASTE.name, reason: chk.why, t: Date.now() };
      pot.last = pot.pending;
      return pot.pending;
    }

    const recipe = G.makeResearchRecipe(chk.combo.cat, chk.flavor, chk.spice ? chk.spice.id : null, chk.good, chk.n);
    if (!recipe) return null;
    const first = !state.recipes[recipe.id];
    const key = G.productKey(recipe.id, chk.berryId);
    // 料越足，一锅出的成品越多：2-4 样 1 份，5-7 样 2 份，8 样以上 3 份
    const count = chk.n >= 8 ? 3 : chk.n >= 5 ? 2 : 1;
    state.products[key] = (state.products[key] || 0) + count;
    G.addLog(state, "锅里出了「" + recipe.name + "」×" + count + "。", "good");
    // 做成的东西直接进仓库；要不要顺手把做法记下来，交给玩家决定
    pot.pending = {
      ok: true, name: recipe.name, count: count, key: key, first: first,
      recipeId: first ? recipe.id : null, t: Date.now()
    };
    pot.last = pot.pending;
    A.checkUnlocks(state);
    return pot.pending;
  };

  // 出锅的结果面板：记下做法就能在加工台批量做，不记也行（东西已经在仓库里了）
  A.potKeepRecipe = function (state) {
    const pd = state.pot && state.pot.pending;
    if (!pd || !pd.recipeId) return { ok: false, why: "没有要记的配方" };
    state.recipes[pd.recipeId] = true;
    const r = G.RECIPE_BY_ID[pd.recipeId];
    G.addLog(state, "把「" + (r ? r.name : pd.name) + "」的做法记进了配方本。", "good");
    state.pot.pending = null;
    A.checkUnlocks(state);
    return { ok: true, recipe: r };
  };

  A.potDismiss = function (state) {
    if (!state.pot || !state.pot.pending) return { ok: false, why: "没有要收起来的东西" };
    state.pot.pending = null;
    return { ok: true };
  };

  // 配方本里可以删掉研发出来的配方（商店买的那些删了没意义，不给删）
  A.forgetRecipe = function (state, recipeId) {
    const r = G.RECIPE_BY_ID[recipeId];
    if (!r || !r.research) return { ok: false, why: "这个配方删不了" };
    if (!state.recipes[recipeId]) return { ok: false, why: "本来就没学过" };
    delete state.recipes[recipeId];
    // 自动加工盯着它的话，顺手关掉，免得一直卡着找不到配方
    if (state.autoRecipe === recipeId) state.autoRecipe = null;
    // 锅里/队列里正在做的也清掉
    state.craftQueue = (state.craftQueue || []).filter((j) => j.recipeId !== recipeId);
    G.addLog(state, "把「" + r.name + "」的做法从配方本里划掉了。", "atlas");
    return { ok: true };
  };

  A.potUpgrade = function (state) {
    const info = A.potLevelInfo(state);
    if (!info.next) return { ok: false, why: "这已经是最大的锅了。" };
    if (state.money < info.next.cost) {
      return { ok: false, why: "换锅要 ₽" + G.fmt(info.next.cost) + "，钱不够" };
    }
    state.money -= info.next.cost;
    state.pot.level = info.next.level;
    state.pot.inPot = [];
    G.addLog(state, "把锅换成了「" + info.next.name + "」：" + info.next.slots +
      " 格，搅拌 " + info.next.stir + "s。", "good");
    return { ok: true, level: info.next };
  };

  // 材料也能卖（回收价六成）或丢掉
  A.sellMaterial = function (state, id, n) {
    const m = G.MATERIAL_BY_ID[id];
    const have = Math.floor(state.materials[id] || 0);
    if (!m || !have) return { ok: false, why: "没有这个材料" };
    const cnt = Math.max(1, Math.min(Math.floor(n || 1), have));
    state.materials[id] = have - cnt;
    if (state.materials[id] <= 0) delete state.materials[id];
    const earned = A.materialSellPrice(state, m) * cnt;
    state.money += earned;
    state.stats.sold += cnt;
    state.stats.revenueTotal += earned;
    state.stats.revenueRegion += earned;
    G.addLog(state, "把 " + cnt + " 份" + m.name + "卖了，拿到 ₽" + G.fmt(earned) + "。", "sell");
    A.checkUnlocks(state);
    return { ok: true, earned: earned };
  };

  A.dropMaterial = function (state, id, n) {
    const m = G.MATERIAL_BY_ID[id];
    const have = Math.floor(state.materials[id] || 0);
    if (!m || !have) return { ok: false, why: "没有这个材料" };
    const cnt = Math.max(1, Math.min(Math.floor(n || 1), have));
    state.materials[id] = have - cnt;
    if (state.materials[id] <= 0) delete state.materials[id];
    G.addLog(state, "扔掉了 " + cnt + " 份" + m.name + "。", "atlas");
    return { ok: true };
  };

  // 仓库用：各类东西的回收价
  A.materialSellPrice = function (state, m) { return Math.round(m.price * 0.6); };

  // ---------- 出售 ----------

  function gain(state, money) {
    state.money += money;
    state.stats.revenueRegion += money;
    state.stats.revenueTotal += money;
  }

  A.sellBerry = function (state, berryId, count) {
    const have = Math.floor(state.berries[berryId] || 0);
    count = Math.floor(Math.min(count || 1, have));
    if (count <= 0) return 0;
    const berry = G.BERRY_BY_ID[berryId];
    const price = G.berrySellPrice(state, berry) * count;
    state.berries[berryId] -= count;
    if (state.berries[berryId] <= 0) delete state.berries[berryId];
    state.stats.sold += count;
    gain(state, price);
    A.checkUnlocks(state);
    return price;
  };

  A.sellAllBerries = function (state) {
    let total = 0;
    Object.keys(state.berries).forEach((id) => { total += A.sellBerry(state, +id, state.berries[id]); });
    return total;
  };

  A.sellProduct = function (state, key, count, regularDex) {
    const have = state.products[key] || 0;
    count = Math.min(count || 1, have);
    if (count <= 0) return 0;
    const parts = key.split("|");
    const recipe = G.RECIPE_BY_ID[parts[0]];
    const berry = G.BERRY_BY_ID[+parts[1]];
    if (!recipe || !berry) return 0;
    const rInfo = regularDex ? A.regularByDex(regularDex) : null;
    const reg = rInfo ? { aff: A.regState(state, regularDex).aff, flavor: rInfo.flavor, dislike: rInfo.dislike } : null;
    const price = G.productSellPrice(state, recipe, berry, reg) * count;
    state.products[key] -= count;
    if (state.products[key] <= 0) delete state.products[key];
    state.stats.sold += count;
    gain(state, price);
    if (regularDex) A.giveAffinity(state, regularDex, recipe.flavor, count);
    A.checkUnlocks(state);
    return price;
  };

  A.sellAllProducts = function (state) {
    let total = 0;
    Object.keys(state.products).forEach((k) => { total += A.sellProduct(state, k, state.products[k]); });
    return total;
  };

  // ---------- 常客 ----------

  A.giveAffinity = function (state, dex, flavor, times) {
    const reg = A.regularByDex(dex);
    if (!reg) return;
    const s = A.regState(state, dex);
    const b = G.bonuses(state);
    let exp = (times || 1) * (1 + b.affinity);
    if (flavor === reg.flavor) exp *= 1.5;
    if (flavor === reg.dislike) exp *= 0.35;
    s.exp += exp;
    const need = (lvl) => 6 + lvl * 8;
    while (s.aff < 5 && s.exp >= need(s.aff)) {
      s.exp -= need(s.aff);
      s.aff++;
      G.addLog(state, reg.name + "的好感提升到 " + s.aff + " 级。", "good");
      G.clearBonusCache();
    }
  };

  // 生成订单
  A.trySpawnOrders = function (state) {
    const now = G.now(state);
    A.regionRegulars(state.region).forEach((reg) => {
      const s = A.regState(state, reg.dex);
      if (!s.unlocked) return;
      const cur = state.orders[reg.dex];
      if (cur && cur.expires > now) return;
      if (cur) delete state.orders[reg.dex];
      // 每位常客独立冷却
      const last = s.lastOrderAt || 0;
      if (now - last < 70000) return;
      if (Math.random() > 0.02) return; // 每 tick 很小概率
      s.lastOrderAt = now;
      const count = 2 + Math.floor(Math.random() * 4) + Math.floor(s.aff / 2);
      const berry = G.bestBerryOfRegion(state.region);
      const flavor = Math.random() < 0.7 ? reg.flavor : G.FLAVORS[Math.floor(Math.random() * G.FLAVORS.length)];
      const recipes = A.unlockedRecipes(state).filter((r) => r.flavor === flavor);
      let unit = berry.basePrice * 3;
      if (recipes.length) {
        const r = recipes[recipes.length - 1];
        unit = G.productValue(r, berry);
      }
      const reward = Math.floor(unit * count * 2.4 * (1 + s.aff * 0.15));
      state.orders[reg.dex] = {
        flavor: flavor, count: count, reward: reward, expires: now + 10 * 60 * 1000
      };
      G.addLog(state, "【订单】" + reg.name + "想要 " + count + " 份" + flavor + "味的东西，赏金 ₽" + G.fmt(reward) + "。", "order");
    });
  };

  A.deliverOrder = function (state, dex) {
    const order = state.orders[dex];
    if (!order) return false;
    // 收集符合口味的商品
    let need = order.count;
    const keys = Object.keys(state.products).filter((k) => {
      const parts = k.split("|");
      const r = G.RECIPE_BY_ID[parts[0]];
      if (!r) return false;
      return r.flavor === order.flavor || r.flavor === "混合";
    });
    let available = 0;
    keys.forEach((k) => { available += state.products[k] || 0; });
    if (available < need) return false;
    for (let i = 0; i < keys.length && need > 0; i++) {
      const k = keys[i];
      const take = Math.min(need, state.products[k]);
      state.products[k] -= take;
      if (state.products[k] <= 0) delete state.products[k];
      need -= take;
    }
    delete state.orders[dex];
    gain(state, order.reward);
    const s = A.regState(state, dex);
    s.orders++;
    state.stats.orders++;
    A.giveAffinity(state, dex, order.flavor, order.count * 2);
    const reg = A.regularByDex(dex);
    G.addLog(state, "把 " + order.count + " 份" + order.flavor + "味的东西交给" + (reg ? reg.name : "常客") +
      "，拿到 ₽" + G.fmt(order.reward) + "。", "good");
    A.checkUnlocks(state);
    return true;
  };

  // ---------- 帮手 ----------

  A.buyHelper = function (state, dex) {
    const slots = A.helperSlots(state);
    if (state.helpers.length >= slots) return false;
    if (state.helpers.some((h) => h.dex === dex)) return false;
    const reg = A.regularByDex(dex);
    if (!reg || !A.regState(state, dex).unlocked) return false;
    const cost = A.helperCost(state);
    if (state.money < cost) return false;
    state.money -= cost;
    state.helpers.push({ dex: dex, cd: 0 });
    G.addLog(state, reg.name + "答应来帮忙看田了。", "good");
    return true;
  };

  // 请一位帮手的价钱（UI 和实际收费都走这里，避免两处公式漂移）
  A.helperCost = function (state) {
    return Math.round(1200 * Math.pow(2.6, state.region - 1) * (1 + state.helpers.length));
  };

  A.fireHelper = function (state, dex) {
    const i = state.helpers.findIndex((h) => h.dex === dex);
    if (i < 0) return false;
    state.helpers.splice(i, 1);
    return true;
  };

  // ---------- 天赋 ----------

  A.buyTalent = function (state, id) {
    const t = G.TALENT_BY_ID[id];
    if (!t) return false;
    const lv = state.talents[id] || 0;
    if (lv >= t.max) return false;
    const cost = G.talentCost(t, lv);
    if (state.talentPoints < cost) return false;
    state.talentPoints -= cost;
    state.talentSpent += cost;
    state.talents[id] = lv + 1;
    G.clearBonusCache();
    return true;
  };

  // ---------- 移民（转世） ----------

  A.canMigrate = function (state) {
    const region = G.regionOf(state);
    const nextRegion = G.REGION_BY_ID[state.region + 1];
    const prog = A.regionProgress(state, state.region);
    const b = G.bonuses(state);
    // 移民费 = 目的地的安家费
    const base = nextRegion ? nextRegion.moveCost : region.moveCost;
    const cost = Math.round(base * (1 - Math.min(0.7, b.moveDiscount)));
    const allDone = prog.total > 0 && prog.done >= prog.total;
    return {
      ok: allDone && state.money >= cost && !!nextRegion,
      allDone: allDone, progress: prog, cost: cost,
      moneyOk: state.money >= cost, hasNext: !!nextRegion,
      next: nextRegion || null
    };
  };

  // ---------- 买地 ----------

  A.plotCap = function (state) {
    // 每个区域最多能买到与基础田地等量的额外田地
    return G.regionOf(state).plots;
  };

  A.plotPrice = function (state) {
    const n = state.extraPlots || 0;
    const region = G.regionOf(state);
    return Math.round(70 * Math.pow(2.7, n) * Math.pow(2.6, region.id - 1));
  };

  A.buyPlot = function (state) {
    if ((state.extraPlots || 0) >= A.plotCap(state)) return false;
    const price = A.plotPrice(state);
    if (state.money < price) return false;
    state.money -= price;
    state.extraPlots = (state.extraPlots || 0) + 1;
    G.syncPlots(state);
    return true;
  };

  A.migrate = function (state) {
    const chk = A.canMigrate(state);
    if (!chk.ok) return null;
    const b = G.bonuses(state);
    const tp = G.talentPointsFor(state.stats.revenueRegion);
    // 走之前把没卖完的货清掉，折成现钱一起带走。
    // 否则搬到后面的区域时身上是 0 元、只有三颗最便宜的种子，根本爬不起来。
    let liquidated = 0;
    Object.keys(state.berries).forEach((id) => {
      const berry = G.BERRY_BY_ID[id];
      if (berry) liquidated += G.berrySellPrice(state, berry) * state.berries[id];
    });
    Object.keys(state.products).forEach((k) => {
      const parts = k.split("|");
      const recipe = G.RECIPE_BY_ID[parts[0]];
      const berry = G.BERRY_BY_ID[+parts[1]];
      if (recipe && berry) liquidated += G.marketPrice(state, recipe, berry) * state.products[k];
    });
    Object.keys(state.materials).forEach((mid) => {
      const m = (G.MATERIALS || []).filter((x) => x.id === mid)[0];
      if (m) liquidated += Math.floor(m.price * 0.6) * state.materials[mid];
    });
    liquidated = Math.floor(liquidated);
    const keep = Math.floor(state.money * b.keepMoney) + liquidated;
    state.talentPoints += tp;
    state.stats.prestige++;
    const from = G.regionOf(state).name;

    state.money = keep;
    state.region++;
    state.maxRegion = Math.max(state.maxRegion, state.region);
    state.extraPlots = 0;
    state.seeds = {};
    state.berries = {};
    state.products = {};
    state.materials = {};
    state.craftQueue = [];
    state.orders = {};
    state.atlas.craft = null;
    state.stats.revenueRegion = 0;
    state.regionEnteredAt = G.now(state);
    // 顺序要紧：先把田清空，syncPlots 才能把多出来的地裁掉
    state.plots.forEach((p) => { p.berry = null; p.grown = 0; p.watered = 0; p.ripe = false; });
    G.syncPlots(state);
    // 新区域的起步种子：给 5 颗本区域中等偏上的树果，别给最便宜那种
    const pool = G.BERRIES.filter((x) => x.region === state.region).sort((x, y) => x.basePrice - y.basePrice);
    const starter = pool[Math.min(1, pool.length - 1)];
    if (starter) state.seeds[starter.id] = 5;
    G.clearBonusCache();
    G.addLog(state, "收拾好行李，从" + from + "搬到" + G.regionOf(state).name + "。天赋点 +" + tp + "。", "prestige");
    return { talentPoints: tp, region: state.region };
  };

  // ---------- 时间推进 ----------

  function stepPlots(state, dt, silent) {
    const b = G.bonuses(state);
    const speed = 1 + b.growSpeed;
    for (let i = 0; i < state.plots.length; i++) {
      const p = state.plots[i];
      if (!p.berry || p.ripe) continue;
      const berry = G.BERRY_BY_ID[p.berry];
      if (!berry) { p.berry = null; continue; }
      p.grown += (dt / berry.growTime) * speed;
      if (p.grown >= 1) { p.grown = 1; p.ripe = true; }
    }
  }

  function stepHelpers(state, dt) {
    if (!state.helpers.length) return;
    const b = G.bonuses(state);
    const interval = 2.2 / (1 + (b.idleRate || 0) + (state.talents.helper || 0) * 0.2);
    state.helpers.forEach((h, hi) => {
      h.cd = (h.cd || 0) + dt;
      if (h.cd < interval) return;
      h.cd -= interval;
      // 优先收成熟的
      for (let i = 0; i < state.plots.length; i++) {
        if (state.plots[i].ripe) { A.harvestPlot(state, i); return; }
      }
      // 其次是空地补种（用库存里最便宜的种子）
      for (let i = 0; i < state.plots.length; i++) {
        const p = state.plots[i];
        if (p.berry) continue;
        const seedId = cheapestSeed(state);
        if (seedId) A.plant(state, i, seedId);
        return;
      }
      // 最后浇水：挑进度最低的
      let target = -1, low = 2;
      for (let i = 0; i < state.plots.length; i++) {
        const p = state.plots[i];
        if (p.berry && !p.ripe && p.grown < low) { low = p.grown; target = i; }
      }
      if (target >= 0) {
        const p = state.plots[target];
        p.grown = Math.min(1, p.grown + 0.03);
        if (p.grown >= 1) p.ripe = true;
      }
    });
  }

  function cheapestSeed(state) {
    let best = null;
    Object.keys(state.seeds).forEach((id) => {
      if ((state.seeds[id] || 0) <= 0) return;
      const b = G.BERRY_BY_ID[+id];
      if (!b) return;
      if (!best || b.basePrice < best.basePrice) best = b;
    });
    return best ? best.id : null;
  }

  function stepCraft(state, dt) {
    if (!state.atlas.craft) return;
    if (G.now(state) >= state.atlas.craft.until) A.collectCraft(state);
  }

  function stepStall(state, dt) {
    const lv = A.modLevel(state, "idleRate");
    if (!lv) return 0;
    // 关掉的时候不攒产量，重新打开也不会突然爆发
    if (state.stallOn === false) { state.stallCarry = 0; return 0; }
    // 摊位的产量是"每秒 0.6 个"这种小数，但果子是离散的：
    // 小数部分先攒着（stallCarry），够一个整的才真的卖掉一个，库存永远不会出现小数点。
    // 上限只是防止长时间没货可卖时数字跑飞；离线结算一步是 5 秒，
    // 上限必须远大于"一步的产量"，否则离线收益会被吃掉。
    state.stallCarry = Math.min(10000, (state.stallCarry || 0) + perStall(state) * dt);
    let quota = Math.floor(state.stallCarry);
    if (quota <= 0) return 0;
    // 每个品种至少留这么多不卖，免得把做果酱的原料一起清了
    const reserve = Math.max(0, Math.floor(state.stallReserve || 0));
    let earned = 0;
    let sold = 0;
    // 从最贵的生果开始卖
    const ids = Object.keys(state.berries).map(Number)
      .sort((a, c) => G.BERRY_BY_ID[c].basePrice - G.BERRY_BY_ID[a].basePrice);
    for (let i = 0; i < ids.length && quota > 0; i++) {
      const id = ids[i];
      const have = Math.floor(state.berries[id] || 0);
      const sellable = Math.max(0, have - reserve);
      const take = Math.min(sellable, quota);
      if (take <= 0) continue;
      const price = G.berrySellPrice(state, G.BERRY_BY_ID[id]) * take;
      state.berries[id] = have - take;
      if (state.berries[id] <= 0) delete state.berries[id];
      state.stats.sold += take;
      state.money += price;
      state.stats.revenueRegion += price;
      state.stats.revenueTotal += price;
      earned += price;
      quota -= take;
      sold += take;
    }
    // 只扣真正卖掉的整数部分
    state.stallCarry = Math.max(0, state.stallCarry - sold);
    return earned;
  }

  function perStall(state) {
    const lv = A.modLevel(state, "idleRate");
    const b = G.bonuses(state);
    return (0.6 + 0.4 * lv) * (1 + b.idleRate);
  }

  // 给 UI 用的摊位状态
  A.stallInfo = function (state) {
    const lv = A.modLevel(state, "idleRate");
    return {
      unlocked: lv > 0,
      level: lv,
      on: state.stallOn !== false,
      reserve: Math.max(0, Math.floor(state.stallReserve || 0)),
      perSec: lv > 0 ? perStall(state) : 0
    };
  };

  A.advance = function (state, dt, opts) {
    opts = opts || {};
    if (dt <= 0) return { earned: 0 };
    if (!state.clock) state.clock = Date.now();
    if (state.needSanitize) { A.sanitize(state); state.needSanitize = false; }
    const before = state.money;
    // 大跨度离线：分块推进。前 10 分钟用 1 秒步长（保证帮手行为准确），之后放宽到 5 秒。
    let remaining = dt;
    const chunk = dt > 600 ? 5 : 1;
    const maxSteps = 24000;
    let steps = 0;
    while (remaining > 0 && steps < maxSteps) {
      const d = Math.min(chunk, remaining);
      // 时钟必须跟着每一小步走：加工台、阿特拉斯出行、订单过期都按 clock 判定，
      // 一次性把 clock 推到底的话，离线结算里这些计时器等于全停了。
      state.clock += d * 1000;
      stepPlots(state, d, opts.silent);
      stepHelpers(state, d);
      stepStall(state, d);
      // 加工必须跟着秒推进，否则离线结算（一次 advance 走完几小时）只会补一次料
      stepCraftQueue(state);
      stepAutoCraft(state);
      stepAutoTrade(state, d);
      remaining -= d;
      steps++;
    }
    // 剩余时间用解析方式补：只推进生长与出货
    if (remaining > 0) {
      state.clock += remaining * 1000;
      stepPlots(state, remaining, true);
      stepStall(state, remaining);
      stepCraftQueue(state);
      stepAutoCraft(state);
      stepAutoTrade(state, remaining);
    }
    stepCraft(state, dt);
    stepCraftQueue(state);
    A.finishTrip(state);
    if (A.stepPot) A.stepPot(state);
    A.trySpawnOrders(state);
    A.checkUnlocks(state);

    const earned = state.money - before;
    state.playTime += dt;
    const rate = dt > 0 ? earned / dt : 0;
    state.rateEMA = (state.rateEMA || 0) * 0.9 + rate * 0.1;
    return { earned: earned };
  };

  G.engine = A;
  G.advance = A.advance;
})();
