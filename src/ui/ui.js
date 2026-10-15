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

  const pick = { seed: null, recipe: null, regularFor: {}, labBerry: null, labFinds: [] };

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s === undefined || s === null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function attr(obj) { return esc(JSON.stringify(obj)); }
  // 库存一律按整数显示：果子/种子/商品/材料都是离散的
  function int(n) { const v = Math.floor(n || 0); return v > 0 ? v : 0; }

  // UI 图标（Kenney Cursor Pixel Pack，CC0）。白色 16x16 PNG，用 img 引，靠 opacity 控制强弱。
  function icon(name) {
    return `<img class="ico" src="assets/ui/${name}.png" alt="" aria-hidden="true">`;
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

  function renderSeedPicker() {
    const box = $("uiSeedPicker");
    const ids = Object.keys(S.seeds).filter((id) => S.seeds[id] > 0)
      .map(Number).sort((a, b) => G.BERRY_BY_ID[a].tier - G.BERRY_BY_ID[b].tier || a - b);
    if (!ids.length) {
      morph(box, `<div class="sub">没有种子了。去${go("shop", "商店")}买一些，或者让${go("atlas", "阿特拉斯")}出门碰碰运气。</div>`);
      return;
    }
    if (!pick.seed || !(S.seeds[pick.seed] > 0)) pick.seed = ids[0];
    const seedHtml = `<div class="sub" style="margin-bottom:4px">手上的种子（点一下选中，再点空地播种）</div>` +
      ids.map((id) => {
        const b = G.BERRY_BY_ID[id];
        const on = pick.seed === id ? "style=\"outline:2px solid var(--gold)\"" : "";
        return `<div class="row" ${on}>
          <img src="${b.icon}" alt="">
          <span class="nm flavor-${b.flavor}">${esc(b.zh)} <span class="tag">${b.flavor}</span></span>
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
            `<button class="small ${stall.reserve === n ? "gold" : ""}" data-act="setReserve" data-p='${attr({ n: n })}'>${n}</button>`).join("")}
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
        <span class="grow flavor-${b.flavor}">${esc(b.zh)} <span class="tag">${b.flavor}</span></span>
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
      const parts = k.split("|");
      const r = G.RECIPE_BY_ID[parts[0]];
      const b = G.BERRY_BY_ID[+parts[1]];
      if (!r || !b) return;
      const v = G.productValue(r, b);
      const sellTo = regs.length
        ? `<select data-act="picksell" data-p='${attr({ k: k })}'>
             <option value="">随便谁（市场价）</option>
             ${regs.map((rg) => `<option value="${rg.dex}" ${pick.regularFor[k] === rg.dex ? "selected" : ""}>${esc(rg.name)}（喜${rg.flavor}）</option>`).join("")}
           </select>`
        : `<span class="sub">还没有常客</span>`;
      const target = pick.regularFor[k] || null;
      const price = target
        ? G.productSellPrice(S, r, b, { aff: G.engine.regState(S, target).aff, flavor: G.engine.regularByDex(target).flavor, dislike: G.engine.regularByDex(target).dislike })
        : G.marketPrice(S, r, b);
      h += `<div class="list-item">
        ${G.productIcon(r, b)}
        <span class="grow" title="${esc(G.productName(r, b))}">${esc(G.productName(r, b))}
          <span class="flavor-${r.flavor}">[${r.flavor}]</span></span>
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
    let h = "";
    const info = G.engine.craftSlotInfo(S);
    h += `<div class="card"><h4>加工台（${S.craftQueue.length}/${info.slots}）</h4>
      <div class="sub">工位 = 2 个基础 + 工坊类道具等级总和 ÷ 2（上限 ${info.cap}）。当前工坊等级和 ${info.total}${
        info.detail.length ? "：" + info.detail.map((x) => x.name + " Lv." + x.level).join("、") : "（还没有工坊道具）"}</div>`;
    // 自动加工开关
    if (G.engine.autoUnlocked(S)) {
      const auto = S.autoRecipe && S.recipes[S.autoRecipe] ? G.RECIPE_BY_ID[S.autoRecipe] : null;
      h += `<div class="row2" style="margin-top:6px">
        <span class="sub">自动加工：${auto ? "开着，优先做「" + esc(auto.name) + "」，原料断了自动换能做的" : "关着"}</span>
        ${auto ? `<button class="small" data-act="autoOff">关掉</button>` : `<span class="sub">（在下面选一个配方，点「一直做这个」）</span>`}
      </div>`;
    } else {
      h += `<div class="sub" style="margin-top:6px">做出第一件工坊道具（区域 2 的「石磨」）之后，这里会多出「自动加工」。</div>`;
    }
    if (!S.craftQueue.length) h += `<div class="sub">空闲中。</div>`;
    const now = G.now(S);
    S.craftQueue.forEach((j) => {
      const r = G.RECIPE_BY_ID[j.recipeId];
      const b = G.BERRY_BY_ID[j.berryId];
      const left = Math.max(0, (j.until - now) / 1000);
      const pctv = 100 - Math.min(100, (left / j.secs) * 100);
      h += `<div class="list-item">${G.productIcon(r, b)}
        <span class="grow">${esc(G.productName(r, b))}</span>
        <span class="sub">${left.toFixed(1)}s</span>
        <div class="bar-outer" style="width:120px"><i style="width:${pctv.toFixed(0)}%"></i></div>
      </div>`;
    });
    h += `</div>`;

    const unlocked = G.engine.unlockedRecipes(S);
    if (!unlocked.length) {
      h += `<div class="card"><h4>还没有配方</h4><div class="sub">去${go("shop", "商店")}买一个配方。最先该买的是「辣味果酱」。</div></div>`;
      return h;
    }
    if (!pick.recipe || !S.recipes[pick.recipe]) pick.recipe = unlocked[0].id;

    // 按品类分组：配方多了以后（10 类 × 5 味 + 10 招牌）平铺就是一片按钮墙
    h += `<div class="card"><h4>选择配方</h4>`;
    const byCat = [];
    unlocked.forEach((r) => {
      let g = byCat.filter((x) => x.id === r.cat)[0];
      if (!g) { g = { id: r.cat, name: r.catName, list: [] }; byCat.push(g); }
      g.list.push(r);
    });
    byCat.forEach((g) => {
      h += `<div class="cat-group"><div class="sub cat-name">${esc(g.name)}</div><div class="row2" style="flex-wrap:wrap">`;
      g.list.forEach((r) => {
        const on = pick.recipe === r.id ? "gold" : "";
        const label = r.specialty ? r.name : r.name.replace(g.name, "") || r.name;
        h += `<button class="${on}" data-act="recipe" data-p='${attr({ r: r.id })}' title="${esc(r.name)}">${esc(label)}</button>`;
      });
      h += `</div></div>`;
    });
    h += `</div>`;

    const recipe = G.RECIPE_BY_ID[pick.recipe];
    const elig = G.engine.eligibleBerries(S, recipe);
    const isAuto = S.autoRecipe === recipe.id;
    h += `<div class="card"><h4>${esc(recipe.name)}</h4>
      <div class="sub">需要：${recipe.needBerry ? esc(G.BERRY_BY_ID[recipe.needBerry].zh) : "「" + recipe.needFlavor + "」味树果"} ×${recipe.needCount}
      ｜耗时 ${(recipe.time / (1 + G.bonuses(S).craftSpeed)).toFixed(1)}s
      ｜基础倍率 ×${recipe.mult}${recipe.specialty ? "（招牌商品）" : ""}</div>
      ${G.engine.autoUnlocked(S) ? `<div class="row2" style="margin-top:4px">
        <button class="small ${isAuto ? "gold" : ""}" data-act="${isAuto ? "autoOff" : "autoOn"}" data-p='${attr({ r: recipe.id })}'>
          ${isAuto ? "✔ 一直在做这个" : "一直做这个（自动加工）"}</button>
        <span class="sub">${isAuto ? "工位一空就自动补料继续做；这个配方的原料断了，会自动换一个现在能做、倍率最高的。" : "打开之后不用盯着，做完一个自动接下一个。"}</span>
      </div>` : ""}`;
    if (!elig.length) {
      const hint = G.engine.berryHint(S, recipe);
      if (hint.length) {
        h += `<div class="sub" style="margin-top:6px">库存不够（要 ${recipe.needCount} 个）。能做这个配方的是这些，去${go("shop", "商店")}买种子种起来：</div>`;
        hint.slice(0, 6).forEach((b) => {
          h += `<div class="list-item"><img src="${b.icon}" alt="">
            <span class="grow flavor-${b.flavor}">${esc(b.zh)}</span>
            <span class="sub">库存 ${int(S.berries[b.id])} / 需要 ${recipe.needCount}</span>
            <span class="sub">种子 ₽${G.fmt(G.seedPrice(S, b))}</span>
          </div>`;
        });
      } else {
        const stall = G.engine.stallInfo(S);
        const beingSold = stall.unlocked && stall.on;
        h += `<div class="sub" style="margin-top:6px">这一带还没有「${recipe.needFlavor || "对应"}」味的树果，搬到后面的区域才会有。</div>`;
        if (beingSold) {
          h += `<div class="sub" style="color:#ffc98a;margin-top:4px">也可能是刚收上来就被摊位自动卖掉了——
            去${go("market", "市场")}页把「摊位自动出货」的保留量调高，或者直接关掉它。</div>`;
        }
      }
    } else {
      elig.forEach((b) => {
        const val = G.productValue(recipe, b);
        const cost = b.basePrice * recipe.needCount;
        h += `<div class="list-item"><img src="${b.icon}" alt="">
          <span class="grow">用 ${esc(b.zh)} ×${recipe.needCount} <span class="sub">（库存 ${int(S.berries[b.id])}）</span></span>
          <span class="sub">原料值 ₽${G.fmt(cost)}</span>
          <span class="gold">→ ₽${G.fmt(val)}</span>
          <button class="small gold" data-act="craft" data-p='${attr({ r: recipe.id, b: b.id })}'>制作</button>
        </div>`;
      });
    }
    h += `</div>`;

    const locked = G.RECIPES.filter((r) => !r.research && !S.recipes[r.id] && r.region <= S.maxRegion);
    if (locked.length) {
      h += `<div class="card"><h4>可以学的配方</h4>`;
      locked.slice(0, 12).forEach((r) => {
        h += `<div class="list-item">
          <span class="grow">${esc(r.name)} <span class="sub">倍率 ×${r.mult}　需要 ${r.needCount} 个${r.needFlavor ? r.needFlavor + "味树果" : "指定树果"}</span></span>
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
    let h = `<div class="card"><h4>${esc(G.regionOf(S).name)} 的常客</h4>
      <div class="sub">解锁全部 ${list.length} 位之后，就能付移民费搬到下一个区域。口味偏好来自性格。</div></div>`;

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
      const prog = (() => {
        const u = reg.unlock || {};
        const stt = S.stats;
        const map = {
          harvest: [stt.harvested, u.value, "累计收获树果"],
          species: [Object.keys(S.dex).length, u.value, "见过的树果种类"],
          crafted: [stt.crafted, u.value, "累计加工商品"],
          revenue: [stt.revenueRegion, u.value, "本区域累计收入"],
          affinity: [Math.max(0, ...Object.keys(S.regulars).map((d) => S.regulars[d].aff || 0)), u.value, "最高好感等级"]
        };
        return map[u.type] || [0, u.value || 1, "未知条件"];
      })();
      const pctv = Math.min(1, prog[0] / prog[1]);

      h += `<div class="card"><div class="mon">
        <img class="portrait" src="assets/pmd/${String(reg.dex).padStart(4, "0")}_portrait.png" alt="" onerror="this.style.visibility='hidden'">
        <div class="grow">
          <div class="who">${esc(reg.name)} <span class="tag">${esc(reg.title)}</span>
            ${unlock ? "" : `<span class="tag">未解锁</span>`}</div>
          <div class="sub">性格 ${esc(reg.nature)}　喜欢 <b class="flavor-${reg.flavor}">${reg.flavor}</b>　讨厌 <b class="flavor-${reg.dislike}">${reg.dislike}</b>
            ｜好感 ${st.aff}/5</div>
          <div class="sub">${esc(reg.desc)}</div>
          ${unlock ? `<div class="sub" style="margin-top:4px">${esc(reg.lines.greet[st.aff % reg.lines.greet.length])}</div>`
            : `<div class="sub" style="margin-top:4px">解锁条件：${esc(prog[2])} ${G.fmt(prog[0])} / ${G.fmt(prog[1])}</div>
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

  function renderShop() {
    let h = "";
    // 种子
    h += `<div class="card"><h4>种子</h4><div class="sub">区域越往后，树果越贵，也越值钱。</div>`;
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
        h += `<div class="list-item"><img src="${b.icon}" alt="">
          <span class="grow flavor-${b.flavor}">${esc(b.zh)} <span class="tag">${b.flavor}</span>
            <span class="sub">${b.growHours}h／收${b.yield}／果₽${b.basePrice}</span></span>
          <span>种子 ${money(price)}</span>
          <button class="small" data-act="buySeed" data-p='${attr({ b: b.id, n: 1 })}' ${S.money < price ? "disabled" : ""}>×1</button>
          <button class="small" data-act="buySeed" data-p='${attr({ b: b.id, n: 10 })}' ${S.money < price * 10 ? "disabled" : ""}>×10</button>
        </div>`;
      });
    });
    h += `</div>`;

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
        <span class="grow">${esc(r.name)} <span class="sub">需要 ${r.needCount} 个${r.needFlavor || "指定"}味 · ×${r.mult} · ${r.time}s</span></span>
        <span>${money(r.cost)}</span>
        <button class="small gold" data-act="buyRecipe" data-p='${attr({ r: r.id })}' ${S.money < r.cost ? "disabled" : ""}>学会</button>
      </div>`;
    });
    h += `</div>`;
    return h;
  }

  // ---------------- 阿特拉斯 / 工坊 ----------------

  function renderAtlas() {
    const cap = G.ATLAS_LINES || {};
    const lines = (cap.idle || ["……"]);
    const line = lines[Math.floor(G.now(S) / 12000) % lines.length];
    let h = `<div class="card"><div class="mon">
      <img class="portrait" src="assets/pmd/0373_portrait.png" alt="">
      <div class="grow"><div class="who">阿特拉斯 <span class="tag">暴飞龙 ♂</span></div>
      <div class="bubble" style="margin-top:4px">${esc(line)}</div></div></div></div>`;

    // 出行
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
      h += `<button data-act="tripGo" class="gold">让他出发</button>
        <button data-act="tripClear">清空清单</button>`;
    }
    h += `</div>`;

    // 正在制作
    const craft = S.atlas.craft;
    h += `<div class="card"><h4>制作间</h4>`;
    if (craft) {
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
          <div class="row2"><span class="grow"><b>${esc(it.name)}</b> <span class="tag">Lv.${lv}/${max}</span>
            <span class="tag">${esc(cat)}</span>
            <span class="tag">区域 ${it.region || 1}</span></span></div>
          <table class="simple" style="margin-top:2px">
            ${lv > 0 ? `<tr><td class="sub">现在</td><td>${esc(nowEff)}</td></tr>` : ""}
            ${nextEff ? `<tr><td class="sub">${lv > 0 ? "再做一级（Lv." + (lv + 1) + "）" : "做出来（Lv.1）"}</td><td class="gold">${esc(nextEff)}</td></tr>` : ""}
            ${lv < max ? `<tr><td class="sub">升满（Lv.${max}）</td><td class="sub">${esc(topEff)}</td></tr>` : ""}
          </table>
          <div class="sub" style="margin-top:4px">${esc(it.desc || "")}</div>
          <div class="sub" style="color:#ffc98a">阿特拉斯说：${esc(it.flavor || "")}</div>
          <div class="sub" style="margin-top:4px">材料：${cost}　耗时 ${G.time(it.craftTime)}</div>
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
    let h = `<div class="card"><h4>移民（转世）</h4>
      <div class="sub">在 ${esc(region.name)} 的常客全部解锁后，付一笔移民费就能搬到下一个区域。
      离开会清空宝可元和库存，但天赋、配方、道具、图鉴、常客好感都会留下。</div>
      <div class="sub" style="margin-top:4px">常客 ${chk.progress.done}/${chk.progress.total}　移民费 ${money(chk.cost)}　
        本次可得天赋点 <b>${tp}</b>（本区域收入 ${money(S.stats.revenueRegion)}）</div>
      <div style="margin-top:6px">
        <button class="gold" data-act="migrate" ${chk.ok ? "" : "disabled"}>
          ${chk.hasNext ? "搬到「" + esc(chk.next.name) + "」" : "已经是最后一片田了"}
        </button>
        ${chk.ok ? "" : `<span class="sub">${!chk.allDone ? "常客还没全解锁。" : !chk.moneyOk ? "钱还不够。" : ""}</span>`}
      </div></div>`;

    h += `<div class="card"><h4>天赋点：${S.talentPoints}</h4>
      <div class="sub">已经花掉 ${S.talentSpent} 点。天赋永久生效，移民不会清空。</div></div>`;

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
    let h = `<div class="card"><h4>${icon("dex")}树果图鉴 ${known}/${G.BERRIES.length}</h4>
      <div class="sub">见过就点亮。种过、买过种子、或者阿特拉斯带回来的都算。</div></div>`;
    h += `<div class="dex-grid">`;
    G.BERRIES.forEach((b) => {
      const seen = S.dex[b.id];
      h += `<div class="dex-cell ${seen ? "" : "unknown"}" title="${esc(seen ? b.zh + "　" + b.flavor + "　" + b.firmnessCn + "　生长" + b.growHours + "h　果₽" + b.basePrice : "你还没见过这种树果")}">
        <img src="${b.icon}" alt=""><div>${seen ? esc(b.zh) : "？？？"}</div>
        ${seen ? `<div class="flavor-${b.flavor}">${b.flavor}</div>` : ""}
      </div>`;
    });
    h += `</div>`;

    h += `<div class="card" style="margin-top:8px"><h4>${icon("regulars")}常客图鉴</h4><div class="dex-grid">`;
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
        <li><b>研发</b>：在${go("lab", "研发")}页勾几样<b>底料</b>（面粉 / 鲜奶 / 黄油 / 砂糖），
          再选一种树果决定口味。底料组合决定做出来是什么东西，香料决定味道合不合。
          搭配不对就是一份失败品——素材和钱照样打水漂，这是实验的代价。</li>
        <li><b>移民</b>：把一片区域的常客全部解锁，付移民费搬走，拿天赋点。天赋永久生效。</li>
      </ol>
      <div class="sub">快捷键：W 全部浇水、H 全部收获、空格 叫卖。进度自动保存在浏览器里，关掉页面也在跑（默认最多结算 4 小时）。</div>
      </div>
      <div class="card"><h4>研发的搭配表</h4>
      <div class="sub">底料组合是固定的一张表，得自己试出来（或者看这里）：</div>
      <table class="simple">
        ${(G.RESEARCH_COMBOS || []).map((c) => `<tr><td>${esc(c.hint)}</td><td class="sub">区域 ${c.region} 解锁</td></tr>`).join("")}
      </table>
      <div class="sub" style="margin-top:6px">香料（月见草籽 / 岩盐花 / 火口椒 / 铁壳果 / 霜苔 / 暮色李）是可选的：
      配上对的味道会多提一档，配错了整锅就废了。每个香料适合和不适合什么味道，在${go("store", "仓库")}里能看到。</div>
      <div class="sub" style="margin-top:4px">研发出来的配方会出现在${go("kitchen", "加工")}页，之后照常用树果做，不再消耗素材。</div>
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
  // 手上所有东西一览：树果 / 商品 / 材料 / 素材 / 失败品。
  // 素材是这里的重点 —— 它只有在仓库里才看得到味道和用途。
  function findRow(f, n) {
    return `<div class="list-item">
      <img class="micon" src="assets/find/${f.id}.png" alt="">
      <span class="grow">${esc(f.name)}
        <span class="tag">${esc(G.FIND_ROLE_LABEL[f.role] || "素材")}</span>
        <span class="tag flavor-tag">${esc(f.flavor)}</span>
        <span class="sub">${esc(f.use)}</span></span>
      <span>×${int(n)}</span>
      <span class="sub">单价 ${money(f.price)}</span>
      <button class="small" data-act="sellFind" data-p='${attr({ id: f.id, n: 1 })}'>卖1</button>
      <button class="small" data-act="sellFind" data-p='${attr({ id: f.id, n: 9999 })}'>卖光</button>
      <button class="small danger" data-act="dropFind" data-p='${attr({ id: f.id })}' title="丢掉，不换钱">丢</button>
    </div>`;
  }

  function renderStore() {
    let h = "";
    const findIds = Object.keys(S.finds).filter((k) => S.finds[k] >= 1);
    h += `<div class="card"><h4>素材（${findIds.length} 种）</h4>
      <div class="sub">都是阿特拉斯出门带回来的。攒够几样就能去${go("lab", "研发")}页搭配新配方——
      底料决定做出来是什么，香料决定味道合不合。</div>`;
    if (!findIds.length) {
      h += `<div class="sub">还没有素材。让阿特拉斯多出门几趟（${go("atlas", "阿特拉斯")}页）。</div>`;
    } else {
      findIds.sort((a, b) => G.FIND_BY_ID[a].price - G.FIND_BY_ID[b].price).forEach((id) => {
        h += findRow(G.FIND_BY_ID[id], S.finds[id]);
      });
    }
    h += `</div>`;

    if (S.waste) {
      h += `<div class="card"><h4>失败品</h4>
        <div class="sub">${esc(G.WASTE.desc)}</div>
        <div class="list-item">
          <span class="grow">失败品 <span class="sub">${esc(G.WASTE.use)}</span></span>
          <span>×${int(S.waste)}</span>
          <span class="sub">单价 ${money(G.WASTE.price)}</span>
          <button class="small" data-act="sellWaste" data-p='${attr({ n: 1 })}'>卖1</button>
          <button class="small" data-act="sellWaste" data-p='${attr({ n: 9999 })}'>卖光</button>
          <button class="small danger" data-act="dropWaste" data-p='${attr({ n: 9999 })}'>丢</button>
        </div></div>`;
    }

    const matIds = Object.keys(S.materials).filter((k) => S.materials[k] >= 1);
    h += `<div class="card"><h4>材料（${matIds.length} 种）</h4>
      <div class="sub">阿特拉斯做道具用的。除了给他打东西，也可以按六成价卖掉。</div>`;
    if (!matIds.length) h += `<div class="sub">仓库里没有材料。</div>`;
    matIds.sort((a, b) => (G.MATERIAL_BY_ID[a] || {}).price - (G.MATERIAL_BY_ID[b] || {}).price)
      .forEach((id) => {
        const m = G.MATERIAL_BY_ID[id];
        if (!m) return;
        const p = G.engine.materialSellPrice(S, m);
        h += `<div class="list-item">
          <img class="micon" src="assets/mat/${m.id}.png" alt="">
          <span class="grow">${esc(m.name)} <span class="sub">${esc(m.desc)}</span></span>
          <span>×${int(S.materials[id])}</span>
          <span class="sub">单价 ${money(p)}</span>
          <button class="small" data-act="sellMaterial" data-p='${attr({ m: id, n: 1 })}'>卖1</button>
          <button class="small" data-act="sellMaterial" data-p='${attr({ m: id, n: 9999 })}'>卖光</button>
          <button class="small danger" data-act="dropMaterial" data-p='${attr({ m: id, n: 9999 })}'>丢</button>
        </div>`;
      });
    h += `</div>`;

    const berryIds = Object.keys(S.berries).filter((k) => S.berries[k] >= 1);
    h += `<div class="card"><h4>树果（${berryIds.length} 种）</h4>`;
    if (!berryIds.length) h += `<div class="sub">还没有收获的树果。</div>`;
    berryIds.sort((a, b) => G.BERRY_BY_ID[b].basePrice - G.BERRY_BY_ID[a].basePrice).forEach((id) => {
      const b = G.BERRY_BY_ID[id];
      h += `<div class="list-item">
        <img src="${b.icon}" alt="">
        <span class="grow flavor-${b.flavor}">${esc(b.zh)} <span class="tag">${b.flavor}</span></span>
        <span>×${int(S.berries[id])}</span>
        <span class="sub">单价 ${money(G.berrySellPrice(S, b))}</span>
        <button class="small" data-act="sellBerry" data-p='${attr({ id: +id, n: 1 })}'>卖1</button>
        <button class="small" data-act="sellBerry" data-p='${attr({ id: +id, n: 9999 })}'>卖光</button>
      </div>`;
    });
    h += `</div>`;

    const keys = Object.keys(S.products).filter((k) => S.products[k] >= 1);
    h += `<div class="card"><h4>商品（${keys.length} 种）</h4>`;
    if (!keys.length) h += `<div class="sub">还没有加工出来的商品。</div>`;
    keys.sort().forEach((k) => {
      const parts = k.split("|");
      const r = G.RECIPE_BY_ID[parts[0]];
      const b = G.BERRY_BY_ID[+parts[1]];
      if (!r || !b) return;
      h += `<div class="list-item">${G.productIcon(r, b)}
        <span class="grow">${esc(G.productName(r, b))}</span>
        <span>×${int(S.products[k])}</span>
        <span class="sub">市场价 ${money(G.marketPrice(S, r, b))}</span>
        <button class="small" data-act="sellProduct" data-p='${attr({ k: k, n: 1 })}'>卖1</button>
        <button class="small" data-act="sellProduct" data-p='${attr({ k: k, n: 9999 })}'>卖光</button>
      </div>`;
    });
    h += `</div>`;
    return h;
  }

  // ---------------- 研发 ----------------
  function renderLab() {
    let h = "";
    const owned = Object.keys(S.finds).filter((k) => S.finds[k] >= 1);
    // 研发配方是按需生成的，所以"学过几个"直接数存档里的 id
    const learned = Object.keys(S.recipes).filter((id) => G.RESEARCH_ID_RE.test(id)).length;

    h += `<div class="card"><h4>研发台</h4>
      <div class="sub">勾几样<b>底料</b>（面粉 / 哞哞鲜奶 / 黄油 / 砂糖），再配一种<b>树果</b>决定口味。
      想让味道更冲就再加<b>一样香料</b>——配得上会多提一档，配错了整锅就废了。</div>
      <div class="sub" style="margin-top:4px">已经研发出来的配方：<b>${learned}</b> 个${
        S.waste ? `　失败品：${int(S.waste)} 份` : ""}</div>
      <div class="sub" style="margin-top:4px">研发出来的配方会在${go("kitchen", "加工")}页出现，之后照常用树果做。</div>
    </div>`;

    if (!owned.length) {
      h += `<div class="card"><h4>手上没有素材</h4>
        <div class="sub">让${go("atlas", "阿特拉斯")}出门跑几趟，回来会带素材。底料常见，香料要碰运气。</div></div>`;
      return h;
    }

    // ① 选树果
    const bIds = Object.keys(S.berries).filter((k) => S.berries[k] >= 1)
      .sort((a, b) => G.BERRY_BY_ID[a].flavor.localeCompare(G.BERRY_BY_ID[b].flavor)
        || G.BERRY_BY_ID[b].basePrice - G.BERRY_BY_ID[a].basePrice);
    if (!pick.labBerry || !S.berries[pick.labBerry]) pick.labBerry = bIds.length ? +bIds[0] : null;
    h += `<div class="card"><h4>① 选树果（决定口味）</h4>`;
    if (!bIds.length) {
      h += `<div class="sub">手上没有树果，先去收一批。</div>`;
    } else {
      h += `<div class="row2" style="flex-wrap:wrap">`;
      bIds.forEach((id) => {
        const b = G.BERRY_BY_ID[id];
        const on = pick.labBerry === +id ? "gold" : "";
        h += `<button class="${on}" data-act="labBerry" data-p='${attr({ b: +id })}' title="×${int(S.berries[id])}">${esc(b.zh)}·${b.flavor}</button>`;
      });
      h += `</div>`;
    }
    h += `</div>`;

    // ② 勾素材
    h += `<div class="card"><h4>② 勾素材（底料最多三样，香料最多一样）</h4><div class="row2" style="flex-wrap:wrap">`;
    G.FINDS.filter((f) => S.finds[f.id] >= 1).forEach((f) => {
      const on = (pick.labFinds || []).indexOf(f.id) >= 0;
      h += `<button class="${on ? "gold" : ""}" data-act="labFind" data-p='${attr({ id: f.id })}'
        title="${esc(f.use)}">${esc(f.name)} ×${int(S.finds[f.id])}</button>`;
    });
    h += `</div>`;
    if ((pick.labFinds || []).length) {
      h += `<button class="small" data-act="labClear" style="margin-top:6px">清空选择</button>`;
    }
    h += `</div>`;

    // ③ 预告
    const berry = S.berries[pick.labBerry] ? G.BERRY_BY_ID[pick.labBerry] : null;
    const chosen = (pick.labFinds || []).filter((id) => S.finds[id] >= 1);
    h += `<div class="card"><h4>③ 会做出什么</h4>`;
    if (!berry || !chosen.length) {
      h += `<div class="sub">选好树果和素材，这里会先算给你看。</div></div>`;
      return h;
    }
    const ev = G.evaluateResearch(S, chosen, berry.flavor);
    const names = chosen.map((id) => G.FIND_BY_ID[id].name).join(" + ");
    if (ev.kind === "invalid") {
      h += `<div class="sub" style="color:#9fa286">${esc(names)} + ${esc(berry.zh)}（${berry.flavor}）</div>
        <div class="sub" style="color:#ffc98a;margin-top:4px">${esc(ev.why)}</div>
        <div class="sub" style="margin-top:4px">这样不会消耗任何东西，换个搭配吧。</div></div>`;
      return h;
    }
    const cost = ev.cost;
    h += `<div class="sub">${esc(names)} + ${esc(berry.zh)}（${esc(berry.flavor)}）</div>`;
    if (ev.kind === "waste") {
      h += `<div class="sub" style="color:#cf5a41;margin-top:4px">会煮成失败品：${esc(ev.why)}</div>
        <div class="sub" style="margin-top:4px">成功率没有，素材和钱都会打水漂。要试就试吧。</div>`;
    } else if (ev.kind === "known") {
      h += `<div class="sub" style="margin-top:4px">这个搭配已经研发过了。换个组合，或者去${go("kitchen", "加工")}页做它。</div>`;
    } else {
      const rc = G.RECIPE_BY_ID[ev.id] || G.makeResearchRecipe(ev.combo.cat, berry.flavor, ev.spice ? ev.spice.id : null, ev.good);
      h += `<div class="sub" style="margin-top:4px;color:#f0c04a">→ ${esc(rc.name)}
        （${esc(ev.catName)}　倍率 ×${rc.mult}　要 ${rc.needCount} 颗${esc(berry.flavor)}味树果）</div>
        <div class="sub" style="margin-top:4px">${esc(ev.why)}</div>`;
    }
    h += `<div class="sub" style="margin-top:6px">研发费 ${money(cost)}${
      S.money < cost ? '<span style="color:#cf5a41">（钱不够）</span>' : ""}</div>`;
    h += `<button class="gold" data-act="labGo" style="margin-top:6px">开始研发</button>`;
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
    morph($("tabs"), TABS.map((t) =>
      `<button data-act="tab" data-p='${attr({ t: t.id })}' class="${UI.tab === t.id ? "on" : ""}" title="${t.name}">${icon("tab-" + t.id)}${t.name}</button>`
    ).join(""));
  }

  // 用户正在操作表单控件时不重建 DOM：
  // 手机上的原生下拉一被销毁就会立刻关闭，表现为"选不中"。
  function formBusy() {
    const body = $("tabBody");
    const el = document.activeElement;
    if (el && body.contains(el) && /^(SELECT|INPUT|TEXTAREA)$/.test(el.tagName)) return true;
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

  UI.frame = function () {
    const now = G.now(S);
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
      const v = G.clickSellValue(S);
      S.money += v;
      S.stats.revenueRegion += v;
      S.stats.revenueTotal += v;
      S.stats.clicks++;
      G.addLog(S, (G.ATLAS_LINES && G.ATLAS_LINES.click ? G.ATLAS_LINES.click[S.stats.clicks % G.ATLAS_LINES.click.length] : "他叫卖了一声。"), "atlas");
      UI.toast("+" + money(v));
    },
    sellBerry: (p) => { const v = G.engine.sellBerry(S, p.id, p.n); if (v) UI.toast("+" + money(v)); },

    // ---- 仓库 ----
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

    // ---- 研发 ----
    labBerry: (p) => { pick.labBerry = p.b; UI.markDirty(); },
    labFind: (p) => {
      pick.labFinds = pick.labFinds || [];
      const i = pick.labFinds.indexOf(p.id);
      if (i >= 0) pick.labFinds.splice(i, 1);
      else pick.labFinds.push(p.id);
      UI.markDirty();
    },
    labClear: () => { pick.labFinds = []; UI.markDirty(); },
    labGo: () => {
      const ids = (pick.labFinds || []).slice();
      const r = G.engine.research(S, ids, pick.labBerry);
      if (!r.ok) { UI.toast(r.why); return; }
      if (r.waste) {
        UI.toast("煮废了，得到一份失败品");
        if (G.ATLAS_LINES && G.ATLAS_LINES.idle) UI.bubble("……这锅我认栽。倒了吧，别留着占地方。");
      } else {
        UI.toast("研发出「" + r.recipe.name + "」");
      }
      // 用掉的素材从选择里清掉
      pick.labFinds = ids.filter((id) => S.finds[id] > 0);
      UI.markDirty();
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
    closeOverlay: () => UI.closeOverlay()
  };

  UI.bubble = function (text) {
    G.addLog(S, text, "atlas");
  };

  document.addEventListener("click", (e) => {
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

  // 表单控件交互期间锁住重建，具体原因见 formBusy()
  document.addEventListener("pointerdown", (e) => {
    const el = e.target;
    const tag = el && el.tagName;
    if (tag === "SELECT" || tag === "INPUT" || tag === "TEXTAREA") formLock = performance.now();
    else if (!el.closest || !el.closest("#tabBody")) formLock = 0;   // 点了别处就解锁
  }, true);
  document.addEventListener("blur", (e) => {
    const tag = e.target && e.target.tagName;
    if (tag === "SELECT" || tag === "INPUT" || tag === "TEXTAREA") formLock = 0;
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

  UI.openSettings = function () {
    UI.openOverlay(`
      <h3>${icon("settings")}设置与存档</h3>
      <div class="sub">存档自动保存在这个浏览器里（localStorage）。换设备就复制下面的字符串。</div>
      <div class="row2" style="margin:8px 0">
        <button data-act="closeOverlay">关闭</button>
        <button data-act="exportSave">导出存档</button>
        <button data-act="importSave">导入存档</button>
        <button class="danger" data-act="resetSave">重新开始</button>
      </div>
      <textarea id="saveBox" placeholder="存档字符串会出现在这里"></textarea>
      <div class="sub" id="saveMsg" style="margin-top:6px"></div>
      <div class="card" style="margin-top:10px">
        <h4>统计</h4>
        <table class="simple">
          <tr><td>游戏时长</td><td>${G.time(S.playTime)}</td></tr>
          <tr><td>累计收获</td><td>${G.fmt(S.stats.harvested)} 个</td></tr>
          <tr><td>累计加工</td><td>${G.fmt(S.stats.crafted)} 次</td></tr>
          <tr><td>累计卖出</td><td>${G.fmt(S.stats.sold)} 件</td></tr>
          <tr><td>累计收入</td><td>${money(S.stats.revenueTotal)}</td></tr>
          <tr><td>移民次数</td><td>${S.stats.prestige}</td></tr>
          <tr><td>阿特拉斯出门</td><td>${S.stats.trips} 次</td></tr>
        </table>
      </div>
    `);
  };

  ACT.exportSave = () => {
    const box = $("saveBox");
    box.value = G.exportSave(S);
    box.select();
    $("saveMsg").textContent = "已导出。复制走这段字符串。";
  };
  ACT.importSave = () => {
    const box = $("saveBox");
    try {
      const s = G.importSave(box.value);
      UI.replaceState(s);
      $("saveMsg").textContent = "导入成功。";
      UI.closeOverlay();
      UI.forceRender();
    } catch (err) {
      $("saveMsg").textContent = "导入失败：" + err.message;
    }
  };
  ACT.resetSave = () => {
    if (!confirm("确定重新开始？当前进度会消失。")) return;
    G.clearSave();
    UI.replaceState(G.newState());
    UI.closeOverlay();
    UI.forceRender();
  };

  UI.replaceState = function (s) { S = s; UI.state = s; };

  UI.init = function (state) {
    S = state;
    UI.state = state;
    UI.tab = "market";
    pick.seed = null;
    UI.forceRender();
  };

  G.UI = UI;
})();
