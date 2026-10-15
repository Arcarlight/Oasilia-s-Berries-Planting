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
    desc: "繁盛之森砍下来的整根原木，皮都没剥。沉是沉，扛着压肩膀，可什么都能搭。",
    trip: true
  },
  {
    id: "clay", name: "陶土", price: 90,
    desc: "溪沟边上挖的湿泥，捏得住形状。烧过以后敲起来是脆的，听个响就知道烧透没。",
    trip: true
  },
  {
    id: "vine", name: "藤条", price: 160,
    desc: "柔韧的藤条。编筐、扎架子、捆车轮，哪一样都少不了它。",
    trip: true
  },
  {
    id: "copper", name: "铜锭", price: 320,
    desc: "三元山矿脉里熔出来的铜锭。热的时候软，冷下来就硬，得趁热敲，等凉了就敲不动了。",
    trip: true
  },
  {
    id: "cloth", name: "粗布", price: 620,
    desc: "盐风镇织的粗布。挡风、垫筐、擦手，怎么用都不亏。",
    trip: true
  },
  {
    id: "resin", name: "松脂", price: 1200,
    desc: "松树伤口上凝住的树脂。黏得很——粘住一次就再也不会忘了。",
    trip: true
  },
  {
    id: "quartz", name: "石英砂", price: 2400,
    desc: "水晶洞穴外沿的亮砂。烧炉子、磨刀口、做灯罩，都用得上。",
    trip: true
  },
  {
    id: "ash", name: "火山灰", price: 4600,
    desc: "三元山温泉口刮下来的灰。能肥地，也能砌炉子。就是呛得慌，装袋的时候别迎着风。",
    trip: true
  },
  {
    id: "salt", name: "深海盐", price: 8800,
    desc: "盐风镇的海里晒出来的粗盐。腌果子管用，换东西的时候也顶用。",
    trip: true
  },
  {
    id: "dragonscale", name: "龙鳞粉", price: 17000,
    desc: "龙系宝可梦换下来的旧鳞，磨成的粉。他自己的那片一直留着，没舍得磨。",
    trip: true
  },
  {
    id: "mooncrystal", name: "月光水晶", price: 36000,
    desc: "水晶洞穴深处结的晶体，不照太阳也亮。捏久了，指尖会发凉。",
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
    desc: "壶身我用的是木头，壶嘴是我拿铜敲出来的。出水口我收窄过，水流细，浇得到根，也不会把刚冒头的芽冲趴下。",
    flavor: "壶把是照你的手距做的。铜嘴敲歪的那只我没扔，自己留着用了。",
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
    desc: "我把粗土过了筛，掺上灰，翻了三遍。松到用手掌按得下坑，苗才肯往下扎。",
    flavor: "我筛到天黑，背上全是灰。你递布过来，我手上都是土，就没敢多握。",
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
    desc: "柄我做得短，刃留得宽，都是照你的身量来的。挖垄、断根、起苗，这一把就够。",
    flavor: "刃口我磨了四遍。木柄我缠了两道粗布，你手小，握久了不硌手。",
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
    desc: "我在这架子上绷了布，夜里接露，天亮一拧就是一壶。花田的水汽重，这架一天能攒不少。",
    flavor: "布得绷紧了才接得住露。我绷坏了两块布，第三块才没松。你说我倔，那我就倔。",
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
    desc: "我把陶管一节一节接到田头，引的是温泉水。水是温的，苗就长得比别处快。",
    flavor: "接缝漏了三处，我全用松脂糊上了。手上那层黏东西，到第三天才自己掉。",
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
    desc: "犁头里我掺了龙鳞粉，啃得开赤沙压硬的土层。你是打沙漠那边飞过来才找到这块土的，那这土就得翻透。",
    flavor: "淬火的时候我手背燎了一下，不重。你别盯着看就行，过两天就下去了。",
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
    desc: "斗是我拿藤条编的，底下装了四个木轮。推到村口一放就是摊子，收摊再推回院里。",
    flavor: "轮子我调了三遍才不歪。斗我编得浅一点，你挑果子不用弯腰。",
    materials: { vine: 3, wood: 1 },
    craftTime: 90,
    effects: [
      { text: "【自动出货】摊位每秒自动卖掉 1 个生果；点击叫卖收益 +15%", mod: { idleRate: 0.06, clickSell: 0.15 } },
      { text: "自动出货加快；点击叫卖收益 +20%", mod: { idleRate: 0.10, clickSell: 0.20 } },
      { text: "自动出货加快；点击叫卖收益 +26%", mod: { idleRate: 0.14, clickSell: 0.26 } },
      { text: "自动出货加快；点击叫卖收益 +33%", mod: { idleRate: 0.17, clickSell: 0.33 } },
      { text: "自动出货加快；点击叫卖收益 +40%", mod: { idleRate: 0.20, clickSell: 0.40 } }
    ]
  },
  {
    id: "wood_sign", name: "木质招牌", cat: "商铺", region: 2,
    desc: "我找了块厚木板，边角刻上树果的样子。挂得高，老远就看得见。",
    flavor: "字是刻的，不是写的。刻坏的那块我没扔，现在垫在灶边。",
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
    desc: "这筐我编成口小底大，装得多，又不压着果。筐沿留了一圈刻痕，是常客自己划的记号。",
    flavor: "我编到第七个才顺手。我特意留了个小的搁在灶台上，装文柚果正好。",
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
    desc: "我在摊角挂了一串铜铃，风一过就响。听着铃声找过来的常客，话都比平时多几句。",
    flavor: "铃是一个一个铸的，音高都不重样。铸废的两只挂在门上，你进出碰一下，我在炉边就知道。",
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
    desc: "木架被海风腌过，我摆得高，防潮，也防偷嘴的小家伙。左边我空着一格，留给回头客。",
    flavor: "我搭架子的时候被浪打了一身，盐干在身上硬得像壳。回去你拿热水给我刷了半天。",
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
    desc: "这摊子我架在云上。台面是我拿月光水晶磨的，果子摆上去，像自己会发光。",
    flavor: "台面我磨了两天。你说太亮，晃眼。我说那正好，路过的都得停下来看两眼。",
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
    desc: "我拿两块青石对磨，推杆我又加长过。磨出来的浆细，不出渣。",
    flavor: "石料是我从山下扛回来的，一段一段，路上歇了四回。磨盘我调平了三遍才成。",
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
    desc: "这罐子我烧成厚壁大肚，封口压得死。腌着的东西不出错，开罐时常能多出一份。",
    flavor: "烧窑那晚我守着没睡。开窑的时候裂了两个，剩下的都成了。裂的那个我没舍得砸，正好留着腌咸菜。",
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
    desc: "溪水推着轮子，轮子再带着磨盘，不用我守着，它自己就一直在转。",
    flavor: "轮辐角度我算错过一次，转起来跟瘸腿一样。我改到后半夜才匀。",
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
    desc: "我把磨坊架在天顶山风口上。那儿风大，我在扇叶底下加了铁箍，一天到晚转个不停。",
    flavor: "装扇叶那天风太猛，我抱着柱子挂了半个时辰，到现在手还发酸。……不说了，反正装上了，转得挺稳。",
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
    desc: "我在窑壁嵌了一圈月光水晶，底下有火就整天亮。地底下不分白天黑夜，这窑也不用等天亮。",
    flavor: "水晶是照着纹路嵌的，歪一颗整圈就不好看。我拆了重来两回。慢是慢了点，不过最后整圈都齐。",
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
    desc: "炉膛里我掺了火山灰，火苗带色，烧得匀，也耐烧。云上头冷，这炉就一直热着。",
    flavor: "开炉第一件，我把眉毛燎了。你看了我一眼没说话，转身去拿药。我下次记着低头。",
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
    desc: "这铃一摇，田里帮忙的就都过来了。铃舌我用布包了一层，声音不尖，老远也听得清。",
    flavor: "铃舌我包了三层粗布，远处听得见就够了，不用吵着大家。",
    materials: { copper: 2, vine: 1 },
    craftTime: 120,
    effects: [
      { text: "【解锁帮手】+1 个帮手槽位，可以请常客来帮忙收果子", mod: { helperSlot: 1 } },
      { text: "帮手槽位 +1", mod: { helperSlot: 1 } },
      { text: "帮手槽位 +2", mod: { helperSlot: 2 } },
      { text: "帮手槽位 +2", mod: { helperSlot: 2 } },
      { text: "帮手槽位 +3", mod: { helperSlot: 3 } }
    ]
  },
  {
    id: "grass_wagon", name: "果筐车", cat: "帮手", region: 3,
    desc: "我做了辆平板车，架上两排筐，推一趟能收一整垄。轮子是硬木的，湿泥地里也不陷。",
    flavor: "车板我刨平了，筐底垫上布，果子磕不坏。轴里我上过松脂，推着轻。",
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
    desc: "山上风大，喊话传不远，吹这个就行。笛音我调得低，一吹能传出去很远。",
    flavor: "第一支我吹不响，当柴烧了。第二支我吹得响，就是难听。第三支我才吹成了调。",
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
    desc: "这架子我搭在洞穴里，月光水晶照出一圈暖光。帮手累了就在上头歇，睡醒接着干。",
    flavor: "架子高度我是照最小的那只调的。它跳上去试了试，回头看了我一眼。它够得着，那就好。",
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
    desc: "这拖板是赤沙上用的，底面我镶了薄铜条，沙里滑得动。拉一趟顶扛十趟。",
    flavor: "铜条是一点一点敲平贴上去的，我敲了一夜。我第二天睡到中午——这事儿你别往外说。",
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
    flavor: "我做这个做了很久。翼膜是我的，水晶是我磨的，没让谁搭手。……你就一直戴着吧，别摘下来。",
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
    text: "道边一段枯枝被风刮倒了，我锯成段扛回来一捆。肩膀压出两道印，明天就消。",
    effect: { material: "wood", count: 4 }
  },
  {
    id: "trip_clay_slip", weight: 15,
    text: "溪沟边的泥好挖，就是滑。我滑了一跤，泥糊了满背——一点没糟蹋，全带回来了。",
    effect: { material: "clay", count: 5 }
  },
  {
    id: "trip_vine_gift", weight: 15,
    text: "有个草系的在编筐，篮子口破了他自己没留神。我帮他补了两道，他硬塞给我一把藤条。",
    effect: { material: "vine", count: 5 }
  },
  {
    id: "trip_copper_clear", weight: 14,
    text: "三元山那间老锻铺在清仓。铜锭按堆卖，我挑了成色匀的，砍到七成。",
    effect: { material: "copper", count: 3 }
  },
  {
    id: "trip_cloth_trade", weight: 14,
    text: "盐风镇的织工要挪货架，我搭了把手，换回三卷粗布。她要多给一卷，我没要。",
    effect: { material: "cloth", count: 3 }
  },
  {
    id: "trip_resin_sticky", weight: 14,
    text: "我取松脂的时候糊了一整只爪子。洗不掉，这两天别让我碰布。",
    effect: { material: "resin", count: 2 }
  },
  {
    id: "trip_salt_wave", weight: 14,
    text: "海边晒盐的摊子被浪打翻了，我帮着扶起来。对方分我一包盐，推了两次没推掉。",
    effect: { material: "salt", count: 1 }
  },
  {
    id: "trip_scale_bargain", weight: 14,
    text: "我跟一条脾气不好的龙磨了半天价。他最后脱了片旧鳞给我，说这叫本钱。这份我记着。",
    effect: { material: "dragonscale", count: 1 }
  },

  // 带回稀有种子（合计权重 50）
  {
    id: "trip_seed_pocket", weight: 13,
    text: "回来路上有颗种子从口袋里滚出来，是多出来的一颗。谁塞的我也不知道。",
    effect: { seed: 1, count: 1 }
  },
  {
    id: "trip_seed_trade", weight: 13,
    text: "这是村口换的种子，我用一只旧篮子换的，对方直点头。",
    effect: { seed: 1, count: 1 }
  },
  {
    id: "trip_seed_storm", weight: 12,
    text: "半路下暴雨，我钻进树洞躲着。脚边冲下来几颗种子，我捡了。",
    effect: { seed: 1, count: 1 }
  },
  {
    id: "trip_seed_barter", weight: 12,
    text: "我用两块木料换的。挑了半天，挑了一颗最圆的。……你尝尝看甜不甜。",
    effect: { seed: 1, count: 1 }
  },

  // 只有碎碎念（合计权重 166）
  {
    id: "trip_lost", weight: 28,
    text: "我在瀑布之森绕了两圈半才出来。绕出来我先买了两个文柚果——你爱吃这个，不能空手回去。"
  },
  {
    id: "trip_rain_shelter", weight: 28,
    text: "雨太大，我在岩棚底下等雨停。我等了很久。背上的东西一点没湿，这就够了。"
  },
  {
    id: "trip_audience", weight: 28,
    text: "几个小家伙围过来看我修东西，看得很认真。我把手上的活儿给他们讲了一遍，讲完才想起来，东西忘买了。"
  },
  {
    id: "trip_ash_cough", weight: 28,
    text: "温泉口那阵风往我脸上刮。我咳了半天，想装一袋灰，一开口全吹跑了。"
  },
  {
    id: "trip_bright_sand", weight: 27,
    text: "水晶洞穴外头摆摊的说他的砂子亮得能卖钱。我看了半天，是挺亮，就买了一把，回来给你当摆件。"
  },
  {
    id: "trip_little_follower", weight: 27,
    text: "有只小家伙一路跟着我，跟到门口就停了。我回头看，它跑了。我到今天也没弄明白它想要什么。"
  }
];

