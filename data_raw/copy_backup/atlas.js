// 阿特拉斯出品 · 材料 / 道具 / 出行事件 / 台词
// 世界观见 DESIGN.md 3.4：材料 → 阿特拉斯制作 → 道具。
// 文案以阿特拉斯（暴飞龙 ♂，铁匠）的口吻为主：沉稳、话少、做得多。喜欢欧亚西莉亚但从不直说，
//   关心都绕到工具细节上（磨过的边角、量过的壶把），说完就转头去干活。
// 欧亚西莉亚（沙漠蜻蜓 ♀）俏皮温柔，最爱文柚果，常把他逗得团团转；他每次都正经作答，答完才反应过来。
//
// effects 语义：effects[i] = 道具升到 Lv.(i+1) 后、相对「没有这件道具」的总加成（累计值）。
//   因此 effects[0] 是 Lv.1 的加成，effects[4] 是 Lv.5 的累计加成；
//   全部道具满足 effects[4] <= effects[0] * 6。
// mod 允许的键（仅此 14 个）：
//   clickWater clickSell growSpeed yieldAdd sellBonus affinity offlineBonus offlineCap
//   craftSpeed craftOutput idleRate helperSlot seedDiscount allBonus

window.G = window.G || {};

// ── 材料：杂货铺直接买（贵），或让阿特拉斯出门采购（便宜、有时间成本） ──────────
G.MATERIALS = [
  {
    id: "wood", name: "木料", price: 40,
    desc: "繁盛之森砍下来的整根原木，皮都没剥。沉，可什么都能搭。",
    trip: true
  },
  {
    id: "clay", name: "陶土", price: 90,
    desc: "溪沟边上挖的湿泥，捏得住形状，烧过以后敲起来是脆的。",
    trip: true
  },
  {
    id: "vine", name: "藤条", price: 160,
    desc: "柔韧的藤，编筐、扎架子、捆车轮，一样都少不了它。",
    trip: true
  },
  {
    id: "copper", name: "铜锭", price: 320,
    desc: "三元山矿脉里熔出来的铜锭。热的时候软，冷了就硬，得趁热敲。",
    trip: true
  },
  {
    id: "cloth", name: "粗布", price: 620,
    desc: "盐风镇织的粗布，挡风、垫筐、擦手，怎么用都不亏。",
    trip: true
  },
  {
    id: "resin", name: "松脂", price: 1200,
    desc: "松树伤口上凝住的树脂。黏得很——粘住一次就再也不会忘了。",
    trip: true
  },
  {
    id: "quartz", name: "石英砂", price: 2400,
    desc: "水晶洞穴外沿的亮砂，烧炉子、磨刀口、做灯罩都用得上。",
    trip: true
  },
  {
    id: "ash", name: "火山灰", price: 4600,
    desc: "三元山温泉口刮下来的灰。肥地，也能砌炉子，就是呛。",
    trip: true
  },
  {
    id: "salt", name: "深海盐", price: 8800,
    desc: "盐风镇的海里晒出来的粗盐。腌果子管用，换东西的时候也顶用。",
    trip: true
  },
  {
    id: "dragonscale", name: "龙鳞粉", price: 17000,
    desc: "龙系宝可梦换下来的旧鳞磨成的粉。他自己的那片一直留着，没舍得磨。",
    trip: true
  },
  {
    id: "mooncrystal", name: "月光水晶", price: 36000,
    desc: "水晶洞穴深处结的晶体，不见天光也亮，捏久了指尖会发凉。",
    trip: true
  },
  {
    id: "skygem", name: "天穹石", price: 90000,
    desc: "天穹园云海里落下来的石头。轻得不像石头，压不住，只能抱着。",
    trip: true
  }
];

G.MATERIAL_BY_ID = Object.fromEntries(G.MATERIALS.map(m => [m.id, m]));

