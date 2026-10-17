// 加工：配方与商品。
// 设计要点：产物价值 = 实际投入的树果价值 × 配方倍率，所以"用更贵的树果做同一份商品"是收益优化的核心。
window.G = window.G || {};
(function () {
  const FLAVORS = ["辣", "涩", "甜", "苦", "酸"];
  const FLAVOR_KEY = { 辣: "spicy", 涩: "dry", 甜: "sweet", 苦: "bitter", 酸: "sour" };

  const CATS = [
    { id: "jam", name: "果酱", mult: 2.2, time: 8, region: 1, unit: "罐", icon: "jar", desc: "把树果熬到出胶装进罐子里，抹面包、兑水都行，是最经放的一种做法。" },
    { id: "juice", name: "果汁", mult: 2.8, time: 12, region: 2, unit: "瓶", icon: "bottle", desc: "树果压出汁滤干净，凉着喝最解渴，赶路口渴的时候一口下去很顶事。" },
    { id: "cube", name: "宝可方块", mult: 3.5, time: 18, region: 3, unit: "盒", icon: "cube", desc: "压成小方块的树果点心，一口一块，耐放又好带。" },
    { id: "poffin", name: "宝芬", mult: 4.2, time: 26, region: 4, unit: "枚", icon: "poffin", desc: "捏成一枚一枚的软点心，入口很容易化开，香味能留好一阵。" },
    { id: "pie", name: "树果派", mult: 4.8, time: 36, region: 5, unit: "个", icon: "pie", desc: "酥皮裹住煮软的果馅烤出来，切开的时候馅会往外淌，趁热吃最好。" },
    { id: "wine", name: "陈酿果酒", mult: 6.0, time: 50, region: 6, unit: "坛", icon: "wine", desc: "树果捣碎封在坛里放着，日子越久越醇，开坛那一下香气能飘出院门。" },
    // 甜品线：接在果酒之后，区域 7-10 逐步解锁。
    // 门槛排在后段是有意的 —— 不加速前中盘，而是把后期那段最长的等待收窄。
    { id: "cake", name: "蛋糕", mult: 6.8, time: 62, region: 7, unit: "块", icon: "cake", desc: "打发的蛋糊和果泥一起烤，蓬松又湿润，切一块配茶正好。" },
    { id: "tart", name: "挞", mult: 7.8, time: 76, region: 8, unit: "个", icon: "tart", desc: "薄薄一层酥皮托着整颗果肉，烤到边缘发焦，酸甜都锁在里头。" },
    { id: "roll", name: "瑞士卷", mult: 9.0, time: 92, region: 9, unit: "条", icon: "roll", desc: "烤好的薄蛋糕抹上奶油和果酱卷起来，切开一圈一圈很好看。" },
    { id: "choco", name: "巧克力", mult: 10.5, time: 110, region: 10, unit: "板", icon: "choco", desc: "可可和果干一起凝成的板子，掰一块含在嘴里慢慢化。" },

    // ── 研发线专属品类：商店里买不到，只能靠在「研发」页搭配出来 ──
    // 这里的 mult / time 只是"它属于哪一档"的登记（图鉴提示、研发费要用），
    // 真正做出来的倍率由 G.researchTier(搭配解锁区域) 现算 —— 见 finds.js。
    // 研发版比同档商店配方多 30%（配料多下几样还能再涨），这就是"研究了半天"的回报。
    { id: "pudding", name: "布丁", mult: 6.8, time: 62, region: 7, unit: "盅", icon: "pudding", researchOnly: true, desc: "果泥拌奶凝成的一盅，勺子挖下去会颤，凉过以后更顺口。" },
    { id: "cookie", name: "曲奇", mult: 7.8, time: 76, region: 8, unit: "袋", icon: "cookie", researchOnly: true, desc: "黄油和面粉揉团压成小片烤脆，装一袋边走边吃。" },
    { id: "candy", name: "糖果", mult: 7.8, time: 76, region: 8, unit: "罐", icon: "candy", researchOnly: true, desc: "熬到发硬的果糖切成小块，含一颗能含很久，甜味会慢慢散开。" },
    { id: "bread", name: "面包", mult: 10.5, time: 110, region: 10, unit: "个", icon: "bread", researchOnly: true, desc: "面团揉足发酵烤出来，外皮脆里头软，掰开有热气。" },

    // ── 特殊糕点 ──
    // 要往锅里下「两份 + 两份」的底料才做得出来（比普通配方费一倍料）。
    // 它们的回报不体现在倍率上（倍率照样按区域取档，不然区域 5 的千层酥能压过区域 9 的瑞士卷），
    // 而是：一锅出 2~3 份、配料越多倍率涨得越多。剩下的槽位丢树果定味道，和别的品类一样。
    { id: "layer", name: "千层酥", mult: 4.8, time: 36, region: 5, unit: "块", icon: "layer", researchOnly: true, desc: "一层油皮一层馅反复叠，烤完会一层层裂开，吃的时候用盘子接着。" },
    { id: "blackforest", name: "黑森林", mult: 6.0, time: 50, region: 6, unit: "角", icon: "blackforest", researchOnly: true, desc: "深色的蛋糕夹着果酱和奶油，表面撒一层碎屑，看着沉吃着不腻。" },
    { id: "spiral", name: "螺旋卷", mult: 6.8, time: 62, region: 7, unit: "条", icon: "spiral", researchOnly: true, desc: "面团抹馅卷成条再盘成圈，烤出来一圈圈花纹，撕着吃。" },
    { id: "milkbun", name: "奶香圆包", mult: 7.8, time: 76, region: 8, unit: "个", icon: "milkbun", researchOnly: true, desc: "牛奶和面粉揉成的小圆包，烤到金黄，掰开有奶香冒出来。" },
    { id: "croissant", name: "可颂", mult: 9.0, time: 92, region: 9, unit: "只", icon: "croissant", researchOnly: true, desc: "反复折叠的油酥面团烤成月牙形，外壳一层层剥着掉，越嚼越香。" },
    { id: "napoleon", name: "拿破仑", mult: 10.5, time: 110, region: 10, unit: "份", icon: "napoleon", researchOnly: true, desc: "酥皮和奶油一层叠一层压成平整的一大块，切的时候得用快刀，不然会塌。" }
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
  G.CAT_BY_ID = Object.fromEntries(CATS.map((c) => [c.id, c]));
  G.FLAVORS = FLAVORS;
  G.RECIPES = recipes;
  G.RECIPE_BY_ID = {};
  recipes.forEach((r) => { G.RECIPE_BY_ID[r.id] = r; });

  // 商店的档位表：区域 1..10 各自那一档的倍率 / 耗时 / 投几颗果子。
  // 研发配方的强度按「你什么时候能把它配出来」取档，不按品类在商店卖第几档 ——
  // 不然区域 1 的面粉 + 鲜奶就能配出商店区域 7 才卖的蛋糕（倍率 ×8.8），
  // 前半张配方表全被它踩平（玩家原话：宝芬比蛋糕还低、挞区域 2 就解锁但倍率比后面高得多）。
  G.SHOP_TIERS = CATS.map((cat, ci) => ({ cat: cat, ci: ci }))
    .filter((x) => !x.cat.researchOnly)
    .sort((a, b) => a.cat.region - b.cat.region)
    .map((x) => ({
      region: x.cat.region,
      mult: x.cat.mult,
      time: x.cat.time,
      // 和商店配方同一个口径：2 + ⌊(品类序号 + 口味序号) / 3⌋，口味取第一味（最省）
      need: 2 + Math.floor(x.ci / 3)
    }));
  G.researchTier = function (region) {
    const r = Math.max(1, Math.min(G.SHOP_TIERS.length, Math.round(region || 1)));
    return G.SHOP_TIERS[r - 1];
  };

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

  // ── 混合口味 ─────────────────────────────────────────────────────────
  // 两条不同味道的树果一起做，产品带两种味道：主料决定用哪张配方，副料只提供第二个味道。
  // 设计见 DESIGN.md 3.6。
  G.MIX_BONUS = 1.08;            // 混合加成：多一道手续，给 8% 回报

  // 两味的标签：「甜酸」（按味道排序，A+B 和 B+A 是同一个东西）
  G.mixTag = function (a, b) {
    if (!a || !b || !a.flavor || a.flavor === b.flavor) return null;
    return [a.flavor, b.flavor].sort().join("");
  };

  // 投料怎么分：主料 ceil(n/2)，副料 floor(n/2)。配方至少要 2 颗，所以副料至少 1 颗
  G.mixSplit = function (n) {
    const total = Math.max(2, Math.floor(n || 2));
    const main = Math.ceil(total / 2);
    return { main: main, sub: total - main };
  };

  // 混合产品的价值：两边料价按实际投料数相加，倍率/坚硬度/浓度照旧，再乘混合加成
  G.mixedValue = function (recipe, mainB, subB) {
    const sp = G.mixSplit(recipe.needCount);
    const firm = 1 + Math.max(0, (mainB.firmness - 1) * 0.05);
    const peak = Math.max(G.flavorIntensity(recipe, mainB), G.flavorIntensity(recipe, subB));
    return Math.floor(
      (mainB.basePrice * sp.main + subB.basePrice * sp.sub) *
      recipe.mult * firm * G.flavorValueBonus(peak) * G.MIX_BONUS
    );
  };

  // 名字：「甜酸果酱」。区域招牌保持原名，不拼味道
  G.mixedName = function (recipe, mainB, subB) {
    if (recipe.specialty || !mainB || !subB) return recipe.name;
    const tag = G.mixTag(mainB, subB);
    if (!tag) return G.productName(recipe, mainB);
    // 用品类名拼（"涩酸"+“果酱”），别用完整配方名，否则会变成"涩酸涩味果酱"
    return tag + (recipe.catName || recipe.name);
  };

  // 混合产品在常客那儿值多少：取两味里更高的那档（爱吃甜的、爱吃酸的都乐意买），
  // 但另一味正好是它讨厌的，就压一截 —— 混合是"覆盖面变宽"，不是"单价翻倍"。
  // 注意一个常客只有一个「喜欢」的味道，所以不存在"两味都爱"的额外加成。
  G.mixedFlavorMult = function (regular, mainB, subB, peak) {
    if (!regular) return 1;
    const flavors = [mainB.flavor, subB.flavor];
    const best = Math.max.apply(null, flavors.map((f) => G.flavorMult(f, regular, peak)));
    const anyDislike = flavors.some((f) => f === regular.dislike);
    return anyDislike ? best * 0.85 : best;
  };

  // 产品键：普通两段（配方|树果），混合三段（配方|主料|副料）
  G.parseProductKey = function (key) {
    const p = String(key || "").split("|");
    return { recipeId: p[0], berryId: +p[1] || 0, subId: p[2] ? +p[2] : 0 };
  };

  // 产品键 → 配方 / 主料 / 副料。副料为 null 就是普通产品
  G.keyInfo = function (key) {
    const p = G.parseProductKey(key);
    return {
      recipe: G.RECIPE_BY_ID[p.recipeId],
      berry: G.BERRY_BY_ID[p.berryId],
      sub: p.subId ? G.BERRY_BY_ID[p.subId] : null
    };
  };

  // 混合产品售价：和普通产品同一套加成，只是价值换 mixedValue、常客加成换 mixedFlavorMult
  G.mixedSellPrice = function (state, recipe, mainB, subB, regular) {
    const b = G.bonuses(state);
    const peak = Math.max(G.flavorIntensity(recipe, mainB), G.flavorIntensity(recipe, subB));
    let v = G.mixedValue(recipe, mainB, subB);
    v *= (1 + b.sellBonus) * (1 + b.allBonus);
    if (b.flavorSell && (recipe.flavor === b.flavorSell || subB.flavor === b.flavorSell)) v *= (1 + b.flavorBonus);
    if (regular) {
      v *= G.mixedFlavorMult(regular, mainB, subB, peak);
      v *= G.affinityMult(regular.aff);
      v *= 1 + (b.regularPay || 0);
    }
    return Math.max(1, Math.floor(v));
  };
  G.mixedMarketPrice = function (state, recipe, mainB, subB) {
    return Math.max(1, Math.floor(G.mixedSellPrice(state, recipe, mainB, subB, null) * 0.85));
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

  // 树果自己的浓度分（0~100）—— 光看果子就能判断它浓不浓，不用先做成甜品。
  // 和制品那套用同一组档位名，方向也一致：果子越浓，做出来越浓。
  G.berryFlavorScore = function (berry) {
    const pw = G.berryFlavorPower(berry);
    if (!pw) return 0;
    return Math.round(18 + ((pw - 1) / 1.4) * 78);   // ×1.0 → 18，×2.4 → 96
  };
  G.berryFlavorTier = function (berry) {
    return G.flavorTier(G.berryFlavorScore(berry), berry ? berry.flavor : "");
  };

  // 浓度：取味道画像里最高的那一角（0~100）。售价和常客加成都看它。
  G.flavorIntensity = function (recipe, berry) {
    const prof = G.flavorProfile(recipe, berry);
    let peak = 0;
    G.FLAVORS_5.forEach((f) => { if (prof[f] > peak) peak = prof[f]; });
    return peak;
  };

  // 浓度分档 —— 界面上用描边字显示，一眼看得出浓淡：
  //   无味 / 清甜·清涩（淡） / 芬芳 / 浓郁 / 厚重
  // 只有最淡那一档带具体味道，再往上就是纯粹的程度词了。
  G.FLAVOR_TIERS = [
    { min: 0, name: "无味" },
    { min: 1, name: "清" },        // 清 + 味道
    { min: 45, name: "芬芳" },
    { min: 65, name: "浓郁" },
    { min: 85, name: "厚重" }
  ];

  // 雷达图每个角用字母代替数字：0~100 分切成 S/A/B/C/D/E/F 七档，颜色越暖代表越浓。
  // 上面那套档位名（清 / 芬芳 / 浓郁 / 厚重）只有一个峰值，雷达图有五个角，各角要各自评级，
  // 所以字母的阈值和档位名对齐：85 厚重 = S，65 浓郁 = A，45 芬芳 = B，再往下细分。
  G.FLAVOR_GRADE_STEPS = [
    { min: 85, letter: "S" },
    { min: 65, letter: "A" },
    { min: 45, letter: "B" },
    { min: 30, letter: "C" },
    { min: 15, letter: "D" },
    { min: 1, letter: "E" },
    { min: 0, letter: "F" }
  ];
  G.flavorGrade = function (v) {
    const x = v || 0;
    for (let i = 0; i < G.FLAVOR_GRADE_STEPS.length; i++) {
      if (x >= G.FLAVOR_GRADE_STEPS[i].min) return G.FLAVOR_GRADE_STEPS[i].letter;
    }
    return "F";
  };

  G.flavorTier = function (peak, flavor) {
    const v = peak || 0;
    if (v <= 0) return "无味";
    let name = "无味";
    G.FLAVOR_TIERS.forEach((t) => { if (v >= t.min) name = t.name; });
    // 最淡那档并进味道里（清甜）；再往上就把味道缀在后面（芬芳 · 甜）
    if (name === "清") return "清" + (flavor || "");
    return flavor ? name + " · " + flavor : name;
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
  G.productIcon = function (recipe, berry, sub, mainShare) {
    const base = `<img class="pbase" src="${G.productSprite(recipe)}" alt="">`;
    // 无味（berry.id === 0）没有图可叠，别输出一个坏图片
    const one = function (x, cls) {
      return x && x.icon ? `<img class="pberry ${cls}" src="${x.icon}" alt="${x.zh}">` : "";
    };
    let over = "";
    if (sub && sub.icon && berry && berry.icon) {
      const share = typeof mainShare === "number" ? mainShare : 0.5;
      // 颗数一样多 → 两颗叠在一起半透明，红+蓝出紫那种"混色"效果
      if (share > 0.5) over = one(berry, "big") + one(sub, "small");
      else if (share < 0.5) over = one(berry, "small") + one(sub, "big");
      else over = one(berry, "blend") + one(sub, "blend");
    } else {
      over = one(berry, "");
    }
    const tag = sub ? (G.mixTag(berry, sub) || "") : "";
    return `<span class="picon" title="${tag || recipe.flavor}">${base}${over}</span>`;
  };

  G.flavorColor = function (fl) { return FLAVOR_COLOR[fl] || "#8cbf6a"; };
})();
