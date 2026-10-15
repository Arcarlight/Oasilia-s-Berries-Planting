// 区域（镇子）。每个区域是一个"轮回段"：种树果 → 加工 → 解锁 6 位常客 → 付移民费搬家。
window.G = window.G || {};
(function () {
  G.REGIONS = [
    {
      id: 1, name: "繁盛之森", biome: "林间空地",
      desc: "林子里的土又软又潮，踩下去能陷进半个指节，带着湿树叶的味儿。风一吹只有沙沙声。西莉亚的头一颗种子，就按在这儿。",
      plots: 4, moveCost: 0, startMoney: 0,
      berries: [1, 2, 3, 4, 5],
      bonus: { growSpeed: 0.1 },
      bonusText: "软土：生长速度 +10%",
      tip: "种子你多备点，四块地都种满，收成它自己就长出来了，用不着你成天惦记。"
    },
    {
      id: 2, name: "繁盛村", biome: "村口集市",
      desc: "树果摊子从村口排成一长串，甜味和吵吵嚷嚷的声音混在一起。来买果子的宝可梦比林子里多多了，西莉亚的摊子夹在中间。",
      plots: 6, moveCost: 1200, startMoney: 0,
      berries: [6, 7, 8, 9, 10, 11],
      bonus: { sell: 0.1 },
      bonusText: "集市：售价 +10%",
      tip: "常客开始上门了。这些老主顾只认自己爱吃的那个味儿，别的果子他们看都不带看一眼的。"
    },
    {
      id: 3, name: "瀑布之森", biome: "水汽弥漫的溪谷",
      desc: "水声从早响到晚，叶子上的水珠就没干过，空气湿得能拧出水。西莉亚在这儿整天湿漉漉的，树果也长得比哪儿都快。",
      plots: 8, moveCost: 6000, startMoney: 0,
      berries: [12, 13, 14, 15, 16, 17, 18],
      bonus: { growSpeed: 0.2 },
      bonusText: "水汽：生长速度 +20%",
      tip: "加工过的果子可比生果值钱多了。配方该买的就买，你别在钱上抠门，省下的那点，回头还得加倍补回去。"
    },
    {
      id: 4, name: "盐风镇", biome: "海岛港口",
      desc: "海风一吹，满嘴都是咸味，船帆和缆绳整天哗啦响。货船一天来两趟，什么都能卖出去，还都卖得贵。",
      plots: 10, moveCost: 26000, startMoney: 0,
      berries: [19, 20, 21, 22, 23, 24, 25],
      bonus: { sell: 0.25 },
      bonusText: "港口：售价 +25%",
      tip: "采购材料交给我去跑吧，我熟路，跑一趟也方便。你在这儿买实在太贵了，不划算。"
    },
    {
      id: 5, name: "沃雷奥斯岛", biome: "传说中的花田",
      desc: "整座岛都被花铺满了，香得有点发晕，风一吹全是嗡嗡声。听说这片花田，是某只宝可梦睡着时呼吸长出来的。",
      plots: 12, moveCost: 120000, startMoney: 0,
      berries: [26, 27, 28, 29, 30, 31, 32],
      bonus: { rareSeed: 0.05, sell: 0.1 },
      bonusText: "花田：稀有种子掉落 +5%，售价 +10%",
      tip: "岛上的访客口味刁得很，可给钱也大方。挑是挑了点儿，值得你多花心思伺候，回头赚得回来。"
    },
    {
      id: 6, name: "天顶山", biome: "高海拔梯田",
      desc: "云都在脚底下翻，风刮得耳朵疼，冷得直打颤。昼夜温差大，果子能冻出一层糖霜，苦味树果在这儿格外值钱。",
      plots: 14, moveCost: 560000, startMoney: 0,
      berries: [33, 34, 35, 36, 37, 38, 39],
      bonus: { flavorSell: "苦", flavorBonus: 0.5 },
      bonusText: "霜降：苦味商品售价 +50%",
      tip: "苦味的东西在这座山上能卖出天价，你多囤点，别等涨上去了才想起去收。"
    },
    {
      id: 7, name: "三元山", biome: "矿脉与温泉",
      desc: "山体里嵌着三条颜色不一样的矿带，凿起来叮叮当当地响。温泉的热气整年往上冒，带着股硫磺味，温室里暖烘烘的，从来不冷。",
      plots: 16, moveCost: 2600000, startMoney: 0,
      berries: [40, 41, 42, 43, 44, 45, 46],
      bonus: { craftSpeed: 0.3, sell: 0.1 },
      bonusText: "温泉温室：加工速度 +30%，售价 +10%",
      tip: "加工速度就是钱。把工坊类的道具升满，这个钱花得值。"
    },
    {
      id: 8, name: "水晶洞穴", biome: "地下发光农场",
      desc: "洞顶挂着发光的水晶，照得没有白天黑夜，潮乎乎的。水滴偶尔从顶上落下来，落在石头上，哒地一声响。这里离地面远得很，可你睡着了，树果照样在长。",
      plots: 18, moveCost: 12000000, startMoney: 0,
      berries: [47, 48, 49, 50, 51, 52, 53],
      bonus: { offline: 0.5, offlineCap: 7200 },
      bonusText: "水晶光：离线收益 +50%，离线上限 +2小时",
      tip: "这洞里不用你盯着，睡一觉它自己就长。你记得回来收就行。"
    },
    {
      id: 9, name: "赤沙绿洲", biome: "沙漠中的绿洲",
      desc: "这里是西莉亚的故乡。沙子烫脚，风里带着股土腥味，绿洲边那一圈土却是凉的。她飞回来那天，阿特拉斯在沙丘上等了一整天。",
      plots: 20, moveCost: 60000000, startMoney: 0,
      berries: [54, 55, 56, 57, 58, 59],
      bonus: { all: 0.2 },
      bonusText: "故乡：全部收益 +20%",
      tip: "龙系树果只认这儿的沙，换到别的土里就养不活。到家了，西莉亚。"
    },
    {
      id: 10, name: "菲洛若亚天穹园", biome: "云海之上的天空花园",
      desc: "再往上就没土了，只有云，风大得能把身子吹歪。传说宝可梦会落在这儿歇脚，顺带买点东西走。",
      plots: 24, moveCost: 300000000, startMoney: 0,
      berries: [60, 61, 62, 63, 64, 65],
      bonus: { all: 0.5, rareSeed: 0.1 },
      bonusText: "天穹：全部收益 +50%，稀有种子掉落 +10%",
      tip: "这是最后一片田了。传说里的大家伙会来光顾，你把货备足些，别到时候手忙脚乱。"
    }
  ];

  G.REGION_BY_ID = {};
  G.REGIONS.forEach((r) => { G.REGION_BY_ID[r.id] = r; });

  // 图鉴/传说：祠堂不是农场，只作为传说常客的登场地点（后期内容）
  G.SHRINES = [
    { id: "groudon", name: "固拉多祠堂", region: 9, dex: 383, text: "沙子烫得能烙脚，热浪一阵阵地往上蒸。祠堂的石门开了一条缝。" },
    { id: "kyogre", name: "盖欧卡祠堂", region: 4, dex: 382, text: "涨潮时祠堂会淹掉一半，退潮后地上铺满贝壳，踩上去咔嚓咔嚓响。" },
    { id: "rayquaza", name: "天穹祭坛", region: 10, dex: 384, text: "云在脚下翻，风从石头缝里擦过去。祭坛的柱子上有道很旧的抓痕。" }
  ];

  G.regionOf = function (s) { return G.REGION_BY_ID[s.region] || G.REGION_BY_ID[1]; };
})();
