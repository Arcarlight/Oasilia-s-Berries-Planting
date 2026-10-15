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
    G.addLog(state, "欧亚西莉亚落在一片空地边上，爪子里捏着三颗樱子果的种子。", "info");
    G.addLog(state, "阿特拉斯把一把旧铁锹插进土里：「先种下去。别的我来。」", "atlas");
    modal(`
      <h3>菲洛若亚大陆 · 树果物语</h3>
      <div class="mon">
        <img class="portrait" src="assets/pmd/0330_portrait.png" alt="" onerror="this.style.visibility='hidden'">
        <img class="portrait" src="assets/pmd/0373_portrait.png" alt="" onerror="this.style.visibility='hidden'">
        <div class="grow">
          <div class="who">欧亚西莉亚 &amp; 阿特拉斯</div>
          <div class="sub">繁盛之森的软土，一脚踩下去能陷半个指节。</div>
        </div>
      </div>
      <div class="bubble" style="margin-top:10px">
        「就这儿了。」她把种子按进土里，回头看了他一眼，「你带的工具够不够？」
      </div>
      <div class="bubble" style="margin-top:10px">
        「……够。」阿特拉斯把包袱放下，「你要种遍整个大陆，我就把整个大陆的铁都敲一遍。」
      </div>
      <div class="card" style="margin-top:12px">
        <h4>头三件事</h4>
        <ol>
          <li>左边有四块空地。点种子旁边的「全种」，把三颗樱子果种下去。</li>
          <li>点正在长的作物给它浇水（或者按底下的「浇水」按钮），长得快很多。</li>
          <li>熟了以后收下来，去「商店」买更多种子，或者去「加工」把果子做成更值钱的商品。</li>
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
      G.UI.toast(n ? "浇了 " + n + " 块地" : "没有需要浇水的田");
      G.UI.forceRender();
    });
    document.getElementById("btnHarvestAll").addEventListener("click", () => {
      const n = G.engine.harvestAll(S);
      G.UI.toast(n ? "收了 " + n + " 个" : "还没有成熟的");
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
      if (el) el.textContent = ok ? "已保存 " + new Date().toLocaleTimeString("zh-CN", { hour12: false }) : "保存失败";
    }
    requestAnimationFrame(loop);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