// ── 道具：4 分类 × 6 件，覆盖 region 1~10，每件 5 级 ──────────────────────────
G.ITEMS = [
  // ===== 农具：点击浇水、生长速度、结果数 =====
  {
    id: "watering_can", name: "铜嘴洒水壶", cat: "农具", region: 1,
    desc: "木壶身，铜壶嘴。出水口收窄过，水流细，浇得到根，也不会把刚冒头的芽冲趴下。",
    flavor: "壶把是照她的手距做的。铜嘴敲歪的那只我自己留着用。",
    materials: { wood: 2, copper: 1 },
    craftTime: 60,
    effects: [
      { text: "点击浇水收益 +15%", mod: { clickWater: 0.15 } },
      { text: "点击浇水收益 +20%", mod: { clickWater: 0.20 } },
      { text: "点击浇水收益 +26%", mod: { clickWater: 0.26 } },
      { text: "点击浇水收益 +33%", mod: { clickWater: 0.33 } },
      { text: "点击浇水收益 +40%", mod: { clickWater: 0.40 } }
    ]
  },
  {
    id: "soft_soil", name: "松软沃土", cat: "农具", region: 2,
    desc: "粗土过筛，掺灰，翻三遍。松到用手掌按得下坑，苗才肯往下扎。",
    flavor: "筛到天黑，背上全是灰。她递布过来，我手上都是土，就没敢多握。",
    materials: { clay: 3, wood: 1 },
    craftTime: 120,
    effects: [
      { text: "生长速度 +10%", mod: { growSpeed: 0.10 } },
      { text: "生长速度 +14%", mod: { growSpeed: 0.14 } },
      { text: "生长速度 +18%", mod: { growSpeed: 0.18 } },
      { text: "生长速度 +23%", mod: { growSpeed: 0.23 } },
      { text: "生长速度 +28%", mod: { growSpeed: 0.28 } }
    ]
  },
  {
    id: "copper_hoe", name: "铜背小锄", cat: "农具", region: 4,
    desc: "柄短，刃宽，照她的身量做的。挖垄、断根、起苗，一把就够。",
    flavor: "刃口磨了四遍。木柄缠了两道粗布，她握久了不硌手。",
    materials: { copper: 4, wood: 2 },
    craftTime: 240,
    effects: [
      { text: "每次收获额外 +1 果", mod: { yieldAdd: 1 } },
      { text: "每次收获额外 +1 果", mod: { yieldAdd: 1 } },
      { text: "每次收获额外 +1 果", mod: { yieldAdd: 1 } },
      { text: "每次收获额外 +2 果", mod: { yieldAdd: 2 } },
      { text: "每次收获额外 +2 果", mod: { yieldAdd: 2 } }
    ]
  },
  {
    id: "dew_frame", name: "集露木架", cat: "农具", region: 5,
    desc: "架上绷布，夜里接露，天亮一拧就是一壶。花田水汽重，这架一天能攒不少。",
    flavor: "布绷紧了才接得住露。绷坏两块，第三块没松。她说我倔，那我就倔。",
    materials: { wood: 5, cloth: 3, copper: 2 },
    craftTime: 300,
    effects: [
      { text: "点击浇水收益 +18%", mod: { clickWater: 0.18 } },
      { text: "点击浇水收益 +24%", mod: { clickWater: 0.24 } },
      { text: "点击浇水收益 +31%", mod: { clickWater: 0.31 } },
      { text: "点击浇水收益 +39%", mod: { clickWater: 0.39 } },
      { text: "点击浇水收益 +48%", mod: { clickWater: 0.48 } }
    ]
  },
  {
    id: "spring_pipe", name: "温泉引水管", cat: "农具", region: 7,
    desc: "陶管一节一节接到田头，引温泉水。水是温的，苗长得比别处快。",
    flavor: "接缝漏了三处，用松脂糊上的。手上那层黏到第三天才自己掉。",
    materials: { copper: 6, clay: 5, quartz: 2 },
    craftTime: 720,
    effects: [
      { text: "生长速度 +12%", mod: { growSpeed: 0.12 } },
      { text: "生长速度 +17%", mod: { growSpeed: 0.17 } },
      { text: "生长速度 +22%，挂机产出 +5%", mod: { growSpeed: 0.22, idleRate: 0.05 } },
      { text: "生长速度 +28%，挂机产出 +7%", mod: { growSpeed: 0.28, idleRate: 0.07 } },
      { text: "生长速度 +34%，挂机产出 +9%", mod: { growSpeed: 0.34, idleRate: 0.09 } }
    ]
  },
  {
    id: "dragon_plow", name: "龙牙深耕犁", cat: "农具", region: 9,
    desc: "犁头掺了龙鳞粉，啃得开赤沙压硬的土层。她是从沙漠里飞过来才找到这块土的，那这土就得翻透。",
    flavor: "淬火时手背燎了一下，不重。她要是问，就说是火星子崩的。",
    materials: { dragonscale: 3, copper: 8, wood: 6 },
    craftTime: 1500,
    effects: [
      { text: "每次收获额外 +1 果", mod: { yieldAdd: 1 } },
      { text: "每次收获额外 +2 果", mod: { yieldAdd: 2 } },
      { text: "每次收获额外 +2 果，生长速度 +10%", mod: { yieldAdd: 2, growSpeed: 0.10 } },
      { text: "每次收获额外 +2 果，生长速度 +14%", mod: { yieldAdd: 2, growSpeed: 0.14 } },
      { text: "每次收获额外 +3 果，生长速度 +18%", mod: { yieldAdd: 3, growSpeed: 0.18 } }
    ]
  },

  // ===== 商铺：点击叫卖、售价、好感、离线 =====
  {
    id: "vine_cart", name: "藤编手推车", cat: "商铺", region: 1,
    desc: "四个木轮，藤条编的斗。推到村口放下就是摊子，收摊推回院里。",
    flavor: "轮子调了三遍才不歪。斗编得浅，她挑果子不用弯腰。",
    materials: { vine: 3, wood: 1 },
    craftTime: 90,
    effects: [
      { text: "点击叫卖收益 +15%", mod: { clickSell: 0.15 } },
      { text: "点击叫卖收益 +20%", mod: { clickSell: 0.20 } },
      { text: "点击叫卖收益 +26%", mod: { clickSell: 0.26 } },
      { text: "点击叫卖收益 +33%", mod: { clickSell: 0.33 } },
      { text: "点击叫卖收益 +40%", mod: { clickSell: 0.40 } }
    ]
  },
  {
    id: "wood_sign", name: "木质招牌", cat: "商铺", region: 2,
    desc: "厚木板一块，边角刻了树果的样子。挂得高，远处也看得见。",
    flavor: "字是刻的，不是写的。刻坏的那块现在垫在灶边。",
    materials: { wood: 4, resin: 1 },
    craftTime: 150,
    effects: [
      { text: "全部售价 +8%", mod: { sellBonus: 0.08 } },
      { text: "全部售价 +11%", mod: { sellBonus: 0.11 } },
      { text: "全部售价 +15%", mod: { sellBonus: 0.15 } },
      { text: "全部售价 +19%", mod: { sellBonus: 0.19 } },
      { text: "全部售价 +24%", mod: { sellBonus: 0.24 } }
    ]
  },
  {
    id: "fruit_basket", name: "藤条果筐", cat: "商铺", region: 4,
    desc: "口小底大，装得多又不压果。筐沿留了一圈刻痕，是常客自己划的记号。",
    flavor: "编到第七个才顺手。特意留了个小的在灶台上，装文柚果正好。",
    materials: { vine: 5, cloth: 2 },
    craftTime: 300,
    effects: [
      { text: "全部售价 +10%", mod: { sellBonus: 0.10 } },
      { text: "全部售价 +14%", mod: { sellBonus: 0.14 } },
      { text: "全部售价 +18%，好感获取 +8%", mod: { sellBonus: 0.18, affinity: 0.08 } },
      { text: "全部售价 +23%，好感获取 +11%", mod: { sellBonus: 0.23, affinity: 0.11 } },
      { text: "全部售价 +28%，好感获取 +14%", mod: { sellBonus: 0.28, affinity: 0.14 } }
    ]
  },
  {
    id: "bell_counter", name: "铜铃摊位", cat: "商铺", region: 5,
    desc: "摊角挂一串铜铃，风过就响。听着响过来的常客，话会比平时多几句。",
    flavor: "铃是一个一个铸的，音高都不重样。铸废的两只挂在门上，她进出碰一下，我在炉边就知道。",
    materials: { copper: 5, cloth: 3, resin: 1 },
    craftTime: 420,
    effects: [
      { text: "好感获取 +12%", mod: { affinity: 0.12 } },
      { text: "好感获取 +17%", mod: { affinity: 0.17 } },
      { text: "好感获取 +22%", mod: { affinity: 0.22 } },
      { text: "好感获取 +28%", mod: { affinity: 0.28 } },
      { text: "好感获取 +34%", mod: { affinity: 0.34 } }
    ]
  },
  {
    id: "salt_stall", name: "盐风货架", cat: "商铺", region: 7,
    desc: "海风腌过的木架，摆得高，防潮，也防偷嘴的小家伙。左边空着一格留给回头客。",
    flavor: "搭架子的时候被浪打了一身，盐干在身上硬得像壳。回去她拿热水给我刷了半天。",
    materials: { wood: 8, salt: 2, cloth: 5 },
    craftTime: 900,
    effects: [
      { text: "全部售价 +12%", mod: { sellBonus: 0.12 } },
      { text: "全部售价 +17%", mod: { sellBonus: 0.17 } },
      { text: "全部售价 +22%，离线收益 +8%", mod: { sellBonus: 0.22, offlineBonus: 0.08 } },
      { text: "全部售价 +28%，离线收益 +11%", mod: { sellBonus: 0.28, offlineBonus: 0.11 } },
      { text: "全部售价 +34%，离线收益 +14%", mod: { sellBonus: 0.34, offlineBonus: 0.14 } }
    ]
  },
  {
    id: "sky_pavilion", name: "天穹展台", cat: "商铺", region: 10,
    desc: "云上的摊子。台面是月光水晶磨的，果子摆上去像自己会亮。",
    flavor: "台面磨了两天。她说太亮，晃眼。我说那正好，路过的都得看两眼。",
    materials: { skygem: 1, cloth: 10, mooncrystal: 2 },
    craftTime: 2700,
    effects: [
      { text: "全部售价 +15%", mod: { sellBonus: 0.15 } },
      { text: "全部售价 +21%", mod: { sellBonus: 0.21 } },
      { text: "全部售价 +28%，好感获取 +10%", mod: { sellBonus: 0.28, affinity: 0.10 } },
      { text: "全部售价 +36%，好感获取 +13%", mod: { sellBonus: 0.36, affinity: 0.13 } },
      { text: "全部售价 +45%，好感获取 +16%", mod: { sellBonus: 0.45, affinity: 0.16 } }
    ]
  },

  // ===== 工坊：加工速度、加工产出、挂机产出 =====
  {
    id: "stone_mill", name: "石磨", cat: "工坊", region: 2,
    desc: "两块青石对磨，推杆加长过。磨出来的浆细，不出渣。",
    flavor: "石料从山下扛的，一段一段，路上歇了四回。磨盘调平三遍才成。",
    materials: { copper: 3, wood: 2 },
    craftTime: 180,
    effects: [
      { text: "加工速度 +12%", mod: { craftSpeed: 0.12 } },
      { text: "加工速度 +17%", mod: { craftSpeed: 0.17 } },
      { text: "加工速度 +22%", mod: { craftSpeed: 0.22 } },
      { text: "加工速度 +28%", mod: { craftSpeed: 0.28 } },
      { text: "加工速度 +34%", mod: { craftSpeed: 0.34 } }
    ]
  },
  {
    id: "clay_jar", name: "陶土腌罐", cat: "工坊", region: 3,
    desc: "厚壁大肚，封口压得死。腌着的东西不出错，开罐时常能多出一份。",
    flavor: "烧窑那晚守着没睡。开窑裂了两个，剩下的都成。裂的那个正好留着腌咸菜。",
    materials: { clay: 4, quartz: 1 },
    craftTime: 180,
    effects: [
      { text: "加工产出额外数量概率 +6%", mod: { craftOutput: 0.06 } },
      { text: "加工产出额外数量概率 +9%", mod: { craftOutput: 0.09 } },
      { text: "加工产出额外数量概率 +12%", mod: { craftOutput: 0.12 } },
      { text: "加工产出额外数量概率 +16%", mod: { craftOutput: 0.16 } },
      { text: "加工产出额外数量概率 +20%", mod: { craftOutput: 0.20 } }
    ]
  },
  {
    id: "water_wheel", name: "木轮水车", cat: "工坊", region: 4,
    desc: "溪水推轮子，轮子带磨盘。不用守着，它自己一直在转。",
    flavor: "轮辐角度算错过一次，转起来跟瘸腿一样。改到后半夜才匀。",
    materials: { wood: 6, copper: 3 },
    craftTime: 360,
    effects: [
      { text: "加工速度 +15%", mod: { craftSpeed: 0.15 } },
      { text: "加工速度 +21%", mod: { craftSpeed: 0.21 } },
      { text: "加工速度 +28%", mod: { craftSpeed: 0.28 } },
      { text: "加工速度 +36%", mod: { craftSpeed: 0.36 } },
      { text: "加工速度 +45%", mod: { craftSpeed: 0.45 } }
    ]
  },
  {
    id: "windmill", name: "风车磨坊", cat: "工坊", region: 6,
    desc: "架在天顶山风口上。风大，扇叶底下加了铁箍，一天不停。",
    flavor: "装扇叶那天风太猛，我抱着柱子挂了半个时辰。手还酸。这个别跟她说。",
    materials: { wood: 8, cloth: 4, copper: 4 },
    craftTime: 600,
    effects: [
      { text: "挂机产出 +10%", mod: { idleRate: 0.10 } },
      { text: "挂机产出 +14%", mod: { idleRate: 0.14 } },
      { text: "挂机产出 +18%，加工速度 +10%", mod: { idleRate: 0.18, craftSpeed: 0.10 } },
      { text: "挂机产出 +23%，加工速度 +14%", mod: { idleRate: 0.23, craftSpeed: 0.14 } },
      { text: "挂机产出 +28%，加工速度 +18%", mod: { idleRate: 0.28, craftSpeed: 0.18 } }
    ]
  },
  {
    id: "crystal_kiln", name: "水晶窑", cat: "工坊", region: 8,
    desc: "窑壁嵌了一圈月光水晶，底下有火就整天亮。地下不分昼夜，这窑也不用等天亮。",
    flavor: "水晶按纹路嵌的，歪一颗整圈就不好看。拆了重来两回。慢是慢了点。",
    materials: { quartz: 6, clay: 6, ash: 2 },
    craftTime: 1200,
    effects: [
      { text: "加工产出额外数量概率 +8%", mod: { craftOutput: 0.08 } },
      { text: "加工产出额外数量概率 +11%", mod: { craftOutput: 0.11 } },
      { text: "加工产出额外数量概率 +15%，加工速度 +12%", mod: { craftOutput: 0.15, craftSpeed: 0.12 } },
      { text: "加工产出额外数量概率 +19%，加工速度 +16%", mod: { craftOutput: 0.19, craftSpeed: 0.16 } },
      { text: "加工产出额外数量概率 +24%，加工速度 +20%", mod: { craftOutput: 0.24, craftSpeed: 0.20 } }
    ]
  },
  {
    id: "dragon_forge", name: "龙焰锻炉", cat: "工坊", region: 10,
    desc: "炉膛掺火山灰，火苗带色，烧得匀，也耐烧。云上冷，这炉一直是热的。",
    flavor: "开炉第一件把眉毛燎了。她看了我一眼没说话，转身去拿药。下次记着低头。",
    materials: { ash: 8, dragonscale: 4, quartz: 8 },
    craftTime: 2400,
    effects: [
      { text: "加工速度 +18%", mod: { craftSpeed: 0.18 } },
      { text: "加工速度 +25%", mod: { craftSpeed: 0.25 } },
      { text: "加工速度 +33%，加工产出额外数量概率 +8%", mod: { craftSpeed: 0.33, craftOutput: 0.08 } },
      { text: "加工速度 +42%，加工产出额外数量概率 +11%，挂机产出 +10%", mod: { craftSpeed: 0.42, craftOutput: 0.11, idleRate: 0.10 } },
      { text: "加工速度 +52%，加工产出额外数量概率 +14%，挂机产出 +14%", mod: { craftSpeed: 0.52, craftOutput: 0.14, idleRate: 0.14 } }
    ]
  },

  // ===== 帮手：帮手槽位、挂机、全属性 =====
  {
    id: "helper_bell", name: "帮手铃", cat: "帮手", region: 1,
    desc: "摇一下，来帮忙的都听得见。铃舌包了布，响而不吵。",
    flavor: "铃舌包了三层粗布。远处听得见就够了，不必吵。",
    materials: { copper: 2, vine: 1 },
    craftTime: 120,
    effects: [
      { text: "挂机产出 +10%", mod: { idleRate: 0.10 } },
      { text: "挂机产出 +14%", mod: { idleRate: 0.14 } },
      { text: "挂机产出 +18%", mod: { idleRate: 0.18 } },
      { text: "挂机产出 +23%", mod: { idleRate: 0.23 } },
      { text: "挂机产出 +28%", mod: { idleRate: 0.28 } }
    ]
  },
  {
    id: "grass_wagon", name: "果筐车", cat: "帮手", region: 3,
    desc: "两排筐的平板车，推一趟能收一整垄。硬木轮，湿泥地也不陷。",
    flavor: "车板刨平了，筐底垫布，果子磕不坏。轴里上过松脂，推着轻。",
    materials: { vine: 4, wood: 3 },
    craftTime: 240,
    effects: [
      { text: "帮手槽位 +1", mod: { helperSlot: 1 } },
      { text: "帮手槽位 +1", mod: { helperSlot: 1 } },
      { text: "帮手槽位 +2，挂机产出 +6%", mod: { helperSlot: 2, idleRate: 0.06 } },
      { text: "帮手槽位 +2，挂机产出 +8%", mod: { helperSlot: 2, idleRate: 0.08 } },
      { text: "帮手槽位 +2，挂机产出 +10%", mod: { helperSlot: 2, idleRate: 0.10 } }
    ]
  },
  {
    id: "dragon_whistle", name: "龙笛", cat: "帮手", region: 6,
    desc: "山上风大，喊话传不远，吹这个就行。音低，传得远。",
    flavor: "第一支吹不响，当柴烧了。第二支响，就是难听。第三支才成调。",
    materials: { resin: 3, dragonscale: 1 },
    craftTime: 600,
    effects: [
      { text: "帮手槽位 +1", mod: { helperSlot: 1 } },
      { text: "帮手槽位 +1", mod: { helperSlot: 1 } },
      { text: "帮手槽位 +1，好感获取 +8%", mod: { helperSlot: 1, affinity: 0.08 } },
      { text: "帮手槽位 +2，好感获取 +11%", mod: { helperSlot: 2, affinity: 0.11 } },
      { text: "帮手槽位 +2，好感获取 +14%", mod: { helperSlot: 2, affinity: 0.14 } }
    ]
  },
  {
    id: "moonlit_nest", name: "月光巢架", cat: "帮手", region: 8,
    desc: "洞穴里搭的架子，水晶照出一圈暖光。帮手累了在上头歇，睡醒接着干。",
    flavor: "架子高度照最小的那只调的。它跳上去试了试，回头看我一眼。够得着就好。",
    materials: { cloth: 8, mooncrystal: 1, resin: 4 },
    craftTime: 1500,
    effects: [
      { text: "挂机产出 +12%", mod: { idleRate: 0.12 } },
      { text: "挂机产出 +17%", mod: { idleRate: 0.17 } },
      { text: "挂机产出 +22%，离线上限 +1800 秒", mod: { idleRate: 0.22, offlineCap: 1800 } },
      { text: "挂机产出 +28%，离线上限 +5400 秒", mod: { idleRate: 0.28, offlineCap: 5400 } },
      { text: "挂机产出 +34%，离线上限 +9000 秒", mod: { idleRate: 0.34, offlineCap: 9000 } }
    ]
  },
  {
    id: "sand_sledge", name: "沙舟拖板", cat: "帮手", region: 9,
    desc: "赤沙上用的拖板，底面镶了薄铜条，沙里滑得动。拉一趟顶扛十趟。",
    flavor: "铜条一点一点敲平贴上去的，敲了一夜。第二天睡到中午——别让她知道。",
    materials: { wood: 10, dragonscale: 2, cloth: 6 },
    craftTime: 1800,
    effects: [
      { text: "帮手槽位 +1", mod: { helperSlot: 1 } },
      { text: "帮手槽位 +1", mod: { helperSlot: 1 } },
      { text: "帮手槽位 +2，挂机产出 +8%", mod: { helperSlot: 2, idleRate: 0.08 } },
      { text: "帮手槽位 +2，挂机产出 +11%", mod: { helperSlot: 2, idleRate: 0.11 } },
      { text: "帮手槽位 +2，挂机产出 +14%", mod: { helperSlot: 2, idleRate: 0.14 } }
    ]
  },
  {
    id: "dragon_wing_amulet", name: "龙之翼护符", cat: "帮手", region: 10,
    desc: "我自己换下来的旧翼膜，压进水晶里，边上裹了天穹石。戴着它，田里哪个环节都快一点、多一点。",
    flavor: "做这个做了很久。翼膜是我的，水晶是我磨的，没让谁搭手。……你戴着，别摘。",
    materials: { dragonscale: 6, mooncrystal: 4, skygem: 2 },
    craftTime: 3600,
    effects: [
      { text: "全收益 +6%", mod: { allBonus: 0.06 } },
      { text: "全收益 +9%", mod: { allBonus: 0.09 } },
      { text: "全收益 +12%", mod: { allBonus: 0.12 } },
      { text: "全收益 +16%", mod: { allBonus: 0.16 } },
      { text: "全收益 +20%", mod: { allBonus: 0.20 } }
    ]
  }
];

