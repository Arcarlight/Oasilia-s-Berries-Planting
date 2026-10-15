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

    // #check=tabs：把所有页签逐一渲染一遍，任何一页抛错都记下来。
    // 这类错误会让页面卡在旧内容上，肉眼很难发现，必须靠自检。
    if (p.check === "tabs") {
      const tabs = ["market", "kitchen", "regulars", "shop", "atlas", "store", "lab", "talents", "dex", "help"];
      const bad = [];
      tabs.forEach((t) => {
        G.UI.tab = t;
        G.UI.forceRender();
        if (G.UI.lastError) bad.push(G.UI.lastError.tab + ": " + G.UI.lastError.message);
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
      const curOk = cur.indexOf("cursor-hand") >= 0
                 && btnCur.indexOf("cursor-point") >= 0
                 && cur.indexOf("2x") >= 0;
      const pick2x = cur.indexOf("2x") >= 0;
      pre.textContent = (bad.length ? "TABCHECK FAIL\n" + bad.join("\n") : "TABCHECK OK")
        + "\nCURSOR " + (curOk ? "OK" : "缺失")
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
