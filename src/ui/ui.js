// UI：所有渲染与交互。引擎不碰 DOM，这里不写数值逻辑。
window.G = window.G || {};
(function () {
  const UI = {};
  let S = null;
  let dirty = true;
  let lastTabRender = 0;
  let lastHtml = "";
  let lastTabId = "";
  // 手机原生下拉打开期间锁住重建：从按下 select 起，到它失焦/选中为止
  let formLock = 0;

  const TABS = [
    { id: "market", name: "市场" },
    { id: "kitchen", name: "加工" },
    { id: "regulars", name: "常客" },
    { id: "shop", name: "商店" },
    { id: "atlas", name: "阿特拉斯" },
    { id: "store", name: "仓库" },
    { id: "lab", name: "研发" },
    { id: "talents", name: "天赋" },
    { id: "dex", name: "图鉴" },
    { id: "help", name: "说明" }
  ];

  const pick = { seed: null, recipe: null, regularFor: {}, labBerry: null, labFinds: [], storeSel: null, kflavor: [] };

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s === undefined || s === null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function attr(obj) { return esc(JSON.stringify(obj)); }
  // 库存一律按整数显示：果子/种子/商品/材料都是离散的
  function int(n) { const v = Math.floor(n || 0); return v > 0 ? v : 0; }

  // UI 图标（Kenney Cursor Pixel Pack，CC0）。白色 16x16 PNG，用 img 引，靠 opacity 控制强弱。
  // 像素图标：1x/2x/3x 三档交给浏览器按屏幕密度挑。
  // 只给 srcset 而不给尺寸，Retina 上会被拿去放大 16px 的图，糊掉。
  function icon(name, extra) {
    return `<img class="ico${extra ? " " + extra : ""}" src="assets/ui/${name}.png"`
      + ` srcset="assets/ui/${name}-2x.png 2x, assets/ui/${name}-3x.png 3x"`
      + ` alt="" aria-hidden="true">`;
  }

  const TAB_NAME = {};
  TABS.forEach((t) => { TAB_NAME[t.id] = t.name; });
  // 文案里提到别的页面时，直接给一个能点的跳转
  function go(tabId, label) {
    return `<button class="link" data-act="tab" data-p='${attr({ t: tabId })}' title="去「${esc(TAB_NAME[tabId] || tabId)}」">${esc(label || TAB_NAME[tabId] || tabId)}</button>`;
  }
  function money(n) { return "₽" + G.fmt(n); }

  UI.markDirty = function () { dirty = true; };

  // 切标签页要作废上一页的 HTML 缓存
  UI.pinForm = function (el) { formLock = performance.now(); };
  // 吐司用 transition 而不是关键帧：这类元素会被连点，关键帧会从头重播，
  // transition 则是从当前值继续，连点也不会跳。
  UI.toast = function (text) {
    const wrap = $("toastWrap");
    const d = document.createElement("div");
    d.className = "toast";
    d.textContent = text;
    wrap.appendChild(d);
    while (wrap.children.length > 4) wrap.removeChild(wrap.firstChild);   // 连点时别堆成一片
    void d.offsetWidth;                 // 先让浏览器认下初始态，再切到 in
    d.classList.add("in");
    setTimeout(() => {
      d.classList.remove("in");         // 原路退出（从下方来，就从下方走）
      setTimeout(() => d.remove(), 160);
    }, 2400);
  };

  // ---------------- 田地 ----------------

  function plotHTML(p, i) {
    if (!p.berry) {
      return `<div class="plot empty" data-act="plot" data-p='${attr({ i: i })}' title="一块空地"></div>`;
    }
    const berry = G.BERRY_BY_ID[p.berry];
    if (!berry) return `<div class="plot empty" data-act="plot" data-p='${attr({ i: i })}'></div>`;
    // 用百科的「树果的树」贴图：1 种子 / 2 发芽 / 3 长高 / 4 开花 / 5 结果
    const g = Math.min(1, p.grown);
    const stage = p.ripe || g >= 0.98 ? 5 : g >= 0.72 ? 4 : g >= 0.42 ? 3 : g >= 0.06 ? 2 : 1;
    const tip = p.ripe
      ? `${berry.zh}：可以收了`
      : `${berry.zh}：生长中 ${Math.floor(g * 100)}%`;
    return `<div class="plot ${p.ripe ? "ripe" : ""}" data-act="plot" data-p='${attr({ i: i })}' title="${esc(tip)}">
      <div class="soil"></div>
      <img class="tree" src="assets/tree/${berry.id}_${stage}.png" alt="${esc(berry.zh)}">
      <div class="bar"><i style="width:${(g * 100).toFixed(1)}%"></i></div>
      ${p.ripe ? '<div class="badge">收</div>' : ""}
    </div>`;
  }


  function renderPlots() {
    const box = $("uiPlots");
    const cols = S.plots.length > 16 ? 6 : 4;
    box.style.gridTemplateColumns = "repeat(" + cols + ", 1fr)";
    const cap = G.engine.plotCap(S);
    const bought = S.extraPlots || 0;
    const price = G.engine.plotPrice(S);
    let html = S.plots.map(plotHTML).join("");
    if (bought < cap) {
      html += `<div class="plot empty" data-act="buyPlot" title="买一块新地" style="border-style:dashed">
        <div style="text-align:center;font-size:11px;color:#9fa286">
          <div style="font-size:20px;color:#f0c04a">＋</div>买地<br>${money(price)}
        </div></div>`;
    }
    morph(box, html);
    const ripe = S.plots.filter((p) => p.ripe).length;
    $("uiPlotInfo").textContent = "（" + S.plots.length + "/" + (S.plots.length + (cap - bought)) + " 块，成熟 " + ripe + "）";
  }

  // 种子那栏的排序：同一种味道放一起，味道内部按浓郁度从高到低。
  // 所以「从上往下」就是「该先种哪个」—— 一键播种也照这个顺序。
  function seedOrder() {
    const ids = Object.keys(S.seeds).filter((id) => S.seeds[id] > 0).map(Number);
    const fi = (b) => {
      const i = G.FLAVORS_5.indexOf(b.flavor);
      return i < 0 ? 99 : i;
    };
    return ids.sort((a, b) => {
      const ba = G.BERRY_BY_ID[a], bb = G.BERRY_BY_ID[b];
      if (fi(ba) !== fi(bb)) return fi(ba) - fi(bb);
      const da = G.berryFlavorScore(ba), db = G.berryFlavorScore(bb);
      if (da !== db) return db - da;              // 浓的排前面
      if (ba.basePrice !== bb.basePrice) return bb.basePrice - ba.basePrice;
      return a - b;
    });
  }
  // 一键播种的顺序：和列表不一样 —— 列表是"看着方便"（同味道归类），
  // 播种是"收益优先"，所以直接按果价从高到低，不管味道。
  function seedPlantOrder() {
    return Object.keys(S.seeds).filter((id) => S.seeds[id] > 0).map(Number)
      .sort((a, b) => {
        const ba = G.BERRY_BY_ID[a], bb = G.BERRY_BY_ID[b];
        if (ba.basePrice !== bb.basePrice) return bb.basePrice - ba.basePrice;
        const da = G.berryFlavorScore(ba), db = G.berryFlavorScore(bb);
        if (da !== db) return db - da;
        return a - b;
      });
  }
  UI.seedOrder = seedOrder;
  UI.seedPlantOrder = seedPlantOrder;
  UI.tabList = function () { return TABS; };

  function renderSeedPicker() {
    const box = $("uiSeedPicker");
    const ids = seedOrder();
    if (!ids.length) {
      morph(box, `<div class="sub">没有种子了。去${go("shop", "商店")}买一些，或者让${go("atlas", "阿特拉斯")}出门碰碰运气。</div>`);
      return;
    }
    if (!pick.seed || !(S.seeds[pick.seed] > 0)) pick.seed = ids[0];
    const seedHtml = `<div class="sub" style="margin-bottom:4px">手上的种子（点一下选中，再点空地播种）
      <br>按 <b>P</b> 一键种下：<b>贵的优先</b>，和下面这个看着方便的顺序不一样。</div>` +
      ids.map((id) => {
        const b = G.BERRY_BY_ID[id];
        const on = pick.seed === id ? "style=\"outline:2px solid var(--gold)\"" : "";
        // 这里列的是「种子」，所以用种子袋的图（布袋 + 右下角一颗树果），
        // 而不是树果本身；名字后面缀一个正常颜色的「种子」，一眼知道拿的是什么。
        return `<div class="row" ${on}>
          <span class="picon seed-icon">
            <img class="pbase" src="${seedBagImg(b)}" alt="">
            <img class="pberry" src="${b.icon}" alt="${esc(b.zh)}"></span>
          <span class="nm flavor-${b.flavor}">${esc(b.zh)}<span class="seedword">种子</span>
            <span class="ftier small flavor-${b.flavor}">${esc(G.berryFlavorTier(b))}</span></span>
          <span class="sub">×${S.seeds[id]}</span>
          <button class="small" data-act="seed" data-p='${attr({ b: id })}'>选中</button>
          <button class="small" data-act="plantAll" data-p='${attr({ b: id })}'>全种</button>
        </div>`;
      }).join("");
    morph(box, seedHtml);
  }

  // ---------------- 市场 ----------------

  function renderMarket() {
    const berryIds = Object.keys(S.berries).filter((k) => S.berries[k] >= 1);
    const keys = Object.keys(S.products).filter((k) => S.products[k] >= 1);
    let h = "";
    const stall = G.engine.stallInfo(S);
    if (stall.unlocked) {
      h += `<div class="card"><h4>摊位自动出货</h4>
        <div class="sub">秒卖 ${stall.perSec.toFixed(1)} 个生果（从最贵的开始）。每个品种至少留 ${stall.reserve} 个不卖，留给加工用。</div>
        <div class="row2" style="margin-top:6px">
          <button class="${stall.on ? "gold" : ""}" data-act="toggleStall">${stall.on ? "✔ 正在自动出货" : "已关闭（点一下打开）"}</button>
          <span class="sub">保留量：</span>
          ${[0, 10, 20, 50, 100, 200].map((n) =>
            `<button class="small ${stall.reserve === n ? "picked" : ""}" data-act="setReserve" data-p='${attr({ n: n })}'>${n}</button>`).join("")}
        </div>
        <div class="sub" style="margin-top:4px">要做果酱又抢不过摊位？把保留量调大，或者直接关掉自动出货。</div>
      </div>`;
    }
    h += `<div class="row2" style="margin-bottom:8px">
      <button data-act="sellAllBerries">生果全部卖出</button>
      <button data-act="sellAllProducts">商品全部卖出</button>
      <span class="sub">直接卖便宜，交给常客贵。喜欢对应口味的常客会多给 50%。</span>
    </div>`;

    h += `<div class="card"><h4>生果</h4>`;
    if (!berryIds.length) h += `<div class="sub">还没有收获的生果。</div>`;
    berryIds.sort((a, b) => G.BERRY_BY_ID[b].basePrice - G.BERRY_BY_ID[a].basePrice).forEach((id) => {
      const b = G.BERRY_BY_ID[id];
      const price = G.berrySellPrice(S, b);
      h += `<div class="list-item">
        <img src="${b.icon}" alt="">
        <span class="grow flavor-${b.flavor}">${esc(b.zh)}
          <span class="ftier small flavor-${b.flavor}">${esc(G.berryFlavorTier(b))}</span></span>
        <span>×${int(S.berries[id])}</span>
        <span class="sub">单价 ${money(price)}</span>
        <button class="small" data-act="sellBerry" data-p='${attr({ id: +id, n: 1 })}'>卖1</button>
        <button class="small" data-act="sellBerry" data-p='${attr({ id: +id, n: 9999 })}'>全卖</button>
      </div>`;
    });
    h += `</div>`;

    h += `<div class="card"><h4>商品</h4>`;
    if (!keys.length) h += `<div class="sub">还没有加工出来的商品。去${go("kitchen", "加工")}看看。</div>`;
    const regs = G.engine.regionRegulars(S.region).filter((r) => G.engine.regState(S, r.dex).unlocked);
    keys.forEach((k) => {
      const ki = G.keyInfo(k);
      const r = ki.recipe, b = ki.berry, sub = ki.sub;
      if (!r || !b) return;
      const v = sub ? G.mixedValue(r, b, sub) : G.productValue(r, b);
      const pname = sub ? G.mixedName(r, b, sub) : G.productName(r, b);
      const ftag = sub ? (G.mixTag(b, sub) || r.flavor) : r.flavor;
      const sellTo = regs.length
        ? `<select data-act="picksell" data-p='${attr({ k: k })}'>
             <option value="">随便谁（市场价）</option>
             ${regs.map((rg) => `<option value="${rg.dex}" ${pick.regularFor[k] === rg.dex ? "selected" : ""}>${esc(rg.name)}（喜${rg.flavor}）</option>`).join("")}
           </select>`
        : `<span class="sub">还没有常客</span>`;
      const target = pick.regularFor[k] || null;
      const regArg = target
        ? { aff: G.engine.regState(S, target).aff, flavor: G.engine.regularByDex(target).flavor, dislike: G.engine.regularByDex(target).dislike }
        : null;
      const price = sub
        ? (regArg ? G.mixedSellPrice(S, r, b, sub, regArg) : G.mixedMarketPrice(S, r, b, sub))
        : (regArg ? G.productSellPrice(S, r, b, regArg) : G.marketPrice(S, r, b));
      const mshare = sub ? (G.mixSplit(G.craftNeedCount(S, r)).main / Math.max(1, G.craftNeedCount(S, r))) : 0.5;
      h += `<div class="list-item">
        ${G.productIcon(r, b, sub, mshare)}
        <span class="grow" title="${esc(pname)}">${esc(pname)}
          <span class="flavor-${b.flavor}">[${esc(ftag)}]</span></span>
        <span>×${int(S.products[k])}</span>
        <span class="sub">基础 ₽${G.fmt(v)}</span>
        ${sellTo}
        <span class="gold">${money(price)}</span>
        <button class="small" data-act="sellProduct" data-p='${attr({ k: k, n: 1, dex: target })}'>卖1</button>
        <button class="small" data-act="sellProduct" data-p='${attr({ k: k, n: 9999, dex: target })}'>全卖</button>
      </div>`;
    });
    h += `</div>`;
    return h;
  }

  // ---------------- 加工 ----------------

  function renderKitchen() {
    const info = G.engine.craftSlotInfo(S);
    const now = G.now(S);
    const free = Math.max(0, info.slots - S.craftQueue.length);
    const b = G.bonuses(S);
    let h = "";

    // ── 工位条：一眼看出还能塞几个 ──
    h += `<div class="card"><h4>加工台（${S.craftQueue.length}/${info.slots}）</h4><div class="slots">`;
    S.craftQueue.forEach((j) => {
      const r = G.RECIPE_BY_ID[j.recipeId];
      const bb = G.BERRY_BY_ID[j.berryId];
      const left = Math.max(0, (j.until - now) / 1000);
      const p = 100 - Math.min(100, (left / j.secs) * 100);
      const nm = r && bb ? (String(j.key).split("|").length === 3 ? G.mixedName(r, bb, G.BERRY_BY_ID[+String(j.key).split("|")[2]]) : G.productName(r, bb)) : "";
      h += `<div class="slot busy" style="--p:${p.toFixed(0)}%" title="正在制作「${esc(nm)}」，还有 ${left >= 60 ? Math.ceil(left / 60) + " 分钟" : left.toFixed(0) + " 秒"}">
        ${r && bb ? G.productIcon(r, bb) : ""}
        <span class="stime">${left >= 60 ? Math.ceil(left / 60) + "分" : left.toFixed(0) + "s"}</span>
        <span class="sname">${esc(nm)}</span></div>`;
    });
    for (let i = 0; i < free; i++) h += `<div class="slot free" title="空工位"></div>`;
    h += `</div>`;
    h = h.replace('</h4>', ` <span class="help"><img class="hico" src="assets/ui/help.png" srcset="assets/ui/help-2x.png 2x, assets/ui/help-3x.png 3x" alt="?"><span class="htip">工位 = 2 个基础 + 工坊类道具等级总和 ÷ 2（上限 ${info.cap}）。
当前等级和 ${info.total}${info.detail.length ? "：" + info.detail.map((x) => x.name + " Lv." + x.level).join("、") : "（还没有工坊道具）"}。
格子里显示正在做的东西和剩余时间，虚线格是空工位。</span></span></h4>`, 1);
    if (G.engine.autoUnlocked(S)) {
      const auto = S.autoRecipe && S.recipes[S.autoRecipe] ? G.RECIPE_BY_ID[S.autoRecipe] : null;
      h += `<div class="row2" style="margin-top:4px"><span class="sub">自动加工：${auto ? "开着，优先做「" + esc(auto.name) + "」" : "关着"}</span>
        ${auto ? `<button class="small" data-act="autoOff">关掉</button>` : `<span class="sub">（下面每行有「一直做」）</span>`}</div>`;
    } else {
      h += `<div class="sub" style="margin-top:4px">做出第一件工坊道具（区域 2 的「石磨」）之后，这里会多出「自动加工」。</div>`;
    }
    h += `</div>`;

    const unlocked = G.engine.unlockedRecipes(S);
    if (!unlocked.length) {
      h += `<div class="card"><h4>还没有配方</h4><div class="sub">去${go("shop", "商店")}买一个配方。最先该买的是「辣味果酱」。</div></div>`;
      return h;
    }

    // ── 混合口味工作台：主料 + 副料 ──
    const mixR = pick.mixFor ? G.RECIPE_BY_ID[pick.mixFor] : null;
    if (mixR && S.recipes[mixR.id]) {
      const need = G.craftNeedCount(S, mixR);
      const sp = G.mixSplit(need);
      const mains = G.engine.eligibleBerries(S, mixR).slice().sort((x, y) => y.basePrice - x.basePrice);
      if (!pick.mixMain || !mains.some((x) => x.id === pick.mixMain)) pick.mixMain = mains.length ? mains[0].id : null;
      const mainB = pick.mixMain ? G.BERRY_BY_ID[pick.mixMain] : null;
      h += `<div class="card" style="border-color:var(--gold)"><h4>混合口味：${esc(mixR.name)}
        <span class="help"><img class="hico" src="assets/ui/help.png" srcset="assets/ui/help-2x.png 2x, assets/ui/help-3x.png 3x" alt="?"><span class="htip">主料决定用哪张配方（要「${esc(mixR.needFlavor || "指定")}」味），副料只要味道不同就成。
投料 ${need} 颗拆成主料 ${sp.main} + 副料 ${sp.sub}，做出来的东西带两种味道。
爱吃这两味的常客都肯买，价值还多 8%。</span></span></h4>
        <button class="small" data-act="mixOn" data-p='${attr({ r: mixR.id })}' style="position:absolute;top:2px;right:26px">关闭</button>`;
      h += `<div class="row2" style="margin-top:6px;flex-wrap:wrap"><span class="sub">主料</span>`;
      mains.slice(0, 8).forEach((x) => {
        h += `<button class="berrybtn${x.id === pick.mixMain ? " picked" : ""}" data-act="mixMain" data-p='${attr({ b: x.id })}'
          title="用${esc(x.zh)}当主料"><img src="${x.icon}" alt=""><b>×${int(S.berries[x.id])}</b></button>`;
      });
      if (!mains.length) h += `<span class="sub">没有够用的主料</span>`;
      h += `</div>`;
      if (mainB) {
        const subs = G.BERRIES.filter((x) => x.id > 0 && x.flavor !== mainB.flavor && (S.berries[x.id] || 0) >= sp.sub);
        h += `<div class="row2" style="margin-top:4px;flex-wrap:wrap"><span class="sub">副料</span>`;
        subs.slice(0, 10).forEach((x) => {
          h += `<button class="berrybtn" data-act="craftMix" data-p='${attr({ r: mixR.id, m: mainB.id, s: x.id })}'
            title="${esc(mainB.zh)}×${sp.main} + ${esc(x.zh)}×${sp.sub} → ${esc(G.mixTag(mainB, x) || "")}"><img src="${x.icon}" alt=""><span class="fchip fc-${x.flavor}">${esc(x.flavor)}</span><b>${int(S.berries[x.id])}</b></button>`;
        });
        if (!subs.length) h += `<span class="sub">手上没有另一种味道的果子够用</span>`;
        h += `</div><div class="sub" style="margin-top:4px">做出来大概是「${esc(G.mixTag(mainB, subs[0] || mainB) || "")}${esc(mixR.catName || mixR.name)}」。</div>`;
      }
      h += `</div>`;
    }

    // ── 口味筛选 ──
    const fls = ["全部"].concat(G.FLAVORS).concat(["混合"]);
    const wants = pick.kflavor || [];
    h += `<div class="card"><div class="fltabs">` + fls.map((f) => {
      const on = f === "全部" ? !wants.length : wants.indexOf(f) >= 0;
      const label = (f === "全部")
        ? esc(f)
        : `<span class="fchip fc-${f}">${esc(f)}</span>`;
      return `<button class="${on ? "picked" : ""}" data-act="kflavor" data-p='${attr({ f: f })}'>${label}</button>`;
    }).join("") + `</div>`
      + (wants.length === 2 ? `<div class="sub" style="margin-top:4px">同时看两个味道：${wants.map(esc).join(" + ")}</div>` : "");

    // ── 一行一张配方：点树果图标直接下单 ──
    const mine = G.engine.regionRegulars(S.region).filter((rg) => G.engine.regState(S, rg.dex).unlocked);
    const list = unlocked.filter((r) => !wants.length || wants.indexOf(r.flavor) >= 0);
    if (!list.length) h += `<div class="sub">这个口味还没有配方。</div>`;
    list.forEach((r) => {
      const secs = r.time / (1 + b.craftSpeed);
      const need = G.craftNeedCount(S, r);
      const elig = G.engine.eligibleBerries(S, r).slice().sort((x, y) => y.basePrice - x.basePrice);
      const fans = mine.filter((rg) => rg.flavor === r.flavor);
      const isAuto = S.autoRecipe === r.id;
      h += `<div class="krow${elig.length ? "" : " off"}">
        <div class="kinfo">
          <div class="kname"><span class="fchip fc-${r.flavor}">${esc(r.flavor)}</span> ${esc(r.name)}${isAuto ? ` <span class="tag" style="color:var(--gold)">自动</span>` : ""}</div>
          <div class="kmeta"><img class="kico" src="assets/ui/stat-money.png" alt="">×${r.mult}
            <img class="kico" src="assets/ui/hourglass.png" alt="">${secs.toFixed(1)}s
            ${fans.slice(0, 3).map((g) => `<img class="guest" src="assets/pmd/${String(g.dex).padStart(4, "0")}_portrait.png" alt="" title="${esc(g.name)}喜欢${esc(r.flavor)}味，会买">`).join("")}
          </div>
        </div>`;
      if (elig.length) {
        elig.forEach((x) => {
          h += `<button class="berrybtn" data-act="craft" data-p='${attr({ r: r.id, b: x.id })}'
            title="用${esc(x.zh)}做一件（吃掉 ${need} 颗）"><img src="${x.icon}" alt=""><b>×${int(S.berries[x.id])}</b></button>`;
        });
        if (free > 0) h += `<button class="fillbtn gold" data-act="craftFill" data-p='${attr({ r: r.id })}'>做满 ${free}</button>`;
        if (G.engine.autoUnlocked(S) && !isAuto) {
          h += `<button class="fillbtn" data-act="autoOn" data-p='${attr({ r: r.id })}' title="一直做这个">一直做</button>`;
        }
        const mixing = pick.mixFor === r.id;
        h += `<button class="fillbtn${mixing ? " gold" : ""}" data-act="mixOn" data-p='${attr({ r: r.id })}' title="两种口味混着做">${mixing ? "取消" : "混"}</button>`;
      } else {
        const hint = G.engine.berryHint(S, r);
        h += `<span class="sub kwhy">缺 ${need} 颗${esc(r.needFlavor || "对应")}味果${hint.length ? "（" + esc(hint.slice(0, 2).map((x) => x.zh).join("、")) + "…）" : "，这一带还没有"}</span>`;
        if (hint.length) h += `<button class="fillbtn" data-act="tab" data-p='${attr({ t: "shop" })}'>去商店</button>`;
      }
      h += `</div>`;
    });
    h += `</div>`;

    const locked = G.RECIPES.filter((r) => !r.research && !S.recipes[r.id] && r.region <= S.maxRegion);
    if (locked.length) {
      h += `<div class="card"><h4>可以学的配方</h4>`;
      locked.slice(0, 12).forEach((r) => {
        h += `<div class="list-item">
          <span class="grow">${esc(r.name)} <span class="sub"><img class="kico" src="assets/ui/stat-money.png" alt="">×${r.mult}　需要 ${G.craftNeedCount(S, r)} 个${r.needFlavor ? r.needFlavor + "味树果" : "指定树果"}</span></span>
          <span>${money(r.cost)}</span>
          <button class="small" data-act="buyRecipe" data-p='${attr({ r: r.id })}' ${S.money < r.cost ? "disabled" : ""}>学会</button>
        </div>`;
      });
      h += `</div>`;
    }
    return h;
  }

  // ---------------- 常客 ----------------

  function renderRegulars() {
    const list = G.engine.regionRegulars(S.region);
    const roamN = G.engine.roamCount(S, S.region);
    let h = `<div class="card"><h4>${esc(G.regionOf(S).name)} 的常客</h4>
      <div class="sub">解锁全部 ${list.length} 位之后，就能付移民费搬到下一个区域。口味偏好来自性格。</div>
      ${roamN ? `<div class="sub" style="margin-top:4px;color:var(--gold)">这一带是巡游回来的第 ${roamN} 次：
        常客要重新上门，门槛 ×${G.engine.roamScale(S, S.region).toFixed(1)}，
        而且只算这次停留里新攒的进度（好感与图鉴都还留着）。</div>` : ""}</div>`;

    if (!list.length) return h + `<div class="sub">这一带还没有常客。</div>`;

    // 自动交付
    const canAuto = G.engine.autoTradeUnlocked(S);
    h += `<div class="card"><h4>自动交付</h4>`;
    if (canAuto) {
      h += `<div class="row2">
        <button class="${S.autoTrade ? "gold" : ""}" data-act="toggleAutoTrade">${S.autoTrade ? "✔ 开着" : "打开自动交付"}</button>
        <span class="sub">${S.autoTrade
          ? "每 2 秒自动把商品交给喜欢这个口味的常客（顺带自动交订单），不用你一件件点。"
          : "打开之后，商品自动交给对味的常客，订单也自动交。"}</span>
      </div>`;
    } else {
      h += `<div class="sub">做出「木质招牌」（区域 2，商铺类）之后，这里会多出自动交付——
      商品会自动交给喜欢这个口味的常客，订单也会自动交。</div>`;
    }
    h += `</div>`;

    list.forEach((reg) => {
      const st = G.engine.regState(S, reg.dex);
      const unlock = st.unlocked;
      const order = S.orders[reg.dex];
      const prog = G.engine.unlockProgress(S, reg);
      const pctv = Math.min(1, prog.cur / prog.need);

      h += `<div class="card"><div class="mon">
        <img class="portrait" src="assets/pmd/${String(reg.dex).padStart(4, "0")}_portrait.png" alt="" onerror="this.style.visibility='hidden'">
        <div class="grow">
          <div class="who">${esc(reg.name)} <span class="tag">${esc(reg.title)}</span>
            ${unlock ? "" : `<span class="tag">未解锁</span>`}</div>
          <div class="sub">性格 ${esc(reg.nature)}　喜欢 <b class="flavor-${reg.flavor}">${reg.flavor}</b>　讨厌 <b class="flavor-${reg.dislike}">${reg.dislike}</b>
            ｜好感 ${st.aff}/5</div>
          <div class="sub">${esc(reg.desc)}</div>
          ${unlock ? `<div class="sub" style="margin-top:4px">${esc(reg.lines.greet[st.aff % reg.lines.greet.length])}</div>`
            : `<div class="sub" style="margin-top:4px">解锁条件：${esc(prog.label)} ${G.fmt(prog.cur)} / ${G.fmt(prog.need)}</div>
               <div class="bar-outer" style="margin-top:4px"><i style="width:${(pctv * 100).toFixed(0)}%"></i></div>`}
          ${order ? `<div class="sub" style="margin-top:4px;color:#9fd8ff">【订单】要 ${order.count} 份<b class="flavor-${order.flavor}">${order.flavor}</b>味的商品，
             赏金 ${money(order.reward)}，剩 ${G.clock((order.expires - G.now(S)) / 1000)}</div>
             <button class="small gold" data-act="deliver" data-p='${attr({ dex: reg.dex })}'>交付订单</button>` : ""}
          ${unlock ? `<button class="small" data-act="hire" data-p='${attr({ dex: reg.dex })}'
             ${S.helpers.some((x) => x.dex === reg.dex) ? "disabled" : ""}>${S.helpers.some((x) => x.dex === reg.dex) ? "已在帮忙" : "请来帮忙（₽" + G.fmt(G.engine.helperCost(S)) + "）"}</button>
             ${S.helpers.some((x) => x.dex === reg.dex) ? `<button class="small danger" data-act="fire" data-p='${attr({ dex: reg.dex })}'>让他回去</button>` : ""}` : ""}
        </div>
      </div></div>`;
    });

    const slots = G.engine.helperSlots(S);
    h += `<div class="card"><h4>帮手（${S.helpers.length}/${slots}）</h4>
      <div class="sub">槽位靠道具解锁（农具类里的帮手道具）。帮手会自动收获、补种、浇水。</div>
      ${S.helpers.map((x) => {
        const r = G.engine.regularByDex(x.dex);
        return `<div class="list-item"><span class="grow">${esc(r ? r.name : x.dex)}</span>
          <button class="small danger" data-act="fire" data-p='${attr({ dex: x.dex })}'>让他回去</button></div>`;
      }).join("") || `<div class="sub">还没有帮手。</div>`}
    </div>`;
    return h;
  }

  // ---------------- 商店 ----------------

  // 种子袋的图：布袋按味道染色（化け猫缶 #0163 那个扎口袋），
  // 面粉是 #0442、砂糖是 #0443，都是扁袋子，别混。
  function seedBagImg(b) {
    const fl = G.FLAVORS_5.indexOf(b.flavor) >= 0 ? b.flavor : "甜";
    return "assets/item/seedbag_" + fl + ".png";
  }

  // 种子那一栏（现在排在商店最前面）
  function shopSeeds() {
    let h = `<div class="card"><h4>种子</h4>
      <div class="sub">区域越往后，树果越贵、味道也越浓，做出来的甜品更值钱。</div>`;
    const byRegion = {};
    G.BERRIES.forEach((b) => {
      if (b.region > S.maxRegion) return;
      (byRegion[b.region] = byRegion[b.region] || []).push(b);
    });
    Object.keys(byRegion).forEach((rid) => {
      const region = G.REGION_BY_ID[rid];
      h += `<div class="sub" style="margin:6px 0 2px;color:var(--green)">${esc(region.name)}</div>`;
      byRegion[rid].forEach((b) => {
        const price = G.seedPrice(S, b);
        const have = S.seeds[b.id] || 0;
        h += `<div class="list-item">
          <span class="picon" style="width:28px;height:28px;flex:0 0 28px">
            <img class="pbase" src="${seedBagImg(b)}" alt="">
            <img class="pberry" src="${b.icon}" alt="${esc(b.zh)}"></span>
          <span class="grow flavor-${b.flavor}">${esc(b.zh)}
            <span class="sub">${b.growHours}h／收${b.yield}／果₽${b.basePrice}
              <span class="ftier small flavor-${b.flavor}">${esc(G.berryFlavorTier(b))}</span></span></span>
          <span>手上 ${int(have)}</span>
          <span>种子 ${money(price)}</span>
          <button class="small" data-act="buySeed" data-p='${attr({ b: b.id, n: 1 })}' ${S.money < price ? "disabled" : ""}>×1</button>
          <button class="small" data-act="buySeed" data-p='${attr({ b: b.id, n: 10 })}' ${S.money < price * 10 ? "disabled" : ""}>×10</button>
        </div>`;
      });
    });
    return h + `</div>`;
  }

  function renderShop() {
    let h = "";
    // 种子放最前面 —— 这里是最常来的一栏，别让玩家每次都往下滚
    h += shopSeeds();

    // 基础食材：阿特拉斯出门会带，但懒得等或者手气差的时候可以直接买，就是贵
    const staples = G.FINDS_FOR_SALE || [];
    if (staples.length) {
      h += `<div class="card"><h4>杂货铺 · 基础食材</h4>
        <div class="sub">做甜品离不了这几样。阿特拉斯出门通常会带回来，
        懒得等的话这里也能现买 —— 只是比自己跑一趟贵得多。</div>`;
      staples.forEach((f) => {
        const price = G.findBuyPrice(f);
        const poor = S.money < price;
        h += `<div class="list-item">
          <img class="micon" src="assets/find/${f.id}.png" alt="">
          <span class="grow">${esc(f.name)} <span class="sub">${esc(f.use)}</span></span>
          <span>库存 ${int(S.finds[f.id] || 0)}</span>
          <span class="sub">${money(price)}</span>
          <button class="small" data-act="buyFind" data-p='${attr({ id: f.id, n: 1 })}'${poor ? " disabled" : ""}>买1</button>
          <button class="small" data-act="buyFind" data-p='${attr({ id: f.id, n: 5 })}'${poor ? " disabled" : ""}>买5</button>
        </div>`;
      });
      h += `</div>`;
    }
    // 材料（杂货铺）
    h += `<div class="card"><h4>杂货铺 · 材料（代购，贵）</h4>
      <div class="sub">直接买能立刻拿到，但比让阿特拉斯出门贵得多。他出门还会带点别的东西回来。</div>`;
    (G.MATERIALS || []).forEach((m) => {
      const price = Math.round(m.price * 2.6);
      h += `<div class="list-item"><img class="micon" src="assets/mat/${m.id}.png" alt="" title="${esc(m.name)}">
        <span class="grow">${esc(m.name)} <span class="sub">${esc(m.desc || "")}</span></span>
        <span class="sub">库存 ${int(S.materials[m.id])}</span>
        <span>${money(price)}</span>
        <button class="small" data-act="buyMaterial" data-p='${attr({ m: m.id, n: 1 })}' ${S.money < price ? "disabled" : ""}>买1</button>
        <button class="small" data-act="buyMaterial" data-p='${attr({ m: m.id, n: 10 })}' ${S.money < price * 10 ? "disabled" : ""}>买10</button>
      </div>`;
    });
    h += `</div>`;

    // 配方
    const locked = G.RECIPES.filter((r) => !r.research && !S.recipes[r.id] && r.region <= S.maxRegion);
    h += `<div class="card"><h4>配方（${S.recipes && Object.keys(S.recipes).length || 0} 已学）</h4>`;
    if (!locked.length) h += `<div class="sub">能买的都买了。</div>`;
    locked.forEach((r) => {
      h += `<div class="list-item">${G.productIcon(r)}
        <span class="grow">${esc(r.name)} <span class="sub">需要 ${G.craftNeedCount(S, r)} 个${r.needFlavor || "指定"}味 · ×${r.mult} · ${r.time}s</span></span>
        <span>${money(r.cost)}</span>
        <button class="small gold" data-act="buyRecipe" data-p='${attr({ r: r.id })}' ${S.money < r.cost ? "disabled" : ""}>学会</button>
      </div>`;
    });
    h += `</div>`;
    return h;
  }

  // ---------------- 阿特拉斯 / 工坊 ----------------

  // 一副共轭图纸：没刻出来就显示"让他刻"，刻出来了就并排放两张让你挑。
  function conjCards(pair) {
    const owned = G.conjOwned(S, pair.id);
    const pick = (S.conj || {})[pair.id];
    const canPick = G.conjCanPick(S, pair.id);
    const making = S.atlas.craft && S.atlas.craft.kind === "conj" &&
      S.atlas.craft.pairId === pair.id ? S.atlas.craft : null;
    const pickedName = pick ? ((G.conjSide(pair, pick.side) || {}).name || "") : "";
    let h = `<div class="card" style="background:var(--panel)" id="conj-${esc(pair.id)}">
      <div class="row2"><span class="grow"><b>${esc(pair.name)}</b>
        <span class="tag">区域 ${pair.region}</span>
        ${pick ? `<span class="tag" style="color:var(--gold)">已定：${esc(pickedName)}</span>` : ""}
        </span></div>
      <div class="sub" style="margin-top:2px">${esc(pair.theme || "")}</div>`;

    if (!owned) {
      const chk = G.engine.canOrderConj(S, pair.id);
      const cost = Object.keys(pair.materials || {}).map((mid) => {
        const m = (G.MATERIALS || []).filter((x) => x.id === mid)[0];
        const has = S.materials[mid] || 0;
        const need = pair.materials[mid];
        return `<span style="color:${has >= need ? "var(--green)" : "var(--red)"}">${esc(m ? m.name : mid)} ${has}/${need}</span>`;
      }).join("　");
      if (making) {
        const left = Math.max(0, (making.until - G.now(S)) / 1000);
        const total = making.secs || pair.craftTime;
        const done = Math.max(0, Math.min(100, ((total - left) / total) * 100));
        h += `<div class="bar-outer" style="margin-top:6px"><i style="width:${done.toFixed(1)}%"></i></div>
          <div class="sub" style="margin-top:2px">正在刻：${done.toFixed(0)}%　还有 ${G.clock(left)}</div>`;
      } else {
        h += `<div class="sub" style="margin-top:4px">材料：${cost}　耗时 ${G.time(G.engine.conjSecs(S, pair))}</div>
          <div class="row2" style="margin-top:4px">
            <button class="small gold" data-act="conjOrder" data-p='${attr({ p: pair.id })}'
              ${chk.ok ? "" : "disabled"}>让他刻一副</button>
            ${chk.ok ? "" : `<span class="sub">${esc(chk.why)}</span>`}
          </div>`;
      }
      return h + `</div>`;
    }

    // 刻好了：两张并排
    h += `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(232px,1fr));gap:8px;margin-top:6px">`;
    (pair.sides || []).forEach((side) => {
      const on = !!(pick && pick.side === side.id);
      const sealed = !!pick && !on;
      h += `<div class="card" style="background:var(--bg);${on ? "outline:2px solid var(--gold);outline-offset:-2px" : ""}${sealed ? ";opacity:.62" : ""}">
        <div class="sidehead">
          ${side.icon ? `<img class="cicon" src="assets/gear/${esc(side.icon)}.png" alt="">` : ""}
          <span class="grow"><b>${esc(side.name)}</b> <span class="tag">${esc(side.tag || "")}</span></span>
          ${on ? `<span class="tag" style="color:var(--gold)">在手</span>` : (sealed ? `<span class="tag">封存</span>` : "")}</div>
        <div class="sub" style="margin-top:4px">${esc(side.desc || "")}</div>
        <div class="sub" style="color:#ffc98a;margin-top:4px">阿特拉斯说：${esc(side.atlas || "")}</div>
        <div class="row2" style="margin-top:6px">
          <button class="small ${on ? "picked" : "gold"}" data-act="conjPick" data-p='${attr({ p: pair.id, s: side.id })}'
            ${(on || !canPick) ? "disabled" : ""}>${on ? "就是这一张" : "选这一张"}</button>
        </div></div>`;
    });
    h += `</div>`;
    if (!canPick) h += `<div class="sub" style="margin-top:4px">这一轮定下了，搬到新地方之后可以重新挑。</div>`;
    return h + `</div>`;
  }

  function renderAtlas() {
    const cap = G.ATLAS_LINES || {};
    const lines = (cap.idle || ["……"]);
    const line = lines[Math.floor(G.now(S) / 12000) % lines.length];
    let h = `<div class="card"><div class="mon">
      <img class="portrait" src="assets/pmd/0373_portrait.png" alt="">
      <div class="grow"><div class="who">阿特拉斯 <span class="tag">暴飞龙 ♂</span></div>
      <div class="bubble" style="margin-top:4px">${esc(line)}</div></div></div></div>`;

    // 出行
    const rep = S.atlas.report;
    const repMats = (rep && rep.mats) || [];
    const repFinds = (rep && rep.finds) || [];
    // 只带回材料、没带回素材的那一趟也要显示 —— 材料同样是"他带回来的东西"
    if (rep && (repMats.length || repFinds.length || rep.eventText)) {
      h += `<div class="card"><h4>上次出门带回来</h4>`;
      repMats.forEach((m) => {
        h += `<div class="list-item"><img class="micon" src="assets/mat/${m.id}.png" alt="">
          <span class="grow">${esc(m.name)}</span><span>×${int(m.count)}</span></div>`;
      });
      repFinds.forEach((f) => {
        h += `<div class="list-item"><img class="micon" src="assets/find/${f.id}.png" alt="">
          <span class="grow">${esc(f.name)} <span class="sub">${esc((G.FIND_BY_ID[f.id] || {}).use || "")}</span></span>
          <span>×${int(f.count)}</span>
          <button class="small" data-act="tab" data-p='${attr({ t: "store" })}'>去仓库看</button></div>`;
      });
      if (rep.eventText) h += `<div class="sub" style="margin-top:4px">${esc(rep.eventText)}</div>`;
      h += `</div>`;
    }

    const trip = S.atlas.trip;
    h += `<div class="card"><h4>出门采购</h4>`;
    if (trip) {
      const left = Math.max(0, (trip.until - G.now(S)) / 1000);
      h += `<div class="sub">清单：${Object.keys(trip.want).map((mid) => {
        const m = (G.MATERIALS || []).filter((x) => x.id === mid)[0];
        return esc(m ? m.name : mid) + "×" + trip.want[mid];
      }).join("、")}</div>
      <div class="bar-outer" style="margin:6px 0"><i style="width:${(100 - Math.min(100, left / ((trip.until - trip.startedAt) / 1000) * 100)).toFixed(0)}%"></i></div>
      <div class="sub">还有 ${G.clock(left)} 回来。</div>`;
    } else {
      h += `<div class="sub">他在家。勾选要买的东西，让他跑一趟（比自己去杂货铺便宜，但要等）。</div>`;
      h += `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(268px,1fr));gap:2px 10px;margin-top:4px">`;
      (G.MATERIALS || []).forEach((m) => {
        const staged = S._tripWant && S._tripWant[m.id];
        h += `<label class="list-item mrow" title="${esc(m.desc || "")}">
          <input type="checkbox" data-act="tripToggle" data-p='${attr({ m: m.id })}' ${staged ? "checked" : ""}>
          <img class="micon" src="assets/mat/${m.id}.png" alt="">
          <span class="grow mname">${esc(m.name)}</span>
          <span class="sub">库存 ${int(S.materials[m.id])}　${money(m.price)}</span>
        </label>`;
      });
      h += `</div>`;
      const tc = G.engine.tripCost(S, S._tripWant || {});
      h += `<div class="sub" style="margin-top:4px">这一趟：${money(tc.cost)}（杂货铺代购要 ${money(Math.round(tc.value * 2.6))}）
        ，来回约 ${G.clock(tc.secs)}${S.money < tc.cost ? '<span style="color:#cf5a41">　钱不够</span>' : ""}</div>`;
      h += `<button data-act="tripGo" class="gold"${S.money < tc.cost ? " disabled" : ""}>让他出发</button>
        <button data-act="tripClear">清空清单</button>`;
    }
    h += `</div>`;

    // 正在制作
    const craft = S.atlas.craft;
    h += `<div class="card"><h4>制作间</h4>`;
    if (craft && craft.kind === "conj") {
      const pair = G.CONJ_BY_ID[craft.pairId];
      const left = Math.max(0, (craft.until - G.now(S)) / 1000);
      const total = craft.secs || (pair ? pair.craftTime : 60);
      const done = Math.max(0, Math.min(100, ((total - left) / total) * 100));
      h += `<div class="sub">正在刻「${esc(pair ? pair.name : craft.pairId)}」的图纸：两张一起刻，刻好了你挑一张。</div>
        <div class="bar-outer" style="margin-top:4px"><i style="width:${done.toFixed(1)}%"></i></div>
        <div class="sub" style="margin-top:2px">${done.toFixed(0)}%　还有 ${G.clock(left)}</div>`;
    } else if (craft) {
      const it = (G.ITEMS || []).filter((x) => x.id === craft.itemId)[0];
      const left = Math.max(0, (craft.until - G.now(S)) / 1000);
      const total = craft.secs || (it ? it.craftTime : 60);
      const done = Math.max(0, Math.min(100, ((total - left) / total) * 100));
      const gain = it && it.effects[Math.min(craft.level, it.effects.length) - 1];
      h += `<div class="sub">正在做「${esc(it ? it.name : craft.itemId)}」→ Lv.${craft.level}：${esc(gain ? gain.text : "")}</div>
        <div class="bar-outer" style="margin-top:4px"><i style="width:${done.toFixed(1)}%"></i></div>
        <div class="sub" style="margin-top:2px">${done.toFixed(0)}%　还有 ${G.clock(left)}</div>`;
    } else {
      h += `<div class="sub">他闲着。选一件道具让他做。</div>`;
    }
    h += `</div>`;

    // 共轭图纸：一副图纸两张，只能挑一张
    const conjVisible = (G.CONJ || []).filter((p) => (p.region || 1) <= (S.maxRegion || 1));
    if (conjVisible.length) {
      const own = conjVisible.filter((p) => G.conjOwned(S, p.id)).length;
      h += `<div class="card"><h4>共轭图纸（${own}/${G.CONJ.length}）</h4>
        <div class="sub">同一块板子上刻着两张图纸，他只肯照一张做出来。定下的那一侧在同一个区域内不能改，
        搬到新地方之后可以重新挑 —— 换一块地，重新想一遍这一轮要往哪儿走。</div>`;
      conjVisible.forEach((pair) => { h += conjCards(pair); });
      h += `</div>`;
    }

    // 道具列表
    h += `<div class="card"><h4>道具（${G.engine.ownedItems(S).length}/${(G.ITEMS || []).length}）</h4>`;
    const cats = ["农具", "商铺", "工坊", "帮手"];
    cats.forEach((cat) => {
      const list = (G.ITEMS || []).filter((it) => it.cat === cat && (it.region || 1) <= S.maxRegion);
      if (!list.length) return;
      h += `<div class="sub" style="margin:6px 0 2px;color:var(--green)">${cat}</div>`;
      list.forEach((it) => {
        const lv = S.items[it.id] || 0;
        const max = it.effects.length;
        const can = G.engine.canCraft(S, it);
        const nowEff = lv > 0 ? it.effects[Math.min(lv, max) - 1].text : "（还没做出来）";
        const nextEff = lv < max ? it.effects[Math.min(lv, max - 1)].text : null;
        const topEff = it.effects[max - 1].text;
        const making = S.atlas.craft && S.atlas.craft.itemId === it.id ? S.atlas.craft : null;
        const cost = Object.keys(it.materials || {}).map((mid) => {
          const m = (G.MATERIALS || []).filter((x) => x.id === mid)[0];
          const has = S.materials[mid] || 0;
          const need = it.materials[mid];
          return `<span style="color:${has >= need ? "var(--green)" : "var(--red)"}">${esc(m ? m.name : mid)} ${has}/${need}</span>`;
        }).join("　");
        let prog = "";
        if (making) {
          const left = Math.max(0, (making.until - G.now(S)) / 1000);
          const total = making.secs || it.craftTime;
          const done = Math.max(0, Math.min(100, ((total - left) / total) * 100));
          prog = `<div class="bar-outer" style="margin-top:6px"><i style="width:${done.toFixed(1)}%"></i></div>
            <div class="sub" style="margin-top:2px">他正在做这个：${done.toFixed(0)}%　还有 ${G.clock(left)}</div>`;
        }
        h += `<div class="card" style="background:var(--panel)" id="item-${esc(it.id)}">
          <div class="row2">${it.icon ? `<img class="gicon" src="assets/gear/${esc(it.icon)}.png" alt="">` : ""}
            <span class="grow"><b>${esc(it.name)}</b> <span class="tag">Lv.${lv}/${max}</span>
            <span class="tag">${esc(cat)}</span>
            <span class="tag">区域 ${it.region || 1}</span></span></div>
          <table class="simple" style="margin-top:2px">
            ${lv > 0 ? `<tr><td class="sub">现在</td><td>${esc(nowEff)}</td></tr>` : ""}
            ${nextEff ? `<tr><td class="sub">${lv > 0 ? "再做一级（Lv." + (lv + 1) + "）" : "做出来（Lv.1）"}</td><td class="gold">${esc(nextEff)}</td></tr>` : ""}
            ${lv < max ? `<tr><td class="sub">升满（Lv.${max}）</td><td class="sub">${esc(topEff)}</td></tr>` : ""}
          </table>
          <div class="sub" style="margin-top:4px">${esc(it.desc || "")}</div>
          <div class="sub" style="color:#ffc98a">阿特拉斯说：${esc(it.flavor || "")}</div>
          <div class="sub" style="margin-top:4px">材料：${cost}　耗时 ${G.time(G.engine.craftSecs(S, it))}${
            G.engine.craftSecs(S, it) < it.craftTime - 0.5 ? "（原本 " + G.time(it.craftTime) + "）" : ""}</div>
          ${prog}
          <div class="row2" style="margin-top:4px">
            <button class="small gold" data-act="craftItem" data-p='${attr({ id: it.id })}'
              ${(!can || lv >= max || S.atlas.craft) ? "disabled" : ""}>${lv >= max ? "已满级" : "让他做（Lv." + (lv + 1) + "）"}</button>
            ${!can && lv < max ? `<span class="sub">材料不够，可以让杂货铺代购，或者让他出远门买</span>` : ""}
          </div>
        </div>`;
      });
    });
    h += `</div>`;
    return h;
  }

  // ---------------- 天赋 ----------------

  function renderTalents() {
    const region = G.regionOf(S);
    const chk = G.engine.canMigrate(S);
    const tp = G.talentPointsFor(S.stats.revenueRegion);
    const rc = G.canRespecTalents(S);
    let h = `<div class="card"><h4>移民（转世）</h4>
      <div class="sub">在 ${esc(region.name)} 的常客全部解锁后，付一笔移民费就能搬到下一个区域。
      离开会清空宝可元和库存，但天赋、配方、道具、图鉴、常客好感都会留下。</div>
      <div class="sub" style="margin-top:4px">常客 ${chk.progress.done}/${chk.progress.total}　移民费 ${money(chk.cost)}　
        本次可得天赋点 <b>${tp}</b>（本区域收入 ${money(S.stats.revenueRegion)}）</div>
      <div style="margin-top:6px">
        <button class="gold" data-act="migrate" ${chk.ok ? "" : "disabled"}>
          ${chk.hasNext ? "搬到「" + esc(chk.next.name) + "」" : "已经是最后一片田了"}
        </button>
        ${chk.ok ? "" : `<span class="sub">${chk.roaming ? "十片地方都走过了，往后走的是巡游（在下面那张卡里挑地方）。"
          : !chk.allDone ? "常客还没全解锁。" : !chk.moneyOk ? "钱还不够。" : ""}</span>`}
      </div></div>`;

    h += `<div class="card"><h4>天赋点：${S.talentPoints}</h4>
      <div class="sub">已经投下去 ${G.talentSpentNow(S)} 点。天赋永久生效，移民不会清空。</div>
      <div class="sub" style="margin-top:2px">每换一个新区域可以洗一次点：把点原价全收回来，重新分配。</div>
      <div class="row2" style="margin-top:6px">
        <button data-act="respecTalents" ${rc.ok ? "" : "disabled"}>
          洗点重来（退回 ${G.talentSpentNow(S)} 点）</button>
        ${rc.ok ? "" : `<span class="sub">${esc(rc.why)}</span>`}
      </div></div>`;

    // 巡游：把整片大陆走完之后才出现
    if (G.engine.canRoam(S)) {
      h += `<div class="card"><h4>巡游</h4>
        <div class="sub">十片地方都走遍了，往后想去哪儿就去哪儿 —— 补树果图鉴、补制品图鉴都方便。
        回去之后当地常客会重新上门，门槛按你现在的分量放大，而且只算这次停留里的进度；
        好感与图鉴记录都留着。<b>巡游不给天赋点</b>，也不收路费，随时可以再走。</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(206px,1fr));gap:6px;margin-top:6px">`;
      G.REGIONS.forEach((r) => {
        const n = G.engine.roamCount(S, r.id);
        const cur = r.id === S.region;
        const avail = !cur && r.id <= (S.maxRegion || 1);
        h += `<div class="card" style="background:var(--panel)">
          <div class="row2"><span class="grow"><b>${esc(r.name)}</b>
            ${cur ? `<span class="tag">现在在这儿</span>` : ""}</span></div>
          <div class="sub">${n ? "巡游回来过 " + n + " 次，当地门槛 ×" + G.engine.roamScale(S, r.id).toFixed(1)
            : "还没巡游回来过"}</div>
          <button class="small" data-act="roam" data-p='${attr({ r: r.id })}'
            ${avail ? "" : "disabled"}>${cur ? "就在这儿" : "巡游过去"}</button>
        </div>`;
      });
      h += `</div></div>`;
    }

    h += `<div class="talent-grid">`;
    G.TALENTS.forEach((t) => {
      const lv = S.talents[t.id] || 0;
      const max = lv >= t.max;
      const cost = G.talentCost(t, lv);
      h += `<div class="card"><h4>${esc(t.name)} <span class="tag">${lv}/${t.max}</span></h4>
        <div class="sub">${esc(t.desc)}</div>
        <div class="sub">当前：${lv > 0 ? "Lv." + lv : "未点"}</div>
        <div class="row2" style="margin-top:4px">
          <button class="small gold" data-act="buyTalent" data-p='${attr({ id: t.id })}'
            ${(max || S.talentPoints < cost) ? "disabled" : ""}>${max ? "满" : "提升（" + cost + " 点）"}</button>
        </div></div>`;
    });
    h += `</div>`;
    return h;
  }

  // ---------------- 图鉴 ----------------

  function renderDex() {
    const known = Object.keys(S.dex).length;
    let h = `<div class="card"><h4>${icon("tab-dex", "ico-h")}树果图鉴 ${known}/${G.BERRIES.length}</h4>
      <div class="sub">见过就点亮。种过、买过种子、或者阿特拉斯带回来的都算。</div>
      <div class="sub">下面那个彩色的词是<b>原味浓度</b>：果子越贵味道越浓（最贵的一档 ×2.4），
      做出来的甜品卖价更高、交给对口的常客加成也更多。<br>
      分五档：<span class="ftier small flavor-甜">清甜</span>（最淡，只有这档带具体味道）
      → 芬芳 → 浓郁 → <span class="ftier small flavor-甜">厚重</span>。
      做成甜品后浓度还会涨 —— 锅里料越多越浓。</div></div>`;
    h += `<div class="dex-grid">`;
    G.BERRIES.forEach((b) => {
      const seen = S.dex[b.id];
      const score = G.berryFlavorScore(b);
      h += `<div class="dex-cell ${seen ? "" : "unknown"}" title="${esc(seen ? b.zh + "　" + b.flavor + "味　" + b.firmnessCn + "　生长" + b.growHours + "h　果₽" + b.basePrice + "　原味浓度 " + G.berryFlavorTier(b) + "（×" + G.berryFlavorPower(b).toFixed(2) + "）" : "你还没见过这种树果")}">
        <img src="${b.icon}" alt=""><div>${seen ? esc(b.zh) : "？？？"}</div>
        ${seen ? `<div class="ftier small flavor-${b.flavor}">${esc(G.berryFlavorTier(b))}</div>` : ""}
      </div>`;
    });
    h += `</div>`;

    // 制品图鉴：每个品类一行，五个口味各一格，做过就点亮
    const made = S.madeProducts || {};
    const total = G.RECIPE_CATS.length * (G.FLAVORS_5.length + 1);   // +1 是混合那一格
    const got = Object.keys(made).length;
    h += `<div class="card" style="margin-top:8px"><h4>制品图鉴 ${got}/${total}</h4>
      <div class="sub">做过一次就点亮。加工台做的和锅里出的都算；
      同一品类的普通版、强化版、加料版算同一样东西。</div>`;
    G.RECIPE_CATS.forEach((cat) => {
      h += `<div class="dex-cat"><span class="dex-cat-name">${esc(cat.name)}${
        cat.researchOnly ? '<span class="sub">研发专属</span>' : ""}</span>
        <div style="flex:1;min-width:0">`;
      if (cat.desc) h += `<div class="sub" style="margin-bottom:2px">${esc(cat.desc)}</div>`;
      h += `<div class="dex-grid dex-grid-sm">`;
      G.FLAVORS_5.forEach((fl) => {
        const ok = !!made[cat.id + "|" + fl];
        h += `<div class="dex-cell ${ok ? "" : "unknown"}"
          title="${esc(ok ? fl + "味" + cat.name + "　倍率 ×" + cat.mult : "还没做过" + fl + "味的" + cat.name)}">
          <img src="${G.productSprite({ cat: cat.id, flavor: fl })}" alt="">
          <div>${ok ? esc(fl + "味") : "？？？"}</div>
          ${ok ? `<div class="flavor-${fl}">${fl}</div>` : ""}
        </div>`;
      });
      const mixOk = !!made[cat.id + "|混合"];
      h += `<div class="dex-cell ${mixOk ? "" : "unknown"}" title="${esc(mixOk ? cat.name + "·混合口味" : "还没做过混合口味")}">
        <img src="${G.productSprite({ cat: cat.id, flavor: G.FLAVORS_5[0] })}" alt="">
        <div>${mixOk ? "混合" : "？？？"}</div></div>`;
      h += `</div></div></div>`;
    });
    // 区域招牌单独列，它们每个区域只有一款
    h += `<div class="dex-cat"><span class="dex-cat-name">区域招牌<span class="sub">每个区域一款</span></span>
      <div class="dex-grid dex-grid-sm">`;
    (G.RECIPES || []).filter((r) => r.specialty).forEach((r) => {
      const ok = !!S.recipes[r.id];
      h += `<div class="dex-cell ${ok ? "" : "unknown"}" title="${esc(ok ? r.name : "还没学会这个招牌配方（区域 " + r.region + "）")}">
        <img src="${G.productSprite(r)}" alt="">
        <div>${ok ? esc(r.name) : "？？？"}</div>
        ${ok ? `<div class="flavor-${r.flavor}">${r.flavor}</div>` : ""}
      </div>`;
    });
    h += `</div></div></div>`;

    h += `<div class="card" style="margin-top:8px"><h4>${icon("tab-regulars", "ico-h")}常客图鉴</h4><div class="dex-grid">`;
    (G.REGULARS || []).forEach((r) => {
      const st = G.engine.regState(S, r.dex);
      h += `<div class="dex-cell ${st.unlocked ? "" : "unknown"}">
        <img src="assets/pmd/${String(r.dex).padStart(4, "0")}_portrait.png" alt="" onerror="this.style.visibility='hidden'">
        <div>${st.unlocked ? esc(r.name) : "？？？"}</div>
        ${st.unlocked ? `<div class="flavor-${r.flavor}">${r.flavor}</div>` : ""}
      </div>`;
    });
    h += `</div></div>`;
    return h;
  }

  function renderHelp() {
    return `<div class="card"><h4>怎么玩</h4>
      <ol>
        <li><b>买种子</b>：去${go("shop", "商店")}，买你现在买得起的最贵的树果种子。</li>
        <li><b>播种</b>：点左上的空地，或者点种子旁边的「全种」。</li>
        <li><b>买地</b>：田地里的虚线格是空位，点一下就用宝可元买一块新地（每区最多买到基础数量的两倍）。</li>
        <li><b>浇水</b>：点田里正在长的作物，或者用底下的「浇水（全部田）」。浇水能明显加快生长。</li>
        <li><b>收获</b>：成熟后点一下，或者「收获全部」。</li>
        <li><b>卖</b>：生果在${go("market", "市场")}直接卖；但先看看${go("kitchen", "加工")}——同一批树果做成商品能多卖好几倍。</li>
        <li><b>学配方</b>：配方要花钱学。学会之后，投入越贵的树果，商品越值钱。</li>
        <li><b>常客</b>：每位常客只爱一种口味。把对应口味的商品交给他，售价 +50%，好感还会涨。</li>
        <li><b>道具</b>：材料可以让阿特拉斯去杂货铺代购，也可以让他出远门买（便宜，要等）。材料齐了他会亲手做。</li>
        <li><b>帮手</b>：好感够的常客可以请来帮忙，自动收、自动补种、自动浇水。</li>
        <li><b>素材</b>：阿特拉斯出门除了买清单上的材料，还会顺手带回一些素材（面粉、鲜奶、香料……），
          都放进${go("store", "仓库")}。素材只有三条出路：卖钱、丢掉、或者拿去研发。</li>
        <li><b>研发</b>：${go("lab", "研发")}页有一口大锅。把树果和素材丢进去（点一下或拖进去都行），
          搅拌一下，成品直接从锅里出来、进${go("store", "仓库")}。
          底料组合决定做出来是什么，树果决定口味，香料决定味道合不合。
          <b>丢得越多，做出来的越值钱</b>——名字前面的「朴实的 / 多味的 / 花团锦簇的」就是料数。
          搭配不对会煮成失败品，料和钱照样扣。</li>
        <li><b>配方</b>：出锅之后可以选「记下做法」，记下来就能在${go("kitchen", "加工")}台批量做；
          不想要了也能在研发页的配方本里划掉。锅本身也能花钱换，格子更多、搅拌更快。</li>
        <li><b>移民</b>：把一片区域的常客全部解锁，付移民费搬走，拿天赋点。天赋永久生效。</li>
        <li><b>洗点</b>：${go("talents", "天赋")}页每换一个新区域可以洗一次点，把点原价全收回来重新分配。</li>
        <li><b>共轭图纸</b>：${go("atlas", "阿特拉斯")}页上他一次只肯刻一副图纸——两块板子摆在一起，
          两张图纸里挑一张，另一张他封存起来。选的那一侧在同一个区域内不能改，
          <b>搬到新地方之后可以重新挑</b>。一侧偏「宽」（果子多、做得多、卖得快），
          一侧偏「精」（单件更值钱、更省果子、慢配方更强）。</li>
        <li><b>巡游</b>：走遍十片地方之后，可以随便回到哪个区域去补图鉴。回去之后当地常客会重新上门，
          门槛按你现在的分量放大，而且只算这次停留里新攒的进度；好感与图鉴记录都留着。
          巡游不给天赋点，也不收路费。</li>
      </ol>
      <div class="sub">快捷键：W 全部浇水、H 全部收获、空格 叫卖。进度自动保存在浏览器里，关掉页面也在跑（默认最多结算 4 小时）。</div>
      </div>
      <div class="card"><h4>大锅的搭配表</h4>
      <div class="sub">锅里的底料组合是固定的一张表，得自己试出来（或者看这里）：</div>
      <table class="simple">
        ${(G.RESEARCH_COMBOS || []).map((c) => `<tr><td>${esc(c.hint)}</td>
          <td class="sub">区域 ${c.region}${c.potLevel ? "　要" + G.potLevel(c.potLevel).slots + "格以上的锅" : ""}</td></tr>`).join("")}
      </table>
      <div class="sub" style="margin-top:6px">底下那六款特殊糕点（千层酥 / 黑森林 / 螺旋卷 / 奶香圆包 / 可颂 / 拿破仑）
      要按<b>具体几份</b>下底料，多一样少一样都成不了型 —— 蛋糕总得有面粉。
      料占掉锅的前几格，<b>剩下的格子丢树果定味道</b>；一颗不放也能出锅，但那是「无味」的，
      五个味道全是 0，卖价只有一两百分之一。</div>
      <div class="sub" style="margin-top:4px">所以锅越大，能做的花样越多：起始那口 4 格的锅连千层酥都放不下，得先换锅。</div>
      <div class="sub" style="margin-top:6px">香料（月见草籽 / 岩盐花 / 火口椒 / 铁壳果 / 霜苔 / 暮色李）是可选的：
      配上对的味道会多提一档，配错了整锅就废了。每个香料适合和不适合什么味道，在${go("store", "仓库")}里能看到。</div>
      <div class="sub" style="margin-top:4px">出锅的成品会直接进仓库；选「记下做法」之后，配方才会出现在${go("kitchen", "加工")}页，
      之后照常用树果做，不再消耗素材。</div>
      </div>

      <div class="card"><h4>关于味道</h4>
      <div class="sub">辣 / 涩 / 甜 / 苦 / 酸 五种味道。常客喜欢什么味道，由它的性格决定（来源：神奇宝贝百科《性格》）：
      <br>辣 — 怕寂寞、固执、顽皮、勇敢
      <br>酸 — 大胆、淘气、乐天、悠闲
      <br>涩 — 内敛、慢吞吞、马虎、冷静
      <br>苦 — 温和、温顺、慎重、自大
      <br>甜 — 胆小、急躁、爽朗、天真
      <br>中立（不影响口味）—— 勤奋、坦率、害羞、浮躁、认真</div></div>
      <div class="card"><h4>自动化什么时候来</h4>
      <div class="sub">不用等，第一件道具就能开自动化。顺序大致是这样：
      <br>1. <b>藤编手推车</b>（区域 1，商铺）——摊位会自己出货，每秒自动卖掉一些生果。
      它会跳过每个品种的「保留量」（默认 20 个），也能在市场页直接关掉，免得抢走做果酱的原料。
      <br>2. <b>帮手铃</b>（区域 1，帮手）——多出 1 个帮手槽位，请常客来帮忙，他会自己收果子、补种、浇水。
      <br>3. <b>木质招牌</b>（区域 2，商铺）——解锁「自动交付」：商品自动交给喜欢这个口味的常客，订单也自动交。
      <br>4. <b>石磨</b>（区域 2，工坊）——加工台工位 +1，并且解锁「自动加工」。
      <br>5. 后面的工坊道具（木轮水车、风车磨坊、水晶窑、龙焰锻炉）每 2 级再给 1 个工位，上限 12 个。
      <br>6. 帮手槽位后面还能再开（果筐车、龙笛、沙舟拖板）。
      <br>道具都要材料，材料可以让阿特拉斯去杂货铺代购（贵、立刻到手），也可以让他出远门买（便宜、要等）。</div></div>
      <div class="card"><h4>阿特拉斯</h4>
      <div class="sub">道具全靠他：材料可以让杂货铺代购（贵、立刻到手），也可以让他出远门采购（便宜、要等，还可能带回别的东西）。
      他做完一件才接下一件。多给他点材料，他不会说好听的，但东西做得很结实。</div></div>
      <div class="card"><h4>素材</h4>
      <div class="sub">宝可梦立绘与行走图来自 PMD Sprite Repository（CC BY-NC-SA 4.0）；
      树果图标与树果树贴图来自神奇宝贝百科；字体是 TakWolf 的「融合像素字体」（SIL OFL 1.1）。非商业同人作品。</div></div>`;
  }

  // ---------------- 组装 ----------------

  // ---------------- 仓库 ----------------
  // 手上所有东西一览：素材 / 材料 / 树果 / 商品 / 失败品。
  // 左边一格格摆开（右下角是持有数），右边单独开一栏放介绍和买卖按钮。
  // 素材是这里的重点 —— 只有在仓库里才看得到它的味道和用途。
  const STORE_KINDS = [
    { kind: "find", title: "素材", hint: "阿特拉斯出门带回来的。攒够几样就能去研发页搭配新配方——底料决定做出来是什么，香料决定味道合不合。" },
    { kind: "material", title: "材料", hint: "阿特拉斯做道具用的。除了给他打东西，也可以按六成价卖掉。" },
    { kind: "berry", title: "树果", hint: "种出来的生果。直接卖便宜，做成商品能多卖好几倍。" },
    { kind: "seed", title: "种子", hint: "种下去用的。收获时有三成概率回种，攒多了占地儿 —— 想清就清：卖掉只有四成价（折损），不想留的直接丢。" },
    { kind: "product", title: "商品", hint: "加工出来的成品。交给喜欢这个口味的常客能多拿五成。" },
    { kind: "waste", title: "失败品", hint: "研发煮废的产物。除了卖三十块，没别的用。" }
  ];

  // 把一件东西整理成统一的形状，格子、详情栏、按钮都用它
  function storeEntry(kind, id) {
    if (kind === "find") {
      const f = G.FIND_BY_ID[id];
      if (!f) return null;
      return {
        kind: kind, id: id, n: S.finds[id] || 0, name: f.name, img: "assets/find/" + f.id + ".png",
        desc: f.desc, note: f.use, price: f.price, priceLabel: "单价",
        tags: [G.FIND_ROLE_LABEL[f.role] || "素材", f.flavor],
        actions: [["sellFind", "卖1", { id: id, n: 1 }], ["sellFind", "卖光", { id: id, n: 9999 }],
                  ["dropFind", "丢", { id: id }, "danger"]]
      };
    }
    if (kind === "material") {
      const m = G.MATERIAL_BY_ID[id];
      if (!m) return null;
      const price = G.engine.materialSellPrice(S, m);
      return {
        kind: kind, id: id, n: S.materials[id] || 0, name: m.name, img: "assets/mat/" + m.id + ".png",
        desc: m.desc, note: "", price: price, priceLabel: "回收价（原价的六成）",
        tags: [], actions: [["sellMaterial", "卖1", { m: id, n: 1 }], ["sellMaterial", "卖光", { m: id, n: 9999 }],
                            ["dropMaterial", "丢", { m: id }, "danger"]]
      };
    }
    if (kind === "berry") {
      const b = G.BERRY_BY_ID[id];
      if (!b) return null;
      return {
        kind: kind, id: +id, n: S.berries[id] || 0, name: b.zh, img: b.icon,
        desc: b.effect ? "吃下去能" + b.effect + "。" : "",
        note: "硬度：" + (b.firmnessCn || "—") + "。",
        price: G.berrySellPrice(S, b), priceLabel: "单价", tags: [b.flavor],
        flavorPeak: G.berryFlavorScore(b), flavorTag: b.flavor,
        flavorLabel: "原味浓度", flavorText: "×" + G.berryFlavorPower(b).toFixed(2) +
          "　做成甜品后还会更浓（锅里料越多越浓）",
        actions: [["sellBerry", "卖1", { id: +id, n: 1 }], ["sellBerry", "卖光", { id: +id, n: 9999 }]]
      };
    }
    if (kind === "seed") {
      const b = G.BERRY_BY_ID[id];
      if (!b) return null;
      return {
        kind: kind, id: +id, n: S.seeds[id] || 0, name: b.zh + "的种子",
        // 扎口布袋按味道染过色，右下角再叠一颗对应的树果 —— 和商品图标一个做法
        img: seedBagImg(b),
        icon: `<span class="picon" title="${esc(b.zh)}的种子"><img class="pbase" src="${seedBagImg(b)}" alt=""><img class="pberry" src="${b.icon}" alt="${esc(b.zh)}"></span>`,
        desc: "种下去长成" + b.zh + "，大约 " + b.growHours + " 小时。",
        note: "回收只给四成价。收获时回种的那些是白来的，卖掉算白赚；花钱买的再卖就亏了。",
        price: G.seedSellPrice(S, b), priceLabel: "回收价（折损）", tags: [b.flavor],
        flavorPeak: G.berryFlavorScore(b), flavorTag: b.flavor,
        flavorLabel: "长出来是", flavorText: "×" + G.berryFlavorPower(b).toFixed(2) + " 浓度",
        actions: [["sellSeed", "卖1", { id: +id, n: 1 }], ["sellSeed", "卖光", { id: +id, n: 9999 }],
                  ["dropSeed", "丢", { id: +id }, "danger"]]
      };
    }
    if (kind === "product") {
      const ki = G.keyInfo(id);
      const r = ki.recipe, b = ki.berry, sub = ki.sub;
      if (!r || !b) return null;
      const sp = G.mixSplit(G.craftNeedCount(S, r));
      return {
        kind: kind, id: id, n: S.products[id] || 0,
        name: sub ? G.mixedName(r, b, sub) : G.productName(r, b),
        img: null, icon: G.productIcon(r, b, sub, sub ? sp.main / Math.max(1, sp.main + sp.sub) : 0.5),
        recipe: r, berry: b, subBerry: sub,
        desc: ((G.CAT_BY_ID && G.CAT_BY_ID[r.cat] && G.CAT_BY_ID[r.cat].desc)
          ? G.CAT_BY_ID[r.cat].desc + "　" : "") +
          (sub
            ? "这份用「" + b.zh + "」×" + sp.main + " 和「" + sub.zh + "」×" + sp.sub + " 做的，基础倍率 ×" + r.mult + "，混着做加成 ×1.08。"
            : "这份是用「" + b.zh + "」做的，基础倍率 ×" + r.mult + "。"),
        note: sub
          ? "爱吃" + b.flavor + "和爱吃" + sub.flavor + "的常客都乐意买；另一味正好是它讨厌的会打折。"
          : "交给喜欢" + r.flavor + "味的常客有加成，味道越浓加得越多（最多 +75%）。",
        price: sub ? G.mixedMarketPrice(S, r, b, sub) : G.marketPrice(S, r, b),
        priceLabel: "市场价", tags: sub ? [b.flavor, sub.flavor] : [r.flavor],
        actions: [["sellProduct", "卖1", { k: id, n: 1 }], ["sellProduct", "卖光", { k: id, n: 9999 }]]
      };
    }
    if (kind === "waste") {
      return {
        kind: kind, id: "waste", n: S.waste || 0, name: G.WASTE.name, img: "",
        desc: G.WASTE.desc, note: G.WASTE.use, price: G.WASTE.price, priceLabel: "单价",
        tags: [], actions: [["sellWaste", "卖1", { n: 1 }], ["sellWaste", "卖光", { n: 9999 }],
                            ["dropWaste", "丢", { n: 9999 }, "danger"]]
      };
    }
    return null;
  }

  // 一类东西的持有清单 → [{id, n}]
  function storeBag(kind) {
    const bag = { find: S.finds, material: S.materials, berry: S.berries,
                  product: S.products, seed: S.seeds }[kind];
    if (kind === "waste") return S.waste ? [{ id: "waste", n: S.waste }] : [];
    return Object.keys(bag || {}).filter((k) => bag[k] >= 1).map((k) => ({ id: k, n: bag[k] }));
  }

  function storeCell(kind, id, n) {
    const e = storeEntry(kind, id);
    if (!e) return "";
    const on = pick.storeSel && pick.storeSel.kind === kind && String(pick.storeSel.id) === String(id);
    const inner = e.icon ? e.icon : `<img src="${e.img}" alt="">`;
    return `<button class="wh-cell${on ? " on" : ""}" data-act="storeSel"
      data-p='${attr({ kind: kind, id: id })}' title="${esc(e.name)}">
      ${inner}<span class="wh-n">×${int(n)}</span></button>`;
  }

  // 五边形味道图：辣涩甜苦酸各占一个角，越靠外越重
  function radarChart(prof) {
    const F = G.FLAVORS_5;
    const cx = 92, cy = 82, R = 56;
    const pt = (i, r) => {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
      return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
    };
    const fmt = (p) => p[0].toFixed(1) + "," + p[1].toFixed(1);

    let grid = "";
    [0.34, 0.67, 1].forEach((k) => {
      const pts = F.map((_, i) => fmt(pt(i, R * k))).join(" ");
      grid += `<polygon points="${pts}" class="radar-grid"/>`;
    });
    let spokes = "", labels = "";
    F.forEach((f, i) => {
      const p = pt(i, R);
      spokes += `<line x1="${cx}" y1="${cy}" x2="${p[0].toFixed(1)}" y2="${p[1].toFixed(1)}" class="radar-spoke"/>`;
      // 轴名和数值合成一行，不然挤在窄栏里会叠在一起
      const lp = pt(i, R + 15);
      const dx = Math.cos(-Math.PI / 2 + (i * 2 * Math.PI) / 5);
      const anchor = dx > 0.25 ? "start" : dx < -0.25 ? "end" : "middle";
      labels += `<text x="${lp[0].toFixed(1)}" y="${(lp[1] + 4).toFixed(1)}"
        text-anchor="${anchor}" class="radar-label">${f}<tspan class="radar-num"> ${prof[f]}</tspan></text>`;
    });
    const dpts = F.map((f, i) => fmt(pt(i, R * Math.max(0.07, (prof[f] || 0) / 100)))).join(" ");
    return `<svg class="radar" viewBox="0 0 184 168" role="img"
      aria-label="味道画像 ${F.map((f) => f + prof[f]).join(" ")}">
      ${grid}${spokes}
      <polygon points="${dpts}" class="radar-fill"/>
      <polygon points="${dpts}" class="radar-line"/>
      ${labels}</svg>`;
  }

  // 右侧详情栏
  function storeDetail() {
    if (!pick.storeSel) {
      return `<div class="card wh-empty"><h4>详情</h4>
        <div class="sub">点左边任意一格，这里会显示它是什么、值多少钱、能拿去干什么。</div></div>`;
    }
    const e = storeEntry(pick.storeSel.kind, pick.storeSel.id);
    if (!e || !e.n) {
      return `<div class="card wh-empty"><h4>详情</h4><div class="sub">手上已经没有这样东西了。</div></div>`;
    }
    let h = `<div class="card wh-detail"><h4>${esc(e.name)}</h4>`;
    h += `<div class="wh-detail-head">`;
    h += e.icon ? e.icon : (e.img ? `<img src="${e.img}" alt="">` : "");
    h += `<div class="wh-detail-meta"><div>持有 <b>×${int(e.n)}</b></div>`;
    e.tags.forEach((t) => {
      const isFlavor = (G.FLAVORS_5 || []).indexOf(t) >= 0 || t === "混合";
      h += `<span class="tag${isFlavor ? " ftag flavor-" + t : ""}">${esc(t)}</span>`;
    });
    h += `</div></div>`;
    if (e.desc) h += `<div class="sub wh-desc">${esc(e.desc)}</div>`;
    // 味道浓度：树果和制品都显示，用同一个档位名，方向一致
    if (e.flavorPeak !== undefined) {
      const cls = e.flavorPeak > 0 ? "flavor-" + e.flavorTag : "ftier-无味";
      h += `<div class="radar-verdict"><span class="ftier ${cls}">${esc(G.flavorTier(e.flavorPeak, e.flavorTag))}</span>
        <span style="margin-left:6px">${esc(e.flavorLabel || "味道浓度")} ${e.flavorPeak / 100 >= 0 ? "" : ""}${e.flavorText || e.flavorPeak}</span></div>`;
    }
    if (e.note) h += `<div class="sub wh-note">${esc(e.note)}</div>`;
    // 甜品：画一张五边形味道图，配一句吐槽
    if (e.kind === "product" && e.recipe && e.berry) {
      const prof = G.flavorProfile(e.recipe, e.berry);
      const peak = G.flavorIntensity(e.recipe, e.berry);
      // 浓度是要给玩家看的：果子越贵越浓，售价和常客加成也越高。
      // 分档用描边字，颜色就是味道的色 —— 无味是灰的。
      const tier = G.flavorTier(peak, e.recipe.flavor);
      const tierCls = peak > 0 ? "flavor-" + e.recipe.flavor : "ftier-无味";
      h += `<div class="radar-wrap">${radarChart(prof)}
        <div class="radar-verdict">
          <span class="ftier ${tierCls}">${esc(tier)}</span>
          <span style="margin-left:6px">浓度 ${peak}　常客对上这个味道 ×${G.flavorMult(e.recipe.flavor, { flavor: e.recipe.flavor, dislike: "" }, peak).toFixed(2)}</span>
        </div>
        <div class="radar-verdict">${esc(G.flavorVerdict(prof))}</div></div>`;
    }
    h += `<div class="wh-price">${e.priceLabel} <b>${money(e.price)}</b></div>`;
    h += `<div class="row2" style="flex-wrap:wrap;margin-top:6px">`;
    e.actions.forEach((a) => {
      h += `<button class="small${a[3] ? " " + a[3] : ""}" data-act="${a[0]}"
        data-p='${attr(a[2])}' title="${a[0] === "dropFind" || a[0] === "dropMaterial" || a[0] === "dropWaste" || a[0] === "dropSeed" ? "丢掉，不换钱" : a[1]}">${a[1]}</button>`;
    });
    h += `</div></div>`;
    return h;
  }

  function renderStore() {
    let h = `<div class="wh">`;
    h += `<div class="wh-main">`;
    STORE_KINDS.forEach((cat) => {
      const bag = storeBag(cat.kind);
      h += `<div class="card"><h4>${cat.title}（${bag.length} 种）</h4>`;
      if (!bag.length) {
        h += `<div class="sub">${cat.kind === "find" ? "还没有素材。让" + go("atlas", "阿特拉斯") + "多出门几趟。" : "这里还空着。"}</div>`;
      } else {
        // 素材按价格排、树果按单价排，贵的先露脸
        bag.sort((x, y) => {
          const ex = storeEntry(cat.kind, x.id), ey = storeEntry(cat.kind, y.id);
          return (ey ? ey.price : 0) - (ex ? ex.price : 0);
        });
        h += `<div class="wh-grid">`;
        bag.forEach((it) => { h += storeCell(cat.kind, it.id, it.n); });
        h += `</div>`;
      }
      h += `<div class="sub wh-hint">${cat.hint}</div></div>`;
    });
    h += `</div>`;
    h += `<aside class="wh-side">${storeDetail()}</aside>`;
    h += `</div>`;
    return h;
  }

  // ---------------- 研发：大锅 ----------------
  // 往锅里丢树果和素材，搅拌，出锅就是成品。
  // 丢得越多成品越值钱；锅可以升级（格子更多、搅拌更快）。
  function labTrayCell(kind, id, n, inPot) {
    let img, name;
    if (kind === "berry") {
      const b = G.BERRY_BY_ID[id];
      if (!b) return "";
      img = `<img src="${b.icon}" alt="">`;
      name = b.zh + "（" + b.flavor + "）";
    } else {
      const f = G.FIND_BY_ID[id];
      if (!f) return "";
      img = `<img src="assets/find/${f.id}.png" alt="">`;
      name = f.name + (f.role === "spice" ? "（香料）" : "（底料）");
    }
    const left = n - inPot;
    return `<button class="lab-cell${left <= 0 ? " out" : ""}" data-act="labAdd" data-tray="${kind}"
      data-p='${attr({ kind: kind, id: id })}'
      title="${esc(name)}　手上 ${int(n)} 个${inPot ? "，锅里 " + inPot + " 个" : ""}　（点一下或拖进锅）">
      ${img}<span class="wh-n">×${int(Math.max(0, left))}</span></button>`;
  }

  function renderLab() {
    const info = G.engine.potLevelInfo(S);
    const pot = S.pot || { level: 1, inPot: [], stir: null };
    const slots = info.now.slots;
    const items = pot.inPot || [];
    const chk = pot.stir ? pot.stir.chk : G.engine.potCheck(S);
    const learned = Object.keys(S.recipes).filter((id) => G.RESEARCH_ID_RE.test(id)).length;

    // 锅里已经用掉多少
    const usedBerry = {}, usedFind = {};
    items.forEach((x) => {
      if (x.kind === "berry") usedBerry[x.id] = (usedBerry[x.id] || 0) + 1;
      else usedFind[x.id] = (usedFind[x.id] || 0) + 1;
    });

    let h = `<div class="card pot-card"><h4>大锅 · ${esc(info.now.name)}</h4>
      <div class="sub">${items.length}/${slots} 格　搅拌 ${info.now.stir.toFixed(1)}s　已记下的配方 ${learned} 个</div>`;

    // ① 锅体
    h += `<div class="pot${pot.stir ? " stirring" : ""}" id="potZone">`;
    h += `<div class="pot-mouth">`;
    for (let i = 0; i < slots; i++) {
      const it = items[i];
      if (it) {
        const img = it.kind === "berry"
          ? `<img src="${G.BERRY_BY_ID[it.id].icon}" alt="">`
          : `<img src="assets/find/${G.FIND_BY_ID[it.id].id}.png" alt="">`;
        h += `<button class="pot-slot filled" data-act="potRemove" data-p='${attr({ i: i })}'
          title="点一下拿出来">${img}</button>`;
      } else {
        h += `<div class="pot-slot"></div>`;
      }
    }
    h += `</div>`;
    h += `<div class="pot-rim"></div>`;
    h += `<div class="pot-bowl">`;
    if (pot.stir) {
      const left = Math.max(0, (pot.stir.until - G.now(S)) / 1000);
      h += `<div class="pot-stirring">搅拌中… ${left.toFixed(1)}s</div>`;
      h += `<div class="pot-bubbles">${"<i></i>".repeat(7)}</div>`;
    } else if (pot.pending) {
      const pd = pot.pending;
      h += `<div class="pot-pop${pd.ok ? "" : " bad"}">${esc(pd.name)}${pd.count > 1 ? "×" + pd.count : ""}</div>`;
    } else {
      h += `<div class="pot-idle">${slots > 0 && !items.length ? "把下面的树果和素材拖进来" : ""}</div>`;
    }
    h += `</div>`;
    h += `<div class="pot-fire">${"<i></i>".repeat(5)}</div>`;
    h += `</div>`;

    // ② 按钮 + 预告
    h += `<div class="row2" style="margin-top:8px;flex-wrap:wrap">`;
    if (pot.stir) {
      h += `<button disabled>搅拌中…</button>`;
    } else {
      const canGo = chk.kind === "recipe";
      h += `<button class="${canGo ? "gold" : ""}" data-act="potStir"${canGo ? "" : " disabled"}>搅拌（${info.now.stir.toFixed(1)}s）</button>`;
    }
    h += `<button class="small" data-act="potClear"${items.length ? "" : " disabled"}>清空</button>`;
    h += `</div>`;

    h += `<div class="pot-preview">`;
    if (pot.stir) {
      h += `<span class="sub">锅里正在转，等它出锅。</span>`;
    } else if (chk.kind === "invalid") {
      h += `<span class="sub">${esc(chk.why)}</span>`;
    } else {
      const catName = chk.catName || (chk.cat ? chk.cat.name : "");
      if (chk.kind === "recipe") {
        const rc = G.RECIPE_BY_ID[chk.id] || G.makeResearchRecipe(chk.combo.cat, chk.flavor, chk.spice ? chk.spice.id : null, chk.good, chk.n);
        const tasteless = chk.flavor === "无味";
        h += `<span class="sub">这一锅会出：<b class="${tasteless ? "" : "gold"}">${esc(rc ? rc.name : catName)}</b>
          　${chk.n} 样料　倍率 ×${rc ? rc.mult : "?"}　研发费 ${money(chk.cost)}</span>`;
        if (tasteless) {
          // 软限制：树果是可选的，但不放就是无味，价钱差上百倍
          h += `<div class="sub" style="margin-top:2px;color:#e0b060">锅里一颗树果都没有 —— 这样出来是<b>无味</b>的，
            五个味道全是 0，卖价只有正常的一两百分之一。要好吃就再丢颗树果进去（剩下的格子都行）。</div>`;
        } else {
          h += `<div class="sub" style="margin-top:2px">${esc(chk.why)}</div>`;
        }
      } else if (chk.kind === "waste") {
        h += `<span class="sub" style="color:#cf5a41">这一锅会煮废：${esc(chk.why)}</span>
          <div class="sub" style="margin-top:2px">料和钱照扣，要试就试吧。</div>`;
      } else if (chk.kind === "known") {
        h += `<span class="sub">这个搭配已经会做了：${esc(chk.catName || "")}。换个料，或者直接去加工页做它。</span>`;
      }
    }
    h += `</div>`;

    // ②' 出锅结果：东西已经进仓库了，这里只问要不要顺手把做法记下来
    const pd = pot.pending;
    if (pd) {
      h += `<div class="pot-result${pd.ok ? "" : " bad"}">`;
      if (pd.ok) {
        h += `<div class="sub">出锅了：<b class="gold">${esc(pd.name)}</b>${pd.count > 1 ? " ×" + pd.count : ""}
          —— 已经放进${go("store", "仓库")}。</div>`;
        if (pd.recipeId) {
          h += `<div class="sub">要不要把做法记进配方本？记下来之后就能在${go("kitchen", "加工")}台批量做。</div>
            <div class="row2" style="margin-top:6px">
              <button class="gold small" data-act="potKeep">记下做法</button>
              <button class="small" data-act="potDismiss">不记了</button>
            </div>`;
        } else {
          h += `<div class="sub">这个做法配方本里已经有了。</div>
            <button class="small" data-act="potDismiss" style="margin-top:6px">知道了</button>`;
        }
      } else {
        h += `<div class="sub">煮废了：${esc(pd.reason || "")}</div>
          <div class="sub">失败品进了${go("store", "仓库")}，卖三十块。</div>
          <button class="small" data-act="potDismiss" style="margin-top:6px">知道了</button>`;
      }
      h += `</div>`;
    }
    h += `</div>`;

    // ③ 托盘
    const berryIds = Object.keys(S.berries).filter((k) => S.berries[k] >= 1)
      .sort((a, b) => G.BERRY_BY_ID[b].basePrice - G.BERRY_BY_ID[a].basePrice);
    const findIds = Object.keys(S.finds).filter((k) => S.finds[k] >= 1)
      .sort((a, b) => (G.FIND_BY_ID[a].role === "spice" ? 1 : 0) - (G.FIND_BY_ID[b].role === "spice" ? 1 : 0)
        || G.FIND_BY_ID[a].price - G.FIND_BY_ID[b].price);
    h += `<div class="card"><h4>树果（决定口味）</h4>`;
    if (!berryIds.length) h += `<div class="sub">手上没有树果，先去收一批。</div>`;
    else {
      h += `<div class="tray">`;
      berryIds.forEach((id) => { h += labTrayCell("berry", +id, S.berries[id], usedBerry[id] || 0); });
      h += `</div>`;
    }
    h += `<h4 style="margin-top:8px">素材（底料定做法 · 香料定味道）</h4>`;
    if (!findIds.length) h += `<div class="sub">还没有素材。让${go("atlas", "阿特拉斯")}多出门几趟。</div>`;
    else {
      h += `<div class="tray">`;
      findIds.forEach((id) => { h += labTrayCell("find", id, S.finds[id], usedFind[id] || 0); });
      h += `</div>`;
    }
    h += `<div class="sub" style="margin-top:6px">点一下或者拖进锅里都行；锅里的食材点一下能拿出来。
      丢得越多，出锅的东西越值钱，卖给对口常客的加价也越高。</div></div>`;

    // ④ 配方本：研发出来的配方可以逐条删掉
    const mine = Object.keys(S.recipes).filter((id) => G.RESEARCH_ID_RE.test(id))
      .map((id) => G.RECIPE_BY_ID[id]).filter(Boolean)
      .sort((a, b) => b.mult - a.mult);
    h += `<div class="card"><h4>配方本（${mine.length} 个）</h4>
      <div class="sub">都是锅里试出来的。留着就能在${go("kitchen", "加工")}台批量做，不想要了也可以划掉。</div>`;
    if (!mine.length) {
      h += `<div class="sub">还是空的。凑齐底料去锅里搅一锅就有了。</div>`;
    } else {
      h += `<div class="book">`;
      mine.forEach((r) => {
        h += `<div class="book-row"><span class="grow">${esc(r.name)}
          <span class="sub">${esc(r.catName || "")}　×${r.mult}　${r.potCount || 2} 样料</span></span>
          <button class="small danger" data-act="forgetRecipe" data-p='${attr({ r: r.id })}'
            title="从配方本里删掉">删</button></div>`;
      });
      h += `</div>`;
    }
    h += `</div>`;

    // ⑤ 换锅
    h += `<div class="card"><h4>换锅</h4>`;
    if (!info.next) {
      h += `<div class="sub">${esc(info.now.name)}已经是最大的一口锅了。</div>`;
    } else {
      h += `<div class="sub">现在：${esc(info.now.name)}　${info.now.slots} 格　搅拌 ${info.now.stir.toFixed(1)}s</div>
        <div class="sub">下一口：${esc(info.next.name)}　${info.next.slots} 格　搅拌 ${info.next.stir.toFixed(1)}s</div>
        <button class="gold" data-act="potUpgrade" style="margin-top:6px"${S.money < info.next.cost ? " disabled" : ""}>
          换锅（${money(info.next.cost)}）</button>`;
    }
    h += `</div>`;
    return h;
  }

  const RENDERERS = {
    market: renderMarket, kitchen: renderKitchen, regulars: renderRegulars,
    shop: renderShop, atlas: renderAtlas, store: renderStore, lab: renderLab,
    talents: renderTalents, dex: renderDex, help: renderHelp
  };

  function renderTabs() {
    // 也用合入：点标签页时会触发重绘，整块替换会让鼠标下的那个标签闪一下
    morph($("tabs"), TABS.map((t, i) =>
      `<button data-act="tab" data-p='${attr({ t: t.id })}' class="${UI.tab === t.id ? "on" : ""}"
        title="${t.name}（按 ${i + 1 <= 9 ? i + 1 : 0} 直接跳过来）">${i < 9
          ? `<span class="tabnum">${i + 1}</span>` : `<span class="tabnum">0</span>`}${icon("tab-" + t.id, "ico-tab")}${t.name}</button>`
    ).join(""));
  }

  // 用户正在操作表单控件时不重建 DOM —— 但只锁"被销毁就出问题"的那几种：
  //   SELECT   手机上原生下拉被销毁会立刻关闭，表现为"选不中"
  //   文本框   正在输入时重建会丢焦点和光标
  // 复选框、单选、按钮、range 这些重建是安全的。
  // 以前这里把任何 INPUT 都算进去，而且 formLock 是 20 秒 —— 结果在代购页勾一个
  // 材料之后，下面那行总价要等 20 秒（或者再点一下让焦点移开）才更新。
  function isTypingControl(el) {
    if (!el) return false;
    if (el.tagName === "SELECT" || el.tagName === "TEXTAREA") return true;
    if (el.tagName === "INPUT") {
      const t = (el.type || "text").toLowerCase();
      return t === "text" || t === "number" || t === "search" || t === "password" || t === "email";
    }
    return false;
  }

  function formBusy() {
    const body = $("tabBody");
    const el = document.activeElement;
    if (el && body.contains(el) && isTypingControl(el)) return true;
    return formLock && performance.now() - formLock < 20000;
  }

  // ── 把新 HTML 合到已有的 DOM 上，而不是整个替换 ──────────────────────────
  // innerHTML 会把所有节点销毁重造。那样有两个后果：
  //   1. 鼠标正悬停的按钮被换掉 → hover 状态丢失 → 一闪一闪
  //   2. 手机上打开的原生下拉（select）节点被销毁 → 选择器瞬间关闭，选不中
  // 事件全部是委托在 document 上的，所以保留节点不会丢监听。
  function syncAttrs(a, b) {
    const attrs = a.attributes;
    for (let i = attrs.length - 1; i >= 0; i--) {
      const name = attrs[i].name;
      if (!b.hasAttribute(name)) a.removeAttribute(name);
    }
    for (let i = 0; i < b.attributes.length; i++) {
      const at = b.attributes[i];
      if (a.getAttribute(at.name) !== at.value) a.setAttribute(at.name, at.value);
    }
  }

  // 逐层合入。节点类型/标签对得上就复用，对不上只替换那一个节点（不动兄弟节点）。
  // 列表变长变短也只增删尾部的节点，已有的节点一律保留 —— 这样鼠标下的按钮永远不会被换掉。
  function mergeInto(oldParent, newParent) {
    const olds = Array.prototype.slice.call(oldParent.childNodes);
    const news = Array.prototype.slice.call(newParent.childNodes);
    const min = Math.min(olds.length, news.length);
    for (let i = 0; i < min; i++) {
      const a = olds[i], b = news[i];
      if (a.nodeType !== b.nodeType || (a.nodeType === 1 && a.tagName !== b.tagName)) {
        oldParent.replaceChild(b.cloneNode(true), a);   // 只换这一个
        continue;
      }
      if (a.nodeType === 3) { if (a.data !== b.data) a.data = b.data; continue; }
      if (a.nodeType !== 1) continue;
      syncAttrs(a, b);
      mergeInto(a, b);
    }
    // 收尾：多了就删，少了就补
    for (let i = olds.length - 1; i >= news.length; i--) oldParent.removeChild(olds[i]);
    for (let i = olds.length; i < news.length; i++) oldParent.appendChild(news[i].cloneNode(true));
  }

  function morph(parent, html) {
    const tpl = document.createElement("template");
    tpl.innerHTML = html;
    mergeInto(parent, tpl.content);
    return true;
  }

  UI.morph = morph;          // 暴露出来给自检用

  function renderTabBody(force) {
    // 节流用真实时间，不用游戏时钟：以后加变速也不会让界面跟着狂刷
    const now = performance.now();
    if (!force && formBusy()) return;
    if (!force && !dirty && now - lastTabRender < 400) return;
    lastTabRender = now;
    dirty = false;
    const fn = RENDERERS[UI.tab] || renderMarket;
    const body = $("tabBody");
    const scroll = body.scrollTop;
    // 某个页面渲染出错时，不能把整个界面卡在旧内容上：把错误显示出来
    UI.lastError = null;
    let html = null;
    try {
      html = fn();
    } catch (e) {
      UI.lastError = { tab: UI.tab, message: e && e.message, stack: (e && e.stack) || "" };
      console.error("渲染 " + UI.tab + " 出错", e);
      html = `<div class="card"><h4>这个页面出错了</h4>
        <div class="sub">${esc(e && e.message)}</div>
        <pre style="white-space:pre-wrap;font-size:12px;color:#9fa286">${esc((e && e.stack) || "")}</pre>
        <div class="sub">存档没坏，切到别的页签还能继续玩。</div></div>`;
    }
    // 内容没变就别动 DOM：innerHTML 会把按钮节点整个销毁重造，
    // 鼠标悬停时会导致 hover 状态反复丢失（一闪一闪），手机上的原生下拉也会被关掉。
    if (html === lastHtml && !UI.lastError) {
      body.scrollTop = scroll;
      return;
    }
    lastHtml = html;
    // 优先"就地合入"，只有结构对不上才整体替换
    if (!morph(body, html)) UI.replaceCount = (UI.replaceCount || 0) + 1;
    body.scrollTop = scroll;
    // 换页时才淡入一次：切页会让整块内容瞬间换掉，200ms 的淡入把这一下接住。
    // 同页内的数据更新不播，否则数字一动就闪。
    if (UI.tab !== lastTabId) {
      lastTabId = UI.tab;
      body.classList.remove("fadein");
      void body.offsetWidth;
      body.classList.add("fadein");
    }
    UI.renderCount = (UI.renderCount || 0) + 1;
  }

  function renderTop() {
    $("uiMoney").textContent = money(S.money);
    const rate = S.rateEMA || 0;
    $("uiRate").textContent = money(rate);
    $("uiTp").textContent = S.talentPoints;
    $("uiRegion").textContent = G.regionOf(S).name;
    $("uiSellVal").textContent = money(G.clickSellValue(S));
  }

  function renderLog() {
    const box = $("uiLog");
    morph(box, S.log.slice(0, 60).map((e) =>
      `<div class="entry ${e.kind || ""}"><span class="t">${new Date(e.t).toLocaleTimeString("zh-CN", { hour12: false })}</span>${esc(e.text)}</div>`
    ).join(""));
  }

  function renderHint() {
    const region = G.regionOf(S);
    const ripe = S.plots.filter((p) => p.ripe).length;
    const empty = S.plots.filter((p) => !p.berry).length;
    let hint = esc(region.tip || "");
    if (ripe) hint = "有 " + ripe + " 块田熟了，按 H 或者点底下的「收获全部」收掉。";
    else if (empty && Object.keys(S.seeds).some((k) => S.seeds[k] > 0)) hint = "还有 " + empty + " 块空地，把种子种下去。";
    else if (!Object.keys(S.seeds).length) hint = "手上的种子用完了，去" + go("shop") + "买点，或者让" + go("atlas") + "出门买。";
    else if (S.craftQueue.length < G.engine.craftSlots(S) && Object.keys(S.berries).length) {
      hint = "加工台空着，去" + go("kitchen") + "做点商品，比直接卖生果赚得多。";
    }
    $("uiHint").innerHTML = hint;
  }

  // 每帧都重建 innerHTML 太浪费，用签名判断"真的变了没有"
  let sigPlots = "", sigSeeds = "", sigLog = "", lastHint = 0;

  // 阿特拉斯回来的时候弹一下提示。
  // 以前只在右侧日志里留一行，那地方很容易看漏 —— 出门/回来本该是个有存在感的事件。
  let lastTripReport = 0;
  function checkTripReport() {
    const r = S.atlas && S.atlas.report;
    if (!r || !r.at || r.at === lastTripReport) return;
    lastTripReport = r.at;
    UI.toast(r.summary);
  }

  // 解锁新常客也要弹一下 —— 以前只写进右边的日志，很容易漏掉
  let lastRegs = null;
  function checkNewRegulars() {
    const now = {};
    (G.REGULARS || []).forEach((r) => {
      if (G.engine.regState(S, r.dex).unlocked) now[r.dex] = true;
    });
    const ids = Object.keys(now);
    // 第一次只是记下现状（读档、离线结算解锁的不补弹，免得一进游戏糊一屏）
    if (lastRegs === null) { lastRegs = now; return; }
    const fresh = ids.filter((d) => !lastRegs[d]);
    lastRegs = now;
    fresh.forEach((d) => {
      const r = (G.REGULARS || []).filter((x) => String(x.dex) === String(d))[0];
      if (r) UI.toast("新常客：" + r.name + "（" + r.title + "）");
    });
  }

  UI.frame = function () {
    const now = G.now(S);
    checkTripReport();
    checkNewRegulars();
    const ps = S.plots.map((p) => (p.berry || 0) + ":" + (p.ripe ? "R" : Math.round(p.grown * 25))).join(",")
      + "|" + S.plots.length + "|" + S.money;
    if (ps !== sigPlots) { sigPlots = ps; renderPlots(); }

    const ss = Object.keys(S.seeds).map((k) => k + "=" + S.seeds[k]).join(",") + "|" + pick.seed;
    if (ss !== sigSeeds) { sigSeeds = ss; renderSeedPicker(); }

    renderTop();
    if (S.log.length + ":" + (S.log[0] ? S.log[0].t : 0) !== sigLog) {
      sigLog = S.log.length + ":" + (S.log[0] ? S.log[0].t : 0);
      renderLog();
    }
    if (now - lastHint > 600) { lastHint = now; renderHint(); }
    renderTabBody(false);
  };

  // 给验收用：列出所有"有实现"的动作名，好检查界面上的 data-act 是不是都有落点。
  // ACT 之外还有两个走别的监听的（下拉框用 change，设置按钮走 openSettings），一并列上，
  // 否则自检会把它们误报成死按钮。
  const ACT_ELSEWHERE = ["picksell", "settings"];
  UI.actNames = function () { return Object.keys(ACT).concat(ACT_ELSEWHERE); };

  UI.forceRender = function () {
    sigPlots = ""; sigSeeds = ""; sigLog = "";
    renderTabs();
    dirty = true;
    renderTabBody(true);
    UI.frame();
  };

  // ---------------- 交互 ----------------

  const ACT = {
    tab: (p) => { UI.tab = p.t; UI.forceRender(); },
    seed: (p) => { pick.seed = p.b; },
    plot: (p) => {
      const plot = S.plots[p.i];
      if (!plot) return;
      if (plot.ripe) {
        const n = G.engine.harvestPlot(S, p.i);
        if (n) UI.toast("收了 " + n + " 个果子");
      } else if (plot.berry) {
        G.engine.waterPlot(S, p.i);
      } else if (pick.seed) {
        if (!G.engine.plant(S, p.i, pick.seed)) UI.toast("种子不够");
      } else {
        UI.toast("先在下面选一种种子");
      }
    },
    plantAll: (p) => {
      const n = G.engine.plantAll(S, p.b);
      UI.toast(n ? "种下 " + n + " 块地" : "没有空地或种子不够");
    },
    buyPlot: () => {
      if (G.engine.buyPlot(S)) UI.toast("买下一块新地");
      else UI.toast("钱不够，或者这一带的地已经买满了");
      UI.forceRender();
    },
    waterAll: () => { const n = G.engine.waterAll(S); if (!n) UI.toast("没有需要浇水的田"); },
    harvestAll: () => { const n = G.engine.harvestAll(S); UI.toast(n ? "收了 " + n + " 个果子" : "还没有成熟的"); },
    sell: () => {
      S.stats.clicks++;
      const r = G.engine.hawk(S);
      if (!r.ok) { UI.toast(r.why); return; }
      UI.toast("+" + money(r.earned) + "（卖了 " + r.count + " 个）");
    },
    sellBerry: (p) => { const v = G.engine.sellBerry(S, p.id, p.n); if (v) UI.toast("+" + money(v)); },
    buyFind: (p) => {
      const r = G.engine.buyFind(S, p.id, p.n);
      UI.toast(r.ok ? "买了 " + r.count + " 份，花了 " + money(r.price) : r.why);
    },

    // ---- 仓库 ----
    storeSel: (p) => { pick.storeSel = { kind: p.kind, id: p.id }; UI.markDirty(); },
    sellFind: (p) => {
      const r = G.engine.sellFind(S, p.id, p.n);
      if (r.ok) UI.toast("卖了 " + r.count + " 份，+" + money(r.earned));
      else UI.toast(r.why);
    },
    dropFind: (p) => {
      const r = G.engine.dropFind(S, p.id, 9999);
      if (r.ok) UI.toast("扔掉了 " + r.count + " 份");
      else UI.toast(r.why);
    },
    sellSeed: (p) => {
      const r = G.engine.sellSeed(S, +p.id, p.n);
      if (!r.ok) return;
      UI.toast("卖了 " + r.n + " 颗种子，收了 ₽" + G.fmt(r.got));
      UI.markDirty();
    },
    dropSeed: (p) => {
      const r = G.engine.dropSeed(S, +p.id, p.n);
      if (!r.ok) return;
      UI.toast("丢了 " + r.n + " 颗种子");
      UI.markDirty();
    },
    sellWaste: (p) => {
      const r = G.engine.sellWaste(S, p.n);
      if (r.ok) UI.toast("+" + money(r.earned));
      else UI.toast(r.why);
    },
    dropWaste: (p) => { const r = G.engine.dropWaste(S, p.n); if (r.ok) UI.toast("倒掉了"); },
    sellMaterial: (p) => {
      const r = G.engine.sellMaterial(S, p.m, p.n);
      if (r.ok) UI.toast("+" + money(r.earned));
      else UI.toast(r.why);
    },
    dropMaterial: (p) => {
      const r = G.engine.dropMaterial(S, p.m, 9999);
      if (r.ok) UI.toast("扔掉了 " + r.count + " 份");
    },

    sellAllBerries: () => { const v = G.engine.sellAllBerries(S); UI.toast(v ? "+" + money(v) : "没有生果"); },
    sellAllProducts: () => { const v = G.engine.sellAllProducts(S); UI.toast(v ? "+" + money(v) : "没有商品"); },
    sellProduct: (p) => {
      const v = G.engine.sellProduct(S, p.k, p.n, p.dex || null);
      if (v) UI.toast("+" + money(v));
    },
    recipe: (p) => { pick.recipe = p.r; UI.markDirty(); },
    autoOn: (p) => {
      S.autoRecipe = p.r;
      UI.toast("自动加工已开启：" + G.RECIPE_BY_ID[p.r].name);
      UI.forceRender();
    },
    autoOff: () => { S.autoRecipe = null; UI.toast("自动加工已关闭"); UI.forceRender(); },
    toggleStall: () => {
      S.stallOn = S.stallOn === false;
      UI.toast(S.stallOn ? "摊位开始自动出货" : "摊位已关闭，生果不会自动卖掉");
      UI.forceRender();
    },
    setReserve: (p) => {
      S.stallReserve = p.n;
      UI.toast("每个品种保留 " + p.n + " 个不卖");
      UI.forceRender();
    },
    toggleAutoTrade: () => {
      S.autoTrade = !S.autoTrade;
      UI.toast(S.autoTrade ? "自动交付已开启" : "自动交付已关闭");
      UI.forceRender();
    },
    kflavor: (p) => {
      // 点「全部」清空；点味道是切换式开关，最多同时选两个
      if (p.f === "全部") { pick.kflavor = []; UI.markDirty(); return; }
      const i = pick.kflavor.indexOf(p.f);
      if (i >= 0) pick.kflavor.splice(i, 1);
      else {
        pick.kflavor.push(p.f);
        if (pick.kflavor.length > 2) pick.kflavor.shift();   // 超过两个就把最早的挤掉
      }
      UI.markDirty();
    },
    mixOn: (p) => {
      pick.mixFor = pick.mixFor === p.r ? null : p.r;
      pick.mixMain = null;
      UI.markDirty();
    },
    mixMain: (p) => { pick.mixMain = p.b; UI.markDirty(); },
    craftMix: (p) => {
      const r = G.engine.craftMix(S, p.r, p.m, p.s);
      if (!r.ok) { UI.toast(r.why); return; }
      UI.toast("做「" + (r.tag || "混合") + "」的排进去了（" + r.secs.toFixed(1) + "s）");
    },
    craftFill: (p) => {
      const r = G.engine.craftFill(S, p.r);
      UI.toast(r.n ? "排了 " + r.n + " 件进去" : "工位满了，或者原料不够");
    },
    craft: (p) => {
      const r = G.engine.craft(S, p.r, p.b);
      if (!r.ok) UI.toast(r.why); else UI.toast("开始加工（" + r.secs.toFixed(1) + "s）");
    },
    buySeed: (p) => {
      if (G.engine.buySeed(S, p.b, p.n)) UI.toast("买了 " + p.n + " 个种子");
      else UI.toast("钱不够");
    },
    buyRecipe: (p) => {
      if (G.engine.buyRecipe(S, p.r)) UI.toast("学会了：" + G.RECIPE_BY_ID[p.r].name);
      else UI.toast("钱不够");
    },
    buyMaterial: (p) => {
      if (G.engine.buyMaterial(S, p.m, p.n)) UI.toast("买到材料");
      else UI.toast("钱不够");
    },
    craftItem: (p) => {
      const r = G.engine.orderCraft(S, p.id);
      if (!r.ok) UI.toast(r.why); else UI.toast("他开始做了");
    },
    tripToggle: (p) => {
      S._tripWant = S._tripWant || {};
      if (S._tripWant[p.m]) delete S._tripWant[p.m];
      else S._tripWant[p.m] = 5;
      UI.markDirty();
    },
    tripClear: () => { S._tripWant = {}; UI.markDirty(); },
    tripGo: () => {
      const want = S._tripWant || {};
      if (!Object.keys(want).length) { UI.toast("先勾选要买的东西"); return; }
      const r = G.engine.startTrip(S, want);
      if (!r.ok) UI.toast(r.why); else { S._tripWant = {}; UI.toast("他出发了"); }
    },
    hire: (p) => {
      if (G.engine.buyHelper(S, p.dex)) UI.toast("来了个帮手");
      else UI.toast("钱不够，或者槽位满了");
    },
    fire: (p) => { G.engine.fireHelper(S, p.dex); UI.toast("让他回去了"); },
    deliver: (p) => {
      if (G.engine.deliverOrder(S, p.dex)) UI.toast("订单完成");
      else UI.toast("符合口味的商品不够");
    },
    buyTalent: (p) => {
      if (G.engine.buyTalent(S, p.id)) UI.toast("天赋提升了");
      else UI.toast("天赋点不够");
    },
    respecTalents: () => {
      const r = G.engine.respecTalents(S);
      if (!r.ok) { UI.toast(r.why); return; }
      UI.toast("收回 " + r.refund + " 点，重新点一遍吧");
      UI.forceRender();
    },
    conjOrder: (p) => {
      const r = G.engine.orderConj(S, p.p);
      if (!r.ok) { UI.toast(r.why); return; }
      UI.toast("他开始刻图纸了（" + G.time(r.secs) + "）");
      UI.forceRender();
    },
    conjPick: (p) => {
      const r = G.engine.chooseConj(S, p.p, p.s);
      if (!r.ok) { UI.toast(r.why); return; }
      const l = (G.ATLAS_LINES && G.ATLAS_LINES.craft_done) || [];
      if (l.length) UI.bubble(l[Math.floor(Math.random() * l.length)]);
      UI.toast("「" + r.side.name + "」定了");
      UI.forceRender();
    },
    roam: (p) => {
      const r = G.engine.roam(S, p.r);
      if (!r) { UI.toast("现在还不能去那儿"); return; }
      UI.flash();
      const l = (G.ATLAS_LINES && G.ATLAS_LINES.prestige) || [];
      if (l.length) UI.bubble(l[Math.floor(Math.random() * l.length)]);
      UI.toast("巡游到「" + G.regionOf(S).name + "」。当地门槛 ×" + r.scale.toFixed(1));
      UI.forceRender();
    },
    migrate: () => {
      const r = G.engine.migrate(S);
      if (r) {
        UI.flash();
        UI.toast("搬到新区域了。天赋点 +" + r.talentPoints);
        const l = (G.ATLAS_LINES && G.ATLAS_LINES.prestige) || [];
        if (l.length) UI.bubble(l[Math.floor(Math.random() * l.length)]);
        UI.forceRender();
      } else UI.toast("还不能搬");
    },
    settings: () => UI.openSettings(),
    closeOverlay: () => UI.closeOverlay(),

    // ---- 研发：大锅 ----
    labAdd: (p) => {
      const r = G.engine.potAdd(S, p.kind, p.id);
      if (!r.ok) UI.toast(r.why);
    },
    potRemove: (p) => { G.engine.potRemove(S, p.i); },
    potClear: () => { G.engine.potClear(S); },
    potStir: () => {
      const r = G.engine.potStir(S);
      if (!r.ok) UI.toast(r.why);
      UI.markDirty();
    },
    potUpgrade: () => {
      const r = G.engine.potUpgrade(S);
      UI.toast(r.ok ? "换成了「" + r.level.name + "」" : r.why);
    },
    potKeep: () => {
      const r = G.engine.potKeepRecipe(S);
      UI.toast(r.ok ? "记进配方本了" : r.why);
    },
    potDismiss: () => { G.engine.potDismiss(S); },
    forgetRecipe: (p) => {
      const r = G.engine.forgetRecipe(S, p.r);
      UI.toast(r.ok ? "划掉了" : r.why);
    },
  };

  UI.bubble = function (text) {
    G.addLog(S, text, "atlas");
  };

  document.addEventListener("click", (e) => {
    if (suppressClick) return;
    const t = e.target.closest("[data-act]");
    if (!t) return;
    const act = t.dataset.act;
    if (!ACT[act]) return;
    let p = {};
    try { p = t.dataset.p ? JSON.parse(t.dataset.p) : {}; } catch (err) { p = {}; }
    ACT[act](p, t, e);
    UI.markDirty();
  });

  document.addEventListener("change", (e) => {
    const tag = e.target && e.target.tagName;
    // 选完立刻解锁并重画（手机上原生下拉这一步很关键）
    if (tag === "SELECT" || tag === "INPUT" || tag === "TEXTAREA") {
      formLock = 0;
      lastHtml = "";
      UI.markDirty();
    }
    const t = e.target.closest("[data-act='picksell']");
    if (!t) return;
    const p = JSON.parse(t.dataset.p);
    pick.regularFor[p.k] = t.value ? +t.value : null;
    UI.markDirty();
  });

  // ---------- 拖食材进锅 ----------
  // 用 pointer 事件而不是 HTML5 拖放：手机上也能用。
  // 点一下 = 直接放一个；拖动 = 跟着手指走，松手落在锅上才算数。
  let potDrag = null;
  let potGhost = null;
  let suppressClick = false;

  function potDragStart(e, cell) {
    let p = {};
    try { p = JSON.parse(cell.dataset.p || "{}"); } catch (err) { return; }
    if (cell.classList.contains("out")) return;   // 手上的份数已经全在锅里了
    const img = cell.querySelector("img");
    potDrag = { kind: p.kind, id: p.id, x0: e.clientX, y0: e.clientY, moved: false, img: img ? img.src : "" };
  }

  function potDragMove(e) {
    if (!potDrag) return;
    const dx = e.clientX - potDrag.x0;
    const dy = e.clientY - potDrag.y0;
    if (!potDrag.moved && dx * dx + dy * dy < 36) return;
    if (!potDrag.moved) {
      potDrag.moved = true;
      potGhost = document.createElement("img");
      potGhost.className = "pot-ghost";
      potGhost.src = potDrag.img;
      document.body.appendChild(potGhost);
    }
    potGhost.style.transform = "translate(" + (e.clientX - 16) + "px," + (e.clientY - 16) + "px)";
    const over = potUnder(e.clientX, e.clientY);
    const zone = $("potZone");
    if (zone) zone.classList.toggle("over", !!over);
    e.preventDefault();
  }

  function potUnder(x, y) {
    const el = document.elementFromPoint(x, y);
    return el && el.closest ? el.closest("#potZone") : null;
  }

  function potDragEnd(e) {
    if (!potDrag) return;
    const d = potDrag;
    potDrag = null;
    if (potGhost) { potGhost.remove(); potGhost = null; }
    const zone = $("potZone");
    if (zone) zone.classList.remove("over");
    if (!d.moved) return;                 // 没动过 → 交给 click 走 labAdd
    suppressClick = true;                 // 拖过了，别再让 click 放第二个
    setTimeout(() => { suppressClick = false; }, 0);
    if (potUnder(e.clientX, e.clientY)) {
      const r = G.engine.potAdd(S, d.kind, d.id);
      if (!r.ok) UI.toast(r.why);
    }
    UI.markDirty();
    lastHtml = "";
    UI.forceRender();
  }

  document.addEventListener("pointerdown", (e) => {
    const cell = e.target.closest ? e.target.closest(".lab-cell") : null;
    if (cell) potDragStart(e, cell);
  });
  document.addEventListener("pointermove", potDragMove, { passive: false });
  document.addEventListener("pointerup", potDragEnd);
  document.addEventListener("pointercancel", potDragEnd);

  // 表单控件交互期间锁住重建，具体原因见 formBusy()
  document.addEventListener("pointerdown", (e) => {
    const el = e.target;
    if (isTypingControl(el)) formLock = performance.now();
    else if (!el || !el.closest || !el.closest("#tabBody")) formLock = 0;   // 点了别处就解锁
  }, true);
  document.addEventListener("blur", (e) => {
    if (isTypingControl(e.target)) formLock = 0;
  }, true);

  // 设置 / 存档弹层
  // 转世过场：整屏淡金一闪。只用透明度，时长 520ms，减弱动效下不播。
  UI.flash = function () {
    const el = $("flash");
    if (!el) return;
    el.classList.remove("run");
    void el.offsetWidth;
    el.classList.add("run");
  };

  let overlayTimer = 0;
  // 弹层统一从这里开：先插内容、再加 .open，让 opacity/transform 的transition 从头播。
  UI.openOverlay = function (inner) {
    const ov = $("overlay");
    clearTimeout(overlayTimer);
    ov.classList.remove("hidden");
    ov.innerHTML = `<div class="modal">${inner}</div>`;
    ov.classList.remove("open");
    void ov.offsetWidth;              // 强制重排，否则连开两次不会重播
    ov.classList.add("open");
    const focusable = ov.querySelector("button");
    if (focusable) focusable.focus();
  };
  // 先退场，动效走完再真正移除
  UI.closeOverlay = function () {
    const ov = $("overlay");
    if (ov.classList.contains("hidden")) return;
    ov.classList.remove("open");
    clearTimeout(overlayTimer);
    overlayTimer = setTimeout(() => {
      ov.classList.add("hidden");
      ov.innerHTML = "";
    }, 160);
  };

  // 存档区：文本框内容要跨重绘保留，不然一存槽位就把它冲掉了
  let saveBoxCache = "";
  let resetArmed = false;

  function slotRows() {
    const list = G.listSlots ? G.listSlots() : [];
    if (!list.length) return `<div class="sub">还没有槽位。开新版本之前先存一个，出事了能退回来。</div>`;
    return list.map((x) => `<div class="slot-row">
      <span class="grow">${esc(x.name)}<span class="sub">${esc(x.region || "")}　${money(x.money || 0)}　${new Date(x.at).toLocaleString("zh-CN", { hour12: false }).slice(0, 16)}</span></span>
      <button class="small" data-act="slotLoad" data-p='${attr({ name: x.name })}'>读这个</button>
      <button class="small danger" data-act="slotDelete" data-p='${attr({ name: x.name })}'>删</button>
    </div>`).join("");
  }

  UI.openSettings = function () {
    UI.openOverlay(`
      <h3>${icon("settings")}设置与存档</h3>
      <div class="sub">存档自动存在这个浏览器里（localStorage）。换设备、或者新版本想开新档，用下面的备份和槽位。</div>

      <div class="card" style="margin-top:10px">
        <h4>备份与恢复</h4>
        <div class="row2" style="flex-wrap:wrap;margin:6px 0">
          <button class="small" data-act="exportSave">导出到文本框</button>
          <button class="small" data-act="downloadSave">下载成文件</button>
          <button class="small" data-act="copySave">复制</button>
          <button class="small" data-act="importSave">从文本框导入</button>
          <button class="small" data-act="pickfile">选文件导入</button>
        </div>
        <textarea id="saveBox" placeholder="点「导出到文本框」会在这里生成一串存档；要恢复的话，把之前存的那串粘进来再点「从文本框导入」。">${esc(saveBoxCache)}</textarea>
        <input type="file" id="saveFile" accept=".json,.txt,application/json" style="display:none">
        <div class="sub" id="saveMsg" style="margin-top:6px"></div>
      </div>

      <div class="card">
        <h4>存档槽位（最多 ${G.SLOT_MAX || 4} 个）</h4>
        <div class="sub">存在浏览器里，和主存档分开。开新版本前先存一个，随时能读回来。</div>
        <div class="row2" style="margin:6px 0;flex-wrap:wrap">
          <input id="slotName" placeholder="给这个存档起个名字" style="flex:1;min-width:150px">
          <button class="small" data-act="slotSave">存入槽位</button>
        </div>
        <div class="slot-list">${slotRows()}</div>
      </div>

      <div class="card">
        <h4>重新开始</h4>
        <div class="sub">清空这个浏览器里的存档，从区域 1 重新来。删之前建议先存一个槽位。</div>
        <div class="row2" style="margin-top:6px">
          ${resetArmed
            ? '<button class="danger" data-act="resetSave">真的删掉，点这里确认</button><button class="small" data-act="resetCancel">算了</button>'
            : '<button class="danger" data-act="resetArm">重新开始</button>'}
        </div>
      </div>

      <div class="card">
        <h4>关于</h4>
        <div class="sub">菲洛若亚大陆 · 树果物语　版本 <b>${esc((G.BUILD || {}).version || "?")}</b>
          （build ${esc(String((G.BUILD || {}).build || 0))}　${esc((G.BUILD || {}).date || "")}）</div>
        <div class="sub" style="margin-top:4px">看到「版本」没变，说明浏览器还在用旧文件——
          按 Ctrl/Cmd + Shift + R 强制刷新一次就好。</div>
      </div>

      <div class="card">
        <h4>更新日志</h4>
        <div class="log-list">${(G.CHANGELOG || []).map((v) => `<div class="log-item">
          <div class="log-head"><b>v${esc(v.version)}</b>　${esc(v.title || "")}
            <span class="sub">${esc(v.date || "")}</span></div>
          <ul>${(v.items || []).map((it) => `<li>${esc(it)}</li>`).join("")}</ul>
        </div>`).join("")}</div>
      </div>

      <div class="card">
        <h4>统计</h4>
        <table class="simple">
          <tr><td>游戏时长</td><td>${G.time(S.playTime)}</td></tr>
          <tr><td>累计收获</td><td>${G.fmt(S.stats.harvested)} 个</td></tr>
          <tr><td>累计加工</td><td>${G.fmt(S.stats.crafted)} 次　（共 ${G.time(S.stats.craftSeconds || 0)}）</td></tr>
          <tr><td>累计卖出</td><td>${G.fmt(S.stats.sold)} 件</td></tr>
          <tr><td>累计收入</td><td>${money(S.stats.revenueTotal)}</td></tr>
          <tr><td>移民次数</td><td>${S.stats.prestige}</td></tr>
          <tr><td>阿特拉斯出门</td><td>${S.stats.trips} 次</td></tr>
          <tr><td>研发成功</td><td>${G.fmt(S.stats.researched || 0)} 个</td></tr>
        </table>
      </div>

      <div class="row2" style="margin-top:10px">
        <button data-act="closeOverlay">关闭</button>
      </div>
    `);
  };

  function saveMessage(text) {
    const el = $("saveMsg");
    if (el) el.textContent = text;
  }
  function refreshSettings() {
    const box = $("saveBox");
    if (box) saveBoxCache = box.value;
    UI.openSettings();       // 重画一遍，槽位列表要跟着变
  }

  ACT.exportSave = () => {
    const box = $("saveBox");
    saveBoxCache = G.exportSave(S);
    box.value = saveBoxCache;
    box.select();
    saveMessage("已导出到上面的文本框。复制走，或者直接「下载成文件」。");
  };
  ACT.copySave = () => {
    const box = $("saveBox");
    const text = box && box.value ? box.value : G.exportSave(S);
    if (box) { box.value = text; saveBoxCache = text; }
    const done = () => saveMessage("已复制到剪贴板。");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, () => { if (box) { box.select(); } saveMessage("复制没成功，手动选中复制吧。"); });
    } else if (box) {
      box.select();
      saveMessage("浏览器不给自动复制，已经帮你选中了，按 Ctrl/Cmd+C。");
    }
  };
  ACT.downloadSave = () => {
    saveBoxCache = G.exportSave(S);
    const blob = new Blob([saveBoxCache], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const region = G.regionOf(S).name;
    a.href = url;
    a.download = "菲洛若亚存档_" + region + "_" +
      new Date().toLocaleString("zh-CN", { hour12: false }).replace(/[\/\s:]/g, "") + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    saveMessage("文件已开始下载。");
  };
  ACT.importSave = () => {
    const box = $("saveBox");
    const text = box ? box.value.trim() : "";
    if (!text) { saveMessage("文本框是空的。先把存档字符串粘进来，或者用「选文件导入」。"); return; }
    try {
      const s = G.importSave(text);
      UI.replaceState(s);
      saveMessage("导入成功。");
      UI.closeOverlay();
      UI.forceRender();
    } catch (err) {
      saveMessage("导入失败：" + err.message);
    }
  };
  ACT.pickfile = () => {
    const input = $("saveFile");
    if (!input) return;
    input.onchange = () => {
      const f = input.files && input.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => {
        const box = $("saveBox");
        if (box) box.value = String(reader.result || "");
        saveMessage("读进来了，点「从文本框导入」确认。");
      };
      reader.onerror = () => saveMessage("这个文件读不出来。");
      reader.readAsText(f);
    };
    input.click();
  };

  ACT.slotSave = () => {
    const nameEl = $("slotName");
    const name = nameEl && nameEl.value.trim() ? nameEl.value.trim() : null;
    const r = G.saveSlot(S, name);
    if (!r.ok) { saveMessage(r.why); return; }
    refreshSettings();
    saveMessage("已存进槽位「" + r.entry.name + "」。");
  };
  ACT.slotLoad = (p) => {
    const s = G.loadSlot(p.name);
    if (!s) { saveMessage("这个槽位读不出来了。"); return; }
    $("overlay").classList.add("hidden");
    UI.replaceState(s);
    UI.closeOverlay();
    UI.forceRender();
    UI.toast("读回了「" + p.name + "」");
  };
  ACT.slotDelete = (p) => {
    G.deleteSlot(p.name);
    refreshSettings();
    saveMessage("删掉了槽位「" + p.name + "」。");
  };

  ACT.resetArm = () => { resetArmed = true; refreshSettings(); saveMessage("想清楚了再点下面那个红的。"); };
  ACT.resetCancel = () => { resetArmed = false; refreshSettings(); };
  ACT.resetSave = () => {
    resetArmed = false;
    G.clearSave();
    UI.replaceState(G.newState());
    UI.closeOverlay();
    UI.forceRender();
    UI.toast("删掉了，从头开始。");
  };

  // 换掉整份存档（重新开始 / 读档 / 导入）。
  // 光改这里的引用不够 —— main.js 自己也持有一份 state，自动存档、
  // visibilitychange、beforeunload 存的都是那一份。不通知它的话，
  // 点完"重新开始"下一次自动存档就把旧数据写回去了，刷新一看全回来了。
  UI.replaceState = function (s) {
    S = s;
    UI.state = s;
    lastRegs = null;      // 换了存档，常客名单缓存作废
    if (G.onStateReplace) G.onStateReplace(s);
  };

  UI.init = function (state) {
    S = state;
    UI.state = state;
    UI.tab = "market";
    pick.seed = null;
    UI.forceRender();
  };

  G.UI = UI;
})();
