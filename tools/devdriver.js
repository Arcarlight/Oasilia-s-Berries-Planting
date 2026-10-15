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
      const pre = document.createElement("pre");
      pre.id = "tabcheck";
      // 顺手报一下光标有没有挂上（截图里看不到光标）
      const cur = getComputedStyle(document.body).cursor;
      const btn = document.querySelector("#tabs button");
      const btnCur = btn ? getComputedStyle(btn).cursor : "?";
      const curOk = cur.indexOf("cursor-arrow") >= 0 && btnCur.indexOf("cursor-hand") >= 0;
      pre.textContent = (bad.length ? "TABCHECK FAIL\n" + bad.join("\n") : "TABCHECK OK")
        + "\nCURSOR " + (curOk ? "OK" : "缺失");
      document.body.appendChild(pre);
    }

    G.UI.forceRender();

    // 供截图脚本判断是否就绪
    document.title = "READY 区域" + S.region + " 钱" + G.fmt(S.money) +
      " 常客" + Object.keys(S.regulars).filter((d) => S.regulars[d].unlocked).length;
    const flag = document.createElement("div");
    flag.id = "devReady";
    flag.textContent = "READY";
    document.body.appendChild(flag);
  }, 60);
})();
