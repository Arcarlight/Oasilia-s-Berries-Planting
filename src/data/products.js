// 加工：配方与商品。
// 设计要点：产物价值 = 实际投入的树果价值 × 配方倍率，所以"用更贵的树果做同一份商品"是收益优化的核心。
window.G = window.G || {};
(function () {
  const FLAVORS = ["辣", "涩", "甜", "苦", "酸"];
  const FLAVOR_KEY = { 辣: "spicy", 涩: "dry", 甜: "sweet", 苦: "bitter", 酸: "sour" };

  const CATS = [
    { id: "jam", name: "果酱", mult: 2.2, time: 8, region: 1, unit: "罐", icon: "jar" },
    { id: "juice", name: "果汁", mult: 2.8, time: 12, region: 2, unit: "瓶", icon: "bottle" },
    { id: "cube", name: "宝可方块", mult: 3.5, time: 18, region: 3, unit: "盒", icon: "cube" },
    { id: "poffin", name: "宝芬", mult: 4.2, time: 26, region: 4, unit: "枚", icon: "poffin" },
    { id: "pie", name: "树果派", mult: 4.8, time: 36, region: 5, unit: "个", icon: "pie" },
    { id: "wine", name: "陈酿果酒", mult: 6.0, time: 50, region: 6, unit: "坛", icon: "wine" },
    // 甜品线：接在果酒之后，区域 7-10 逐步解锁。
    // 门槛排在后段是有意的 —— 不加速前中盘，而是把后期那段最长的等待收窄。
    { id: "cake", name: "蛋糕", mult: 6.8, time: 62, region: 7, unit: "块", icon: "cake" },
    { id: "tart", name: "挞", mult: 7.8, time: 76, region: 8, unit: "个", icon: "tart" },
    { id: "roll", name: "瑞士卷", mult: 9.0, time: 92, region: 9, unit: "条", icon: "roll" },
    { id: "choco", name: "巧克力", mult: 10.5, time: 110, region: 10, unit: "板", icon: "choco" },

    // ── 研发线专属品类：商店里买不到，只能靠在「研发」页搭配出来 ──
    // 倍率比同期的商店品类高一档，作为"研究了半天"的回报。
    { id: "pudding", name: "布丁", mult: 7.4, time: 70, region: 7, unit: "盅", icon: "pudding", researchOnly: true },
    { id: "cookie", name: "曲奇", mult: 8.8, time: 84, region: 8, unit: "袋", icon: "cookie", researchOnly: true },
    { id: "candy", name: "糖果", mult: 9.8, time: 60, region: 8, unit: "罐", icon: "candy", researchOnly: true },
    { id: "bread", name: "面包", mult: 11.5, time: 124, region: 10, unit: "个", icon: "bread", researchOnly: true },

    // ── 特殊糕点 ──
    // 要往锅里下「两份 + 两份」的底料才做得出来（比普通配方费一倍料），
    // 所以倍率也高一档。剩下的槽位丢树果定味道，和别的品类一样。
    { id: "layer", name: "千层酥", mult: 9.2, time: 72, region: 5, unit: "块", icon: "layer", researchOnly: true },
    { id: "blackforest", name: "黑森林", mult: 10.0, time: 80, region: 6, unit: "角", icon: "blackforest", researchOnly: true },
    { id: "spiral", name: "螺旋卷", mult: 10.8, time: 88, region: 7, unit: "条", icon: "spiral", researchOnly: true },
    { id: "milkbun", name: "奶香圆包", mult: 11.6, time: 96, region: 8, unit: "个", icon: "milkbun", researchOnly: true },
    { id: "croissant", name: "可颂", mult: 12.4, time: 104, region: 9, unit: "只", icon: "croissant", researchOnly: true },
    { id: "napoleon", name: "拿破仑", mult: 13.2, time: 112, region: 10, unit: "份", icon: "napoleon", researchOnly: true }
  ];

  const recipes = [];
  CATS.forEach((cat, ci) => {
    if (cat.researchOnly) return;        // 研发线专属，商店里不卖
    FLAVORS.forEach((fl, fi) => {
      // 果酱是最基础的加工法：5 种口味在第一个区域就全部开放。
      // 否则初始区域只能做辣味，而当地的常客要酸/涩/甜/苦/辣都有，订单根本交不了。
      const region = cat.id === "jam" ? 1 : Math.min(10, cat.region + fi);
      // 需要同口味的树果数量：随配方等级上升
      const count = 2 + Math.floor((ci + fi) / 3);
      recipes.push({
        id: cat.id + "_" + FLAVOR_KEY[fl],
        name: fl + "味" + cat.name,
        cat: cat.id,
        catName: cat.name,
        unit: cat.unit,
        icon: cat.icon,
        flavor: fl,
        needFlavor: fl,
        needCount: count,
        minTier: 1,
        mult: cat.mult,
        time: cat.time,
        region: region,
        cost: Math.round(cat.mult * 90 * Math.pow(1.75, region - 1)),
        specialty: false
      });
    });
  });

  // 每个区域一款招牌商品：需要该区域最贵的树果，倍率更高、有独立名字
  const SPECIALS = [
    { region: 1, berry: 5, name: "繁盛五色酱", cat: "jam", mult: 3.0 },
    { region: 2, berry: 11, name: "村口蜜酿果汁", cat: "juice", mult: 3.4 },
    { region: 3, berry: 18, name: "瀑布冷萃果酒", cat: "wine", mult: 4.2 },
    { region: 4, berry: 25, name: "盐风海盐宝可方块", cat: "cube", mult: 4.6 },
    { region: 5, berry: 32, name: "沃雷奥斯花蜜宝芬", cat: "poffin", mult: 5.4 },
    { region: 6, berry: 39, name: "天顶霜糖树果派", cat: "pie", mult: 6.0 },
    { region: 7, berry: 46, name: "三元温泉果冻", cat: "cube", mult: 6.6 },
    { region: 8, berry: 53, name: "水晶灯心糖渍", cat: "poffin", mult: 7.2 },
    { region: 9, berry: 59, name: "赤沙龙脉陈酿", cat: "wine", mult: 8.0 },
    { region: 10, berry: 65, name: "天穹落霞宝芬", cat: "poffin", mult: 9.0 }
  ];
  SPECIALS.forEach((sp, i) => {
    const cat = CATS.filter((c) => c.id === sp.cat)[0];
    recipes.push({
      id: "special_" + (i + 1),
      name: sp.name,
      cat: sp.cat,
      catName: cat.name,
      unit: cat.unit,
      icon: cat.icon,
      flavor: "混合",
      needFlavor: null,
      needBerry: sp.berry,
      needCount: 3,
      minTier: 1,
      mult: sp.mult,
      time: Math.round(cat.time * 1.8),
      region: sp.region,
      cost: Math.round(sp.mult * 400 * Math.pow(2.0, sp.region - 1)),
      specialty: true
    });
  });

  G.RECIPE_CATS = CATS;
  G.FLAVORS = FLAVORS;
  G.RECIPES = recipes;
  G.RECIPE_BY_ID = {};
  recipes.forEach((r) => { G.RECIPE_BY_ID[r.id] = r; });

  // 商品在库存里的键：配方 + 投入树果 id（投入越贵，商品越值钱）
  G.productKey = function (recipeId, berryId) { return recipeId + "|" + berryId; };

  // 味道浓的，价钱上要体现出来 —— 不然"浓"就只是雷达图上好看了。
  // 55 分以下不加（淡的没资格要价），满 99 分加 30%。
  G.FLAVOR_VALUE_BONUS = 0.30;
  G.flavorValueBonus = function (peak) {
    return 1 + Math.max(0, Math.min(1, (peak - 55) / 44)) * G.FLAVOR_VALUE_BONUS;
  };

  G.productValue = function (recipe, berry) {
    const firm = 1 + Math.max(0, (berry.firmness - 1) * 0.05);
    const peak = G.flavorIntensity(recipe, berry);
    return Math.floor(berry.basePrice * recipe.needCount * recipe.mult * firm * G.flavorValueBonus(peak));
  };

  // 商品叫法：树果名放最前，一眼看得出这份东西是用哪种果子做的。
  //   普通配方 → 「桃桃果甜味瑞士卷」
  //   区域招牌 → 保留它自己的名字（那些名字本身就是文案的一部分）
  G.productName = function (recipe, berry) {
    if (!berry) return recipe.name;
    // 无味时配方名里已经带了「无味」，别再拼一次（否则是「无味铺张的无味拿破仑」）
    if (berry.id === 0) return recipe.name;
    return recipe.specialty ? recipe.name : berry.zh + recipe.name;
  };

  // 商品图标：用神奇宝贝百科的原作道具贴图打底，右下角叠一颗投入的树果。
  const FLAVOR_COLOR = { 辣: "#e05635", 涩: "#714fda", 甜: "#ff9861", 苦: "#77d2e2", 酸: "#e9d93f", 混合: "#8cbf6a", 无味: "#9a9a8c" };

  // ── 味道画像 ────────────────────────────────────────────────────────────
  // 一件甜品在「辣涩甜苦酸」五个方向上的强度，用来画那张五边形雷达图。
  // 用商品 key 做种子，所以同一样东西每次看到的图都一样（不是随机数）。
  G.FLAVORS_5 = ["辣", "涩", "甜", "苦", "酸"];

  function hashStr(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  // 味道浓度：果子越贵越浓（区域 1 的 ₽6 → ×1.0，区域 10 的 ₽5000 → ×2.4）。
  // 同一区域里精品/量产的价格差不大，所以浓度也差不多 —— 浓度是"代"的差别，
  // 精品/量产是"一颗换几颗"的差别，两条轴不打架。
  const PRICE_LO = 6, PRICE_HI = 5400;
  G.berryFlavorPower = function (berry) {
    if (!berry || berry.id === 0) return 0;
    const t = Math.log(Math.max(PRICE_LO, berry.basePrice) / PRICE_LO) / Math.log(PRICE_HI / PRICE_LO);
    return 1 + 1.4 * Math.max(0, Math.min(1, t));
  };

  // 浓度：取味道画像里最高的那一角（0~100）。售价和常客加成都看它。
  G.flavorIntensity = function (recipe, berry) {
    const prof = G.flavorProfile(recipe, berry);
    let peak = 0;
    G.FLAVORS_5.forEach((f) => { if (prof[f] > peak) peak = prof[f]; });
    return peak;
  };

  G.flavorWord = function (v) {
    if (v <= 0) return "没味道";
    if (v < 45) return "淡";
    if (v < 65) return "有点味道";
    if (v < 85) return "够味";
    return "浓";
  };

  G.flavorProfile = function (recipe, berry) {
    // 无味：五个角全是 0 —— 没有树果就没有味道，雷达图是空的
    if (!berry || berry.id === 0 || recipe.flavor === "无味") {
      const zero = {};
      G.FLAVORS_5.forEach((f) => { zero[f] = 0; });
      return zero;
    }
    const seed = hashStr(G.productKey(recipe.id, berry.id));
    const power = G.berryFlavorPower(berry) || 1;
    const prof = {};
    G.FLAVORS_5.forEach((f, i) => {
      // 底色：每种味道都有一点点，多少由种子决定，像是"这一锅的底子"。
      // 果子越浓，这一层也越明显 —— 雷达图整个鼓起来。
      prof[f] = Math.min(96, Math.round((6 + ((seed >>> (i * 3)) & 15)) * Math.pow(power, 0.8)));
    });
    // 主味：配方本身的味道，料越足越浓
    const n = recipe.potCount || 2;
    prof[recipe.flavor] = Math.min(99, Math.round((56 + n * 3.6) * Math.pow(power, 0.5)));
    // 香料再顶一角
    const sp = recipe.spice ? G.FIND_BY_ID[recipe.spice] : null;
    if (sp && sp.flavor !== recipe.flavor) {
      prof[sp.flavor] = Math.max(prof[sp.flavor], 38 + ((seed >>> 11) & 17));
    }
    // 果子自己的味道也算一味底子
    if (berry && berry.flavor !== recipe.flavor) {
      prof[berry.flavor] = Math.max(prof[berry.flavor], 22 + ((seed >>> 17) & 12));
    }
    return prof;
  };

  // 一句吐槽：点开一看就知道这一锅到底什么味儿
  G.flavorVerdict = function (prof) {
    const top = G.FLAVORS_5.slice().sort((a, b) => prof[b] - prof[a]);
    const hi = top[0], v = prof[hi];
    const lowest = Math.min.apply(null, G.FLAVORS_5.map((f) => prof[f]));
    // 无味：五个角全 0，别套"平衡"那套话
    if (v <= 0) return "……什么味道都没有。便宜是有道理的。";
    if (v - lowest < 22) return "哪儿都不突出，但没人会拒绝第二块。";
    if (hi === "甜" && v > 88) return "甜得掉牙——这次是字面意思。";
    if (hi === "辣" && v > 78) return "这真的还算甜品吗。阿特拉斯说好吃。";
    if (hi === "酸" && v > 78) return "牙软。先喝口水吧。";
    if (hi === "苦" && v > 74) return "吃完会安静一会儿。";
    if (hi === "涩" && v > 74) return "舌头上留了一层膜，得再吃一口压下去。";
    if (hi === "甜") return "偏甜，配茶正好。";
    if (hi === "辣") return "后劲在喉咙里，挺暖。";
    if (hi === "酸") return "酸得干净，开胃。";
    if (hi === "苦") return "苦味收得很利落，不讨厌。";
    return "涩口，但回味是甜的。";
  };

  G.productSprite = function (recipe) {
    const cat = recipe.cat;
    // 无味（锅里没放树果）有单独一套抽掉颜色的图
    if (cat === "cube") return "assets/item/cube_" + (recipe.flavor === "无味" ? "无味" : recipe.flavor === "混合" ? "辣" : recipe.flavor) + ".png";
    if (cat === "poffin") return "assets/item/poffin_" + (recipe.flavor === "无味" ? "无味" : recipe.flavor === "混合" ? "甜" : recipe.flavor) + ".png";
    // 这四类按口味换图：底都是 化け猫缶 的图标，只把"该变色的那部分"换了色相
    //  果酱 → 罐身   果汁 → 杯里的液体   果酒 → 瓶身   树果派 → 馅和果子
    // 以前五个口味共用一张百科的占位图，全靠右下角那颗树果区分，太偷懒了。
    // 换色由 tools/recolor_products.py 生成。
    const fl = recipe.flavor === "混合" ? "辣" : recipe.flavor;
    if (cat === "jam") return "assets/item/jam_" + fl + ".png";
    if (cat === "juice") return "assets/item/juice_" + fl + ".png";
    if (cat === "pie") return "assets/item/pie_" + fl + ".png";
    if (cat === "wine") return "assets/item/wine_" + fl + ".png";
    if (cat === "cake") return "assets/item/cake.png";
    if (cat === "tart") return "assets/item/tart.png";
    if (cat === "roll") return "assets/item/roll.png";
    if (cat === "choco") return "assets/item/choco.png";
    if (cat === "pudding") return "assets/item/pudding.png";
    if (cat === "cookie") return "assets/item/cookie.png";
    if (cat === "candy") return "assets/item/candy.png";
    if (cat === "bread") return "assets/item/bread.png";
    if (cat === "layer") return "assets/item/layer.png";
    if (cat === "blackforest") return "assets/item/blackforest.png";
    if (cat === "spiral") return "assets/item/spiral.png";
    if (cat === "milkbun") return "assets/item/milkbun.png";
    if (cat === "croissant") return "assets/item/croissant.png";
    if (cat === "napoleon") return "assets/item/napoleon.png";
    return "assets/item/jam.png";
  };

  // berry 可以省略（比如还没决定用哪种树果时），省略就只显示底图
  G.productIcon = function (recipe, berry) {
    const base = `<img class="pbase" src="${G.productSprite(recipe)}" alt="">`;
    // 无味（berry.id === 0）没有图可叠，别输出一个坏图片
    const over = berry && berry.icon
      ? `<img class="pberry" src="${berry.icon}" alt="${berry.zh}">`
      : "";
    return `<span class="picon" title="${recipe.flavor}">${base}${over}</span>`;
  };

  G.flavorColor = function (fl) { return FLAVOR_COLOR[fl] || "#8cbf6a"; };
})();