G.ITEM_BY_ID = Object.fromEntries(G.ITEMS.map(i => [i.id, i]));

// ── 阿特拉斯出行（采购）随机事件 ─────────────────────────────────────────────
// engine.js 的 finishTrip 每次出行必抽一条事件，所以这张权重表 = 实际出货概率。
// 按 DESIGN.md 3.4 配平：额外材料 116/332 ≈ 35%，稀有种子 50/332 ≈ 15%，其余 50% 是无额外收益的碎碎念。
G.ATLAS_EVENTS = [
  // 带回材料（合计权重 116）
  {
    id: "trip_timber", weight: 16,
    text: "道边一段枯枝被风刮倒了，锯成段扛回来一捆。肩膀压出两道印，明天就消。",
    effect: { material: "wood", count: 4 }
  },
  {
    id: "trip_clay_slip", weight: 15,
    text: "溪沟边的泥好挖，就是滑。滑了一跤，泥糊了满背——一点没糟蹋，全带回来了。",
    effect: { material: "clay", count: 5 }
  },
  {
    id: "trip_vine_gift", weight: 15,
    text: "有个草系的在编筐，篮子口破了他自己没留神。我帮他补了两道，他硬塞给我一把藤条。",
    effect: { material: "vine", count: 5 }
  },
  {
    id: "trip_copper_clear", weight: 14,
    text: "三元山那间老锻铺在清仓。铜锭按堆卖，我挑了成色匀的，价谈到七成。",
    effect: { material: "copper", count: 3 }
  },
  {
    id: "trip_cloth_trade", weight: 14,
    text: "盐风镇的织工要挪货架，我搭了把手，换回三卷粗布。她要多给一卷，我没要。",
    effect: { material: "cloth", count: 3 }
  },
  {
    id: "trip_resin_sticky", weight: 14,
    text: "取松脂的时候糊了一整只爪子。洗不掉，这两天别让我碰布。",
    effect: { material: "resin", count: 2 }
  },
  {
    id: "trip_salt_wave", weight: 14,
    text: "海边晒盐的摊子被浪打翻了，我帮着扶起来。对方分我一包盐，推了两次没推掉。",
    effect: { material: "salt", count: 1 }
  },
  {
    id: "trip_scale_bargain", weight: 14,
    text: "跟一条脾气不好的龙磨了半天价。他最后脱了片旧鳞给我，说这叫本钱。这份我记着。",
    effect: { material: "dragonscale", count: 1 }
  },

  // 带回稀有种子（合计权重 50）
  {
    id: "trip_seed_pocket", weight: 13,
    text: "回来路上有颗种子从口袋里滚出来。多的。谁塞的我不知道。",
    effect: { seed: 1, count: 1 }
  },
  {
    id: "trip_seed_trade", weight: 13,
    text: "村口换的种子。我用一只旧篮子换的，对方直点头。",
    effect: { seed: 1, count: 1 }
  },
  {
    id: "trip_seed_storm", weight: 12,
    text: "半路下暴雨，钻进树洞躲着。脚边冲下来几颗种子，我捡了。",
    effect: { seed: 1, count: 1 }
  },
  {
    id: "trip_seed_barter", weight: 12,
    text: "拿两块木料换的。挑了半天，我挑了一颗她大概会喜欢的。",
    effect: { seed: 1, count: 1 }
  },

  // 只有碎碎念（合计权重 166）
  {
    id: "trip_lost", weight: 28,
    text: "瀑布之森绕了两圈半才出来。绕出来先买了两个文柚果——她爱吃这个，不能空手回去。"
  },
  {
    id: "trip_rain_shelter", weight: 28,
    text: "雨太大，在岩棚底下等停。等了很久。背上的东西一点没湿，这就够了。"
  },
  {
    id: "trip_audience", weight: 28,
    text: "几个小家伙围过来看我修东西，看得很认真。我把手上的活儿给他们讲了一遍，讲完东西忘买了。"
  },
  {
    id: "trip_ash_cough", weight: 28,
    text: "温泉口那阵风往我脸上刮。咳了半天，想装一袋灰，一开口全吹跑了。"
  },
  {
    id: "trip_bright_sand", weight: 27,
    text: "水晶洞穴外头摆摊的说他的砂子亮得能卖钱。我看了半天，是挺亮。买了一把，回来给你当摆件。"
  },
  {
    id: "trip_little_follower", weight: 27,
    text: "有只小家伙一路跟着我，跟到门口就停了。我回头看，它跑了。到现在不知道它要什么。"
  }
];

