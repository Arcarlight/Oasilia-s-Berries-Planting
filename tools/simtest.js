// 无头数值验证：在浏览器里跑完整局，检查进度曲线、解锁条件、移民与离线结算。
// 用法：浏览器打开 tools/simtest.html（或用 Edge headless --dump-dom 抓结果）
window.SIM = {};
(function () {
  const out = [];
  function log(s) { out.push(s); }

  function fresh() { return G.newState(); }

  // 一个"正常玩家"的近似行为：田不空着，加工台不停，有钱就学配方/做道具
  function eng2Evaluator(state, picks, flavor) {
    return G.evaluateResearch(state, picks, flavor);
  }

  // 给模拟报告用：跑了多少趟、研发了多少配方、煮废多少锅
  const simStats = { trips: 0, research: 0, waste: 0, spent: 0 };

  function bot(state) {
    const eng = G.engine;
    const b = G.bonuses(state);

    // 1. 收
    eng.harvestAll(state);

    // 2. 加工台尽量塞满（用最值钱的配方配最值钱的树果）
    // 加工台是按「次数」算进度的，而不少常客的解锁条件正是累计加工 N 次
    // （区域 9/10 要 2.6万 ~ 9万 次）。长配方（特殊糕点要 100~160 秒）每秒收益
    // 不低，但会占着工位把次数进度拖垮 —— 真玩家这时候会先做快的。
    //
    // 关键是"只盯当前区域那道门槛"：盯全地图的会被最远的 9 万次拖住，
    // 一直做小果酱、收入塌掉（踩过这个坑）。
    const gate = (function () {
      let need = 0;
      eng.regionRegulars(state.region).forEach((rg) => {
        const u = rg.unlock || {};
        if (u.type === "crafted" && !eng.regState(state, rg.dex).unlocked) {
          need = Math.max(need, u.value);
        }
      });
      return need;
    })();
    const chasing = gate > 0 && (state.stats.crafted || 0) < gate;
    // 平时按「每秒收益」排；正在追当前区域的次数门槛时改挑快的
    const rate = (r) => (chasing ? 1 / r.time : r.mult * r.needCount / r.time);
    const recipes = eng.unlockedRecipes(state).sort((x, y) => rate(y) - rate(x));
    for (let i = 0; i < recipes.length; i++) {
      if (state.craftQueue.length >= eng.craftSlots(state)) break;
      const elig = eng.eligibleBerries(state, recipes[i]);
      if (!elig.length) continue;
      elig.sort((x, y) => y.basePrice - x.basePrice);
      for (let j = 0; j < elig.length; j++) {
        const r = eng.craft(state, recipes[i].id, elig[j].id);
        if (r.ok) break;
        window.__why[r.why] = (window.__why[r.why] || 0) + 1;
      }
    }

    // 3. 卖商品：交给喜欢这个味道的常客（顺便涨好感）
    const mine = eng.regionRegulars(state.region).filter((r) => eng.regState(state, r.dex).unlocked);
    Object.keys(state.products).forEach((k) => {
      const keep = 2;
      if (state.products[k] <= keep) return;
      const recipe = G.RECIPE_BY_ID[k.split("|")[0]];
      let target = null;
      if (recipe) {
        if (mine.some((r) => r.flavor === recipe.flavor)) {
          target = mine.filter((r) => r.flavor === recipe.flavor)
            .sort((a, b) => eng.regState(state, b.dex).aff - eng.regState(state, a.dex).aff)[0];
        } else if (mine.length) {
          target = mine[0];
        }
      }
      eng.sellProduct(state, k, state.products[k] - keep, target ? target.dex : null);
    });

    // 4. 卖生果：没人要的口味全卖，有人要的留一部分
    const needed = {};
    recipes.forEach((r) => { needed[r.needFlavor] = true; if (r.needBerry) needed["#" + r.needBerry] = true; });
    Object.keys(state.berries).forEach((id) => {
      const berry = G.BERRY_BY_ID[id];
      const keep = (needed[berry.flavor] || needed["#" + id]) ? 40 : 0;
      if (state.berries[id] > keep) eng.sellBerry(state, +id, state.berries[id] - keep);
    });

    // 4.4 常客全解锁后开始攒移民费，停止一切非必要支出
    const moveGate = eng.canMigrate(state);
    const saving = moveGate.allDone;

    // 4.41 让阿特拉斯出门：素材只能这么来，也是研发的前提
    if (!state.atlas.trip && !state.atlas.craft) {
      const want = {};
      const mats = (G.MATERIALS || []).filter((m) => m.trip);
      // 优先补手上最缺的材料，剩下的随便买一点
      const missing = mats.filter((m) => (state.materials[m.id] || 0) < 6)
        .sort((a, b) => a.price - b.price);
      missing.slice(0, 2).forEach((m) => { want[m.id] = 2; });
      if (!Object.keys(want).length) want[mats[0].id] = 2;
      // 出远门是要花钱的，钱不够就先别去（早期尤其明显）
      if (state.money > eng.tripCost(state, want).cost * 3 && eng.startTrip(state, want).ok) simStats.trips++;
    }

    // 4.42 有素材就往锅里丢：挑一个还没做过的搭配，丢够料再搅
    if (!state.atlas.trip && !state.pot.stir && !state.pot.pending) {
      const ownedFind = Object.keys(state.finds).filter((k) => state.finds[k] > 0);
      const ownedBerry = Object.keys(state.berries).filter((k) => state.berries[k] > 0);
      if (ownedFind.length >= 2 && ownedBerry.length) {
        const berryId = +ownedBerry.sort((x, y) => G.BERRY_BY_ID[y].basePrice - G.BERRY_BY_ID[x].basePrice)[0];
        const flavor = G.BERRY_BY_ID[berryId].flavor;
        for (let c = 0; c < (G.RESEARCH_COMBOS || []).length; c++) {
          const combo = G.RESEARCH_COMBOS[c];
          if ((state.maxRegion || 1) < combo.region) continue;
          // 这一组底料手上有齐吗
          // 同一个素材可以在组合里出现多次（特殊糕点就是「两份 + 两份」），
          // 所以要按用量数，不能简单地"用过的就不再用"
          const pick = [];
          const used = {};
          for (let r = 0; r < combo.need.length; r++) {
            const role = combo.need[r];
            const f = ownedFind.filter((id) =>
              G.FIND_BY_ID[id].role === role && (state.finds[id] || 0) > (used[id] || 0))[0];
            if (!f) break;
            used[f] = (used[f] || 0) + 1;
            pick.push(f);
          }
          if (pick.length < combo.need.length) continue;
          // 糖果那一条还得配一样香料
          if (combo.requireSpice) {
            const sp = ownedFind.filter((id) => G.FIND_BY_ID[id].role === "spice" && pick.indexOf(id) < 0)[0];
            if (sp) pick.push(sp); else continue;
          }
          const ev = G.evaluateResearch(state, pick, flavor, pick.length + 1);
          if (ev.kind !== "recipe" || state.money < ev.cost * 1.5) continue;
          G.engine.potClear(state);
          if (!G.engine.potAdd(state, "berry", berryId).ok) continue;
          pick.forEach((id) => G.engine.potAdd(state, "find", id));
          const st = G.engine.potStir(state);
          if (st.ok) { simStats.research++; simStats.spent += st.preview.cost; }
          break;
        }
      }
    }

    // 4.425 有钱就换锅：格子多了才下得了特殊糕点（两份 + 两份的底料）
    if (state.pot.level < G.POT_LEVELS.length && !saving) {
      const nextLv = G.POT_LEVELS[state.pot.level];
      if (state.money > nextLv.cost * 5) eng.potUpgrade(state);
    }

    // 4.43 锅里有结果就收下（记下做法），别让它一直挂着
    if (state.pot.pending) {
      if (state.pot.pending.ok && state.pot.pending.recipeId) G.engine.potKeepRecipe(state);
      else G.engine.potDismiss(state);
    }

    // 4.5 学配方优先于扩张：配方是收益乘数
    const locked2 = G.RECIPES.filter((r) => !r.research && !state.recipes[r.id] && r.region <= state.maxRegion)
      .sort((x, y) => x.cost - y.cost);
    if (!saving && locked2.length && state.money > locked2[0].cost * 1.3) eng.buyRecipe(state, locked2[0].id);

    // 4.6 买地（前 8 块地性价比最高）
    for (let g = 0; g < 3; g++) {
      const price = eng.plotPrice(state);
      if (!saving && (state.extraPlots || 0) < eng.plotCap(state) && state.money > price * 2.5) eng.buyPlot(state);
      else break;
    }

    // 5. 买种子 + 播种：轮换品种（玩家会为了不同口味的配方多种几样）
    const avail = G.BERRIES.filter((x) => x.region <= state.maxRegion)
      .sort((x, y) => y.basePrice - x.basePrice);
    const wide = avail.slice(0, 12);
    state.plots.forEach((p, i) => {
      if (p.berry || p.ripe) return;
      const stock = wide.filter((b) => (state.seeds[b.id] || 0) > 0);
      if (stock.length) { eng.plant(state, i, stock[i % stock.length].id); return; }
      const target = wide[i % wide.length];
      const price = G.seedPrice(state, target);
      if (state.money > price * 4) {
        if (eng.buySeed(state, target.id, 1)) eng.plant(state, i, target.id);
      }
    });
    // 只在真的有缺口时补种子，别囤
    const emptyNow = state.plots.filter((p) => !p.berry).length;
    if (emptyNow > 0) {
      for (let k = 0; k < wide.length; k++) {
        const berry = wide[k];
        if ((state.seeds[berry.id] || 0) > 0) continue;
        const price = G.seedPrice(state, berry);
        if (state.money > price * 8) eng.buySeed(state, berry.id, 1);
      }
    }

    // 6. 再学一个配方（钱多的话）
    const locked = G.RECIPES.filter((r) => !state.recipes[r.id] && r.region <= state.maxRegion)
      .sort((x, y) => x.cost - y.cost);
    if (!saving && locked.length && state.money > locked[0].cost * 4) {
      eng.buyRecipe(state, locked[0].id);
    }

    // 7. 阿特拉斯：让他做道具（测试材料→制作链路）
    if (!state.atlas.craft && (G.ITEMS || []).length) {
      const want = (G.ITEMS || []).filter((it) => (it.region || 1) <= state.maxRegion)
        .filter((it) => (state.items[it.id] || 0) < it.effects.length);
      for (let i = 0; i < want.length; i++) {
        const it = want[i];
        let matCost = 0;
        Object.keys(it.materials).forEach((mid) => {
          const m = (G.MATERIALS || []).filter((x) => x.id === mid)[0];
          if (m) matCost += m.price * 2.6 * it.materials[mid];
        });
        if (state.money < matCost * 6) continue;
        let ok = true;
        Object.keys(it.materials).forEach((mid) => {
          const has = state.materials[mid] || 0;
          const need = it.materials[mid];
          if (has < need && !eng.buyMaterial(state, mid, need - has)) ok = false;
        });
        if (ok && eng.orderCraft(state, it.id).ok) break;
      }
    }
    eng.collectCraft(state);

    // 7.2 打开自动交付 / 自动加工（有对应道具才生效）
    if (eng.autoTradeUnlocked(state)) state.autoTrade = true;
    if (eng.autoUnlocked(state) && !state.autoRecipe && recipes.length) {
      state.autoRecipe = recipes[0].id;
    }

    // 7.5 雇帮手
    const slots = eng.helperSlots(state);
    if (state.helpers.length < slots) {
      const cands = eng.regionRegulars(state.region)
        .filter((r) => eng.regState(state, r.dex).unlocked && !state.helpers.some((h) => h.dex === r.dex));
      if (cands.length) eng.buyHelper(state, cands[0].dex);
    }

    // 8. 移民
    const chk = eng.canMigrate(state);
    if (chk.ok) {
      const r = eng.migrate(state);
      if (r) {
        // 天赋点随手花掉
        let spent = true;
        while (spent) {
          spent = false;
          const cand = G.TALENTS.filter((t) => (state.talents[t.id] || 0) < t.max)
            .sort((x, y) => G.talentCost(x, state.talents[x.id] || 0) - G.talentCost(y, state.talents[y.id] || 0));
          for (let i = 0; i < cand.length; i++) {
            if (eng.buyTalent(state, cand[i].id)) { spent = true; break; }
          }
        }
        log("  移民 " + G.time(state.playTime) + " → 区域 " + r.region + "（+" + r.talentPoints + " 天赋点，" +
          "累计 " + G.fmt(state.stats.revenueTotal) + "）");
      }
    }
  }

  function run(seconds, label, stepSec) {
    const state = fresh();
    const step = stepSec || 5;
    const marks = [];
    const checkpoints = [600, 1800, 3600, 7200, 14400, 28800, 43200, 64800, 86400,
      129600, 172800, 259200, 345600];
    let ci = 0;
    let prestigeAt = [];
    let lastRegion = 1;
    let regionStart = 0;
    let regionIncome = 0;
    for (let t = 0; t < seconds; t += step) {
      bot(state);
      G.advance(state, step);
      regionIncome = state.stats.revenueRegion;
      if (state.region !== lastRegion) {
        prestigeAt.push({
          t: t, from: lastRegion, to: state.region,
          dwell: t - regionStart,
          income: state.stats.revenueTotal
        });
        regionStart = t;
        lastRegion = state.region;
      }
      while (ci < checkpoints.length && t >= checkpoints[ci]) {
        marks.push({ t: checkpoints[ci], money: state.money, region: state.region,
          dex: Object.keys(state.dex).length, recipes: Object.keys(state.recipes).length,
          regulars: Object.keys(state.regulars).filter((d) => state.regulars[d].unlocked).length,
          items: Object.keys(state.items).length, lifetime: state.stats.revenueTotal,
          plots: state.plots.length, mats: Object.keys(state.materials).length,
          seeds: Object.keys(state.seeds).reduce((a, k) => a + state.seeds[k], 0),
          helpers: state.helpers.length, queue: state.craftQueue.length });
        ci++;
      }
    }
    log("=== " + label + "（模拟 " + G.time(seconds) + "）===");
    marks.forEach((m) => {
      log("  t=" + G.time(m.t).padEnd(8) + " 区" + m.region + " 钱=" + G.fmt(m.money).padEnd(7) +
        " 地=" + m.plots + " 种=" + m.seeds + " 图鉴=" + m.dex + " 配方=" + m.recipes +
        " 常客=" + m.regulars + " 道具=" + m.items + " 材料=" + m.mats + " 帮手=" + m.helpers +
        " 加工台=" + m.queue + " 累计=" + G.fmt(m.lifetime));
    });
    prestigeAt.forEach((p) => {
      log("  移民：区域 " + p.from + " 停留 " + G.time(p.dwell) + "（累计到 " + G.fmt(p.income) + "）→ 区域 " + p.to);
    });
    if (!prestigeAt.length) log("  移民记录：无");
    log("  加工失败原因：" + JSON.stringify(window.__why));
    log("  材料库存：" + JSON.stringify(state.materials));
    log("  最终：区域 " + state.region + "，累计收入 " + G.fmt(state.stats.revenueTotal) +
      "，收获 " + G.fmt(state.stats.harvested) + "，加工 " + G.fmt(state.stats.crafted) +
      "，天赋点 " + state.talentPoints);
    log("  出门 " + simStats.trips + " 趟，研发成功 " + simStats.research +
      " 个、煮废 " + simStats.waste + " 锅，研发花掉 ₽" + G.fmt(simStats.spent) +
      "，仓库素材 " + Object.keys(state.finds).length + " 种");
    return state;
  }

  // ---- 断言 ----
  const fails = [];
  function check(name, cond, extra) {
    if (!cond) fails.push(name + (extra ? " → " + extra : ""));
  }

  function state9Setup(st) {
    st.items["vine_cart"] = 3;   // 自动出货 Lv.3
    st.berries[1] = 17;
    st.stallReserve = 0;         // 这一条测的是"库存是不是整数"，先不设保留量
    st.plots.forEach((p) => { p.berry = null; p.ripe = false; });
  }

  function unitTests() {
    const s = fresh();
    check("初始 4 块田", s.plots.length === 4, s.plots.length);
    check("初始 3 颗种子", s.seeds[1] === 3, JSON.stringify(s.seeds));

    // 种 → 长 → 收
    G.engine.plant(s, 0, 1);
    check("播种成功", s.plots[0].berry === 1);
    const berry = G.BERRY_BY_ID[1];
    G.advance(s, berry.growTime + 2);
    check("成熟", s.plots[0].ripe === true, s.plots[0].grown);
    const n = G.engine.harvestPlot(s, 0);
    check("收获", n >= 2, n);
    check("收获计数", s.stats.harvested === n, s.stats.harvested);

    // 卖
    const before = s.money;
    const got = G.engine.sellBerry(s, 1, 1);
    check("卖出生果", s.money === before + got && got > 0, got);

    // 买种子
    s.money = 100;
    check("买种子", G.engine.buySeed(s, 2, 2) && s.seeds[2] === 2, JSON.stringify(s.seeds));

    // 配方与加工
    s.money = 100000;
    check("学配方", G.engine.buyRecipe(s, "jam_spicy"));
    s.berries[1] = 10;
    const c = G.engine.craft(s, "jam_spicy", 1);
    check("开始加工", c.ok, c.why);
    G.advance(s, G.RECIPE_BY_ID["jam_spicy"].time + 2);
    check("加工完成", Object.keys(s.products).length === 1, JSON.stringify(s.products));
    const key = Object.keys(s.products)[0];
    const moneyBefore = s.money;
    const sold = G.engine.sellProduct(s, key, 1);
    check("卖出商品", s.money === moneyBefore + sold && sold > 0, sold);

    // 存档往返
    const code = G.exportSave(s);
    const back = G.importSave(code);
    check("存档往返", back.money === s.money && back.stats.harvested === s.stats.harvested);

    // 离线结算不报错
    const s2 = fresh();
    G.advance(s2, 8 * 3600, { silent: true });
    check("离线上限内不崩", typeof s2.money === "number");

    // 自动化：加工台工位、自动加工、帮手槽位、叫卖收益
    const s3 = fresh();
    check("初始 2 个工位", G.engine.craftSlots(s3) === 2, G.engine.craftSlots(s3));
    s3.items["stone_mill"] = 5;
    check("工坊 Lv5 → 4 个工位", G.engine.craftSlots(s3) === 4,
      JSON.stringify(G.engine.craftSlotInfo(s3)));
    check("有工坊道具才解锁自动加工", G.engine.autoUnlocked(s3) === true);
    const s4 = fresh();
    check("没有工坊道具时自动加工是锁的", G.engine.autoUnlocked(s4) === false);

    s3.recipes["jam_spicy"] = true;
    s3.berries[1] = 200;
    s3.autoRecipe = "jam_spicy";
    G.advance(s3, 120);
    const made = Object.keys(s3.products).reduce((a, k) => a + s3.products[k], 0);
    check("自动加工真的在出货", made > 0, made);
    check("自动加工不越过工位上限", s3.craftQueue.length <= G.engine.craftSlots(s3),
      s3.craftQueue.length);
    s3.autoRecipe = null;
    G.advance(s3, 30); // 先把在制品收完
    const idleMade = Object.keys(s3.products).reduce((a, k) => a + s3.products[k], 0);
    G.advance(s3, 300);
    const laterMade = Object.keys(s3.products).reduce((a, k) => a + s3.products[k], 0);
    check("关掉后不再自动加工", laterMade === idleMade && s3.craftQueue.length === 0,
      idleMade + " → " + laterMade + "（队列 " + s3.craftQueue.length + "）");

    // 叫卖：手上没货就是 0（它靠卖真实库存，不是凭空生钱）；
    // 有货的时候一次能吆喝动 2 个，进账要明显高于直接卖单价
    const s5 = fresh();
    const cheapBerry = G.bestAvailableBerry(s5);
    s5.berries[cheapBerry.id] = 20;
    check("叫卖一次抵得上两个生果的钱", G.clickSellValue(s5) >= G.berrySellPrice(s5, cheapBerry) * 2,
      G.clickSellValue(s5) + " vs " + G.berrySellPrice(s5, cheapBerry));

    // 帮手铃给槽位
    const s6 = fresh();
    s6.items["helper_bell"] = 1;
    check("帮手铃 Lv1 → 1 个帮手槽", G.engine.helperSlots(s6) === 1, G.engine.helperSlots(s6));
    s6.regulars[190] = { aff: 0, exp: 0, unlocked: true, orders: 0 };
    s6.money = 1e9;
    check("能请到帮手", G.engine.buyHelper(s6, 190) === true, JSON.stringify(s6.helpers));

    // 自动交付
    const s7 = fresh();
    s7.items["wood_sign"] = 1;               // sellBonus → 解锁自动交付
    s7.autoTrade = true;
    s7.recipes["jam_spicy"] = true;
    const spicyReg = G.REGULARS.filter((r) => r.region === 1 && r.flavor === "辣")[0];
    s7.regulars[spicyReg.dex] = { aff: 0, exp: 0, unlocked: true, orders: 0 };
    s7.products["jam_spicy|1"] = 20;
    const moneyBefore7 = s7.money;
    G.advance(s7, 10);
    check("自动交付把钱收进来", s7.money > moneyBefore7, s7.money - moneyBefore7);
    check("自动交付确实出了货", (s7.products["jam_spicy|1"] || 0) < 20, s7.products["jam_spicy|1"]);
    check("自动交付涨了好感", G.engine.regState(s7, spicyReg.dex).exp > 0 || G.engine.regState(s7, spicyReg.dex).aff > 0);
    check("没招牌时不解锁自动交付", G.engine.autoTradeUnlocked(fresh()) === false);

    // 移民：库存折现 + 地块裁回正确数量 + 起步种子
    const s8 = fresh();
    s8.region = 1; s8.maxRegion = 1; s8.money = 1e7; s8.stats.revenueRegion = 1e7;
    G.REGULARS.filter((r) => r.region === 1).forEach((r) => {
      s8.regulars[r.dex] = { aff: 0, exp: 0, unlocked: true, orders: 0 };
    });
    s8.extraPlots = 4; G.syncPlots(s8);
    s8.plots.forEach((p) => { p.berry = 1; });
    s8.berries[1] = 100;
    s8.products["jam_spicy|1"] = 50;
    const mig = G.engine.migrate(s8);
    check("移民成功", !!mig, JSON.stringify(G.engine.canMigrate(s8)));
    check("移民把库存折成现钱带走", s8.money > 0, s8.money);
    check("移民后地块数量正确", s8.plots.length === G.REGION_BY_ID[2].plots,
      s8.plots.length + " vs " + G.REGION_BY_ID[2].plots);
    const starterSeeds = Object.keys(s8.seeds).filter((k) => s8.seeds[k] > 0);
    check("移民后给起步种子", starterSeeds.length === 1 && s8.seeds[starterSeeds[0]] === 5,
      JSON.stringify(s8.seeds));

    // 摊位自动出货：库存必须永远是整数
    const s9 = fresh();
    state9Setup(s9);
    G.advance(s9, 37);
    const frac = Object.keys(s9.berries).filter((k) => s9.berries[k] % 1 !== 0);
    check("生果库存不出现小数", frac.length === 0, JSON.stringify(s9.berries));
    check("摊位确实卖掉了东西", (s9.berries[1] || 0) < 17, s9.berries[1]);
    check("种子库存不出现小数", Object.keys(s9.seeds).every((k) => s9.seeds[k] % 1 === 0),
      JSON.stringify(s9.seeds));

    // 摊位不许"攒份额"：没货的时候不生产，果子一入库不该被一次性清空。
    // 原来 stallCarry 在空仓时也一直涨（上限 10000），收一波果子就被瞬间卖光。
    const sBurst = fresh();
    sBurst.items["vine_cart"] = 5;
    sBurst.stallReserve = 0;
    sBurst.plots.forEach((p) => { p.berry = null; p.ripe = false; });
    sBurst.berries = {};
    G.advance(sBurst, 600);                        // 空转十分钟攒份额
    check("空仓时份额不累积", !sBurst.stallCarry, sBurst.stallCarry);
    sBurst.berries[1] = 200;                       // 收一波
    G.advance(sBurst, 1);                          // 只过一秒
    check("果子入库不会被瞬间卖光", (sBurst.berries[1] || 0) > 195, sBurst.berries[1]);

    // 叫卖：要真的卖货，不能凭空生钱
    const sClick = fresh();
    sClick.berries[1] = 10;
    const mBefore = sClick.money;
    const preview = G.clickSellValue(sClick);
    const hk = G.engine.hawk(sClick);
    check("叫卖真的卖出了生果", hk.ok && hk.count > 0 && sClick.berries[1] === 10 - hk.count,
      JSON.stringify({ sold: hk.count, left: sClick.berries[1] }));
    check("叫卖进账等于预告", hk.earned === preview, hk.earned + " vs " + preview);
    check("叫卖扣了库存才进钱", sClick.money === mBefore + hk.earned, sClick.money - mBefore);
    check("卖光了就叫卖不动", (function () {
      const st = fresh();
      st.berries = {};
      return G.engine.hawk(st).ok === false && st.money === 0;
    })());
    check("掌力天赋让一次能吆喝更多",
      (function () {
        const st = fresh();
        const before = G.clickSellBatch(st);
        st.talents.click = 12;
        return G.clickSellBatch(st) > before;
      })(), "掌力 → " + G.clickSellBatch((function () { const st = fresh(); st.talents.click = 12; return st; })()) + " 个");

    // 基础食材能在商店买到，香料不行
    const sBuy = fresh();
    sBuy.money = 100000;
    const bf = G.engine.buyFind(sBuy, "flour", 3);
    check("基础食材能买", bf.ok && sBuy.finds.flour === 3, JSON.stringify(sBuy.finds));
    check("买食材要花比卖价多得多的钱", bf.price === G.findBuyPrice(G.FIND_BY_ID.flour) * 3, bf.price);
    check("香料不卖", G.engine.buyFind(sBuy, "moonherb", 1).ok === false);
    check("钱不够买不了", (function () {
      const st = fresh();
      st.money = 1;
      return G.engine.buyFind(st, "flour", 1).ok === false;
    })());

    // 出远门要花钱
    const sTrip = fresh();
    sTrip.money = 100000;
    const tc = G.engine.tripCost(sTrip, { wood: 2, clay: 1 });
    check("出行有报价", tc.cost > 0 && tc.cost < Math.round(tc.value * 2.6), tc.cost + " vs 杂货铺 " + Math.round(tc.value * 2.6));
    const mBefore2 = sTrip.money;
    const tr = G.engine.startTrip(sTrip, { wood: 2, clay: 1 });
    check("出行真的扣钱", tr.ok && sTrip.money === mBefore2 - tc.cost, mBefore2 - sTrip.money);
    sTrip.atlas.trip.until = G.now(sTrip) - 1;
    G.engine.finishTrip(sTrip);
    // 随机事件可能额外多带材料回来，所以只断言"至少到货"
    check("钱扣了、材料也到了",
      (sTrip.materials.wood || 0) >= 2 && (sTrip.materials.clay || 0) >= 1,
      JSON.stringify(sTrip.materials));
    const sPoor = fresh();
    sPoor.money = 1;
    check("没钱出不了门", G.engine.startTrip(sPoor, { wood: 5 }).ok === false, sPoor.money);

    // 摊位保留量：低于保留量的果子不许被自动卖掉
    const s11 = fresh();
    s11.items["vine_cart"] = 5;
    s11.berries[1] = 25;
    s11.stallReserve = 20;
    G.advance(s11, 120);
    check("摊位不吃掉保留量以内的果子", (s11.berries[1] || 0) >= 20, s11.berries[1]);

    // 摊位开关
    const s12 = fresh();
    s12.items["vine_cart"] = 5;
    s12.berries[1] = 200;
    s12.stallReserve = 0;
    s12.stallOn = false;
    G.advance(s12, 120);
    check("关掉摊位后一个果子都不卖", s12.berries[1] === 200, s12.berries[1]);
    s12.stallOn = true;
    G.advance(s12, 120);
    check("打开摊位后开始出货", (s12.berries[1] || 0) < 200, s12.berries[1]);

    // 旧存档里的小数库存要被抹平
    const s10 = fresh();
    s10.berries[1] = 4.659182000006376;
    s10.products["jam_spicy|1"] = 2.7;
    s10.needSanitize = true;
    G.advance(s10, 1);
    check("载入时抹平小数库存", s10.berries[1] === 4 && s10.products["jam_spicy|1"] === 2,
      JSON.stringify(s10.berries) + JSON.stringify(s10.products));

    check("常客数据 60 位", (G.REGULARS || []).length === 60, (G.REGULARS || []).length);
    check("配方 60 个（10 类 × 5 味 + 10 招牌）", G.RECIPES.length === 60, G.RECIPES.length);

    // ── 素材 / 仓库 / 研发 ────────────────────────────────────────────────
    check("素材表 10 种", G.FINDS.length === 10, G.FINDS.length);
    check("素材能分成底料和香料", G.FINDS.filter((f) => f.role === "spice").length === 6,
      G.FINDS.filter((f) => f.role === "spice").length);
    check("研发专属品类不在商店里",
      G.RECIPES.filter((r) => r.researchOnly).length === 0 &&
      G.RECIPE_CATS.filter((c) => c.researchOnly).length === 10,
      G.RECIPE_CATS.filter((c) => c.researchOnly).length + " 个研发专属（4 个甜品 + 6 个特殊糕点）");

    // 出门会带素材回来
    const st1 = fresh();
    st1.maxRegion = 9;
    st1.money = 1e6;
    const kinds = {};
    for (let i = 0; i < 120; i++) {
      G.engine.startTrip(st1, {});
      st1.atlas.trip.until = G.now(st1) - 1;
      G.engine.finishTrip(st1);
    }
    Object.keys(st1.finds).forEach((k) => { kinds[k] = true; });
    check("出门能带回素材（120 趟出 6 种以上）", Object.keys(kinds).length >= 6,
      Object.keys(kinds).length + " 种");
    check("出门回来有一条完整汇总",
      (function () {
        const st = fresh();
        st.money = 1e6;                       // 出远门要花钱
        G.engine.startTrip(st, { wood: 2 });
        st.atlas.trip.until = G.now(st) - 1;
        const r = G.engine.finishTrip(st);
        return r && /回来了/.test(r.summary) && r.summary.indexOf("木料×2") >= 0;
      })(), "看看 finishTrip 的 summary");
    check("汇总会写进日志",
      (function () {
        const st = fresh();
        st.money = 1e6;
        G.engine.startTrip(st, { wood: 1 });
        st.atlas.trip.until = G.now(st) - 1;
        G.engine.finishTrip(st);
        return st.log.slice(0, 5).some((e) => e.text.indexOf("回来了") >= 0);
      })());
    check("阿特拉斯页能拿到上次带回来的东西",
      (function () {
        const st = fresh();
        st.maxRegion = 9;
        st.money = 1e6;
        G.engine.startTrip(st, { wood: 1 });
        st.atlas.trip.until = G.now(st) - 1;
        G.engine.finishTrip(st);
        return st.atlas.report && Array.isArray(st.atlas.report.got) && st.atlas.report.got.length > 0;
      })());
    check("report 不会因为下次出门被清掉",
      (function () {
        const st = fresh();
        st.money = 1e6;
        G.engine.startTrip(st, { wood: 1 });
        st.atlas.trip.until = G.now(st) - 1;
        G.engine.finishTrip(st);
        G.engine.startTrip(st, { wood: 1 });
        return !!st.atlas.report;
      })());

    check("底料比香料常见很多",
      (function () {
        let st = 0, sp = 0;
        Object.keys(st1.finds).forEach((k) => {
          if (G.FIND_BY_ID[k].role === "spice") sp += st1.finds[k]; else st += st1.finds[k];
        });
        return st > sp * 2;
      })(), "底料 " + Object.keys(st1.finds).length);

    // 仓库：卖素材换钱
    const st2 = fresh();
    st2.finds = { flour: 5 };
    const before2 = st2.money;
    G.engine.sellFind(st2, "flour", 3);
    check("卖素材进账", st2.money === before2 + G.FIND_BY_ID.flour.price * 3, st2.money - before2);
    check("卖完还剩两个", st2.finds.flour === 2, st2.finds.flour);
    G.engine.dropFind(st2, "flour", 99);
    check("丢素材不换钱且清空", st2.finds.flour === undefined && st2.money === before2 + 1200);

    // 研发：底料组合决定品类
    const rState = fresh();
    rState.maxRegion = 10;
    rState.money = 1e12;
    rState.finds = { flour: 40, moomoo: 40, butter: 40, sugar: 40, cinderpepper: 20, saltbloom: 20, moonherb: 20 };
    rState.berries = { 1: 99 };   // 樱子果：辣味
    const spicyBerry = G.BERRY_BY_ID[1];
    check("测试用果子是辣味", spicyBerry.flavor === "辣", spicyBerry.flavor);

    const cake = G.evaluateResearch(rState, ["flour", "moomoo"], spicyBerry.flavor);
    check("面粉+鲜奶 → 蛋糕", cake.kind === "recipe" && cake.combo.cat === "cake", cake.kind + "/" + (cake.combo || {}).cat);
    const bread = G.evaluateResearch(rState, ["flour", "moomoo", "butter"], "辣");
    check("面粉+鲜奶+黄油 → 面包", bread.kind === "recipe" && bread.combo.cat === "bread", bread.kind);
    const cookie = G.evaluateResearch(rState, ["flour", "butter", "sugar"], "辣");
    check("面粉+黄油+砂糖 → 曲奇", cookie.kind === "recipe" && cookie.combo.cat === "cookie", cookie.kind);
    const zero = G.evaluateResearch(rState, ["flour"], "辣");
    check("只放一样底料拦下来", zero.kind === "invalid", zero.kind);
    // 特殊糕点要下 4 样底料（两份 + 两份），所以上限放宽到四样；
    // 五样才算"放太杂"
    rState.pot.level = 2;   // 特殊糕点要 5 格起的锅
    const layer4 = G.evaluateResearch(rState, ["flour", "flour", "butter", "butter"], "辣");
    check("面粉×2+黄油×2 能配成千层酥",
      layer4.kind === "recipe" && layer4.combo.cat === "layer", layer4.kind + "/" + (layer4.combo || {}).cat);
    const tooMuch = G.evaluateResearch(rState,
      ["flour", "flour", "flour", "flour", "flour", "butter", "butter", "butter", "moomoo"], "辣");
    check("底料超过八样拦下来", tooMuch.kind === "invalid", tooMuch.kind);
    const twoSpice = G.evaluateResearch(rState, ["flour", "moomoo", "cinderpepper", "saltbloom"], "辣");
    check("两种香料拦下来", twoSpice.kind === "invalid", twoSpice.kind);

    // 香料：配对加分，配错毁锅
    const candyGood = G.evaluateResearch(rState, ["sugar", "cinderpepper"], "辣");
    check("砂糖+火口椒+辣味 → 糖果（配对）",
      candyGood.kind === "recipe" && candyGood.combo.cat === "candy" && candyGood.good === true,
      candyGood.kind + "/good=" + candyGood.good);
    const candyBad = G.evaluateResearch(rState, ["sugar", "cinderpepper"], "甜");
    check("火口椒配甜味会煮废", candyBad.kind === "waste", candyBad.kind);
    const sourNeutral = G.evaluateResearch(rState, ["sugar", "cinderpepper"], "酸");
    check("既不算配对也不算毁锅", sourNeutral.kind === "recipe" && sourNeutral.good === false,
      sourNeutral.kind + "/good=" + sourNeutral.good);

    // 树果数值的硬指标 —— 这两个坑以前都踩过：
    //   1. 同区域内差 3~7 倍，木子果 / 番荔果 / 草蚕果 / 谜芝果是纯陷阱
    //   2. 区域 9 最好的（83.3）还不如区域 8 最好的（111.1）
    // 指标是「每格每小时的收益」：果价 × 产量 ÷ 生长时间
    const berryDens = (b) => b.basePrice * b.yield / b.growHours;
    const byRegion = {};
    G.BERRIES.forEach((b) => { (byRegion[b.region] = byRegion[b.region] || []).push(b); });
    const regions = Object.keys(byRegion).map(Number).sort((a, b) => a - b);
    let prevCeil = 0;
    let worstRatio = 1;
    let monotone = true;
    regions.forEach((r) => {
      const ds = byRegion[r].map(berryDens);
      const lo = Math.min.apply(null, ds), hi = Math.max.apply(null, ds);
      worstRatio = Math.min(worstRatio, lo / hi);
      if (hi <= prevCeil) monotone = false;
      prevCeil = Math.max(prevCeil, hi);
    });
    check("没有「种了不如不种」的陷阱果（同区内最低 / 最高 ≥ 65%）",
      worstRatio >= 0.65, "最差的一区只有 " + (worstRatio * 100).toFixed(0) + "%");
    check("越后面的区域天花板越高", monotone);
    check("产量随区域递增",
      (function () {
        const avg = regions.map((r) => byRegion[r].reduce((a, b) => a + b.yield, 0) / byRegion[r].length);
        for (let i = 1; i < avg.length; i++) if (avg[i] < avg[i - 1]) return false;
        return true;
      })());
    check("种子价还是果价的七成上下",
      G.BERRIES.every((b) => Math.abs(b.seedCost / b.basePrice - 0.7) < 0.06));

    // 特殊糕点：区域 + 锅等级两道门槛
    const sp = fresh();
    sp.maxRegion = 10;
    sp.money = 1e12;
    sp.finds = { flour: 20, moomoo: 20, butter: 20, sugar: 20 };
    const LAYER = ["flour", "flour", "butter", "butter"];
    const NAPOLEON = ["flour", "flour", "flour", "flour", "butter", "butter", "butter", "moomoo"];
    const at = (idv, lv) => {
      sp.pot.level = lv;
      return G.evaluateResearch(sp, idv, "甜", idv.length);
    };
    check("4 格的锅下不了千层酥（面粉×2+黄油×2 加一颗树果要 5 格）",
      at(LAYER, 1).kind === "invalid" && /锅/.test(at(LAYER, 1).why), at(LAYER, 1).why);
    check("换成 5 格的锅就能下了", at(LAYER, 2).kind === "recipe" && at(LAYER, 2).combo.cat === "layer",
      at(LAYER, 2).kind);
    sp.maxRegion = 4;
    check("区域不够照样不行", at(LAYER, 5).kind === "invalid");
    sp.maxRegion = 10;
    check("拿破仑（面粉×4+黄油×3+鲜奶×1）要 10 格的锅",
      at(NAPOLEON, 4).kind === "invalid" && at(NAPOLEON, 5).kind === "recipe");

    // 树果是软限制：不放也能出锅，但出来的是无味、五个味道全 0、价钱低一截
    const sTaste = fresh();
    sTaste.money = 1e12;
    sTaste.maxRegion = 10;
    sTaste.pot.level = 2;
    sTaste.finds = { flour: 9, butter: 9 };
    ["flour", "flour", "butter", "butter"].forEach((id) => G.engine.potAdd(sTaste, "find", id));
    const ckNoBerry = G.engine.potCheck(sTaste);
    check("不放树果也能开火", ckNoBerry.kind === "recipe" && ckNoBerry.flavor === "无味",
      ckNoBerry.kind + "/" + ckNoBerry.flavor);
    G.engine.potStir(sTaste);
    sTaste.clock += 60000 * 1000;
    const outNoBerry = G.engine.stepPot(sTaste);
    check("出锅的是无味的", outNoBerry && /无味/.test(outNoBerry.name), outNoBerry && outNoBerry.name);
    check("无味的雷达图五个角全是 0",
      (function () {
        const [rid, bid] = Object.keys(sTaste.products)[0].split("|");
        const prof = G.flavorProfile(G.RECIPE_BY_ID[rid], G.BERRY_BY_ID[+bid]);
        return +bid === 0 && G.FLAVORS_5.every((f) => prof[f] === 0);
      })());
    check("无味比正常便宜一个数量级",
      (function () {
        const [rid] = Object.keys(sTaste.products)[0].split("|");
        const r = G.RECIPE_BY_ID[rid];
        const best = G.BERRIES.slice().sort((a, b) => b.basePrice - a.basePrice)[0];
        return G.productValue(r, G.FLAVORLESS) * 20 < G.productValue(r, best);
      })());

    // 大锅：丢料 → 搅拌 → 出锅（成品直接进仓库，配方要不要记得自己决定）
    const potS = fresh();
    potS.maxRegion = 10;
    potS.money = 1e12;
    potS.finds = { flour: 40, moomoo: 40, butter: 40, sugar: 40, cinderpepper: 20, moonherb: 20 };
    potS.berries = { 1: 99 };                       // 樱子果：辣味
    check("锅默认 4 格、6 秒", G.engine.potSlots(potS) === 4 && G.engine.potStirSecs(potS) === 6,
      G.engine.potSlots(potS) + "格/" + G.engine.potStirSecs(potS) + "s");
    check("空锅搅不动", G.engine.potStir(potS).ok === false);
    check("只放树果不算数",
      (G.engine.potAdd(potS, "berry", 1).ok && G.engine.potCheck(potS).kind === "invalid"),
      G.engine.potCheck(potS).why);
    G.engine.potAdd(potS, "find", "sugar");
    G.engine.potAdd(potS, "find", "cinderpepper");
    const pchk = G.engine.potCheck(potS);
    check("砂糖+火口椒+辣味 → 糖果（配对）",
      pchk.kind === "recipe" && pchk.combo.cat === "candy" && pchk.good === true,
      pchk.kind + "/good=" + pchk.good);
    check("3 样料 → 前缀「丰富的」", G.potPrefix(3) === "丰富的", G.potPrefix(3));
    check("料越多倍率越高",
      G.potMultBonus(6) > G.potMultBonus(3) && G.potMultBonus(3) > G.potMultBonus(2),
      G.potMultBonus(2) + "/" + G.potMultBonus(3) + "/" + G.potMultBonus(6));

    const beforeMoney = potS.money;
    const stir = G.engine.potStir(potS);
    check("搅拌能开起来", stir.ok, stir.why || "");
    check("搅拌时扣了研发费", potS.money < beforeMoney, beforeMoney - potS.money);
    check("搅拌时锅里的料被收走",
      potS.pot.inPot.length === 0 && potS.finds.sugar === 39,
      JSON.stringify(potS.pot.inPot) + " 糖剩 " + potS.finds.sugar);
    check("搅拌中不能接着丢", G.engine.potAdd(potS, "find", "flour").ok === false);
    check("搅拌没到点不出货", G.engine.stepPot(potS) === null);

    potS.clock += 20000 * 1000;                     // 快进 20 秒
    const out2 = G.engine.stepPot(potS);
    check("到点出锅", !!out2 && out2.ok, JSON.stringify(out2));
    check("成品进了仓库", Object.keys(potS.products).some((k) => /^res_candy/.test(k)),
      JSON.stringify(potS.products));
    check("出锅不自动记配方（等玩家决定）",
      !Object.keys(potS.recipes).some((id) => /^res_/.test(id)), JSON.stringify(Object.keys(potS.recipes)));
    check("成品名带料数前缀", /^丰富的/.test(out2.name), out2.name);
    check("结果面板挂着等决定", !!potS.pot.pending && potS.pot.pending.recipeId, JSON.stringify(potS.pot.pending));

    G.engine.potKeepRecipe(potS);
    const rid2 = Object.keys(potS.recipes).filter((id) => /^res_/.test(id))[0];
    check("「记下做法」才进配方本", !!rid2, rid2);
    check("记下的配方能在加工台批量做",
      G.engine.unlockedRecipes(potS).some((r) => r.id === rid2));
    check("结果面板收起来了", !potS.pot.pending);
    check("研发配方加工时不吃素材",
      !G.RECIPE_BY_ID[rid2].fromFind && !G.RECIPE_BY_ID[rid2].findCount);

    G.engine.forgetRecipe(potS, rid2);
    check("配方可以删掉", !potS.recipes[rid2]);
    check("删了就不在加工列表里",
      !G.engine.unlockedRecipes(potS).some((r) => r.id === rid2));

    // 配错味道 → 废品
    const potW = fresh();
    potW.maxRegion = 10; potW.money = 1e12;
    potW.finds = { flour: 9, moomoo: 9, moonherb: 9 };
    potW.berries = { 1: 9 };
    G.engine.potAdd(potW, "berry", 1);
    G.engine.potAdd(potW, "find", "flour");
    G.engine.potAdd(potW, "find", "moomoo");
    G.engine.potAdd(potW, "find", "moonherb");
    check("月见草籽配辣味会煮废", G.engine.potCheck(potW).kind === "waste", G.engine.potCheck(potW).kind);
    const wasteBefore2 = potW.waste;
    G.engine.potStir(potW);
    potW.clock += 20000 * 1000;
    const wout = G.engine.stepPot(potW);
    check("废品进了仓库", potW.waste === wasteBefore2 + 1 && wout.ok === false, potW.waste);

    // 换锅
    const potU = fresh();
    potU.money = 1e9;
    check("换锅要花钱、格子变多、搅拌变快",
      (function () {
        const before = G.engine.potSlots(potU);
        const r = G.engine.potUpgrade(potU);
        return r.ok && G.engine.potSlots(potU) > before && G.engine.potStirSecs(potU) < 6;
      })());

    // 种子能卖能丢（以前只能囤着）
    const sSeed = fresh();
    sSeed.money = 0;
    sSeed.seeds = { 1: 9 };
    const seedBerry = G.BERRY_BY_ID[1];
    check("种子回收是折损价", G.seedSellPrice(sSeed, seedBerry) < G.seedPrice(sSeed, seedBerry),
      "回收 ₽" + G.seedSellPrice(sSeed, seedBerry) + " / 买入 ₽" + G.seedPrice(sSeed, seedBerry));
    const soldSeed = G.engine.sellSeed(sSeed, 1, 4);
    check("卖种子按颗结算", soldSeed.ok && soldSeed.n === 4 && sSeed.seeds[1] === 5,
      "剩 " + sSeed.seeds[1]);
    check("卖种子会进账", sSeed.money === G.seedSellPrice(sSeed, seedBerry) * 4, "₽" + sSeed.money);
    G.engine.sellSeed(sSeed, 1, 9999);
    check("卖光之后那一格不留 0", sSeed.seeds[1] === undefined);
    sSeed.seeds[2] = 3;
    G.engine.dropSeed(sSeed, 2, 9999);
    check("种子能直接丢掉", sSeed.seeds[2] === undefined);

    // 制品图鉴：做过一次就点亮，按「品类|口味」记
    const sDex = fresh();
    sDex.money = 1e6;
    sDex.recipes.jam_spicy = true;
    sDex.berries[1] = 50;
    check("还没做过时图鉴是空的", Object.keys(sDex.madeProducts || {}).length === 0,
      JSON.stringify(sDex.madeProducts));
    check("开工不会点亮图鉴（要等出货）",
      (function () {
        G.engine.craft(sDex, "jam_spicy", 1);
        return Object.keys(sDex.madeProducts || {}).length === 0;
      })());
    // 快进到出货
    for (let t = 0; t < 60; t++) G.advance(sDex, 1);
    check("做完就点亮了果酱·辣", sDex.madeProducts["jam|辣"] === true,
      JSON.stringify(sDex.madeProducts));
    check("同品类同口味的强化版算同一样东西",
      (function () {
        const r = G.makeResearchRecipe("jam", "辣", null, false, 4);
        sDex.recipes[r.id] = true;
        G.engine.noteMade(sDex, r);
        return Object.keys(sDex.madeProducts).filter((k) => k === "jam|辣").length === 1;
      })());
    check("锅里出锅也点亮图鉴",
      (function () {
        const st = fresh();
        st.money = 1e9; st.maxRegion = 10;
        st.finds = { flour: 9, moomoo: 9, cinderpepper: 9 };
        st.berries = { 1: 9 };
        G.engine.potAdd(st, "berry", 1);
        G.engine.potAdd(st, "find", "flour");
        G.engine.potAdd(st, "find", "moomoo");
        G.engine.potAdd(st, "find", "cinderpepper");
        G.engine.potStir(st);
        st.clock += 30000 * 1000;
        G.engine.stepPot(st);
        return Object.keys(st.madeProducts).length > 0;
      })());
    check("老存档能补出制品图鉴",
      (function () {
        const legacy = G.migrate(JSON.parse(JSON.stringify(
          Object.assign({}, fresh(), { madeProducts: undefined }))));
        return legacy.madeProducts && typeof legacy.madeProducts === "object";
      })());

    // 存档往返：研发的配方只存 id，读档要按 id 把配方造回来
    // 前面把配方删掉了，这里再搅一锅记下来
    G.engine.potAdd(potS, "berry", 1);
    G.engine.potAdd(potS, "find", "sugar");
    G.engine.potAdd(potS, "find", "cinderpepper");
    G.engine.potStir(potS);
    potS.clock += 20000 * 1000;
    G.engine.stepPot(potS);
    G.engine.potKeepRecipe(potS);
    const keptId = Object.keys(potS.recipes).filter((id) => /^res_/.test(id))[0];
    check("存档测试前确实记下了一个配方", !!keptId, String(keptId));
    const code2 = G.exportSave(potS);
    const reloaded = G.importSave(code2);
    check("存档能带走研发的配方", reloaded.recipes[keptId] === true, keptId);
    check("读档把配方表按 id 复原回来了",
      !!G.RECIPE_BY_ID[keptId] && G.RECIPE_BY_ID[keptId].research === true, keptId);
    check("读档后仓库里的素材还在", reloaded.finds.flour === potS.finds.flour, reloaded.finds.flour);
    check("读档后失败品还在", reloaded.waste === potS.waste, reloaded.waste);
    check("读档后锅的等级和格子还在",
      reloaded.pot.level === potS.pot.level && G.engine.potSlots(reloaded) === G.engine.potSlots(potS),
      reloaded.pot.level);
    // 老存档没有 pot 字段，迁移要能补上
    const legacy = G.migrate(JSON.parse(JSON.stringify(Object.assign({}, potS, { pot: undefined }))));
    check("老存档能补出锅", !!legacy.pot && legacy.pot.level === 1 && Array.isArray(legacy.pot.inPot),
      JSON.stringify(legacy.pot));
    // 存档槽位：开新版本前能存一个，随时读回来
    if (G.saveSlot) {
      const slotS = G.newState();
      slotS.money = 777; slotS.region = 5;
      G.listSlots().forEach((x) => G.deleteSlot(x.name));
      check("存槽位成功", G.saveSlot(slotS, "自检").ok === true, JSON.stringify(G.listSlots()));
      check("槽位里存了名字和进度",
        G.listSlots()[0].name === "自检" && G.listSlots()[0].money === 777, JSON.stringify(G.listSlots()[0]));
      const back2 = G.loadSlot("自检");
      check("槽位能读回来", back2 && back2.money === 777 && back2.region === 5, back2 && back2.money);
      check("读不存在的槽位返回空", G.loadSlot("没有这个") === null);
      G.deleteSlot("自检");
      check("槽位能删掉", G.listSlots().length === 0, G.listSlots().length);
      for (let i = 0; i < 6; i++) G.saveSlot(G.newState(), "槽" + i);
      check("槽位有上限", G.listSlots().length === (G.SLOT_MAX || 4), G.listSlots().length);
      G.listSlots().forEach((x) => G.deleteSlot(x.name));
    }

    check("树果 65 种", G.BERRIES.length === 65, G.BERRIES.length);
    check("道具 24 件", (G.ITEMS || []).length === 24, (G.ITEMS || []).length);
    check("材料 12 种", (G.MATERIALS || []).length === 12, (G.MATERIALS || []).length);
    check("每个区域都有 6 位常客", G.REGIONS.every((r) =>
      (G.REGULARS || []).filter((x) => x.region === r.id).length === 6));
    // 口味一致性
    let badFlavor = [];
    (G.REGULARS || []).forEach((r) => {
      const nat = G.NATURES && G.NATURES[r.nature];
      if (!nat) { badFlavor.push(r.name + ":" + r.nature); return; }
      if (nat.喜 !== r.flavor || nat.厌 !== r.dislike) badFlavor.push(r.name + " " + r.nature);
    });
    check("性格→口味一致", badFlavor.length === 0, badFlavor.slice(0, 5).join(", "));
  }

  window.__why = {};

  window.SIM.bot = bot;
  window.SIM.freshState = fresh;

  window.SIM.run = function () {
    unitTests();
    log("【单元测试】" + (fails.length ? "失败 " + fails.length + " 项：" : "全部通过"));
    fails.forEach((f) => log("  ✗ " + f));
    log("");
    const s = run(3600 * 48, "48 小时长线模拟（5 秒步长）", 5);
    log("");
    // 移民后的曲线：把天赋点花掉再跑一遍前 3 小时
    log("【测试页结尾】");
    return out.join("\n");
  };

  window.SIM.fails = fails;
})();
