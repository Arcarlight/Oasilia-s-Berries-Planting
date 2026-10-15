// 无头数值验证：在浏览器里跑完整局，检查进度曲线、解锁条件、移民与离线结算。
// 用法：浏览器打开 tools/simtest.html（或用 Edge headless --dump-dom 抓结果）
window.SIM = {};
(function () {
  const out = [];
  function log(s) { out.push(s); }

  function fresh() { return G.newState(); }

  // 一个"正常玩家"的近似行为：田不空着，加工台不停，有钱就学配方/做道具
  function bot(state) {
    const eng = G.engine;
    const b = G.bonuses(state);

    // 1. 收
    eng.harvestAll(state);

    // 2. 加工台尽量塞满（用最值钱的配方配最值钱的树果）
    const recipes = eng.unlockedRecipes(state).sort((x, y) => y.mult - x.mult);
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

    // 4.5 学配方优先于扩张：配方是收益乘数
    const locked2 = G.RECIPES.filter((r) => !state.recipes[r.id] && r.region <= state.maxRegion)
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

    // 叫卖收益至少是最贵树果的 1.5 倍，不能是废按钮
    const s5 = fresh();
    const cheapBerry = G.bestAvailableBerry(s5);
    check("叫卖收益 > 生果单价", G.clickSellValue(s5) >= G.berrySellPrice(s5, cheapBerry) * 1.5,
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
