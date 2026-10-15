// 素材：阿特拉斯出门时捡回来、顺手买回来的零碎东西。
//
// 它和另外两类东西都不一样，别搞混：
//   树果   —— 种出来的，是原料
//   材料   —— 阿特拉斯做道具用的（木料/铜锭/天穹石…），在「阿特拉斯」页采买
//   素材   —— 只能靠他出门带回来，进「仓库」，出路有三条：卖掉换钱、丢掉、或者去「研发」做实验
//
// 研发是一套小型「搭配实验」，不是"素材换配方"：
//   · 底料：面粉 / 哞哞鲜奶 / 黄油 / 砂糖 —— 决定做出来是哪一类
//   · 香料：月见草籽 / 岩盐花 / 火口椒 / 铁壳果 / 霜苔 / 暮色李 —— 只负责味道
//   · 树果：提供口味（辣涩甜苦酸）；香料配得上就加分，配不上就毁锅
//   底料组合对不上、料放太多、香料放两种、香料和果子味道打架 —— 都会煮出一份「失败品」。
window.G = window.G || {};
(function () {
  // role: base 面粉 / liquid 鲜奶 / fat 黄油 / sweet 砂糖 / spice 香料
  const FINDS = [
    // ── 底料：做甜品离不了，出门常带 ──
    {
      id: "flour", name: "面粉", role: "base", flavor: "无味", price: 400, region: 1, tier: "staple",
      desc: "繁盛村磨坊里磨出来的细面，装在扎口的粗布袋里，拎起来轻飘飘的。",
      use: "底料。蛋糕、挞、面包的架子都靠它撑起来。"
    },
    {
      id: "moomoo", name: "哞哞鲜奶", role: "liquid", flavor: "醇厚", price: 900, region: 1, tier: "staple",
      desc: "奶牛宝可梦当天挤的奶，瓶口封着一层厚厚的奶皮，倒出来挂壁。",
      use: "底料。和面粉调成面糊，和糖打出奶油，和油搅成稠浆。"
    },
    {
      id: "butter", name: "黄油", role: "fat", flavor: "油润", price: 2000, region: 2, tier: "staple",
      desc: "鲜奶搅出来的整块黄油，用油纸包着，指甲一按就陷下去一个坑。",
      use: "底料。起酥全靠它，和糖一起能压成块。"
    },
    {
      id: "sugar", name: "砂糖", role: "sweet", flavor: "纯甜", price: 4500, region: 3, tier: "staple",
      desc: "结晶细匀的白糖，抓一把在手里会从指缝往下漏。",
      use: "底料。压住酸涩、托住果香，少了它什么都立不住。"
    },

    // ── 香料：只改味道，不放也行。配得上加分，配不上直接毁一锅 ──
    {
      id: "moonherb", name: "月见草籽", role: "spice", flavor: "清冽", price: 9000, region: 3, tier: "rare",
      affix: "月见", good: ["酸", "涩", "甜"], bad: ["辣"],
      desc: "只在夜里开花的草，白天去看就是一丛普通叶子。籽粒攥在手里凉丝丝的。",
      use: "配酸、涩、甜的果子最好；碰上辣味会苦得发涩。"
    },
    {
      id: "saltbloom", name: "岩盐花", role: "spice", flavor: "咸鲜", price: 18000, region: 4, tier: "rare",
      affix: "盐花", good: ["甜", "苦"], bad: ["酸"],
      desc: "盐风镇礁石缝里结出来的盐晶，风一吹就长一层，形状像开花。",
      use: "甜的配它更甜，苦的配它更厚；配酸味会腥。"
    },
    {
      id: "cinderpepper", name: "火口椒", role: "spice", flavor: "辛辣", price: 36000, region: 5, tier: "rare",
      affix: "火口", good: ["辣", "苦"], bad: ["甜"],
      desc: "长在温泉火口边上的小辣椒，个头越小吃着越冲。",
      use: "专给辣味和苦味加一层火气；放进甜食里就是一场灾难。"
    },
    {
      id: "ironnut", name: "铁壳果", role: "spice", flavor: "涩口", price: 72000, region: 6, tier: "rare",
      affix: "铁壳", good: ["涩", "苦"], bad: ["甜", "酸"],
      desc: "壳硬到能崩牙的坚果，得拿锤子敲。他每次都要敲坏一个砧角。",
      use: "压进涩味和苦味里最搭；甜食会被它磨得发木。"
    },
    {
      id: "frostmoss", name: "霜苔", role: "spice", flavor: "冰凉", price: 150000, region: 7, tier: "rare",
      affix: "霜苔", good: ["酸", "涩"], bad: ["辣", "甜"],
      desc: "天顶山石背上的一层白苔，太阳晒不化，捏起来是干的。",
      use: "酸涩的配它清得干净；辣味和甜味碰上它只剩一股凉气。"
    },
    {
      id: "duskplum", name: "暮色李", role: "spice", flavor: "微酸", price: 320000, region: 8, tier: "rare",
      affix: "暮色", good: ["酸", "甜", "涩"], bad: ["苦"],
      desc: "傍晚才熟的野李，熟透了也还是紫黑色，看着并不起眼。",
      use: "提酸提香都行；丢进苦味里会又酸又苦，尝不出别的。"
    }
  ];

  G.FINDS = FINDS;
  G.FIND_BY_ID = {};
  FINDS.forEach((f) => { G.FIND_BY_ID[f.id] = f; });

  G.FIND_ROLE_NAME = { base: "底料", liquid: "底料", fat: "底料", sweet: "底料", spice: "香料" };
  G.FIND_ROLE_LABEL = { base: "面粉", liquid: "鲜奶", fat: "黄油", sweet: "砂糖", spice: "香料" };

  // 搭配表：底料（+最多一种香料）→ 品类。
  // need 是 role 的集合，顺序无关、必须完全吻合；表里没列到的组合就是废品。
  // region 是解锁区域：研发也是要跟着区域走的，不然开局就能钻出后期配方。
  G.RESEARCH_COMBOS = [
    { need: ["base", "liquid"], cat: "cake", region: 1, hint: "面粉 + 鲜奶  →  蛋糕" },
    { need: ["base", "fat"], cat: "tart", region: 2, hint: "面粉 + 黄油  →  挞" },
    { need: ["base", "sweet"], cat: "pie", region: 3, hint: "面粉 + 砂糖  →  树果派" },
    { need: ["liquid", "sweet"], cat: "poffin", region: 4, hint: "鲜奶 + 砂糖  →  宝芬" },
    { need: ["fat", "sweet"], cat: "choco", region: 5, hint: "黄油 + 砂糖  →  巧克力" },
    { need: ["liquid", "fat"], cat: "pudding", region: 6, hint: "鲜奶 + 黄油  →  布丁" },
    { need: ["sweet"], cat: "candy", region: 7, requireSpice: true, hint: "砂糖 + 一种香料  →  糖果" },
    { need: ["base", "liquid", "sweet"], cat: "roll", region: 8, hint: "面粉 + 鲜奶 + 砂糖  →  瑞士卷" },
    { need: ["base", "fat", "sweet"], cat: "cookie", region: 9, hint: "面粉 + 黄油 + 砂糖  →  曲奇" },
    { need: ["base", "liquid", "fat"], cat: "bread", region: 10, hint: "面粉 + 鲜奶 + 黄油  →  面包" }
  ];

  // 废品：搭配失败剩下的那一坨。能卖，但基本不值钱。
  G.WASTE = {
    id: "waste", name: "失败品", price: 30,
    desc: "一坨说不清是什么的东西，颜色也不太对。闻着还行，但没人愿意吃第二口。",
    use: "没别的用。卖了吧，三十块也是钱。"
  };

  const FLAVOR_KEY = { 辣: "spicy", 涩: "dry", 甜: "sweet", 苦: "bitter", 酸: "sour" };
  G.FLAVOR_KEY = FLAVOR_KEY;

  // 研发出来的东西不叫「甜味蛋糕」这种说明书名字，按味道起外号：
  //   普通版偏中性（偏甜、微苦），加了配对香料就往夸张里走（甜得掉牙、辣到冒烟）。
  G.FLAVOR_FUN = {
    辣: { mild: "微辣", rich: "辣到冒烟" },
    涩: { mild: "带点涩", rich: "涩得发麻" },
    甜: { mild: "偏甜", rich: "甜得掉牙" },
    苦: { mild: "微苦", rich: "苦得皱眉" },
    酸: { mild: "偏酸", rich: "牙软" }
  };
  // good = 香料和这个味道对得上（决定用夸张名还是中性名）
  G.researchName = function (flavor, catName, spice, good) {
    const fun = G.FLAVOR_FUN[flavor] || { mild: flavor, rich: flavor };
    if (!spice) return fun.mild + catName;
    return spice.affix + (good ? fun.rich : fun.mild) + catName;
  };

  // 香料是可选的修饰：先按底料（不含香料）查表。
  // 只有「砂糖 + 香料 → 糖果」这一条是反过来跟着香料走的。
  function comboOf(coreRoles, hasSpice) {
    const key = coreRoles.slice().sort().join("+");
    if (hasSpice) {
      const sp = G.RESEARCH_COMBOS.filter(
        (c) => c.requireSpice && c.need.slice().sort().join("+") === key)[0];
      if (sp) return sp;
    }
    return G.RESEARCH_COMBOS.filter(
      (c) => !c.requireSpice && c.need.slice().sort().join("+") === key)[0];
  }
  G.researchComboOf = comboOf;

  // ── 研发配方：按需生成 ───────────────────────────────────────────────────
  // 组合数 × 口味 × 香料 = 300 多个，没必要全部预建。真正被研发出来的时候才造，
  // 存档里只存一个 id；读档时用 hydrateResearch 按 id 复原。
  G.RESEARCH_ID_RE = /^res_([a-z]+)_([a-z]+)_([a-z]+)$/;
  const SPICE_BY_ID = {};
  FINDS.forEach((f) => { SPICE_BY_ID[f.id] = f; });

  G.makeResearchRecipe = function (catId, flavor, spiceId, good) {
    const id = "res_" + catId + "_" + FLAVOR_KEY[flavor] + "_" + (spiceId || "plain");
    if (G.RECIPE_BY_ID[id]) return G.RECIPE_BY_ID[id];
    good = !!good;
    const cat = (G.RECIPE_CATS || []).filter((c) => c.id === catId)[0];
    if (!cat) return null;
    const spice = spiceId && SPICE_BY_ID[spiceId] && SPICE_BY_ID[spiceId].role === "spice"
      ? SPICE_BY_ID[spiceId] : null;
    // 底料参考：能买到同品类普通配方就用它的颗数，研发专属品类则按品类自己推
    const base = (G.RECIPES || []).filter(
      (r) => r.cat === catId && r.flavor === flavor && !r.specialty && !r.research)[0];
    const needCount = base ? base.needCount + 1 : 4;
    const r = {
      id: id,
      name: G.researchName(flavor, cat.name, spice, good),
      cat: cat.id,
      catName: cat.name,
      unit: cat.unit,
      icon: cat.icon,
      flavor: flavor,
      needFlavor: flavor,
      needCount: needCount,
      minTier: 1,
      mult: Math.round(cat.mult * (good ? 1.5 : spice ? 1.35 : 1.3) * 100) / 100,
      time: Math.round(cat.time * 1.15),
      region: cat.region,
      cost: 0,
      specialty: false,
      research: true,
      spice: spice ? spice.id : null,
      needRoles: null,          // 加工时只吃树果，不再消耗素材（素材在研发那一步就花掉了）
      findCount: 0
    };
    G.RECIPES.push(r);
    G.RECIPE_BY_ID[id] = r;
    return r;
  };

  // 读档时把已研发的配方复原（存档只存了 id）
  G.hydrateResearch = function (state) {
    if (!state || !state.recipes) return;
    Object.keys(state.recipes).forEach((id) => {
      if (!G.RESEARCH_ID_RE.test(id)) return;
      const m = id.match(G.RESEARCH_ID_RE);
      const fl = flavorOfKey(m[2]);
      const sid = m[3] === "plain" ? null : m[3];
      const sp = sid ? SPICE_BY_ID[sid] : null;
      G.makeResearchRecipe(m[1], fl, sid, !!(sp && (sp.good || []).indexOf(fl) >= 0));
    });
  };

  function flavorOfKey(k) {
    return Object.keys(FLAVOR_KEY).filter((f) => FLAVOR_KEY[f] === k)[0] || "甜";
  }
  G.flavorOfKey = function (k) { return flavorOfKey(k); };

  // ── 搭配判定 ────────────────────────────────────────────────────────────
  // 返回：
  //   { kind:"recipe" }                      —— 能搭出一个配方（这次没做过）
  //   { kind:"known" }                       —— 这个搭配已经研发过了
  //   { kind:"waste" }                       —— 会煮成失败品（素材照样消耗）
  //   { kind:"invalid" }                     —— 连火都没点起来（不消耗）
  G.evaluateResearch = function (state, findIds, flavor) {
    const list = (findIds || []).map((id) => G.FIND_BY_ID[id]).filter(Boolean);
    const cores = list.filter((f) => f.role !== "spice");
    const spices = list.filter((f) => f.role === "spice");

    if (!cores.length && !spices.length) return { kind: "invalid", why: "一样都没放。" };
    if (cores.length > 3) return { kind: "invalid", why: "底料放太杂了，先减到三样以内。" };
    if (spices.length > 1) return { kind: "invalid", why: "两种香料一起下，味道会互相打架。" };

    const spice = spices[0] || null;
    const combo = comboOf(cores.map((f) => f.role), !!spice);
    if (!cores.length) {
      return { kind: "invalid", why: "光放香料和不起来，得先有底料。" };
    }
    if (!combo && cores.length < 2) {
      return { kind: "invalid", why: "至少放两样底料，单放一样和不起来。" };
    }

    if (!combo) {
      return { kind: "waste", spice: spice, why: "这几样底料凑在一起成不了型，煮出来是一锅糊。" };
    }
    if (state && (state.maxRegion || 1) < combo.region) {
      return {
        kind: "invalid", combo: combo, spice: spice,
        why: "这个搭配还太超前了（要走到区域 " + combo.region + " 才琢磨得出来）。"
      };
    }
    if (spice && (spice.bad || []).indexOf(flavor) >= 0) {
      return {
        kind: "waste", combo: combo, spice: spice,
        why: spice.name + "的" + spice.flavor + "味碰上" + flavor + "味果子，整锅都毁了。"
      };
    }
    const cat = (G.RECIPE_CATS || []).filter((c) => c.id === combo.cat)[0];
    const good = !!(spice && (spice.good || []).indexOf(flavor) >= 0);
    const id = "res_" + combo.cat + "_" + FLAVOR_KEY[flavor] + "_" + (spice ? spice.id : "plain");
    const known = !!(state && state.recipes[id]);
    const cost = G.researchCost(combo.cat, flavor, list.length, !!spice);
    return {
      kind: known ? "known" : "recipe",
      combo: combo, cat: cat, catName: cat ? cat.name : combo.cat, spice: spice, good: good,
      id: id, cost: cost,
      why: good
        ? spice.name + "正好压得住" + flavor + "味，能多提一档。"
        : (spice ? spice.name + "和" + flavor + "味不算最搭，但也毁不了锅。" : "稳妥的老搭配。")
    };
  };

  // 研发费：按该品类普通配方价推算，放的料越多越贵，加香料再加一档
  G.researchCost = function (catId, flavor, nIngredients, withSpice) {
    const base = (G.RECIPES || []).filter(
      (r) => r.cat === catId && r.flavor === flavor && !r.specialty && !r.research)[0];
    const cat = (G.RECIPE_CATS || []).filter((c) => c.id === catId)[0];
    const b = base ? base.cost : (cat ? Math.round(cat.mult * 260 * Math.pow(1.85, cat.region - 1)) : 4000);
    return Math.round(b * (1.8 + 0.6 * (nIngredients || 2)) * (withSpice ? 1.3 : 1));
  };

  // 出门带回来的概率：底料常见，香料看运气
  G.FIND_DROP = { stapleChance: 0.6, rareChance: 0.22 };
})();