// ── 各阶段通用台词 ────────────────────────────────────────────────────────────
G.ATLAS_LINES = {
  idle: [
    "你忙你的吧，我就在这儿坐会儿，不碍着你的事。",
    "……这堆料我看了一下午，还能再搭个架子出来。",
    "我手里还有活儿要干，站着歇一会儿也算歇。",
    "你刚才说我的角歪了一点。我摸了两遍，是正的。……你笑了半天，我到现在也没弄清哪里好笑。",
    "——啊？哦，我刚才走神了。你接着说吧，我听着呢。"
  ],
  click: [
    "你浇吧，桶我都给你提满了，你不用使劲。",
    "你叫卖不用喊那么响，把筐往前推一推就行。",
    "你手拿稳一点，这水壶是铜打的，不是石头，摔一下要凹进去的。",
    "你说我手劲这么小，还敢种地呀。我说地不看手劲，看耐性。你笑得更厉害了。",
    "——你刚才是不是又在逗我。……算了，我接着浇。"
  ],
  harvest: [
    "这一批比上一批沉。土养得好，不是我的功劳。",
    "你放筐里的时候别摞太高，压坏了我心疼。",
    "我挑两颗最圆的放一边。……你就别问了，我留着有用。",
    "我收完歇一会儿，地又跑不掉。",
    "你说我搬得比帮手还快。我说替自己家搬的和替别家搬的不一样。我说完才想起来，这话不该说。"
  ],
  craft_start: [
    "你往旁边让一点，我要动锤子了，火星子会溅出来。",
    "我把料点过两遍了，够用，你放心。",
    "这活儿我熟，交给我就行，你去田里转转吧。",
    "你别催我啊。急火赶出来的东西不经用，我不想让你用两天就坏了。",
    "——你说慢慢做，你在这儿等着看我做完。……那我就慢慢做。"
  ],
  craft_done: [
    "我做好了。边角我都磨过了，你拿的时候别攥太紧。",
    "我敲完了。手上这几道印子是以前就有的，不是这活儿弄的，你别替我担心。",
    "要是用坏了，你就拿回来给我，我再给你修好。",
    "……我觉得还行吧。你先用着，哪儿不顺手了再拿回来给我。",
    "你刚说好看。我没接话，低头把接缝又摸了一遍。……铁匠的手比耳朵准。"
  ],
  trip_start: [
    "我出门了。单子上的东西，一样不会漏。",
    "我天黑前回来。要是晚了，你就先睡。",
    "田就交给你看着了，路上有我看着，你只管放心。",
    "清单我看了三遍，这次我不多买。……大概能管住自己吧。",
    "——你说早点回来呀，阿特拉斯，文柚果你给我留了两个。……那我走快一点。"
  ],
  trip_return: [
    "我回来了。东西都在背上，一样没少。",
    "路上是碰见点事，不过东西一样没少。别的你就别问了，问了我也不好说。",
    "给你。我手有点抖，是扛东西扛的。",
    "这趟我把价谈下来了，没亏着。",
    "——你说怎么又晒成这样呀。我说路上没遮的地方。你转身去拿药了。"
  ],
  prestige: [
    "搬就搬吧，我又不是跑不动这一趟。反正不管土在哪儿，咱们家就在哪儿。",
    "这块地我干完了。下一块只会更好。",
    "我装了三袋土。你别拦着我，这是本钱。",
    "这事儿你来决定，我都听你的，你点头我就搬。",
    "你问我到了那边还做不做铁匠。我说做，到哪儿我都做铁匠。……你问的其实是别的，我答慢了。"
  ],
  region_unlock: [
    "这是个新地方，我先飞一圈看看哪儿能落平地。",
    "图上标得含糊，我自己飞了一圈才知道，实地比图上大得多。",
    "我去看看。土不行我再往远飞。",
    "这边的风土不一样，我得先试一块地。",
    "——你说这次别再迷路了呀。我说上回也不算迷路。你笑了一路。"
  ],
  offline: [
    "你不在的时候，我把活儿都干完了，账也都记着呢。",
    "熟的那几颗我收下来了，都放在阴凉处了。",
    "文柚果我带了回来，搁在陶罐边上了。",
    "一垄都没少，我数过了，你放心。",
    "我路上跑了几趟，腿是酸，歇一歇就好。"
  ]
};
