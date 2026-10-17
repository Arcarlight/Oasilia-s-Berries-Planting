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
    { need: ["base", "liquid", "fat"], cat: "bread", region: 10, hint: "面粉 + 鲜奶 + 黄油  →  面包" },

    // ── 特殊糕点 ──
    // 底料要按「具体几份」下，而且必须**完全吻合**：多一样少一样都成不了型。
    // 配方按各糕点真实的用料配 —— 面粉是主料，黄油 / 鲜奶 / 砂糖按比例搭。
    // 底料占掉锅的前几格，剩下的槽位丢树果定味道；一颗不放也能出锅，
    // 但那就是「无味」的：五个味道全是 0，价钱低一大截（这就是它的软限制）。
    { need: ["base", "base", "fat", "fat"], cat: "layer", region: 5, potLevel: 2,
      hint: "面粉×2 + 黄油×2  →  千层酥" },
    { need: ["base", "base", "sweet", "liquid"], cat: "blackforest", region: 6, potLevel: 2,
      hint: "面粉×2 + 砂糖×1 + 鲜奶×1  →  黑森林" },
    { need: ["base", "base", "base", "liquid", "liquid"], cat: "spiral", region: 7, potLevel: 3,
      hint: "面粉×3 + 鲜奶×2  →  螺旋卷" },
    { need: ["base", "base", "base", "liquid", "liquid", "sweet"], cat: "milkbun", region: 8, potLevel: 4,
      hint: "面粉×3 + 鲜奶×2 + 砂糖×1  →  奶香圆包" },
    { need: ["base", "base", "base", "fat", "fat", "liquid"], cat: "croissant", region: 9, potLevel: 4,
      hint: "面粉×3 + 黄油×2 + 鲜奶×1  →  可颂" },
    { need: ["base", "base", "base", "base", "fat", "fat", "fat", "liquid"],
      cat: "napoleon", region: 10, potLevel: 5,
      hint: "面粉×4 + 黄油×3 + 鲜奶×1  →  拿破仑" }
  ];

  // 「无味」：锅里一颗树果都没放时出锅的东西。
  // 它不是失败品 —— 底料下对了照样成糕点，只是五个味道全是 0，卖不上价。
  G.FLAVORLESS = {
    id: 0, zh: "无味", flavor: "无味", basePrice: 30, firmness: 1, icon: "",
    firmnessCn: "—", effect: "就是没什么味道"
  };
  G.BERRY_BY_ID[0] = G.FLAVORLESS;

  // 废品：搭配失败剩下的那一坨。能卖，但基本不值钱。
  G.WASTE = {
    id: "waste", name: "失败品", price: 30,
    desc: "一坨说不清是什么的东西，颜色也不太对。闻着还行，但没人愿意吃第二口。",
    use: "没别的用。卖了吧，三十块也是钱。"
  };

  const FLAVOR_KEY = { 辣: "spicy", 涩: "dry", 甜: "sweet", 苦: "bitter", 酸: "sour", 无味: "flavorless" };
  G.FLAVOR_KEY = FLAVOR_KEY;

  // 研发出来的东西不叫「甜味蛋糕」这种说明书名字，按味道起外号：
  //   普通版偏中性（偏甜、微苦），加了配对香料就往夸张里走（甜得掉牙、辣到冒烟）。
  G.FLAVOR_FUN = {
    无味: { mild: "无味", rich: "没味道" },
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
  // id 里带上投入的食材数：同一套搭配，料越足做出来的是越强的另一个东西
  G.RESEARCH_ID_RE = /^res_([a-z]+)_([a-z]+)_([a-z]+)(?:_(\d+))?$/;
  const SPICE_BY_ID = {};
  FINDS.forEach((f) => { SPICE_BY_ID[f.id] = f; });

  G.makeResearchRecipe = function (catId, flavor, spiceId, good, potCount) {
    const n = Math.max(2, potCount || 2);
    const id = "res_" + catId + "_" + FLAVOR_KEY[flavor] + "_" + (spiceId || "plain") + "_" + n;
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
      // 前缀表示料数：朴实的 → 多味的 → 层层叠叠的 ……
      // 不这么写的话，两种强度在仓库里长得一模一样。
      name: G.potPrefix(n) + G.researchName(flavor, cat.name, spice, good),
      cat: cat.id,
      catName: cat.name,
      unit: cat.unit,
      icon: cat.icon,
      flavor: flavor,
      needFlavor: flavor,
      needCount: needCount,
      minTier: 1,
      mult: Math.round(cat.mult * (good ? 1.5 : spice ? 1.35 : 1.3) * G.potMultBonus(n) * 100) / 100,
      potCount: n,
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
      if (!m) return;
      const fl = flavorOfKey(m[2]);
      const sid = m[3] === "plain" ? null : m[3];
      const sp = sid ? SPICE_BY_ID[sid] : null;
      // 老存档的 id 没有世代数，当成两手料（2 样）处理
      G.makeResearchRecipe(m[1], fl, sid, !!(sp && (sp.good || []).indexOf(fl) >= 0), m[4] ? +m[4] : 2);
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
  G.evaluateResearch = function (state, findIds, flavor, potN) {
    const list = (findIds || []).map((id) => G.FIND_BY_ID[id]).filter(Boolean);
    const cores = list.filter((f) => f.role !== "spice");
    const spices = list.filter((f) => f.role === "spice");

    if (!cores.length && !spices.length) return { kind: "invalid", why: "一样都没放。" };
    // 特殊糕点最多要 8 样底料（拿破仑：面粉×4 + 黄油×3 + 鲜奶×1），上限放到八样
    if (cores.length > 8) return { kind: "invalid", why: "底料放太杂了，先减到八样以内。" };
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
    // 特殊糕点还要求锅够大：4 样底料加一颗树果，起始那口 4 格的锅根本放不下
    if (combo.potLevel && state && ((state.pot && state.pot.level) || 1) < combo.potLevel) {
      const need = G.potLevel(combo.potLevel);
      return {
        kind: "invalid", combo: combo, spice: spice,
        why: "锅还太小了 —— 这个搭配至少要「" + need.name + "」（" + need.slots + " 格）。去换锅。"
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
    const n = Math.max(2, potN || list.length || 2);
    const id = "res_" + combo.cat + "_" + FLAVOR_KEY[flavor] + "_" + (spice ? spice.id : "plain") + "_" + n;
    const known = !!(state && state.recipes[id]);
    const cost = G.researchCost(combo.cat, flavor, list.length, !!spice,
      state ? state.region : (combo ? combo.region : 1));
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
  // 研发费按「**在哪个区域**做」定价，不是按品类的商店解锁区域。
  //
  // 以前是拿品类的商店配方价当基准，于是区域 1 的第一个搭配
  // （面粉 + 鲜奶 → 蛋糕）照着**区域 7** 的蛋糕价报价，一锅 16 万 ——
  // 而区域 1 一整轮的总收入才 2 万，等于第一个区域根本做不了料理。
  G.RESEARCH_COST_BASE = 220;      // 区域 1、普通品类、2 样料的基准价
  G.researchCost = function (catId, flavor, nIngredients, withSpice, region) {
    const cat = (G.RECIPE_CATS || []).filter((c) => c.id === catId)[0];
    const r = Math.max(1, Math.min(10, region || (cat ? cat.region : 1)));
    // 品类本身越贵（倍率越高）越费钱，但只作为系数，不主导
    const b = Math.round(G.RESEARCH_COST_BASE * ((cat ? cat.mult : 6.8) / 6.8) * Math.pow(1.9, r - 1));
    return Math.round(b * (1.8 + 0.6 * (nIngredients || 2)) * (withSpice ? 1.3 : 1));
  };

  // ── 大锅 ────────────────────────────────────────────────────────────────
  // 锅越大，一次能丢进去的食材越多（做出来的甜品越值钱），搅拌也越快。
  G.POT_LEVELS = [
    { level: 1, slots: 4, stir: 6.0, cost: 0,        name: "一口旧铁锅" },
    { level: 2, slots: 5, stir: 5.0, cost: 9000,     name: "补过底的铁锅" },
    { level: 3, slots: 6, stir: 4.0, cost: 75000,    name: "铜箍深锅" },
    { level: 4, slots: 8, stir: 3.0, cost: 600000,   name: "三口连灶的大锅" },
    { level: 5, slots: 10, stir: 2.2, cost: 5000000, name: "恒温石锅" },
    { level: 6, slots: 12, stir: 1.6, cost: 45000000, name: "星屑夹层锅" }
  ];
  G.potLevel = function (level) {
    const t = G.POT_LEVELS;
    return t[Math.min(t.length, Math.max(1, level || 1)) - 1] || t[0];
  };

  // 一次投入的食材越多，做出来的东西越值钱：每多一样 +12% 倍率。
  // 上限设一下，免得堆满锅就无敌。
  G.POT_MIN_INGREDIENTS = 2;
  G.potMultBonus = function (n) {
    return 1 + Math.min(8, Math.max(0, (n || 2) - 2)) * 0.12;
  };
  // 卖给对口常客的加成也跟着涨：2 样 +50%，之后每多一样 +5%，封顶 +95%
  G.potFlavorBonus = function (n) {
    return Math.min(1.95, 1.5 + Math.min(8, Math.max(0, (n || 2) - 2)) * 0.05);
  };

  // 料越足，名字前面的前缀越夸张。这不只是好听 —— 前缀就是强度等级，
  // 一眼能从仓库里认出「这是几样料煮出来的」。
  const POT_PREFIX = [
    "", "简约的", "朴实的", "丰富的", "多味的", "层层叠叠的", "花团锦簇的",
    "极尽奢华的", "铺张的", "不计成本的", "过了头的", "不知节制的", "不像话的"
  ];
  G.potPrefix = function (n) {
    const i = Math.max(1, Math.min(POT_PREFIX.length - 1, n || 1));
    return POT_PREFIX[i];
  };
  // 锅最多 12 格，所以前缀也只排到 12
  G.POT_PREFIX = POT_PREFIX;

  // 基础食材（面粉 / 哞哞鲜奶 / 黄油 / 砂糖）也能在杂货铺买到，只是贵得多 ——
  // 给"懒得等阿特拉斯"或者手气差的人一条后路。
  // 香料不卖：那是跑一趟才有的东西，能买就没意义了。
  G.FIND_BUY_MARKUP = 6;
  G.findBuyPrice = function (f) {
    return Math.round((f.price || 0) * G.FIND_BUY_MARKUP);
  };
  G.FINDS_FOR_SALE = FINDS.filter((f) => f.tier === "staple");

  // 出门带回来的概率：底料常见，香料看运气
  G.FIND_DROP = { stapleChance: 0.6, rareChance: 0.22 };
})();
