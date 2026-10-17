// 验收驱动：给 tools/dev.html 用。通过 URL hash 控制快进时长、标签页与动作。
// 例：tools/dev.html#hours=3&tab=kitchen
(function () {
  function params() {
    const h = (location.hash || "").replace(/^#/, "");
    const o = {};
    h.split("&").forEach((kv) => {
      const i = kv.indexOf("=");
      if (i > 0) o[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1));
    });
    return o;
  }

  setTimeout(function () {
    const p = params();
    const S = window.__state;
    if (!S || !window.SIM) {
      document.title = "ERR: no state";
      return;
    }
    G.UI.closeOverlay();

    const hours = parseFloat(p.hours || "0");
    if (hours > 0) {
      const total = hours * 3600;
      for (let t = 0; t < total; t += 5) {
        try { window.SIM.bot(S); } catch (e) { /* 驱动脚本出错不该影响画面 */ }
        G.advance(S, 5);
      }
    }
    if (p.money) S.money = parseFloat(p.money);
    if (p.tp) S.talentPoints = parseFloat(p.tp);
    if (p.tab) G.UI.tab = p.tab;
    if (p.act === "overlay") { G.UI.openSettings(); }

    // ── 先把状态摆好，再点按钮 ──
    // 顺序很重要：像 potlevel 这种必须赶在 #cells 之前，
    // 否则会拿"还没升级的锅"去点，格子数对不上（踩过一次）。

    // #tripwant=wood:2,clay:1：勾上出行清单，用来验证报价
    if (p.tripwant) {
      S._tripWant = {};
      String(p.tripwant).split(",").forEach((kv) => {
        const parts = kv.split(":");
        if (parts[0]) S._tripWant[parts[0]] = parseInt(parts[1], 10) || 1;
      });
      G.UI.tab = "atlas";
      G.UI.forceRender();
    }

    // #givefinds=1：把四种底料补到 50 份，锅的验收才稳定（不然会被机器人用光）
    if (p.givefinds) {
      (G.FINDS || []).forEach((f) => { S.finds[f.id] = Math.max(S.finds[f.id] || 0, 50); });
      G.UI.forceRender();
    }

    // #giveseeds=1：每种已解锁的树果给 5 颗种子，方便看种子选择器
    if (p.giveseeds) {
      (G.BERRIES || []).forEach((b) => {
        if (b.region <= S.maxRegion) S.seeds[b.id] = Math.max(S.seeds[b.id] || 0, 5);
      });
      G.UI.forceRender();
    }

    // #potlevel=N：直接把锅升到 N 级，用来验证特殊糕点的门槛
    if (p.potlevel) {
      S.pot.level = Math.max(1, Math.min(G.POT_LEVELS.length, parseInt(p.potlevel, 10) || 1));
      S.money = Math.max(S.money, 1e9);
      G.UI.forceRender();
    }

    // #giveprod=1：直接塞几件甜品进仓库，方便看味道雷达图
    // （正常玩的时候成品很快就会被常客买走，验收时等不到）
    if (p.giveprod) {
      const combos = [[ "candy", "辣", "cinderpepper", true, 6 ], [ "cake", "甜", null, false, 3 ]];
      combos.forEach((c) => {
        const r = G.makeResearchRecipe(c[0], c[1], c[2], c[3], c[4]);
        S.recipes[r.id] = true;
        S.products[G.productKey(r.id, 1)] = 3;
      });
      G.UI.forceRender();
    }

    // ── 下面是模拟操作 ──

    // #cells=0,10,11：依次点几个格子（仓库/研发的格子墙）。
    // 研发那边就是"往锅里丢食材"，用来验证预告和出锅。
    if (p.cells !== undefined) {
      G.UI.forceRender();
      // 支持两种写法：
      //   #cells=0,10      → 按格子在页面上的先后顺序点
      //   #cells=b0,b0,f0  → b 从树果托盘点、f 从素材托盘点（推荐，不受数量影响）
      String(p.cells).split(",").forEach((tok) => {
        const t = tok.trim();
        let cells, i;
        if (/^[bf]\d+$/.test(t)) {
          const tray = t[0] === "b" ? "berry" : "find";
          cells = document.querySelectorAll(".lab-cell[data-tray='" + tray + "']");
          i = parseInt(t.slice(1), 10) || 0;
        } else {
          cells = document.querySelectorAll(".wh-cell, .lab-cell");
          i = parseInt(t, 10) || 0;
        }
        if (cells[i]) cells[i].click();
        G.UI.forceRender();
      });
    }
    // #sel=product：在仓库里选中某一类的第一格（find/material/berry/product/waste）
    if (p.sel) {
      G.UI.forceRender();
      const all = document.querySelectorAll(".wh-cell");
      for (let i = 0; i < all.length; i++) {
        let d = {};
        try { d = JSON.parse(all[i].dataset.p || "{}"); } catch (e) { d = {}; }
        if (d.kind === p.sel) { all[i].click(); break; }
      }
      G.UI.forceRender();
    }

    // #recipe=3：点第 3 个配方按钮，验证选中态真的换过去（不只是动作存在）
    if (p.recipe !== undefined) {
      G.UI.forceRender();
      const btns = document.querySelectorAll("[data-act='recipe']");
      const i = parseInt(p.recipe, 10) || 0;
      const before = document.querySelector(".card h4 + .sub") ? "" : "";
      if (btns[i]) btns[i].click();
      G.UI.forceRender();
      const on = document.querySelector("[data-act='recipe'].picked");
      const pre2 = document.createElement("pre");
      pre2.id = "recipecheck";
      pre2.textContent = "RECIPECHECK " + (on ? "选中=" + on.textContent.trim() : "没有选中任何配方")
        + "　可选配方 " + btns.length + " 个";
      document.body.appendChild(pre2);
    }

    // #stir=1：点搅拌，然后快进到出锅，用来抓出锅画面
    if (p.stir) {
      G.UI.forceRender();
      const btn = document.querySelector("[data-act='potStir']");
      if (btn && !btn.disabled) btn.click();
      G.UI.forceRender();
      if (p.stir === "done") {
        for (let t = 0; t < 30; t++) G.advance(S, 1);
        G.UI.forceRender();
      }
    }

    // 界面上的 data-act 必须在 ACT 里有实现，否则按钮就是死的。
    // 之前改研发动作块时误删了 15 个动作（recipe/craft/buySeed…），肉眼看不出，
    // 只有点到那个按钮才发现 —— 这条自检就是为那类事故加的。
    function checkActs() {
      const have = {};
      (G.UI.actNames ? G.UI.actNames() : []).forEach((k) => { have[k] = true; });
      const bad = {};
      document.querySelectorAll("[data-act]").forEach((el) => {
        const a = el.dataset.act;
        if (a && !have[a]) bad[a] = true;
      });
      return Object.keys(bad);
    }

    // #check=regtoast：解锁新常客要弹提示
    if (p.check === "regtoast") {
      const out = [];
      try {
        const locked = (G.REGULARS || []).filter((r) => !G.engine.regState(S, r.dex).unlocked);
        out.push("现在锁着的常客：" + locked.length + " 个");
        if (!locked.length) out.push("（全解锁了，换个 hours 再跑）");
        else {
          const target = locked[0];
          // headless 下 rAF 不跑，UI.frame 可能一次都没执行过，
          // 而 checkNewRegulars 第一次只记现状不弹 —— 所以先手动跑一帧打底。
          G.UI.frame();
          G.UI.frame();
          const before = document.querySelectorAll("#toastWrap .toast").length;
          // 直接把他标成已解锁，然后跑一帧
          G.engine.regState(S, target.dex).unlocked = true;
          G.UI.frame();
          const toasts = [].slice.call(document.querySelectorAll("#toastWrap .toast"))
            .map((x) => x.textContent);
          const hit = toasts.filter((x) => x.indexOf(target.name) >= 0);
          out.push("解锁「" + target.name + "（" + target.title + "）」之后：" +
            (hit.length ? "弹了 ✓ → " + hit[0] : "没弹 ✗"));
          out.push("日志里也有：" + (S.log.some((l) => String(l.t).indexOf("新常客") >= 0) ? "是" : "否（要等 checkUnlocks 跑一次）"));
          out.push("（弹窗数 " + before + " → " + toasts.length + "）");
        }
      } catch (err) { out.push("抛异常了：" + (err && err.message)); }
      const pre = document.createElement("pre");
      pre.id = "regtoastcheck";
      pre.textContent = "REGTOASTCHECK\n  " + out.join("\n  ");
      document.body.appendChild(pre);
    }

    // #check=tabkeys：数字键 1~9 / 0 切页签
    if (p.check === "tabkeys") {
      const out = [];
      try {
        const list = G.UI.tabList();
        out.push("页签共 " + list.length + " 个");
        let ok = true;
        for (let i = 0; i < list.length; i++) {
          const code = i === 9 ? "Digit0" : "Digit" + (i + 1);
          document.dispatchEvent(new KeyboardEvent("keydown", { code: code, bubbles: true }));
          G.UI.frame();
          if (G.UI.tab !== list[i].id) { ok = false; out.push("  " + code + " 应该切到 " + list[i].name + "，实际 " + G.UI.tab); }
        }
        out.push(ok ? "1~9 / 0 全部对得上 ✓" : "有对不上的 ✗");
        // 输入框里按数字不该切页签
        G.UI.tab = list[0].id;
        const inp = document.createElement("input");
        document.body.appendChild(inp);
        inp.focus();
        inp.dispatchEvent(new KeyboardEvent("keydown", { code: "Digit5", bubbles: true }));
        G.UI.frame();
        out.push("在输入框里按数字不切页签：" + (G.UI.tab === list[0].id ? "是 ✓" : "否 ✗"));
        inp.remove();
      } catch (err) { out.push("抛异常了：" + (err && err.message)); }
      const pre = document.createElement("pre");
      pre.id = "tabkeycheck";
      pre.textContent = "TABKEYCHECK\n  " + out.join("\n  ");
      document.body.appendChild(pre);
    }

    // #check=plantp：按 P 一键播种，顺序要跟着种子栏从上往下（贵的先）
    if (p.check === "plantp") {
      const out = [];
      try {
        // 清空田地，每种已解锁的果子给 3 颗种子
        S.plots.forEach((pl) => { pl.berry = null; pl.grown = 0; pl.ripe = false; });
        S.seeds = {};
        (G.BERRIES || []).forEach((b) => {
          if (b.region <= S.maxRegion) S.seeds[b.id] = 3;
        });
        G.UI.forceRender();

        const listOrder = G.UI.seedOrder();
        const order = G.UI.seedPlantOrder();
        out.push("列表顺序（前 6 个）：" + listOrder.slice(0, 6).map((id) => {
          const b = G.BERRY_BY_ID[id];
          return b.zh + "[" + G.berryFlavorTier(b) + "]";
        }).join(" "));

        out.push("播种顺序（前 6 个）：" + order.slice(0, 6).map((id) => {
          const b = G.BERRY_BY_ID[id];
          return b.zh + "₽" + b.basePrice;
        }).join(" "));
        out.push("播种顺序是按果价降序：" + (order.every((id, i) => i === 0 ||
          G.BERRY_BY_ID[order[i - 1]].basePrice >= G.BERRY_BY_ID[id].basePrice) ? "是 ✓" : "否 ✗"));

        // 同一个味道是不是挨在一起、浓郁度降序
        let grouped = true;
        const seen = [];
        listOrder.forEach((id) => {
          const f = G.BERRY_BY_ID[id].flavor;
          if (seen.indexOf(f) < 0) seen.push(f);
          else if (seen[seen.length - 1] !== f) grouped = false;
        });
        out.push("同味道挨在一起：" + (grouped ? "是 ✓" : "否 ✗"));

        let desc = true;
        for (let i = 1; i < listOrder.length; i++) {
          const a = G.BERRY_BY_ID[listOrder[i - 1]], b = G.BERRY_BY_ID[listOrder[i]];
          if (a.flavor === b.flavor && G.berryFlavorScore(a) < G.berryFlavorScore(b)) desc = false;
        }
        out.push("列表里同味道内浓郁度降序：" + (desc ? "是 ✓" : "否 ✗"));

        // 按 P
        const emptyBefore = S.plots.filter((pl) => !pl.berry).length;
        document.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyP", bubbles: true }));
        G.UI.frame();
        const planted = S.plots.filter((pl) => pl.berry).map((pl) => pl.berry);
        out.push("空地 " + emptyBefore + " 块，按 P 之后种下 " + planted.length + " 块");
        // 种下去的顺序应该和种子栏顺序一致
        const want = [];
        order.forEach((id) => { const n = 3; for (let k = 0; k < n; k++) want.push(id); });
        const okOrder = planted.every((id, i) => id === want[i]);
        out.push("播种顺序跟着「贵的优先」：" + (okOrder ? "是 ✓" : "否 ✗"));
        out.push("第一块地种的是：" + (planted[0] !== undefined ? G.BERRY_BY_ID[planted[0]].zh : "（没种）"));
      } catch (err) { out.push("抛异常了：" + (err && err.message)); }
      const pre = document.createElement("pre");
      pre.id = "plantcheck";
      pre.textContent = "PLANTCHECK\n  " + out.join("\n  ");
      document.body.appendChild(pre);
    }

    // #check=reset：重新开始之后，刷新不该把旧数据带回来。
    // 复现路径：点确认 → 触发一次自动存档（beforeunload 走的就是这条路）→ 看存档里还有没有进度。
    if (p.check === "reset") {
      const out = [];
      try {
      const KEY = "philoroa.save.v1";
      const read = () => {
        try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; }
      };
      const progressOf = (sv) => sv && sv.stats ? (sv.stats.harvested || 0) : 0;

      // 先像真玩家那样存一次，存档里得有进度，这个检查才有意义
      window.dispatchEvent(new Event("beforeunload"));
      const before = progressOf(read());
      out.push("删之前存档里的收获数：" + before);
      if (before <= 0) out.push("（这份档的进度是 0，测不出东西 —— 换个 hours 再跑）");

      // 走真实的点击路径：先按"重新开始"解锁，再按那个红的
      G.UI.openSettings();
      const arm = document.querySelector("[data-act='resetArm']");
      if (!arm) out.push("找不到重新开始的按钮");
      else {
        arm.click();
        G.UI.forceRender();
        const save2 = document.querySelector("[data-act='resetSave']");
        if (!save2) out.push("点了重新开始之后没出现确认按钮");
        else {
          save2.click();
          G.UI.forceRender();

          // 关键一步：自动存档存的必须是新的那一份
          const mainS = window.__state;
          out.push("页面的存档引用和界面的一致：" +
            (mainS === G.UI.state ? "是" : "否（main.js 还拿着旧的那份）"));

          // beforeunload 触发的就是 main.js 里那句 G.saveGame(S)
          window.dispatchEvent(new Event("beforeunload"));

          const after = read();
          out.push("删完自动存档之后，存档里的收获数：" + progressOf(after));
          out.push(progressOf(after) === 0 && progressOf(after) !== before
            ? "✓ 存档是干净的，刷新也是新档"
            : "✗ 旧数据还在存档里（刷新一下就复原了）");
        }
      }
      } catch (err) { out.push("抛异常了：" + (err && err.message)); }
      const pre = document.createElement("pre");
      pre.id = "resetcheck";
      pre.textContent = "RESETCHECK\n  " + out.join("\n  ");
      document.body.appendChild(pre);
    }

    // #check=tripsel：勾一个材料，确认下面那行总价立刻更新（不用点第二次）
    if (p.check === "tripsel") {
      const out = [];
      S.money = 1e6;
      G.UI.tab = "atlas";
      G.UI.forceRender();
      const readQuote = () => {
        const el = document.querySelector("#tabBody");
        const m = el.textContent.match(/这一趟：₽([\d.万]+)/);
        return m ? m[1] : "（没有报价行）";
      };
      const before = readQuote();
      const box = document.querySelector("[data-act='tripToggle']");
      if (!box) out.push("找不到代购勾选框");
      else {
        // 用真实的 pointerdown → click 序列，模拟鼠标
        const r = box.getBoundingClientRect();
        const opt = { bubbles: true, cancelable: true, clientX: r.left + 4, clientY: r.top + 4, button: 0 };
        box.dispatchEvent(new PointerEvent("pointerdown", opt));
        box.checked = true;
        box.dispatchEvent(new MouseEvent("click", opt));
        box.dispatchEvent(new Event("change", { bubbles: true }));
        G.UI.frame();
        const after = readQuote();
        out.push("勾之前：" + before + "　勾之后：" + after);
        out.push(after !== before && after !== "0" ? "总价立刻更新了 ✓" : "总价没更新 ✗（还是要点第二次）");
      }
      const pre2 = document.createElement("pre");
      pre2.id = "tripselcheck";
      pre2.textContent = "TRIPSELCHECK\n  " + out.join("\n  ");
      document.body.appendChild(pre2);
    }

    // #check=trip：造一趟完整的出行，验证"他回来了"有没有汇总、有没有提示
    if (p.check === "trip") {
      const out = [];
      G.engine.startTrip(S, { wood: 2 });
      S.atlas.trip.until = G.now(S) - 1;
      const r = G.engine.finishTrip(S);
      out.push("finishTrip 有汇总：" + (r && r.summary ? "有 —— " + r.summary : "没有"));
      out.push("报告里带了东西：" + (S.atlas.report && S.atlas.report.got.length ? S.atlas.report.got.join("、") : "空手"));
      // 日志是新条目插在最前（unshift）并且封顶 120 条，直接看最新几条
      const newest = S.log.slice(0, 4).map((e) => e.text);
      out.push("最新日志含汇总：" + newest.some((t) => t.indexOf("回来了") >= 0)
        + "（" + newest.map((t) => t.slice(0, 22)).join(" / ") + "）");
      // 帧循环会不会弹提示
      G.UI.forceRender();
      G.UI.frame();
      const toast = document.querySelector(".toast");
      out.push("回来弹提示：" + (toast ? "弹了 —— " + toast.textContent : "没弹"));
      // 阿特拉斯页要留一条
      G.UI.tab = "atlas"; G.UI.forceRender();
      // 只要这趟带回了东西（材料也算）就该有记录，不能只看素材
      out.push("阿特拉斯页有记录：" + (/上次出门带回来/.test(document.querySelector("#tabBody").textContent) ? "有" : "没有"));
      G.UI.tab = "market"; G.UI.forceRender();
      const preT = document.createElement("pre");
      preT.id = "tripcheck";
      preT.textContent = "TRIPCHECK\n  " + out.join("\n  ");
      document.body.appendChild(preT);
    }

    // #check=buttons：逐个点几个真按钮，看动作到底有没有跑起来
    if (p.check === "buttons") {
      const out = [];
      function tryClick(sel, label) {
        const el = document.querySelector(sel);
        if (!el) { out.push(label + "：找不到按钮 " + sel); return null; }
        const before = { money: S.money, berries: Object.keys(S.berries).length, recipe: G.UI.state ? "" : "" };
        try { el.click(); } catch (e) { out.push(label + "：抛错 " + e.message); return null; }
        return before;
      }
      // 市场：生果全部卖出
      G.UI.tab = "market"; G.UI.forceRender();
      S.berries = { 1: 50 };
      const m0 = S.money;
      tryClick("[data-act='sellAllBerries']", "生果全部卖出");
      out.push("生果全部卖出：" + (S.money > m0 ? "OK（+" + Math.round(S.money - m0) + "）" : "没反应"));
      // 商店：买种子
      G.UI.tab = "shop"; G.UI.forceRender();
      const seedBtn = document.querySelector("[data-act='buySeed']");
      if (seedBtn) {
        const s0 = (S.seeds[1] || 0);
        seedBtn.click();
        out.push("买种子：" + ((S.seeds[1] || 0) > s0 ? "OK" : "没反应"));
      } else out.push("买种子：页面上没有这个按钮");
      // 加工：选配方
      G.UI.tab = "kitchen"; G.UI.forceRender();
      const rb = document.querySelectorAll("[data-act='recipe']");
      if (rb.length > 1) {
        const prev = document.querySelector("[data-act='recipe'].picked");
        const prevTxt = prev ? prev.textContent.trim() : "";
        rb[1].click();
        G.UI.forceRender();
        const now2 = document.querySelector("[data-act='recipe'].picked");
        out.push("选配方：" + (now2 && now2.textContent.trim() !== prevTxt ? "OK（" + now2.textContent.trim() + "）" : "没反应"));
      } else out.push("选配方：还没解锁配方");
      // 天赋 / 常客 / 阿特拉斯 至少确认页面上的按钮能被点到（不校验效果）
      ["regulars", "atlas", "talents"].forEach((t) => {
        G.UI.tab = t; G.UI.forceRender();
        const first = document.querySelector("#tabBody [data-act]:not(.link)");
        out.push(t + " 页第一个按钮：" + (first ? (first.dataset.act + (first.disabled ? "（disabled）" : "")) : "没有"));
      });
      // 用真实的 pointerdown → pointerup → click 序列再点一次，
      // 光 .click() 绕过了指针事件，测不出"拖拽逻辑把点击吃掉了"这类问题
      G.UI.tab = "market"; G.UI.forceRender();
      S.berries = { 1: 50 };
      const btn2 = document.querySelector("[data-act='sellAllBerries']");
      const m1 = S.money;
      if (btn2) {
        const r = btn2.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const mk = (type, extra) => new PointerEvent(type, Object.assign({
          bubbles: true, cancelable: true, clientX: cx, clientY: cy, pointerId: 1, button: 0, buttons: 1
        }, extra || {}));
        btn2.dispatchEvent(mk("pointerdown"));
        btn2.dispatchEvent(mk("pointerup", { buttons: 0 }));
        btn2.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, clientX: cx, clientY: cy }));
        out.push("真实指针序列点击：" + (S.money > m1 ? "OK（+" + Math.round(S.money - m1) + "）" : "没反应"));
      } else out.push("真实指针序列：找不到按钮");

      const preB = document.createElement("pre");
      preB.id = "buttoncheck";
      preB.textContent = "BUTTONCHECK\n  " + out.join("\n  ");
      document.body.appendChild(preB);
    }

    // #check=settings：开设置面板，点一遍存槽位/读槽位/删槽位，确认存档管理真能用
    if (p.check === "settings") {
      const out = [];
      try {
        G.UI.openSettings();
        const has = (a) => !!document.querySelector("[data-act='" + a + "']");
        ["exportSave", "downloadSave", "copySave", "importSave", "pickfile", "slotSave", "resetArm"]
          .forEach((a) => { if (!has(a)) out.push("缺少按钮：" + a); });
        // 存一个槽位
        document.getElementById("slotName").value = "自检槽位";
        document.querySelector("[data-act='slotSave']").click();
        const rows = document.querySelectorAll(".slot-row");
        if (!rows.length) out.push("存了槽位但列表里没有");
        else if (G.listSlots().length !== 1) out.push("槽位数量不对：" + G.listSlots().length);
        // 导出能不能出东西
        document.querySelector("[data-act='exportSave']").click();
        if (!(document.getElementById("saveBox").value || "").length) out.push("导出是空的");
        // 删掉
        document.querySelector("[data-act='slotDelete']").click();
        if (G.listSlots().length !== 0) out.push("删槽位没生效");
        // 版本号和更新日志
        if (!/版本/.test(document.querySelector("#overlay").textContent)) out.push("设置里没显示版本号");
        const logItems = document.querySelectorAll(".log-item");
        if (!logItems.length) out.push("更新日志是空的");
        if (typeof (window.G || {}).BUILD === "undefined" || !G.BUILD.build) out.push("G.BUILD.build 没写进去");
        // 重新开始要两步
        document.querySelector("[data-act='resetArm']").click();
        if (!document.querySelector("[data-act='resetSave']")) out.push("重新开始没有二次确认");
        document.querySelector("[data-act='resetCancel']").click();
        G.UI.closeOverlay();
      } catch (e) {
        out.push("抛错：" + e.message);
      }
      const preS = document.createElement("pre");
      preS.id = "settingscheck";
      preS.textContent = out.length ? "SETTINGSCHECK FAIL\n  " + out.join("\n  ") : "SETTINGSCHECK OK";
      document.body.appendChild(preS);
    }

    // #check=tabs：把所有页签逐一渲染一遍，任何一页抛错都记下来。
    // 这类错误会让页面卡在旧内容上，肉眼很难发现，必须靠自检。
    if (p.check === "tabs") {
      const tabs = ["market", "kitchen", "regulars", "shop", "atlas", "store", "lab", "talents", "dex", "help"];
      const bad = [];
      const deadActs = {};
      tabs.forEach((t) => {
        G.UI.tab = t;
        G.UI.forceRender();
        if (G.UI.lastError) bad.push(G.UI.lastError.tab + ": " + G.UI.lastError.message);
        checkActs().forEach((a) => { deadActs[a] = t; });
      });
      G.UI.tab = "market"; G.UI.forceRender();
      const probe = [];
      document.querySelectorAll("#tabBody button:not(.link)").forEach((b, i) => {
        if (i > 6) return;
        const cs = getComputedStyle(b);
        probe.push(b.textContent.trim().slice(0, 6) + "=" + cs.borderImageSource.split("/").pop().slice(0, 14) + "@" + cs.borderWidth);
      });
      const pre = document.createElement("pre");
      pre.id = "tabcheck";
      // 顺手报一下光标有没有挂上（截图里看不到光标）
      const cur = getComputedStyle(document.body).cursor;
      const btn = document.querySelector("#tabs button");
      const btnCur = btn ? getComputedStyle(btn).cursor : "?";
      // 平时=hand，可点击=point，浇水=water
      // 光标尺寸要按系统给：Windows 用 32 那套（基准图是 -2x），别的一律 16 那套。
      // Windows 的系统光标是 32×32 设备像素，给它 16 CSS 像素看着只有一半大。
      const isWin = document.documentElement.classList.contains("os-win");
      const expectHand = isWin ? "cursor-hand-2x.png" : "cursor-hand.png";
      const expectPoint = isWin ? "cursor-point-2x.png" : "cursor-point.png";
      const curOk = cur.indexOf(expectHand) >= 0
                 && btnCur.indexOf(expectPoint) >= 0
                 && cur.indexOf("2x") >= 0;
      const pick2x = cur.indexOf("2x") >= 0;
      const dead = Object.keys(deadActs);
      pre.textContent = (bad.length ? "TABCHECK FAIL\n" + bad.join("\n") : "TABCHECK OK")
        + (dead.length ? "\nACTCHECK FAIL 这几个按钮没实现：\n  " + dead.join("\n  ") : "\nACTCHECK OK")
        + "\nCURSOR " + (curOk ? "OK" : "缺失（基准图不对）")
        + " 系统=" + (isWin ? "Windows(32 CSS 像素)" : "其他(16 CSS 像素)")
        + " dpr=" + window.devicePixelRatio
        + " 用到2倍图=" + (pick2x ? "是" : "否")
        + "\n  body=" + cur.replace(/file:[^)]*\//g, "").slice(0, 110)
        + "\n  btn =" + btnCur.replace(/file:[^)]*\//g, "").slice(0, 110)
        + "\n  water=" + (() => {
            const w = document.querySelector('#btnWaterAll, .plot:not(.ripe)');
            return w ? getComputedStyle(w).cursor.replace(/file:[^)]*\//g, "").slice(0, 60) : "（页面上没找到浇水按钮）";
          })()
        + "\nBTN " + probe.join(" | ");
      document.body.appendChild(pre);
    }

    G.UI.forceRender();

    // #check=motion：确认动效真的挂上了。
    // CSS 写错属性名会被浏览器静默丢弃，肉眼看不出，所以逐条断言。
    if (p.check === "motion") {
      const res = [];
      const t = (name, ok, extra) => res.push((ok ? "✅ " : "❌ ") + name + (extra ? "  " + extra : ""));
      const transProp = (el) => getComputedStyle(el).transitionProperty;
      const animNames = (el) => el.getAnimations().map((a) => a.animationName || a.transitionProperty).join(",");

      // 1) 弹层：opacity + transform 都要在
      G.UI.openOverlay("<h3>动效自检</h3><button>关闭</button>");
      const ov = document.getElementById("overlay");
      const modal = ov.querySelector(".modal");
      const tp = transProp(modal);
      t("弹层 transition 含 opacity", tp.indexOf("opacity") >= 0, tp);
      t("弹层 transition 含 transform", tp.indexOf("transform") >= 0);
      t("弹层进场时确实有动画在跑", modal.getAnimations().length > 0, animNames(modal));
      t("弹层不用 scale(0) 进场", getComputedStyle(modal).transform.indexOf("matrix(0, 0, 0, 0") !== 0);

      // 2) 吐出吐司
      G.UI.toast("动效自检");
      const toast = document.querySelector("#toastWrap .toast");
      const ttp = toast ? transProp(toast) : "";
      t("吐司 transition 含 opacity/transform", ttp.indexOf("opacity") >= 0 && ttp.indexOf("transform") >= 0, ttp);
      t("吐司进场有动画在跑", toast && toast.getAnimations().length > 0);

      // 3) 标签页切换淡入
      const body = document.getElementById("tabBody");
      G.UI.tab = "shop"; G.UI.forceRender();
      t("切页时 tabBody 带 fadein", body.classList.contains("fadein"));
      t("切页淡入动画在跑", body.getAnimations().some((a) => a.animationName === "tabIn"),
        animNames(body));

      // 4) 按钮按下反馈
      const b0 = body.querySelector("button:not(.link)");
      t("按钮 transition 含 transform", b0 && transProp(b0).indexOf("transform") >= 0, b0 ? transProp(b0) : "");

      // 样式表级的 never-ship 检查不在这里做：file:// 下浏览器不允许 JS 读本地样式表，
      // 在页内查会"看起来全过"其实是空跑。那部分搬到 tools/lint_css.py 静态查。

      // 转世过场
      const fl = document.getElementById("flash");
      G.UI.flash();
      t("转世过场挂在 #flash 上", fl && fl.classList.contains("run"));
      t("过场确实在跑", fl && fl.getAnimations().some((a) => a.animationName === "flashThrough"));
      t("过场只用透明度（不位移）", getComputedStyle(fl).transform === "none", getComputedStyle(fl).transform);

      G.UI.closeOverlay();
      res.push("（样式表静态检查见 python3 tools/lint_css.py）");
      const pre3 = document.createElement("pre");
      pre3.id = "motioncheck";
      pre3.textContent = "MOTIONCHECK " + (res.filter((x) => x.startsWith("❌")).length === 0 ? "全部通过" : "有失败") + "\n" + res.join("\n");
      document.body.appendChild(pre3);
    }

    // #check=morph：直接给"就地合入"机制做单元自检。
    // 它要保证的是：内容更新时按钮/下拉这些节点绝不被销毁重造。
    if (p.check === "morph") {
      const box = document.createElement("div");
      const card = () => '<div class="card"><button data-act="x">卖1</button><span class="n">10</span></div>';
      box.innerHTML = card();
      document.body.appendChild(box);
      const btn0 = box.querySelector("button");
      const span0 = box.querySelector("span");
      const res = [];
      const t = (name, ok, extra) => res.push((ok ? "✅ " : "❌ ") + name + (extra ? "  " + extra : ""));

      G.UI.morph(box, card());
      t("内容不变时按钮节点保留", box.querySelector("button") === btn0);

      G.UI.morph(box, '<div class="card"><button data-act="x">卖1</button><span class="n">11</span></div>');
      t("只改数字时按钮节点保留", box.querySelector("button") === btn0);
      t("数字确实更新了", box.querySelector("span").textContent === "11");
      t("span 节点也保留", box.querySelector("span") === span0);

      G.UI.morph(box, '<div class="card"><button data-act="x">卖1</button><span class="n">11</span><span>新条目</span></div>');
      t("列表变长后按钮节点仍保留", box.querySelector("button") === btn0);
      t("新条目已补上", box.querySelectorAll("span").length === 2);

      G.UI.morph(box, '<div class="card"><button data-act="x">卖1</button></div>');
      t("列表变短后按钮节点仍保留", box.querySelector("button") === btn0);
      t("多余节点已移除", box.querySelectorAll("span").length === 0);

      G.UI.morph(box, '<div class="card"><button data-act="x">全卖</button><span class="n">3</span></div>');
      t("按钮文字更新且节点保留", box.querySelector("button") === btn0 && btn0.textContent === "全卖");

      G.UI.morph(box, '<section><p>换了结构</p></section>');
      t("外层标签变了才替换", box.querySelector("section") !== null);

      const sel = document.createElement("select");
      sel.innerHTML = "<option>a</option>";
      const box2 = document.createElement("div");
      box2.innerHTML = '<div class="list-item"><select data-act="picksell"><option>a</option></select></div>';
      document.body.appendChild(box2);
      const realSel = box2.querySelector("select");
      G.UI.morph(box2, '<div class="list-item"><select data-act="picksell"><option>a</option></select><b>新</b></div>');
      t("列表变长时下拉节点保留", box2.querySelector("select") === realSel);

      const pre2 = document.createElement("pre");
      pre2.id = "morphcheck";
      pre2.textContent = "MORPHCHECK " + (res.every((x) => x.startsWith("✅")) ? "全部通过" : "有失败") + "\n" + res.join("\n");
      document.body.appendChild(pre2);
      box.remove(); box2.remove();
    }

    // #check=churn：验证 DOM 不会被反复销毁重建。
    // 这正是"按钮 hover 一闪一闪"和"手机上下拉瞬间关闭、选不中"的根因。
    // headless 的 dump 模式不跑 requestAnimationFrame，所以手动逐帧驱动主循环。
    if (p.check === "churn") {
      const body = document.getElementById("tabBody");
      const n0 = G.UI.renderCount || 0;
      const r0 = G.UI.replaceCount || 0;
      const t0 = S.clock;
      const money0 = S.money;

      const btn0 = body.querySelector("button");
      const plot0 = document.querySelector(".plot");
      if (btn0) btn0.__survive = 1;
      if (plot0) plot0.__survive = 1;

      // 用页面里真实的"卖给常客"下拉来测：手机上正打开它选择时，节点绝不能被换掉
      const probeSel = body.querySelector("select") || document.querySelector("select");
      if (probeSel) {
        probeSel.focus();
        // 真实手机上打开下拉前会有一次 pointerdown，用它触发交互锁
        probeSel.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      }

      // 压力模式：让加工台一直有活在干，进度条每帧都在变 → 每帧 HTML 都不同
      const recipes = Object.keys(S.recipes || {});
      const stress = p.stress === "1" && recipes.length;
      const FRAMES = 900;
      let frames = 0;
      const step = () => {
        for (let i = 0; i < 30 && frames < FRAMES; i++) {
          if (stress && frames % 20 === 0) {
            try { G.engine.craft(S, recipes[(frames / 20) % recipes.length | 0]); } catch (e) {}
          }
          G.advance(S, 1 / 60);
          G.UI.frame();
          frames++;
        }
        if (frames < FRAMES) { setTimeout(step, 0); return; }
        const secs = (S.clock - t0) / 1000;
        const n = (G.UI.renderCount || 0) - n0;
        const r = (G.UI.replaceCount || 0) - r0;
        const out = [
          "CHURN " + n + " 次渲染 / " + secs.toFixed(1) + " 秒 = " + (n / Math.max(0.1, secs)).toFixed(1) + " 次/秒",
          "  整体替换（会把节点销毁重造）: " + r + " 次",
          "  按钮节点存活: " + (btn0 ? (body.querySelector("button") === btn0 ? "是" : "否（被销毁重建了）") : "（本页没有按钮）"),
          "  田地节点存活: " + (plot0 ? (document.querySelector(".plot") === plot0 ? "是" : "否（被销毁重建了）") : "（没有田地）"),
          "  下拉节点存活: " + (probeSel ? (document.contains(probeSel) ? "是" : "否（被销毁了）") : "（本页没有下拉）"),
          "  这期间游戏在跑: 钱 " + G.fmt(money0) + " → " + G.fmt(S.money)
        ];
        const pre = document.createElement("pre");
        pre.id = "churn";
        pre.textContent = out.join("\n");
        document.body.appendChild(pre);
      };
      setTimeout(step, 0);
    }


    document.title = "READY 区域" + S.region + " 钱" + G.fmt(S.money) +
      " 常客" + Object.keys(S.regulars).filter((d) => S.regulars[d].unlocked).length;
    const flag = document.createElement("div");
    flag.id = "devReady";
    flag.textContent = "READY";
    document.body.appendChild(flag);
  }, 60);
})();
