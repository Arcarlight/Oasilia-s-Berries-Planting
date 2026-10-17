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
    // 按「是不是工坊类道具」算，不是按「这一级的加成里有没有 craftSpeed」算。
    // 以前那样算的话：陶土腌罐（只给产量）一级都不加，风车磨坊 / 水晶窑
    // 的低级阶段也不算 —— 玩家做出来一件工坊道具，工位却没动。
    A.ownedItems(state).forEach((it) => {
      if (it.cat !== "工坊") return;
      const lv = state.items[it.id] || 0;
      if (lv > 0) detail.push({ name: it.name, level: lv });
    });
    const total = detail.reduce((a, x) => a + x.level, 0);
    const slots = Math.min(12, 2 + Math.floor(total / 2));
    return { slots: slots, total: total, detail: detail, cap: 12 };
  };

  A.craftSlots = function (state) {
    return A.craftSlotInfo(state).slots;
  };

  // 自动加工：解锁条件是手上有任意一件工坊类道具（第一个是区域 2 的石磨）
  A.autoUnlocked = function (state) {
    return A.craftSlotInfo(state).detail.length > 0;
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

  // ---------- 巡游（走到天穹园之后可以自由换区域） ----------
  //
  // 为什么要这么绕：常客的解锁记录是**跨区域永久**的，而门槛查的是**累计数据**。
  // 走到区域 10 时，累计收获 / 累计加工时长早就远超区域 1 的门槛了 ——
  // 直接给门槛乘个系数，在重访时一点约束力都没有。
  // 所以巡游重访时改成「只算这次停留内的进度」，门槛再按巡游档位放大。
  A.roamCount = function (state, regionId) {
    return (state.roam && state.roam[regionId]) || 0;
  };

  // 巡游强度：第一次重访 ×2.2，第二次 ×3.4……
  A.roamScale = function (state, regionId) {
    const n = A.roamCount(state, regionId);
    return n > 0 ? 1 + 1.2 * n : 1;
  };

  // 这次停留内新长的进度（进区域时打的快照）
  A.stayProgress = function (state) {
    const st = state.stats || {};
    const base = state.stayBase || {};
    return {
      harvested: (st.harvested || 0) - (base.harvested || 0),
      craftSeconds: (st.craftSeconds || 0) - (base.craftSeconds || 0),
      revenue: st.revenueRegion || 0
    };
  };

  // 进区域时打一个快照；巡游和移民都要调
  A.markStayBase = function (state) {
    const st = state.stats || {};
    state.stayBase = { harvested: st.harvested || 0, craftSeconds: st.craftSeconds || 0 };
  };

  // 这位常客现在离门槛还有多远。巡游重访时门槛按档位放大，而且只看本次停留内的进度
  // （累计数据在后期早就爆表，拿它当门槛等于没有门槛）。
  A.unlockProgress = function (state, reg) {
    const st = state.stats || {};
    const u = reg.unlock || { type: "harvest", value: 100 };
    const roaming = reg.region === state.region && A.roamCount(state, reg.region) > 0;
    const k = roaming ? A.roamScale(state, reg.region) : 1;
    const stay = roaming ? A.stayProgress(state) : null;
    const need = (v) => Math.round(v * k);
    switch (u.type) {
      case "harvest":
        return { cur: stay ? stay.harvested : (st.harvested || 0), need: need(u.value),
          label: roaming ? "本次停留收获树果" : "累计收获树果" };
      case "craftTime":
        return { cur: stay ? stay.craftSeconds : (st.craftSeconds || 0), need: need(u.value),
          label: roaming ? "本次停留加工时长" : "累计加工时长" };
      case "revenue":
        return { cur: st.revenueRegion || 0, need: need(u.value), label: "本区域累计收入" };
      case "species":
        return { cur: Object.keys(state.dex).length, need: u.value, label: "见过的树果种类" };
      case "crafted":
        return { cur: st.crafted || 0, need: u.value, label: "累计加工商品" };
      case "affinity": {
        const best = Object.keys(state.regulars)
          .reduce((a, d) => Math.max(a, state.regulars[d].aff || 0), 0);
        return { cur: best, need: u.value, label: "最高好感等级" };
      }
      default: return { cur: 0, need: u.value || 1, label: "未知条件" };
    }
  };

  A.unlockDone = function (state, reg) {
    if (A.regState(state, reg.dex).unlocked) return true;
    const p = A.unlockProgress(state, reg);
    return p.cur >= p.need;
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

  // 「自动 ₽/秒」是显示值，不进存档：取最近这段时间的平均。
  // 以前是每帧 `EMA*0.9 + 瞬时*0.1` —— 而 advance 每秒被调 60 次，
  // 时间常数只有 0.16 秒，等于没平滑，数字一直在跳。
  const RATE_WINDOW = 12;      // 秒
  function noteRate(state, dt) {
    // 采样窗挂在 state 上（不可枚举，所以不进存档）。
    // 以前是模块级变量 —— 换存档、或者同时在跑两个 state 时会串。
    if (!state._rateWin) {
      Object.defineProperty(state, "_rateWin", { value: [], writable: true, enumerable: false });
    }
    const rateWin = state._rateWin;
    const t = state.playTime, m = state.money;
    // 离线补算 / 切回标签页会一次跳好几分钟，那样的采样点没意义，重来
    if (!rateWin.length || !(dt > 0) || dt > 2) {
      rateWin.length = 0;
      rateWin.push({ t: t, m: m });
      return;
    }
    rateWin.push({ t: t, m: m });
    while (rateWin.length > 2 && t - rateWin[0].t > RATE_WINDOW) rateWin.shift();
    const a = rateWin[0];
    const span = t - a.t;
    if (span < 0.5) return;                 // 样本还不够长，先沿用上一次的值
    state.rateEMA = Math.max(0, (m - a.m) / span);
  }

  // 这件道具**实际**要做多久（算上锻造加速）。
  // 界面上那行「耗时」以前用的是 item.craftTime（基础值），有加速时会显示 3 分钟、
  // 实际却从 2 分半开始倒数 —— 显示和实际必须是同一个数。
  A.craftSecs = function (state, item) {
    return Math.max(4, item.craftTime / (1 + G.bonuses(state).craftSpeed));
  };

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
    const secs = A.craftSecs(state, item);
    state.atlas.craft = { itemId: itemId, until: G.now(state) + secs * 1000, level: lv + 1,
      secs: secs, startedAt: G.now(state) };
    G.addLog(state, "阿特拉斯开始做「" + item.name + "」了（" + G.time(secs) + "）。", "atlas");
    return { ok: true, secs: secs };
  };

  A.collectCraft = function (state) {
    const c = state.atlas.craft;
    if (!c || G.now(state) < c.until) return null;
    state.atlas.craft = null;
    G.clearBonusCache();
    // 共轭图纸和普通道具共用同一个制作间，只是做出来的东西不一样
    if (c.kind === "conj") {
      state.conjOwned[c.pairId] = true;
      const pair = G.CONJ_BY_ID[c.pairId];
      G.addLog(state, "阿特拉斯把「" + (pair ? pair.name : c.pairId) +
        "」的两张图纸摆在你面前：「只能挑一张。另一张我封起来了。」", "atlas");
      return c;
    }
    state.items[c.itemId] = (state.items[c.itemId] || 0) + 1;
    const item = (G.ITEMS || []).filter((x) => x.id === c.itemId)[0];
    G.addLog(state, "阿特拉斯把「" + (item ? item.name : c.itemId) + "」拍在你面前：做好了。", "atlas");
    return c;
  };

  // ---------- 共轭图纸 ----------

  // 这副图纸现在能不能下单
  A.canOrderConj = function (state, pairId) {
    const pair = G.CONJ_BY_ID[pairId];
    if (!pair) return { ok: false, why: "没有这副图纸" };
    if ((state.maxRegion || 1) < (pair.region || 1)) {
      return { ok: false, why: "还没走到这块地方，琢磨不出来" };
    }
    if (G.conjOwned(state, pairId)) return { ok: false, why: "这副图纸已经刻好了" };
    if (state.atlas.craft) return { ok: false, why: "阿特拉斯手里还有一件没做完" };
    const lack = Object.keys(pair.materials || {}).filter(
      (mid) => (state.materials[mid] || 0) < pair.materials[mid]);
    if (lack.length) {
      const m = (G.MATERIALS || []).filter((x) => x.id === lack[0])[0];
      return { ok: false, why: "材料不够，缺" + (m ? m.name : lack[0]) };
    }
    return { ok: true };
  };

  A.conjSecs = function (state, pair) {
    return Math.max(4, pair.craftTime / (1 + G.bonuses(state).craftSpeed));
  };

  A.orderConj = function (state, pairId) {
    const chk = A.canOrderConj(state, pairId);
    if (!chk.ok) return chk;
    const pair = G.CONJ_BY_ID[pairId];
    Object.keys(pair.materials).forEach((mid) => {
      state.materials[mid] -= pair.materials[mid];
      if (state.materials[mid] <= 0) delete state.materials[mid];
    });
    const secs = A.conjSecs(state, pair);
    state.atlas.craft = {
      kind: "conj", pairId: pairId, until: G.now(state) + secs * 1000,
      secs: secs, startedAt: G.now(state)
    };
    G.addLog(state, "阿特拉斯开始刻「" + pair.name + "」的图纸了（" + G.time(secs) + "）。", "atlas");
    return { ok: true, secs: secs };
  };

  // 选边。同一个区域内定下来就不能改，搬家后可以重新选。
  A.chooseConj = function (state, pairId, sideId) {
    const pair = G.CONJ_BY_ID[pairId];
    if (!pair) return { ok: false, why: "没有这副图纸" };
    if (!G.conjOwned(state, pairId)) return { ok: false, why: "图纸还没刻好" };
    const side = G.conjSide(pair, sideId);
    if (!side) return { ok: false, why: "没有这一侧" };
    if (!G.conjCanPick(state, pairId)) {
      return { ok: false, why: "这一侧定下了，搬到新区域才能改" };
    }
    const before = state.conj[pairId];
    state.conj[pairId] = { side: sideId, region: state.region };
    G.clearBonusCache();
    if (!before || before.side !== sideId) {
      G.addLog(state, "「" + pair.name + "」定了：" + side.name + "。", "atlas");
    }
    return { ok: true, side: side };
  };

  // 阿特拉斯出门采购
  // 出远门买材料的加价：杂货铺代购是 2.6 倍，跑一趟只要 1.4 倍，代价是要等。
  // 之前这里一分钱都不收 —— 白拿材料，等于把杂货铺整条线架空了。
  const TRIP_MARKUP = 1.4;

  A.tripCost = function (state, wants) {
    const mats = wants || {};
    let value = 0;
    Object.keys(mats).forEach((mid) => {
      const m = (G.MATERIALS || []).filter((x) => x.id === mid)[0];
      if (m) value += m.price * mats[mid];
    });
    return { value: value, cost: Math.round(value * TRIP_MARKUP), secs: A.tripSecs(value) };
  };

  A.tripSecs = function (value) {
    return Math.max(45, Math.min(900, (value || 0) / 120));
  };

  A.startTrip = function (state, wants) {
    if (state.atlas.trip) return { ok: false, why: "他已经出门了" };
    const mats = wants || {};
    let value = 0;
    Object.keys(mats).forEach((mid) => {
      const m = (G.MATERIALS || []).filter((x) => x.id === mid)[0];
      if (m) value += m.price * mats[mid];
    });
    const cost = Math.round(value * TRIP_MARKUP);
    if (state.money < cost) {
      return { ok: false, why: "这一趟要 ₽" + G.fmt(cost) + "，钱不够" };
    }
    state.money -= cost;
    const secs = A.tripSecs(value);
    state.atlas.trip = { want: mats, until: G.now(state) + secs * 1000, startedAt: G.now(state), cost: cost };
    // 上一趟的结算留着不删：阿特拉斯页要显示"上次带回来"，删了就只剩空白。
    // 回来提示靠 report.at 的变化触发，不会因为留着而重复弹。
    state.stats.trips++;
    G.addLog(state, "阿特拉斯出门了，走之前把清单咬在嘴里：" +
      Object.keys(mats).map((mid) => {
        const m = (G.MATERIALS || []).filter((x) => x.id === mid)[0];
        return (m ? m.name : mid) + "×" + mats[mid];
      }).join("、") + "。", "atlas");
    return { ok: true, secs: secs, cost: cost };
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

    // 一条"他回来了"的汇总。
    // 原来只有「多带回来：X」这种零碎条目，回来了反而没有一条完整的话，
    // 日志又挤在右侧栏里，很容易看漏。
    // 材料单独列一份：只带回材料、没带回素材的那一趟，页面上也该有东西显示
    const mats = Object.keys(got).map((mid) => {
      const m = (G.MATERIALS || []).filter((x) => x.id === mid)[0];
      return { id: mid, name: m ? m.name : mid, count: got[mid] };
    });
    const parts = mats.map((x) => x.name + "×" + x.count);
    finds.forEach((f) => { parts.push(f.name + "×" + f.count); });
    if (extra && extra.seed) {
      const sb = G.BERRY_BY_ID[extra.seed.id];
      parts.push((sb ? sb.zh : "种子") + "×" + extra.seed.count);
    }
    const summary = "阿特拉斯回来了"
      + (parts.length ? "，带回来：" + parts.join("、") : "，空着手回来的")
      + "。";
    G.addLog(state, summary, "good");
    state.atlas.report = {
      at: Date.now(),
      summary: summary,
      got: parts.slice(),                       // 留给老代码看的那份（字符串）
      mats: mats,                               // 材料（带 id，页面上要显示图标）
      finds: finds.map((f) => ({ id: f.id, name: f.name, count: f.count })),
      eventText: ev ? ev.text : "",
      seed: extra && extra.seed ? extra.seed : null
    };
    return { got: got, event: ev, extra: extra, finds: finds, summary: summary };
  };

  // ---------- 加工 ----------

  A.eligibleBerries = function (state, recipe) {
    const need = G.craftNeedCount(state, recipe);
    if (recipe.needBerry) return (state.berries[recipe.needBerry] || 0) >= need
      ? [G.BERRY_BY_ID[recipe.needBerry]] : [];
    return G.BERRIES.filter((b) => (state.berries[b.id] || 0) >= need &&
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
  // 帮手必须是"这一带的常客"。旧存档里换过区、但 helpers 没清干净的，
  // 读档时按当前区域校验一遍 —— 不然那几个幽灵会一直在新田里收种浇水。
  A.pruneHelpers = function (state) {
    if (!state.helpers || !state.helpers.length) return 0;
    const ok = {};
    A.regionRegulars(state.region).forEach((r) => { ok[r.dex] = true; });
    const before = state.helpers.length;
    state.helpers = state.helpers.filter((h) => ok[h.dex]);
    const cut = before - state.helpers.length;
    if (cut) G.addLog(state, "清掉了 " + cut + " 个不在这一带的帮手。", "info");
    return cut;
  };

  A.sanitize = function (state) {
    ["berries", "seeds", "products", "materials"].forEach((bag) => {
      Object.keys(state[bag] || {}).forEach((k) => {
        const v = Math.floor(state[bag][k]);
        if (!(v > 0)) delete state[bag][k];
        else state[bag][k] = v;
      });
    });
    state.stallCarry = Math.max(0, state.stallCarry || 0);
    A.pruneHelpers(state);
    // 老存档里可能已经被 NaN 污染过（卖了东西钱不动就是这个）
    if (typeof state.money !== "number" || !isFinite(state.money)) {
      G.addLog(state, "余额有异常值，已经修回 0。", "info");
      state.money = 0;
    }
    ["revenueRegion", "revenueTotal"].forEach((k) => {
      if (!isFinite(state.stats[k])) state.stats[k] = 0;
    });
  };

  A.craft = function (state, recipeId, berryId) {
    const recipe = G.RECIPE_BY_ID[recipeId];
    const berry = G.BERRY_BY_ID[berryId];
    if (!recipe || !berry) return { ok: false, why: "配方或树果不存在" };
    if (!state.recipes[recipeId]) return { ok: false, why: "还没学会这个配方" };
    if (recipe.needBerry && recipe.needBerry !== berryId) return { ok: false, why: "这个配方要的是别的树果" };
    if (recipe.needFlavor && berry.flavor !== recipe.needFlavor) return { ok: false, why: "口味不对" };
    // 「精打细算」会让研发配方的投料变少，所有用到颗数的地方都走这个函数
    const need = G.craftNeedCount(state, recipe);
    if ((state.berries[berryId] || 0) < need) return { ok: false, why: "树果不够" };
    if (recipe.fromFind && (state.finds[recipe.fromFind] || 0) < (recipe.findCount || 1)) {
      const f = G.FIND_BY_ID[recipe.fromFind];
      return { ok: false, why: "缺素材：" + (f ? f.name : recipe.fromFind) };
    }
    if (state.craftQueue.length >= A.craftSlots(state)) return { ok: false, why: "加工台满了" };
    if (recipe.fromFind) {
      state.finds[recipe.fromFind] -= (recipe.findCount || 1);
      if (state.finds[recipe.fromFind] <= 0) delete state.finds[recipe.fromFind];
    }
    state.berries[berryId] -= need;
    if (state.berries[berryId] <= 0) delete state.berries[berryId];
    const b = G.bonuses(state);
    const secs = Math.max(1, recipe.time / (1 + b.craftSpeed));
    const key = G.productKey(recipeId, berryId);
    state.craftQueue.push({
      recipeId: recipeId, berryId: berryId, key: key,
      until: G.now(state) + secs * 1000, secs: secs, value: G.productValue(recipe, berry)
    });
    state.stats.crafted++;
    // 门槛看的是「累计加工时长」，不是次数 —— 否则做慢配方的人被罚 14 倍。
    // 次数继续记着，给玩家看成就。
    state.stats.craftSeconds = (state.stats.craftSeconds || 0) + (secs || 0);
    A.checkUnlocks(state);
    return { ok: true, secs: secs };
  };

  // 混合口味：主料定配方（必须对上 recipe 需要的味道/树果），副料只要味道不同。
  // 投料总数不变，拆成主料多数、副料少数。
  A.craftMix = function (state, recipeId, mainBerryId, subBerryId) {
    const recipe = G.RECIPE_BY_ID[recipeId];
    const mainB = G.BERRY_BY_ID[mainBerryId];
    const subB = G.BERRY_BY_ID[subBerryId];
    if (!recipe || !mainB || !subB) return { ok: false, why: "配方或树果不存在" };
    if (!state.recipes[recipeId]) return { ok: false, why: "还没学会这个配方" };
    if (recipe.needBerry && recipe.needBerry !== mainBerryId) return { ok: false, why: "主料得是这个配方要的树果" };
    if (recipe.needFlavor && mainB.flavor !== recipe.needFlavor) return { ok: false, why: "主料得是「" + recipe.needFlavor + "」味的树果" };
    if (mainB.flavor === subB.flavor) return { ok: false, why: "两味一样，直接做普通版就行" };
    const need = G.craftNeedCount(state, recipe);
    const sp = G.mixSplit(need);
    if ((state.berries[mainBerryId] || 0) < sp.main) return { ok: false, why: "主料不够（要 " + sp.main + " 颗）" };
    if ((state.berries[subBerryId] || 0) < sp.sub) return { ok: false, why: "副料不够（要 " + sp.sub + " 颗）" };
    if (state.craftQueue.length >= A.craftSlots(state)) return { ok: false, why: "加工台满了" };
    state.berries[mainBerryId] -= sp.main;
    if (state.berries[mainBerryId] <= 0) delete state.berries[mainBerryId];
    state.berries[subBerryId] -= sp.sub;
    if (state.berries[subBerryId] <= 0) delete state.berries[subBerryId];
    const b = G.bonuses(state);
    const secs = Math.max(1, recipe.time / (1 + b.craftSpeed));
    const key = recipeId + "|" + mainBerryId + "|" + subBerryId;
    state.craftQueue.push({
      recipeId: recipeId, berryId: mainBerryId, key: key,
      until: G.now(state) + secs * 1000, secs: secs, value: G.mixedValue(recipe, mainB, subB)
    });
    state.stats.crafted++;
    state.stats.craftSeconds = (state.stats.craftSeconds || 0) + (secs || 0);
    A.checkUnlocks(state);
    return { ok: true, secs: secs, tag: G.mixTag(mainB, subB) };
  };

  // 额外产出的概率：常规的 craftOutput 管所有配方；
  // 「慢火细作」只给慢配方加码 —— 这正是它和「快手淬火」分开的意义：
  // 一个抬所有配方的吞吐，一个只抬慢而精的那一类。
  const SLOW_RECIPE_SECS = 60;
  A.extraOutputChance = function (state, recipe) {
    const b = G.bonuses(state);
    let c = b.craftOutput || 0;
    if (recipe && (recipe.time || 0) >= SLOW_RECIPE_SECS) c += b.slowOutput || 0;
    return Math.min(0.85, c);
  };

  function stepCraftQueue(state) {
    if (!state.craftQueue.length) return;
    const now = G.now(state);
    for (let i = state.craftQueue.length - 1; i >= 0; i--) {
      const j = state.craftQueue[i];
      if (now < j.until) continue;
      const recipe = G.RECIPE_BY_ID[j.recipeId];
      const extraChance = A.extraOutputChance(state, recipe);
      let n = 1;
      if (extraChance > 0 && Math.random() < extraChance) n++;
      state.products[j.key] = (state.products[j.key] || 0) + n;
      A.noteMade(state, recipe);
      // 混合口味在图鉴里单独算一格：品类|混合
      if (String(j.key).split("|").length === 3 && state.madeProducts) {
        state.madeProducts[recipe.cat + "|混合"] = true;
      }
      state.craftQueue.splice(i, 1);
      state.stats.lastCraft = { key: j.key, n: n, at: now };
    }
  }

  // 一键做满：把空闲工位按「树果单价从高到低」依次填上
  A.craftFill = function (state, recipeId) {
    const recipe = G.RECIPE_BY_ID[recipeId];
    if (!recipe) return { ok: false, n: 0 };
    let n = 0;
    for (let guard = 0; guard < 30; guard++) {
      if (state.craftQueue.length >= A.craftSlots(state)) break;
      const elig = A.eligibleBerries(state, recipe);
      if (!elig.length) break;
      elig.sort((a, c) => c.basePrice - a.basePrice);
      if (!A.craft(state, recipeId, elig[0].id).ok) break;
      n++;
    }
    return { ok: n > 0, n: n };
  };

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
    const before = state.money;
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
    // 自动交付是后台行为，玩家看不到明细就容易怀疑"钱没进"。每 15 秒最多记一条。
    const got = state.money - before;
    if (got > 0) {
      const now = G.now(state);
      if (!state._autoLogAt || now - state._autoLogAt > 15000) {
        state._autoLogAt = now;
        G.addLog(state, "自动交付入账 ₽" + G.fmt(got) + "（余额 ₽" + G.fmt(state.money) + "）。", "sell");
      }
    }
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
    // 树果不放也行 —— 底料对就成糕点，只是「无味」的（五个味道全 0），卖不上价。
    // 这是软限制：特殊糕点要占掉锅的前好几格，逼玩家每锅都塞一颗树果太死板。
    if (!finds.length) return { kind: "invalid", why: "光放树果煮不出花样，再丢点底料。" };

    // 口味取锅里占多数的那种树果（一样多就按先放的）
    const tally = {};
    berries.forEach((b) => {
      const f = G.BERRY_BY_ID[b.id].flavor;
      tally[f] = (tally[f] || 0) + 1;
    });
    let flavor = "无味", best = -1;   // 一颗树果都没放 → 无味
    berries.forEach((b) => {
      const f = G.BERRY_BY_ID[b.id].flavor;
      if (tally[f] > best) { best = tally[f]; flavor = f; }
    });

    const n = items.length;
    const ev = G.evaluateResearch(state, finds.map((x) => x.id), flavor, n);
    const out = Object.assign({}, ev);
    out.flavor = flavor;
    out.n = n;
    out.berryId = berries.length ? berries[0].id : 0;   // 0 = 无味
    out.items = items.slice();
    // 一定要带上 state.region —— 研发费按"在哪个区域做"算，
    // 不传就会退回按品类的商店解锁区域算（区域1 做蛋糕会报价 16 万，做一个亏一个）。
    out.cost = ev.kind === "invalid" ? 0
      : G.researchCost(ev.combo ? ev.combo.cat : (ev.cat && ev.cat.id) || "cake",
                       flavor, n, !!ev.spice, state.region);
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
    A.noteMade(state, recipe);
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

  // 种子：卖掉是按折损价，也能直接丢
  A.sellSeed = function (state, id, n) {
    const have = state.seeds[id] || 0;
    const take = Math.min(have, n || 1);
    const berry = G.BERRY_BY_ID[id];
    if (!berry || take <= 0) return { ok: false, got: 0 };
    const got = G.seedSellPrice(state, berry) * take;
    state.seeds[id] -= take;
    if (state.seeds[id] <= 0) delete state.seeds[id];
    state.money += got;
    state.stats.revenue = (state.stats.revenue || 0) + got;
    state.stats.revenueRegion = (state.stats.revenueRegion || 0) + got;
    G.clearBonusCache();
    return { ok: true, got: got, n: take };
  };

  // 一键播种：按给定顺序，从空地开始把手上所有种子种下去。
  // 顺序由界面给（那栏从上往下就是"该先种哪个"），贵的排前面。
  A.plantAllInOrder = function (state, ids) {
    let n = 0;
    for (let i = 0; i < (ids || []).length; i++) {
      const id = ids[i];
      while ((state.seeds[id] || 0) > 0) {
        let slot = -1;
        for (let j = 0; j < state.plots.length; j++) {
          if (!state.plots[j].berry) { slot = j; break; }
        }
        if (slot < 0) return n;
        A.plant(state, slot, id);
        n++;
      }
    }
    return n;
  };

  A.dropSeed = function (state, id, n) {
    const have = state.seeds[id] || 0;
    const take = Math.min(have, n || 1);
    if (take <= 0) return { ok: false, n: 0 };
    state.seeds[id] -= take;
    if (state.seeds[id] <= 0) delete state.seeds[id];
    return { ok: true, n: take };
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

  // 在杂货铺买基础食材（面粉 / 哞哞鲜奶 / 黄油 / 砂糖）。比跑一趟贵得多，图个方便。
  A.buyFind = function (state, id, count) {
    const f = G.FIND_BY_ID[id];
    if (!f || (f.tier || "staple") !== "staple") return { ok: false, why: "这个不卖" };
    const n = Math.max(1, Math.floor(count || 1));
    const price = G.findBuyPrice(f) * n;
    if (state.money < price) return { ok: false, why: "要 ₽" + G.fmt(price) + "，钱不够" };
    state.money -= price;
    state.finds[id] = (state.finds[id] || 0) + n;
    return { ok: true, count: n, price: price };
  };

  // 制品图鉴：做过一次就点亮。按「品类|口味」记，不看是哪张配方做的
  // （同一品类同一口味可能有普通版、强化版、不同料数的版本，算同一样东西）。
  A.noteMade = function (state, recipe) {
    if (!recipe || !recipe.cat || !recipe.flavor) return;
    if (!state.madeProducts) state.madeProducts = {};
    state.madeProducts[recipe.cat + "|" + recipe.flavor] = true;
  };

  // 叫卖：吆喝一声，把摊上最贵的几个生果出手。
  // 价钱比自动出货高两成半（主动叫卖有溢价），但真的要从库存里扣。
  A.hawk = function (state) {
    const ids = G.clickSellStock(state);
    if (!ids.length) return { ok: false, why: "摊上没货，叫卖也没人买" };
    let left = G.clickSellBatch(state);
    let earned = 0;
    let sold = 0;
    ids.forEach((id) => {
      if (left <= 0) return;
      const have = Math.floor(state.berries[id] || 0);
      const take = Math.min(have, left);
      if (take <= 0) return;
      const price = G.clickSellPrice(state, G.BERRY_BY_ID[id]) * take;
      state.berries[id] = have - take;
      if (state.berries[id] <= 0) delete state.berries[id];
      earned += price;
      sold += take;
      left -= take;
    });
    if (!sold) return { ok: false, why: "摊上没货，叫卖也没人买" };
    state.money += earned;
    state.stats.sold += sold;
    state.stats.revenueRegion += earned;
    state.stats.revenueTotal += earned;
    A.checkUnlocks(state);
    const lines = (G.ATLAS_LINES && G.ATLAS_LINES.click) || [];
    const line = lines.length ? lines[state.stats.clicks % lines.length] : "他叫卖了一声。";
    G.addLog(state, line + "（卖了 " + sold + " 个，拿到 ₽" + G.fmt(earned) + "）", "atlas");
    return { ok: true, earned: earned, count: sold };
  };

  // 仓库用：各类东西的回收价
  A.materialSellPrice = function (state, m) { return Math.round(m.price * 0.6); };

  // ---------- 出售 ----------

  function gain(state, money) {
    // 金额一旦算成 NaN / Infinity，后面每一次加钱都会继续是 NaN —— 表现就是
    // "卖了东西但钱不动、余额一直是 0"。宁可这一笔记 0 并留日志，也不能把存档污染了。
    if (typeof money !== "number" || !isFinite(money)) {
      G.addLog(state, "结算金额异常（" + String(money) + "），这一笔按 0 记。", "info");
      console.warn("gain 收到异常金额", money);
      return;
    }
    state.money += money;
    if (!isFinite(state.money)) { state.money = 0; }   // 兜底：余额本身坏了就归零
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
    const ki = G.keyInfo(key);
    const recipe = ki.recipe, berry = ki.berry, sub = ki.sub;
    if (!recipe || !berry) return 0;
    const rInfo = regularDex ? A.regularByDex(regularDex) : null;
    const reg = rInfo ? { aff: A.regState(state, regularDex).aff, flavor: rInfo.flavor, dislike: rInfo.dislike } : null;
    const unit = sub ? G.mixedSellPrice(state, recipe, berry, sub, reg) : G.productSellPrice(state, recipe, berry, reg);
    const price = unit * count;
    state.products[key] -= count;
    if (state.products[key] <= 0) delete state.products[key];
    state.stats.sold += count;
    gain(state, price);
    if (regularDex) {
      const affFlavor = (sub && rInfo && sub.flavor === rInfo.flavor) ? sub.flavor : recipe.flavor;
      A.giveAffinity(state, regularDex, affFlavor, count);
    }
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
    const b = G.bonuses(state);
    // 「提供打包」让客人来得更勤（缩短冷却），赏金也更高
    const cooldown = 70000 / (1 + (b.orderRate || 0));
    const payMult = 1 + (b.orderPay || 0);
    A.regionRegulars(state.region).forEach((reg) => {
      const s = A.regState(state, reg.dex);
      if (!s.unlocked) return;
      const cur = state.orders[reg.dex];
      if (cur && cur.expires > now) return;
      if (cur) delete state.orders[reg.dex];
      // 每位常客独立冷却
      const last = s.lastOrderAt || 0;
      if (now - last < cooldown) return;
      if (Math.random() > 0.02) return; // 每 tick 很小概率
      s.lastOrderAt = now;
      const count = 2 + Math.floor(Math.random() * 4) + Math.floor(s.aff / 2);
      const berry = G.bestBerryOfRegion(state.region);
      const flavor = Math.random() < 0.7 ? reg.flavor : G.FLAVORS[Math.floor(Math.random() * G.FLAVORS.length)];
      const recipes = A.unlockedRecipes(state).filter((r) => r.flavor === flavor);
      let unit = berry.basePrice * 3;
      if (recipes.length) {
        // 以前取"最后一个解锁的配方"，而研发配方只要锅大，倍率能到普通配方的 4~5 倍，
        // 于是同一个味道的订单赏金能差 20 倍（玩家真实存档里 5 份甜味报出 ₽37万）。
        // 现在只拿商店配方当基准；没有商店配方就取中位数，避免被个别极端配方带飞。
        const shop = recipes.filter((r) => !r.research && !r.specialty);
        let base = null;
        if (shop.length) {
          base = shop[0];
        } else {
          const sorted = recipes.slice().sort((a, b) => a.mult - b.mult);
          base = sorted[Math.floor(sorted.length / 2)];
        }
        unit = G.productValue(base, berry);
      }
      const reward = Math.floor(unit * count * 2.4 * (1 + s.aff * 0.15) * payMult);
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
      const ki = G.keyInfo(k);
      if (!ki.recipe) return false;
      if (ki.recipe.flavor === order.flavor || ki.recipe.flavor === "混合") return true;
      return !!(ki.sub && ki.sub.flavor === order.flavor);
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

  // ---------- 洗点 ----------
  // 每个区域只能洗一次（搬到新区域后解锁）。退点按当初点的原价退，不扣手续费。
  // 这一条和共轭图纸是同一个节奏：换一块新地方，重新想一遍这一轮该怎么走。
  A.respecTalents = function (state) {
    const chk = G.canRespecTalents(state);
    if (!chk.ok) return chk;
    const refund = G.talentSpentNow(state);
    state.talentPoints += refund;
    state.talents = {};
    state.talentSpent = 0;
    state.talentRespecAt = state.region;
    G.clearBonusCache();
    // 阡陌（多一块田）退掉之后田会变少 —— 先把空出来的裁掉，还长着东西的等收完再说
    G.syncPlots(state);
    G.addLog(state, "把天赋点全收回来了（" + refund + " 点），可以重新点一遍。", "good");
    return { ok: true, refund: refund };
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
    // 走到最后一个区域之后，所有移动都算巡游（不给天赋点）。
    // 不堵这条的话：巡游回区域 5 → 重新解锁那 6 位 → 再"移民"到区域 6，
    // 就能把天赋点反复刷出来。
    const roaming = A.canRoam(state);
    return {
      ok: allDone && state.money >= cost && !!nextRegion && !roaming,
      allDone: allDone, progress: prog, cost: cost,
      moneyOk: state.money >= cost, hasNext: !!nextRegion, roaming: roaming,
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

  // 阿特拉斯手里那件还没做完的活 —— 搬走之前把材料退回来。
  // 不退的话，搬家刚好卡在一次制作中间，材料就白花了（他不会跟着搬走半成品）。
  function refundAtlasCraft(state) {
    const c = state.atlas.craft;
    if (!c) return;
    if (c.kind === "conj") {
      const pair = G.CONJ_BY_ID[c.pairId];
      if (pair) {
        Object.keys(pair.materials || {}).forEach((mid) => {
          state.materials[mid] = (state.materials[mid] || 0) + pair.materials[mid];
        });
      }
    }
    state.atlas.craft = null;
  }

  // 收拾行李进新区域：折现、清板、重置进度、给起步种子。
  // 移民（往下一个区域）和巡游（回到走过的区域）共用这一段 —— 差别只在
  // 天赋点、移民费、以及巡游要重置当地常客。
  //
  // 只折算树果和商品。料理素材 / 材料 这两样**不折、直接清掉**，因为它们
  // 随时能用钱在杂货铺买到：
  //   素材买价是卖价的 6 倍、材料是 2.6 倍，而迁移时钱基本全丢（keepMoney 初始 0）。
  //   只要折算价 > 0，"临走前把钱全换成素材/材料"就是稳赚 —— 亏 5/6 也好过亏光。
  //   所以这两样一律清零，买它们来"存钱"就是纯亏。
  //   （树果也能买种子种，但那要等生长，属于正常经营，不算套利。）
  function enterRegion(state, regionId) {
    const b = G.bonuses(state);
    let liquidated = 0;
    Object.keys(state.berries).forEach((id) => {
      const berry = G.BERRY_BY_ID[id];
      if (berry) liquidated += G.berrySellPrice(state, berry) * state.berries[id];
    });
    Object.keys(state.products).forEach((k) => {
      const ki = G.keyInfo(k);
      if (!ki.recipe || !ki.berry) return;
      const unit = ki.sub
        ? G.mixedMarketPrice(state, ki.recipe, ki.berry, ki.sub)
        : G.marketPrice(state, ki.recipe, ki.berry);
      liquidated += unit * state.products[k];
    });
    liquidated = Math.floor(liquidated);
    state.money = Math.floor(state.money * b.keepMoney) + liquidated;
    state.region = regionId;
    state.maxRegion = Math.max(state.maxRegion, regionId);
    state.extraPlots = 0;
    state.seeds = {};
    state.berries = {};
    state.products = {};
    state.materials = {};
    state.finds = {};
    state.waste = 0;
    state.craftQueue = [];
    state.orders = {};
    // 帮手是"这一带的常客"，人不会跟着搬家走 —— 不清掉的话，新区域的田里
    // 会出现几个本区域根本没解锁的帮手在自动收种浇水（玩家看到的"幽灵"）。
    if (state.helpers && state.helpers.length) {
      const names = state.helpers.map((h) => (A.regularByDex(h.dex) || {}).name || h.dex);
      G.addLog(state, "雇的帮手留在了老地方：" + names.join("、") + "。到了新区域重新请人。", "info");
    }
    state.helpers = [];
    A.pruneHelpers(state);   // 兜一层：万一之前漏了，这里也清干净
    refundAtlasCraft(state);
    state.stats.revenueRegion = 0;
    state.regionEnteredAt = G.now(state);
    // 巡游重访的门槛只看"这次停留"的进度，所以要在这里打快照
    A.markStayBase(state);
    // 顺序要紧：先把田清空，syncPlots 才能把多出来的地裁掉
    state.plots.forEach((p) => { p.berry = null; p.grown = 0; p.watered = 0; p.ripe = false; });
    G.syncPlots(state);
    // 新区域的起步种子：给 5 颗本区域中等偏上的树果，别给最便宜那种
    const pool = G.BERRIES.filter((x) => x.region === regionId).sort((x, y) => x.basePrice - y.basePrice);
    const starter = pool[Math.min(1, pool.length - 1)];
    if (starter) state.seeds[starter.id] = 5;
    G.clearBonusCache();
    return liquidated;
  }

  // 搬家会带走多少钱 —— 和 enterRegion 里那套折现规则同一份口径。
  // 玩家最容易误会的就是这件："我明明卖了东西，怎么一分钱没有"。
  A.migratePreview = function (state) {
    const b = G.bonuses(state);
    let liquidated = 0;
    Object.keys(state.berries).forEach((id) => {
      const berry = G.BERRY_BY_ID[id];
      if (berry) liquidated += G.berrySellPrice(state, berry) * state.berries[id];
    });
    Object.keys(state.products).forEach((k) => {
      const ki = G.keyInfo(k);
      if (!ki.recipe || !ki.berry) return;
      const unit = ki.sub
        ? G.mixedMarketPrice(state, ki.recipe, ki.berry, ki.sub)
        : G.marketPrice(state, ki.recipe, ki.berry);
      liquidated += unit * state.products[k];
    });
    liquidated = Math.floor(liquidated);
    const keepPct = Math.round((b.keepMoney || 0) * 100);
    return {
      keepPct: keepPct,
      liquidated: liquidated,
      total: Math.floor(state.money * (b.keepMoney || 0)) + liquidated
    };
  };

  A.migrate = function (state) {
    const chk = A.canMigrate(state);
    if (!chk.ok) return null;
    const tp = G.talentPointsFor(state.stats.revenueRegion);
    const from = G.regionOf(state).name;
    state.talentPoints += tp;
    state.stats.prestige++;
    enterRegion(state, state.region + 1);
    G.addLog(state, "收拾好行李，从" + from + "搬到" + G.regionOf(state).name + "。天赋点 +" + tp + "。", "prestige");
    return { talentPoints: tp, region: state.region };
  };

  // ---------- 巡游（走到最后一个区域之后才开放） ----------

  A.canRoam = function (state) {
    return (state.maxRegion || 1) >= 10;
  };

  // 巡游到过的地方。不收钱、不要求常客全解锁 —— 这是"回去补图鉴"，不该被困住。
  A.roam = function (state, regionId) {
    if (!A.canRoam(state)) return null;
    regionId = +regionId;
    if (!G.REGION_BY_ID[regionId]) return null;
    if (regionId > (state.maxRegion || 1)) return null;
    if (regionId === state.region) return null;
    const from = G.regionOf(state).name;
    state.roam[regionId] = (state.roam[regionId] || 0) + 1;
    state.stats.roams = (state.stats.roams || 0) + 1;
    enterRegion(state, regionId);
    // 当地常客重新上门：好感与图鉴记录留着，但"上门"这件事要重新办一次，
    // 门槛按巡游档位放大，而且只算这次停留内的进度。
    A.regionRegulars(regionId).forEach((reg) => {
      A.regState(state, reg.dex).unlocked = false;
    });
    G.clearBonusCache();
    G.addLog(state, "从" + from + "巡游回" + G.regionOf(state).name + "（第 " +
      state.roam[regionId] + " 次）。当地常客门槛 ×" + A.roamScale(state, regionId).toFixed(1) +
      "，得重新上门。", "prestige");
    return { region: regionId, count: state.roam[regionId], scale: A.roamScale(state, regionId) };
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
    // 每个品种至少留这么多不卖，免得把做果酱的原料一起清了
    const reserve = Math.max(0, Math.floor(state.stallReserve || 0));
    // 没货可卖的时候不攒份额。
    // 原来份额一直在涨（上限 10000），田里一收货就一次性全卖光 —— 这就是
    // "有时候会瞬间卖完"的原因。摊位的产能卖不掉就是白费，不该攒着等货。
    const hasStock = Object.keys(state.berries).some((k) => state.berries[k] > reserve);
    if (!hasStock) { state.stallCarry = 0; return 0; }
    state.stallCarry = Math.min(10000, (state.stallCarry || 0) + perStall(state) * dt);
    let quota = Math.floor(state.stallCarry);
    if (quota <= 0) return 0;
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

  // 保险：钱、种子、果子、商品全都见底 = 什么都做不了，游戏直接卡死。
  // 玩家报过"卖了东西不给钱、余额 0"，查下来是这种状态 —— 他其实已经没东西可卖了。
  // 这种情况送几颗最便宜的种子，让他能重新种起来。
  // 余额自愈：钱一旦被写成 NaN/Infinity，之后所有加减都还是它，
  // 表现就是"卖了东西一分钱不进"、最后彻底卡死。每帧记一个正常值，
  // 发现坏了就退回上一帧 —— 最多损失一帧的钱，绝不会丢档。
  function healMoney(state) {
    if (!isFinite(state.money)) {
      const back = isFinite(state._lastGoodMoney) ? state._lastGoodMoney : 0;
      // 顺手把出问题的代码位置记下来：下次玩家再遇到，日志里就能直接看到是谁写坏的
      const where = ((new Error().stack || "").split("\n")[1] || "").trim().slice(0, 90);
      G.addLog(state, "余额被算成了非法值（" + String(state.money) + "），已退回上一帧的 ₽" +
        G.fmt(back) + "。位置：" + where, "info");
      state.money = back;
    }
    Object.defineProperty(state, "_lastGoodMoney", {
      value: state.money, writable: true, enumerable: false, configurable: true
    });
  }

  // 彻底卡死的判定：钱、种子、树果、商品全部见底 —— 什么都做不了。
  // 这时候不偷偷塞东西，而是挂一个标记，让阿特拉斯出面给一笔补助（界面弹窗）。
  A.isStuck = function (state) {
    if (state.money >= 10) return false;
    const has = (bag) => Object.keys(bag || {}).some((k) => bag[k] > 0);
    return !has(state.seeds) && !has(state.berries) && !has(state.products);
  };

  // 阿特拉斯给的补助：一次 ₽200，够买几袋种子重新起步
  A.AID_MONEY = 200;
  A.takeAid = function (state) {
    if (!state.stuck) return false;
    state.stuck = false;
    state.money += A.AID_MONEY;
    state.stats.revenueTotal += 0;   // 补助不算收入，别影响历史曲线
    G.addLog(state, "收下了阿特拉斯塞过来的 ₽" + G.fmt(A.AID_MONEY) + "。他没多说，转身就去搬种子了。", "good");
    G.clearBonusCache();
    return true;
  };

  // 每帧看一眼：卡死了就把标记立起来（界面据此弹窗）
  function markStuck(state) {
    if (A.isStuck(state)) state.stuck = true;
    else state.stuck = false;
  }

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
    healMoney(state);
    markStuck(state);
    // 洗点退掉「阡陌」之后田会多出来。收完的自动裁掉；还长着东西的留着等这一茬。
    if (state.plots.length > G.plotCount(state)) G.syncPlots(state);

    const earned = state.money - before;
    state.playTime += dt;
    noteRate(state, dt);
    return { earned: earned };
  };

  G.engine = A;
  G.advance = A.advance;
})();
