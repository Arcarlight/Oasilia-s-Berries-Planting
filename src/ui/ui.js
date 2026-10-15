// UI：所有渲染与交互。引擎不碰 DOM，这里不写数值逻辑。
window.G = window.G || {};
(function () {
  const UI = {};
  let S = null;
  let dirty = true;
  let lastTabRender = 0;

  const TABS = [
    { id: "market", name: "市场" },
    { id: "kitchen", name: "加工" },
    { id: "regulars", name: "常客" },
    { id: "shop", name: "商店" },
    { id: "atlas", name: "阿特拉斯" },
    { id: "talents", name: "天赋" },
    { id: "dex", name: "图鉴" },
    { id: "help", name: "说明" }
  ];

  const pick = { seed: null, recipe: null, regularFor: {} };

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s === undefined || s === null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function attr(obj) { return esc(JSON.stringify(obj)); }
  // 库存一律按整数显示：果子/种子/商品/材料都是离散的
  function int(n) { const v = Math.floor(n || 0); return v > 0 ? v : 0; }
  function money(n) { return "₽" + G.fmt(n); }

  UI.markDirty = function () { dirty = true; };
  UI.toast = function (text) {
    const wrap = $("toastWrap");
    const d = document.createElement("div");
    d.className = "toast";
    d.textContent = text;
    wrap.appendChild(d);
    setTimeout(() => d.remove(), 2700);
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
    box.innerHTML = html;
    const ripe = S.plots.filter((p) => p.ripe).length;
    $("uiPlotInfo").textContent = "（" + S.plots.length + "/" + (S.plots.length + (cap - bought)) + " 块，成熟 " + ripe + "）";
  }

  function renderSeedPicker() {
    const box = $("uiSeedPicker");
    const ids = Object.keys(S.seeds).filter((id) => S.seeds[id] > 0)
      .map(Number).sort((a, b) => G.BERRY_BY_ID[a].tier - G.BERRY_BY_ID[b].tier || a - b);
    if (!ids.length) {
      box.innerHTML = `<div class="sub">没有种子了。去「商店」买一些，或者让阿特拉斯出门碰碰运气。</div>`;
      return;
    }
    if (!pick.seed || !(S.seeds[pick.seed] > 0)) pick.seed = ids[0];
    box.innerHTML = `<div class="sub" style="margin-bottom:4px">手上的种子（点一下选中，再点空地播种）</div>` +
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
    if (!keys.length) h += `<div class="sub">还没有加工出来的商品。去「加工」看看。</div>`;
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
        <span class="grow">${esc(r.name)} <span class="sub">（${esc(b.zh)}）</span>
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
        <span class="grow">${esc(r.name)}（${esc(b.zh)}）</span>
        <span class="sub">${left.toFixed(1)}s</span>
        <div class="bar-outer" style="width:120px"><i style="width:${pctv.toFixed(0)}%"></i></div>
      </div>`;
    });
    h += `</div>`;

    const unlocked = G.engine.unlockedRecipes(S);
    if (!unlocked.length) {
      h += `<div class="card"><h4>还没有配方</h4><div class="sub">去「商店 → 配方」买一个。最先该买的是「辣味果酱」。</div></div>`;
      return h;
    }
    if (!pick.recipe || !S.recipes[pick.recipe]) pick.recipe = unlocked[0].id;

    h += `<div class="card"><h4>选择配方</h4><div class="row2" style="flex-wrap:wrap">`;
    unlocked.forEach((r) => {
      const on = pick.recipe === r.id ? "gold" : "";
      h += `<button class="${on}" data-act="recipe" data-p='${attr({ r: r.id })}'>${esc(r.name)}</button>`;
    });
    h += `</div></div>`;

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
        h += `<div class="sub" style="margin-top:6px">库存不够（要 ${recipe.needCount} 个）。能做这个配方的是这些，去「商店」买种子种起来：</div>`;
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
            去「市场」页把「摊位自动出货」的保留量调高，或者直接关掉它。</div>`;
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

    const locked = G.RECIPES.filter((r) => !S.recipes[r.id] && r.region <= S.maxRegion);
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
             ${S.helpers.some((x) => x.dex === reg.dex) ? "disabled" : ""}>${S.helpers.some((x) => x.dex === reg.dex) ? "已在帮忙" : "请来帮忙（₽" + G.fmt(Math.round(5000 * Math.pow(3.2, S.region - 1) * (1 + S.helpers.length))) + "）"}</button>
             ${S.helpers.some((x) => x.dex === reg.dex) ? `<button class="small danger" data-act="fire" data-p='${attr({ dex: reg.dex })}'>让他回去</button>` : ""}` : ""}
        </div>
      </div></div>`;
    });


    // 材料（杂货铺）
    h += `<div class="card"><h4>杂货铺 · 材料（代购，贵）</h4>
      <div class="sub">直接买能立刻拿到，但比让阿特拉斯出门贵得多。他出门还会带点别的东西回来。</div>`;
    (G.MATERIALS || []).forEach((m) => {
      const price = Math.round(m.price * 2.6);
      h += `<div class="list-item"><span class="grow">${esc(m.name)} <span class="sub">${esc(m.desc || "")}</span></span>
        <span class="sub">库存 ${int(S.materials[m.id])}</span>
        <span>${money(price)}</span>
        <button class="small" data-act="buyMaterial" data-p='${attr({ m: m.id, n: 1 })}' ${S.money < price ? "disabled" : ""}>买1</button>
        <button class="small" data-act="buyMaterial" data-p='${attr({ m: m.id, n: 10 })}' ${S.money < price * 10 ? "disabled" : ""}>买10</button>
      </div>`;
    });
    h += `</div>`;

    // 配方
    const locked = G.RECIPES.filter((r) => !S.recipes[r.id] && r.region <= S.maxRegion);
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
      h += `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:2px 10px;margin-top:4px">`;
      (G.MATERIALS || []).forEach((m) => {
        const staged = S._tripWant && S._tripWant[m.id];
        h += `<label class="list-item" style="border:none;padding:2px 0;cursor:pointer" title="${esc(m.desc || "")}">
          <input type="checkbox" data-act="tripToggle" data-p='${attr({ m: m.id })}' ${staged ? "checked" : ""}>
          <span class="grow">${esc(m.name)}</span>
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
    let h = `<div class="card"><h4>树果图鉴 ${known}/${G.BERRIES.length}</h4>
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

    h += `<div class="card" style="margin-top:8px"><h4>常客图鉴</h4><div class="dex-grid">`;
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
        <li><b>买种子</b>：去「商店」，买你现在买得起的最贵的树果种子。</li>
        <li><b>播种</b>：点左上的空地，或者点种子旁边的「全种」。</li>
        <li><b>买地</b>：田地里的虚线格是空位，点一下就用宝可元买一块新地（每区最多买到基础数量的两倍）。</li>
        <li><b>浇水</b>：点田里正在长的作物，或者用底下的「浇水（全部田）」。浇水能明显加快生长。</li>
        <li><b>收获</b>：成熟后点一下，或者「收获全部」。</li>
        <li><b>卖</b>：生果在「市场」直接卖；但先看看「加工」——同一批树果做成商品能多卖好几倍。</li>
        <li><b>学配方</b>：配方要花钱学。学会之后，投入越贵的树果，商品越值钱。</li>
        <li><b>常客</b>：每位常客只爱一种口味。把对应口味的商品交给他，售价 +50%，好感还会涨。</li>
        <li><b>道具</b>：材料可以让阿特拉斯去杂货铺代购，也可以让他出远门买（便宜，要等）。材料齐了他会亲手做。</li>
        <li><b>帮手</b>：好感够的常客可以请来帮忙，自动收、自动补种、自动浇水。</li>
        <li><b>移民</b>：把一片区域的常客全部解锁，付移民费搬走，拿天赋点。天赋永久生效。</li>
      </ol>
      <div class="sub">快捷键：W 全部浇水、H 全部收获、空格 叫卖。进度自动保存在浏览器里，关掉页面也在跑（默认最多结算 4 小时）。</div>
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

  const RENDERERS = {
    market: renderMarket, kitchen: renderKitchen, regulars: renderRegulars,
    shop: renderShop, atlas: renderAtlas, talents: renderTalents,
    dex: renderDex, help: renderHelp
  };

  function renderTabs() {
    $("tabs").innerHTML = TABS.map((t) =>
      `<button data-act="tab" data-p='${attr({ t: t.id })}' class="${UI.tab === t.id ? "on" : ""}">${t.name}</button>`
    ).join("");
  }

  function renderTabBody(force) {
    const now = G.now(S);
    if (!force && !dirty && now - lastTabRender < 400) return;
    lastTabRender = now;
    dirty = false;
    const fn = RENDERERS[UI.tab] || renderMarket;
    const body = $("tabBody");
    const scroll = body.scrollTop;
    body.innerHTML = fn();
    body.scrollTop = scroll;
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
    box.innerHTML = S.log.slice(0, 60).map((e) =>
      `<div class="entry ${e.kind || ""}"><span class="t">${new Date(e.t).toLocaleTimeString("zh-CN", { hour12: false })}</span>${esc(e.text)}</div>`
    ).join("");
  }

  function renderHint() {
    const region = G.regionOf(S);
    const ripe = S.plots.filter((p) => p.ripe).length;
    const empty = S.plots.filter((p) => !p.berry).length;
    let hint = region.tip || "";
    if (ripe) hint = "有 " + ripe + " 块田熟了，先收。";
    else if (empty && Object.keys(S.seeds).some((k) => S.seeds[k] > 0)) hint = "还有 " + empty + " 块空地，把种子种下去。";
    else if (S.craftQueue.length < G.engine.craftSlots(S) && Object.keys(S.berries).length) hint = "加工台空着，做点商品比直接卖生果赚得多。";
    $("uiHint").textContent = hint;
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
    const t = e.target.closest("[data-act='picksell']");
    if (!t) return;
    const p = JSON.parse(t.dataset.p);
    pick.regularFor[p.k] = t.value ? +t.value : null;
    UI.markDirty();
  });

  // 设置 / 存档弹层
  UI.closeOverlay = function () { $("overlay").className = "hidden"; $("overlay").innerHTML = ""; };

  UI.openSettings = function () {
    const ov = $("overlay");
    ov.className = "";
    ov.innerHTML = `<div class="modal">
      <h3>设置与存档</h3>
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
    </div>`;
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