// ── 各阶段通用台词 ────────────────────────────────────────────────────────────
G.ATLAS_LINES = {
  idle: [
    "你忙你的。我在这儿坐会儿，不碍事。",
    "……这堆料我看了一下午，还能再搭个架子出来。",
    "手里有活，站着也算歇。",
    "她说我的角歪了一点。我摸了两遍，是正的。她笑了半天。……我到现在也没弄清哪里好笑。",
    "——啊？哦。你说什么都行，我听着。"
  ],
  click: [
    "浇吧。桶我提满的，你不用使劲。",
    "叫卖不用喊那么响，把筐往前推一推就行。",
    "手稳一点。水壶是铜的，不是石头。",
    "她说：手劲这么小还敢种地。我说地不看手劲，看耐性。她笑得更厉害了。",
    "——她刚才是不是又在逗我。……算了，接着浇。"
  ],
  harvest: [
    "这一批比上一批沉。土养得好，不是我的功劳。",
    "放筐里，别摞太高，压坏了可惜。",
    "挑两颗最圆的放一边。……别问，我有用。",
    "收完歇一会儿。地跑不掉。",
    "她说：你搬得比帮手快。我说替自己家搬的和替别家搬的不一样。说完才想起来，这话不该说。"
  ],
  craft_start: [
    "让开一点，我要动锤子。",
    "料点过两遍，够。",
    "这活儿我熟，你去看田。",
    "别催。急火出来的东西不经用。",
    "——她说：慢慢做，我等着看你做完。……那我就慢慢做。"
  ],
  craft_done: [
    "做好了。边角都磨过，你拿的时候别攥太紧。",
    "敲完了。手上这点印子跟活儿没关系。",
    "用坏了拿回来，我再修。",
    "……还行吧。她说好才算好。",
    "她刚说好看。她每次都这么说。不过铁匠听得出哪句是客气，哪句不是。"
  ],
  trip_start: [
    "我出门了。单子上的东西，一样不会漏。",
    "天黑前回来。晚了你就先睡。",
    "田你看着，路我看着。",
    "清单看了三遍。这次不多买。……大概。",
    "——她说：早点回来，文柚果给你留了两个。……那我走快一点。"
  ],
  trip_return: [
    "回来了。东西在背上，全在。",
    "路上有点事，东西没少。别的别问。",
    "给你。手有点抖，是扛的。",
    "这趟价谈得不亏。",
    "——她说：怎么又晒成这样。我说路上没遮的。她转身去拿药了。"
  ],
  prestige: [
    "搬就搬。土在哪儿，家就在哪儿。",
    "这块地干完了。下一块只会更好。",
    "我装了三袋土。别拦，这是本钱。",
    "你决定，我搬。",
    "她说：到了那边你还做铁匠吗。我说做。……她问的其实是别的，我答慢了。"
  ],
  region_unlock: [
    "新地方。我先去踩一圈，看哪里能落平地。",
    "图上标得含糊，实地大得多。",
    "去看看。土不行我再往远飞。",
    "这边的风土不一样，得先试一块地。",
    "——她说：这次别再迷路了。我说上回也不算迷路。她笑了一路。"
  ],
  offline: [
    "你不在的时候活儿都干完了，账记着。",
    "熟的那几颗我收了，放在阴凉处。",
    "文柚果带了回来，搁在陶罐边上。",
    "一垄都没少，你放心。",
    "路上跑了几趟，腿是酸，歇一歇就好。"
  ]
};
