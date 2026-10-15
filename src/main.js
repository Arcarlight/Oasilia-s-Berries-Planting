// 入口：读档 → 离线结算 → 主循环。
(function () {
  let S = null;
  let lastFrame = 0;
  let lastSave = 0;
  const SAVE_INTERVAL = 10000;

  function modal(html) {
    const ov = document.getElementById("overlay");
    ov.className = "";
    ov.innerHTML = `<div class="modal">${html}</div>`;
  }

  function offlineReport(away, used, earned, state) {
    const lines = (G.ATLAS_LINES && G.ATLAS_LINES.offline) || [];
    const line = lines.length ? lines[Math.floor(Math.random() * lines.length)] : "";
    const capped = away > used + 1;
    const ripe = state.plots.filter((p) => p.ripe).length;
    modal(`
      <h3>你离开了 ${G.time(away)}</h3>
      <div class="mon">
        <img class="portrait" src="assets/pmd/0373_portrait.png" alt="" onerror="this.style.visibility='hidden'">
        <div class="grow">
          <div class="who">阿特拉斯</div>
          <div class="bubble" style="margin-top:4px">${esc(line)}</div>
        </div>
      </div>
      <table class="simple" style="margin-top:12px">
        <tr><td>结算时长</td><td>${G.time(used)}${capped ? "（离线上限）" : ""}</td></tr>
        <tr><td>这段时间入账</td><td class="gold">₽${G.fmt(earned)}</td></tr>
        <tr><td>田里成熟的作物</td><td>${ripe} 块</td></tr>
        ${state.atlas.trip ? `<tr><td>阿特拉斯</td><td>还没回来</td></tr>` : ""}
      </table>
      <div class="row2" style="margin-top:10px">
        <button class="gold" data-act="closeOverlay">去收果子</button>
      </div>
      <div class="sub" style="margin-top:8px">关闭页面也能继续赚，但上限是 ${G.time(G.offlineCapSeconds(state))}。
      想延长就点天赋「静养」，或者去水晶洞穴。</div>
    `);
  }

  function welcome(state) {
    G.addLog(state, "西莉亚收拢翅膀，轻轻落在空地边上，爪子里还攥着三颗樱子果的种子。", "info");
    G.addLog(state, "阿特拉斯把大包小包一个个卸下来码好，才抬头说：「种子你慢慢种，这些家伙什交给我来收拾，你歇会儿。」", "atlas");
    modal(`
      <h3>菲洛若亚大陆 · 树果物语</h3>
      <div class="mon">
        <img class="portrait" src="assets/pmd/0330_portrait.png" alt="" onerror="this.style.visibility='hidden'">
        <img class="portrait" src="assets/pmd/0373_portrait.png" alt="" onerror="this.style.visibility='hidden'">
        <div class="grow">
          <div class="who">欧亚西莉亚 &amp; 阿特拉斯</div>
          <div class="sub">繁盛之森的土又松又软，一脚踩下去能陷进去半个指节。</div>
        </div>
      </div>
      <div class="bubble" style="margin-top:10px">
        「就这里吧！」西莉亚把种子轻轻按进土里，回头看着顶着大包小包的阿特拉斯，眼睛都笑弯了，「辛苦啦，阿特拉斯！你一个人把这么些东西都扛过来了，真了不起，我光看着都觉得肩膀发酸。」
      </div>
      <div class="bubble" style="margin-top:10px">
        阿特拉斯把包袱一个个卸下来，码得整整齐齐，才闷闷地回她：「这些东西不沉，我扛得动，你不用担心。多带的那两件，是我怕你半路想起来要用，顺手塞进去的。」说完他顿了顿，像是才反应过来自己说了什么，又小声补了一句，「我不是嫌你带得多，我就是怕你路上不方便。」
      </div>
      <div class="card" style="margin-top:12px">
        <h4>头三件事</h4>
        <ol>
          <li>左边有四块空地。点种子旁边的「全种」，把三颗樱子果都种下去。</li>
          <li>点正在长的苗给它浇水，或者按底下的「浇水」按钮，浇了长得快很多。</li>
          <li>熟了收下来，去「商店」再买点种子，或者去「加工」把果子做成更值钱的商品。</li>
        </ol>
      </div>
      <div class="row2">
        <button class="gold" data-act="closeOverlay">开始</button>
      </div>
    `);
  }

  function esc(s) {
    return String(s === undefined || s === null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function boot() {
    let state = G.loadGame();
    const fresh = !state;
    if (fresh) state = G.newState();
    S = state;
    window.__state = state;

    if (!fresh) {
      const away = (Date.now() - (state.lastSeen || Date.now())) / 1000;
      if (away > 45) {
        const cap = G.offlineCapSeconds(state);
        const used = Math.min(away, cap);
        const before = state.money;
        G.advance(state, used, { silent: true });
        const earned = state.money - before;
        // 没结算到的那部分时间照样流逝：把游戏时钟对回真实时间，避免加工/出行卡在过去
        state.clock = Date.now();
        offlineReport(away, used, earned, state);
      }
    }

    G.UI.init(state);
    if (fresh) welcome(state);

    document.getElementById("btnSell").addEventListener("click", () => {
      G.UI.frame();
    });
    document.getElementById("btnWaterAll").addEventListener("click", () => {
      const n = G.engine.waterAll(S);
      G.UI.toast(n ? "浇了 " + n + " 块地" : "这会儿没有要浇水的田");
      G.UI.forceRender();
    });
    document.getElementById("btnHarvestAll").addEventListener("click", () => {
      const n = G.engine.harvestAll(S);
      G.UI.toast(n ? "收了 " + n + " 个" : "还没有熟的");
      G.UI.forceRender();
    });
    document.getElementById("btnSettings").addEventListener("click", () => G.UI.openSettings());

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        G.saveGame(S);
      } else {
        // 标签页在后台时 requestAnimationFrame 不跑，回来要补上这段时间
        const away = (Date.now() - (S.lastSeen || Date.now())) / 1000;
        if (away > 30) {
          const used = Math.min(away, G.offlineCapSeconds(S));
          G.advance(S, used, { silent: true });
        }
        S.clock = Date.now();
        lastFrame = performance.now();
      }
    });
    window.addEventListener("beforeunload", () => G.saveGame(S));

    document.addEventListener("keydown", (e) => {
      if (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT") return;
      if (e.code === "KeyH") document.getElementById("btnHarvestAll").click();
      if (e.code === "KeyW") document.getElementById("btnWaterAll").click();
      if (e.code === "Space") { e.preventDefault(); document.getElementById("btnSell").click(); }
    });

    lastFrame = performance.now();
    requestAnimationFrame(loop);
  }

  function loop(now) {
    const dt = Math.min(5, (now - lastFrame) / 1000);
    lastFrame = now;
    if (dt > 0) {
      G.advance(S, dt);
      G.UI.frame();
    }
    if (now - lastSave > SAVE_INTERVAL) {
      lastSave = now;
      const ok = G.saveGame(S);
      const el = document.getElementById("uiSaved");
      if (el) el.textContent = ok ? "存好了 " + new Date().toLocaleTimeString("zh-CN", { hour12: false }) : "没存上";
    }
    requestAnimationFrame(loop);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
