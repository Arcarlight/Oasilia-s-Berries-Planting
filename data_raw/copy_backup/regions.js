// 区域（镇子）。每个区域是一个"轮回段"：种树果 → 加工 → 解锁 6 位常客 → 付移民费搬家。
window.G = window.G || {};
(function () {
  G.REGIONS = [
    {
      id: 1, name: "繁盛之森", biome: "林间空地",
      desc: "林木间的软土，一脚踩下去能陷半个指节。欧亚西莉亚第一次在这里把种子按进地里。",
      plots: 4, moveCost: 0, startMoney: 0,
      berries: [1, 2, 3, 4, 5],
      bonus: { growSpeed: 0.1 },
      bonusText: "软土：生长速度 +10%",
      tip: "先买种子，把四块地都种满，再等第一次收获。"
    },
    {
      id: 2, name: "繁盛村", biome: "村口集市",
      desc: "树果摊子摆成长长一排的村子。来买果子的宝可梦比林子里的多得多。",
      plots: 6, moveCost: 1200, startMoney: 0,
      berries: [6, 7, 8, 9, 10, 11],
      bonus: { sell: 0.1 },
      bonusText: "集市：售价 +10%",
      tip: "常客开始出现了。他们只买自己爱吃的味道。"
    },
    {
      id: 3, name: "瀑布之森", biome: "水汽弥漫的溪谷",
      desc: "水声整天不停，叶子上永远挂着水珠。这里的树果长得比别处快。",
      plots: 8, moveCost: 6000, startMoney: 0,
      berries: [12, 13, 14, 15, 16, 17, 18],
      bonus: { growSpeed: 0.2 },
      bonusText: "水汽：生长速度 +20%",
      tip: "加工台的收益远高于生果。买配方，别舍不得钱。"
    },
    {
      id: 4, name: "盐风镇", biome: "海岛港口",
      desc: "风里带着盐。货船每天来两趟，什么都能卖出去，什么都卖得贵。",
      plots: 10, moveCost: 26000, startMoney: 0,
      berries: [19, 20, 21, 22, 23, 24, 25],
      bonus: { sell: 0.25 },
      bonusText: "港口：售价 +25%",
      tip: "该让阿特拉斯出门采购材料了，自己买的太贵。"
    },
    {
      id: 5, name: "沃雷奥斯岛", biome: "传说中的花田",
      desc: "岛上全是花。据说这里的花田是某只宝可梦睡着时呼吸长出来的。",
      plots: 12, moveCost: 120000, startMoney: 0,
      berries: [26, 27, 28, 29, 30, 31, 32],
      bonus: { rareSeed: 0.05, sell: 0.1 },
      bonusText: "花田：稀有种子掉落 +5%，售价 +10%",
      tip: "岛上的访客很挑，但出手也大方。"
    },
    {
      id: 6, name: "天顶山", biome: "高海拔梯田",
      desc: "云在脚下。昼夜温差大得能把果子冻出糖霜，苦味树果在这里格外值钱。",
      plots: 14, moveCost: 560000, startMoney: 0,
      berries: [33, 34, 35, 36, 37, 38, 39],
      bonus: { flavorSell: "苦", flavorBonus: 0.5 },
      bonusText: "霜降：苦味商品售价 +50%",
      tip: "苦味配方在这里能卖出天价。"
    },
    {
      id: 7, name: "三元山", biome: "矿脉与温泉",
      desc: "山体里嵌着三条不同颜色的矿带。温泉的热气让温室终年不冷。",
      plots: 16, moveCost: 2600000, startMoney: 0,
      berries: [40, 41, 42, 43, 44, 45, 46],
      bonus: { craftSpeed: 0.3, sell: 0.1 },
      bonusText: "温泉温室：加工速度 +30%，售价 +10%",
      tip: "加工速度就是钱。把工坊的道具升满。"
    },
    {
      id: 8, name: "水晶洞穴", biome: "地下发光农场",
      desc: "洞顶垂着发光的水晶，不分昼夜。这里离地面很远，但你睡着的时候它照样在长。",
      plots: 18, moveCost: 12000000, startMoney: 0,
      berries: [47, 48, 49, 50, 51, 52, 53],
      bonus: { offline: 0.5, offlineCap: 7200 },
      bonusText: "水晶光：离线收益 +50%，离线上限 +2小时",
      tip: "关掉页面也照样赚。记得回来看。"
    },
    {
      id: 9, name: "赤沙绿洲", biome: "沙漠中的绿洲",
      desc: "欧亚西莉亚的故乡。沙子烫脚，绿洲边上那一圈土却是凉的。她飞回来那天，阿特拉斯在沙丘上等了一整天。",
      plots: 20, moveCost: 60000000, startMoney: 0,
      berries: [54, 55, 56, 57, 58, 59],
      bonus: { all: 0.2 },
      bonusText: "故乡：全部收益 +20%",
      tip: "龙系树果只认这里的沙。"
    },
    {
      id: 10, name: "菲洛若亚天穹园", biome: "云海之上的天空花园",
      desc: "再往上就没有土了，只有云。传说宝可梦会落在这里歇脚，顺便买点东西。",
      plots: 24, moveCost: 300000000, startMoney: 0,
      berries: [60, 61, 62, 63, 64, 65],
      bonus: { all: 0.5, rareSeed: 0.1 },
      bonusText: "天穹：全部收益 +50%，稀有种子掉落 +10%",
      tip: "这是最后一片田。传说常客会来。"
    }
  ];

  G.REGION_BY_ID = {};
  G.REGIONS.forEach((r) => { G.REGION_BY_ID[r.id] = r; });

  // 图鉴/传说：祠堂不是农场，只作为传说常客的登场地点（后期内容）
  G.SHRINES = [
    { id: "groudon", name: "固拉多祠堂", region: 9, dex: 383, text: "沙子烫得能烙脚。祠堂的石门开着一条缝。" },
    { id: "kyogre", name: "盖欧卡祠堂", region: 4, dex: 382, text: "涨潮时祠堂会被淹掉一半，退潮时地上全是贝壳。" },
    { id: "rayquaza", name: "天穹祭坛", region: 10, dex: 384, text: "云在脚下翻。祭坛的柱子上一道很旧的抓痕。" }
  ];

  G.regionOf = function (s) { return G.REGION_BY_ID[s.region] || G.REGION_BY_ID[1]; };
})();
