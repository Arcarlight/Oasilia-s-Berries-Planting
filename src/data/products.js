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
    { id: "wine", name: "陈酿果酒", mult: 6.0, time: 50, region: 6, unit: "坛", icon: "wine" }
  ];

  const recipes = [];
  CATS.forEach((cat, ci) => {
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

  G.productValue = function (recipe, berry) {
    const firm = 1 + Math.max(0, (berry.firmness - 1) * 0.05);
    return Math.floor(berry.basePrice * recipe.needCount * recipe.mult * firm);
  };

  G.productName = function (recipe, berry) {
    return recipe.specialty ? recipe.name : recipe.name + "（" + berry.zh + "）";
  };

  // 商品图标：用神奇宝贝百科的原作道具贴图打底，右下角叠一颗投入的树果。
  const FLAVOR_COLOR = { 辣: "#e05635", 涩: "#714fda", 甜: "#ff9861", 苦: "#77d2e2", 酸: "#e9d93f", 混合: "#8cbf6a" };

  G.productSprite = function (recipe) {
    const cat = recipe.cat;
    if (cat === "cube") return "assets/item/cube_" + (recipe.flavor === "混合" ? "辣" : recipe.flavor) + ".png";
    if (cat === "poffin") return "assets/item/poffin_" + (recipe.flavor === "混合" ? "甜" : recipe.flavor) + ".png";
    if (cat === "jam") return "assets/item/jam.png";
    if (cat === "juice") return "assets/item/juice.png";
    if (cat === "pie") return "assets/item/pie.png";
    if (cat === "wine") return "assets/item/wine.png";
    return "assets/item/jam.png";
  };

  // berry 可以省略（比如还没决定用哪种树果时），省略就只显示底图
  G.productIcon = function (recipe, berry) {
    const base = `<img class="pbase" src="${G.productSprite(recipe)}" alt="">`;
    const over = berry
      ? `<img class="pberry" src="${berry.icon}" alt="${berry.zh}">`
      : "";
    return `<span class="picon" title="${recipe.flavor}">${base}${over}</span>`;
  };

  G.flavorColor = function (fl) { return FLAVOR_COLOR[fl] || "#8cbf6a"; };
})();
