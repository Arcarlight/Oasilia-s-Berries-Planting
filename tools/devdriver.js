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

    // #check=tabs：把所有页签逐一渲染一遍，任何一页抛错都记下来。
    // 这类错误会让页面卡在旧内容上，肉眼很难发现，必须靠自检。
    if (p.check === "tabs") {
      const tabs = ["market", "kitchen", "regulars", "shop", "atlas", "talents", "dex", "help"];
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
