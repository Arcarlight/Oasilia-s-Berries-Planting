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
    desc: "繁盛之森砍下来的整根原木剥了皮晾干可以直接用，搭架子或者削个木柄都结实耐用。",
    trip: true
  },
  {
    id: "clay", name: "陶土", price: 90,
    desc: "溪沟边挖上来的湿黏泥攥在爪子里能捏成任何形状，烧透了敲起来响声清脆，做罐子做陶管都离不开它。",
    trip: true
  },
  {
    id: "vine", name: "藤条", price: 160,
    desc: "林子深处割下来的老藤晾过以后仍然柔韧，用它编筐、扎篱笆、捆车轮都松不了。",
    trip: true
  },
  {
    id: "copper", name: "铜锭", price: 320,
    desc: "打造铜器得先备一整块铜锭，三元山矿脉熔出来的那种趁热软和好加工，凉透以后变硬，想改只能回炉重烧。",
    trip: true
  },
  {
    id: "cloth", name: "粗布", price: 620,
    desc: "挡风垫筐擦手粗布都能凑合，盐风镇织布机上织出来的那种最结实，磨破了不心疼。",
    trip: true
  },
  {
    id: "resin", name: "松脂", price: 1200,
    desc: "从老松树皮的伤口上淌下来凝成的树脂沾上手很难洗掉，熬化了涂在绳结和木器上能防潮。",
    trip: true
  },
  {
    id: "quartz", name: "石英砂", price: 2400,
    desc: "水晶洞穴外沿淘洗出来的透亮晶砂颗粒细而匀，烧炉子、打磨器口或者做灯罩都用得上。",
    trip: true
  },
  {
    id: "ash", name: "火山灰", price: 4600,
    desc: "三元山温泉火口边上铲下来的细灰撒进地垄能肥土，掺进炉料能把锻炉砌牢，只是扬起来呛人，装袋要避着风。",
    trip: true
  },
  {
    id: "salt", name: "深海盐", price: 8800,
    desc: "盐风镇海滩上晒出来的大粒粗盐腌厚皮树果最对路，拿去跟别家宝可梦换零碎东西挺受欢迎。",
    trip: true
  },
  {
    id: "dragonscale", name: "龙鳞粉", price: 17000,
    desc: "龙系宝可梦换季时脱落的旧鳞磨成的细粉掺进炉料能让打出来的东西更硬，据说也拿来当药引。",
    trip: true
  },
  {
    id: "mooncrystal", name: "月光水晶", price: 36000,
    desc: "水晶洞穴最深处凝结出来的晶体不必照阳光也通体发亮，握久了指尖发麻，据说和月亮有关。",
    trip: true
  },
  {
    id: "skygem", name: "天穹石", price: 90000,
    desc: "天穹园云海里飘落下来的奇石看着像石头，掂起来还没有一片羽毛沉，放在掌心会自己往云里飘。",
    trip: true
  }
];

G.MATERIAL_BY_ID = Object.fromEntries(G.MATERIALS.map(m => [m.id, m]));

// ── 道具：4 分类 × 6 件，覆盖 region 1~10，每件 5 级 ──────────────────────────
G.ITEMS = [
  // ===== 农具：点击浇水、生长速度、结果数 =====
  {
    id: "watering_can", name: "铜嘴洒水壶", cat: "农具", region: 1,
    icon: "watering_can",
    desc: "木头掏空了当壶身再接一截长铜嘴，浇水的时候水流细而匀，不会把刚撒下去的种子冲散。",
    flavor: "提梁我拿砂石修过好几轮，弧度正贴着你的掌心。旁边敲瘪了一块的那只我也没舍得扔，平时自己打铁口渴了当水舀子使正合适。",
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
    icon: "soft_soil",
    desc: "先把粗石子和硬泥块筛干净再拌上草木灰，土松了以后苗在里面扎根能省不少力气。",
    flavor: "我弯腰翻了一整下午，头发里落的全是细灰。你拿着湿布过来给我擦额头，怕手上泥巴沾脏你的衣裳，愣是缩着手不敢往前迎。",
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
    icon: "copper_hoe",
    desc: "锄头背上包一层铜、刃口磨薄，翻土和挑断老草根都省劲，铜不容易生锈。",
    flavor: "锄刃我在油石上细细蹭过，光亮得能映出影子。握柄那处我用洗软的粗布密密缠了两道，你手皮嫩，省得干久了磨出红泡来。",
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
    icon: "dew_frame",
    desc: "四根木桩立起来绷上粗布接夜里的露水，早上拧一把够浇一趟地。",
    flavor: "布扯得不紧水珠就挂不住。我先前拉断了两截，重新量绳头才算绷踏实。你在旁边说我瞎较劲，可手艺活儿松一寸，收成可就少一罐。",
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
    icon: "spring_pipe",
    desc: "用陶管一节一节接进温泉把温热的水引到垄沟底下，让作物喝着暖水长得更快。",
    flavor: "接榫的地方漏过几缕热汤，我熬了满满一铁勺黏松脂全封实了。手上沾的黏胶洗不掉，足足硬皮了两三天，抓什么家伙什都发涩。",
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
    icon: "dragon_plow",
    desc: "犁尖里掺了龙鳞粉能一路翻开板结的生土，犁沟深了根自然往下扎。",
    flavor: "拉风箱淬火时迎风燎着了手背，红了一小块，其实压根不打紧。你非说看着渗人，硬是给我抹了两天清凉膏，闻着全是甜甜的草药味。",
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
    icon: "vine_cart",
    desc: "藤条编的车斗底下装两个木轮，装满货推起来也稳当，摆到集市上卸下车斗能当个小摊台用。",
    flavor: "两边轮轴找平费了我好大工夫，改了三回才不往左偏。车斗特意编得浅矮，你站在车边点货收钱，伸手就能拿到底下的果子。",
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
    icon: "wood_sign",
    desc: "厚木板削平了写上字挂在摊子门口，过路的隔老远认得出这是哪一家。",
    flavor: "原本想刻字，下凿偏了一刀给劈出条大裂缝，让我随手塞在门后当垫脚板了。后来这块我就只耐着性子凿图样，反倒比写字还显眼。",
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
    icon: "fruit_basket",
    desc: "藤条编的筐底上垫一层软草，果子码进去磕不着碰不着，筐沿修圆了不硌手。",
    flavor: "手生的时候编得歪歪扭扭，拆拆改改编到第七个才像个正经样。我挑了个最紧实的搁在窗台边，正好能盛下一堆文柚果留着给你当零嘴。",
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
    icon: "bell_counter",
    desc: "摊位角上挂一串小铜铃，客人走近的时候铃会响，听见响动说明有生意上门。",
    flavor: "有两个砂眼没清干净，敲起来哑声哑气的，我栓在了自家门帘子角上。你平日里推门出入撞得它一响，坐在锻炉后头就知道是你回屋了。",
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
    icon: "salt_stall",
    desc: "货架立在风口上、板面撒一层盐隔潮，果子摆在上头不容易坏。",
    flavor: "在礁石滩架木方那会儿冷不丁让海头浪拍了一身，咸水晾干后衣服硬得能立起来。回去你一边笑我笨，一边烧开大锅热水帮我搓洗后背。",
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
    icon: "sky_pavilion",
    desc: "展台架高了以后整条街都看得见摆在最上头的货，只是云里风大，四角都得钉牢。",
    flavor: "台面那块大水晶我蹲在水盆边足足磨了两天。你说摆在云端太扎眼、晃得慌，说开铺子就得这样，从云海打头飞过的过客都得探头看上两眼。",
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
    icon: "stone_mill",
    desc: "上下两扇石盘扣在一起中间插一根木轴，树果从上面漏下去，转几圈磨成浆。",
    flavor: "那两块大青石是我用麻绳勒在背上一截截挪下山的，路上歇了整整四趟。回院子找平咬合面凿到半夜，总算转起来没半分杂音了。",
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
    icon: "clay_jar",
    desc: "陶土烧成的鼓肚罐子口沿留一圈水槽，盖上盖子不透气，腌什么都能放很久。",
    flavor: "烧土窑那晚风紧，我怕火候撤了降温，整夜靠在柴火堆边没敢合眼。清早出窑碎了一只，剩下的敲着声儿都脆，烂的那只正巧留在大灶后头腌干菜。",
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
    icon: "water_wheel",
    desc: "木轮架在急流上让水冲着转，磨盘跟着一块动，不用守在旁边也能一直干活。",
    flavor: "头回装斗板角度没算准，转到顶上总要猛磕一下，吵得人心烦。我泡在冷水滩里敲凿榫头改到后半夜，第二天试水总算顺当得跟溪水一个流速了。",
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
    icon: "windmill",
    desc: "四片风翼立在山口，四片风翼立在山口迎着风，磨盘挂在轴上从早转到晚。",
    flavor: "爬梁上固定主翼轴那天赶上山谷倒灌风，我抓着横木悬在半空撑了半个多时辰，下来时膀子酸得抬不起爪。……反正装得极结实，刮再大风也晃不动分毫。",
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
    icon: "crystal_kiln",
    desc: "窑壁里衬了一圈水晶，火烧起来以后热气在窑里回旋不散，烘出来的东西成色很匀。",
    flavor: "水晶块必须顺着天然晶纹往石壁里卡，歪一颗火舌就往外窜。我敲碎重嵌了两回，工是费了点，但烧起来内膛火光聚成一团，好看又顶热。",
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
    icon: "dragon_forge",
    desc: "炉膛里压着一口龙焰，火头比寻常炉子猛得多也烧不裂，打出来的东西格外结实。",
    flavor: "第一次起大火封炉膛，火头窜得急，眉角燎了一块皮。你进来看见什么都没问，取来药膏轻轻往我额角抹。……下回开炉我肯定把头埋低些，不让你挂心。",
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
    icon: "helper_bell",
    desc: "小铜铃挂在田头摇一下，附近的帮手听见会自己跑过来搭手。",
    flavor: "铜舌头我拆下来包了三遍布才算合意。打铁的听惯了砸锤的脆响，但田里需要的是安宁，声调沉下来，大家听着心里才不慌。",
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
    icon: "grass_wagon",
    desc: "车架上并排码着几只大筐、底下装了轮子，帮手推着一趟能运回小半垄的果子。",
    flavor: "车板每块木拼缝我都拿刨刀推得光平，筐底全垫了软布，免得路上乱颠蹭破皮。轮轴里抹匀了松脂，推起来轻快顺溜，用不着死命使蛮力。",
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
    icon: "dragon_whistle",
    desc: "龙骨掏空做成的短笛吹起来声音沉而长，山风再大也能传到对面山坡。",
    flavor: "头两支开孔偏了半毫，吹着跟漏气似的难听，随手扔进锻炉当柴引火了。直到第三支才把音调校正。山高风疾，音准差一点，远处的帮手可就辨不清方向了。",
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
    icon: "moonlit_nest",
    desc: "巢架搭在避风的洞里、顶上嵌一块月光水晶终夜亮着，帮手累了过来眯一觉，外头的凉风进不来。",
    flavor: "进窝的木台阶我特意比照着最小个头那只的高度落的凿。小家伙跳上去稳稳当当，回头瞧了我一眼。个头小的够得着，别的大个子自然更踩得稳当。",
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
    icon: "sand_sledge",
    desc: "厚木排底下铺了一层刨平的铜皮，在松软的沙坡上拖着走省力，整筐的重货省得往肩上扛。",
    flavor: "铜皮边缘必须收得圆润，翘起半颗沙粒大的一角都会在沙里打绊。我蹲在地上敲平这排细铜钉敲了一整宿，第二天累得直不起腰——你可别当笑话到处讲。",
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
    icon: "dragon_wing_amulet",
    desc: "旧翼膜压进两片水晶中间、边上嵌一圈天穹石，挂在身上据说能沾些龙气，干起活来顺手。",
    flavor: "这坠子我趁着夜里一个人在油石边磨了许多天。没让谁搭过手，边角手艺全是自己的。……你既然收下了就稳妥挂着，地里再忙乱也别随手摘下来。",
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
    text: "山道边上一根粗枯枝被狂风刮倒了，我当场锯成长段用麻绳捆着扛回来一大包。肩膀上被硬木压出了两道红印子，等睡一宿到明天准能消退干净。",
    effect: { material: "wood", count: 4 }
  },
  {
    id: "trip_clay_slip", weight: 15,
    text: "溪水沟边的陶泥特别好挖，就是脚底下湿滑得很。我不小心滑了一大跤，摔得泥巴糊了满满一后背——好在一点都没糟蹋泥料，全给端端正正兜回来了。",
    effect: { material: "clay", count: 5 }
  },
  {
    id: "trip_vine_gift", weight: 15,
    text: "半道上瞧见有个草系的小个子在专心编筐，篮子底漏了个破口他自己没留神。我放下背篓帮他拿工具补牢了缝隙，他死活非要硬塞给我一大把新割的好藤条。",
    effect: { material: "vine", count: 5 }
  },
  {
    id: "trip_copper_clear", weight: 14,
    text: "三元山那间老铁匠铺子正赶上清点旧存货。整堆的铜锭按份数出清，我挨个挑拣了里头成色最均匀的几块，硬是跟掌柜把价钱磨到了七成。",
    effect: { material: "copper", count: 3 }
  },
  {
    id: "trip_cloth_trade", weight: 14,
    text: "盐风镇那个织布的熟面孔赶着要搬动大沉货架，我走过去搭了把手帮他稳稳抬过去，换回了整整三卷厚实粗布。对方本想多塞给我一卷当谢礼，没好多要就推回去了。",
    effect: { material: "cloth", count: 3 }
  },
  {
    id: "trip_resin_sticky", weight: 14,
    text: "我从老松树干上剜取松脂的时候，一个没当心把整只大爪子都黏糊糊地裹住了。在水洼里搓了半天也洗不干净，这两天你可千万别让我伸手碰织布啊。",
    effect: { material: "resin", count: 2 }
  },
  {
    id: "trip_salt_wave", weight: 14,
    text: "海滩边晒盐的木槽被迎面扑上来的潮浪给掀翻了，我赶紧跨过去帮着一道拉绳子扶正。对方分了我一包晒得极透的粗盐，当场推让了两次都没能推掉。",
    effect: { material: "salt", count: 1 }
  },
  {
    id: "trip_scale_bargain", weight: 14,
    text: "我在半道上跟一头脾气格外冲的同族老龙磨了半天价钱。他最后被我磨得没脾气了，顺手揭下一片褪落的旧龙鳞重重拍给我，说这权当给我的开工本钱。这份人情我心里暗暗记下了。",
    effect: { material: "dragonscale", count: 1 }
  },

  // 带回稀有种子（合计权重 50）
  {
    id: "trip_seed_pocket", weight: 13,
    text: "我往回走的山路上，冷不丁有一颗饱满的硬种子从大衣口袋里滑滚了出来，仔细一数比清单上多出了一粒。到底是谁趁我不注意悄悄塞进我兜里的，到现在也没想明白。",
    effect: { seed: 1, count: 1 }
  },
  {
    id: "trip_seed_trade", weight: 13,
    text: "这是我在村口跟过路熟客换回来的新鲜种子，拿身边一只闲置的旧竹篮换给对方，那家伙接过去高兴得直冲我点头呢。",
    effect: { seed: 1, count: 1 }
  },
  {
    id: "trip_seed_storm", weight: 12,
    text: "我走到半路上冷不丁下起了倾盆暴雨，赶紧缩着翅膀钻进老树洞里避雨。没多会儿雨水顺着坡道冲下来几颗被泥裹着的圆滚种子，眼疾手快全顺手捡起来了。",
    effect: { seed: 1, count: 1 }
  },
  {
    id: "trip_seed_barter", weight: 12,
    text: "这是我拿两块结实的硬木料跟别处摊子换过来的。我在那堆货里蹲着挑拣了老半天，特意挑了这一颗长得最饱满最圆润的。……你回头尝尝看这果子结出来到底甜不甜。",
    effect: { seed: 1, count: 1 }
  },

  // 只有碎碎念（合计权重 166）
  {
    id: "trip_lost", weight: 28,
    text: "我在瀑布之森那片浓雾林子里晕头转向地绕了两圈半才总算走出来。我一钻出林口，先拐去摊前买下了两颗刚摘下的新鲜文柚果——你平日里最爱吃这个，说什么也不能两手空空回院子。"
  },
  {
    id: "trip_rain_shelter", weight: 28,
    text: "天上的雨下得太急太大，我只好老老实实蹲在石崖底下等雨水收歇。我在那儿干坐着等了足足好久。好在背篓里给你带回来的物件半点没被雨水打湿，这就足够了。"
  },
  {
    id: "trip_audience", weight: 28,
    text: "几个路过的小家伙围坐在石头边，瞪大眼睛看我敲打修整农具，瞧得别提有多认真了。我就耐着性子把手里的锻造要领一五一十全讲给他们听，等讲完了我才猛地想起来，自己正经要买的东西居然给忘在铺子脑后了。"
  },
  {
    id: "trip_ash_cough", weight: 28,
    text: "三元山温泉火口旁猛地刮过来一阵怪风，劈头盖脸冲我脸上刮过来。我弯着腰咳了半天，本打算拿布袋多装一袋细腻火山灰，刚张开嘴，一阵大风把刮好的灰全给吹飞了。"
  },
  {
    id: "trip_bright_sand", weight: 27,
    text: "水晶洞穴外头摆摊那个家伙逢人就嚷嚷他的碎石英砂亮堂得能卖大价钱。我站在摊前仔细瞅了半天，发现确实晶莹剔透得很，就掏钱买了一大把揣在兜里，带回来给你摆在桌上当个亮眼的小摆件。"
  },
  {
    id: "trip_little_follower", weight: 27,
    text: "半道上有只不知打哪儿来的毛茸茸小家伙，一声不响一路尾随着我，一直跟到咱们小院木门前才停下脚步。我刚一扭头去看它，它又一溜烟飞快跑没了影。我直到今天也没琢磨明白它当时到底是冲着什么来的。"
  }
];

// ── 各阶段通用台词 ────────────────────────────────────────────────────────────
G.ATLAS_LINES = {
  idle: [
    "你先忙你手头的活儿去吧，我在这块大石头上坐着稍微歇口气，绝不挡着你的路。",
    "……墙根这堆废料我蹲在这儿琢磨看了一下午，拼拼凑凑的话，还能再给你搭出个结实的小花架来。",
    "我这双手里等会儿还有不少铁活要赶，站在这儿靠着木柱子歇上一会儿，也就算我歇息过了。",
    "你刚才笑着逗我说，脑袋顶上的弯角好像有点长歪了。我当真抬爪摸了足足两遍，明明挺端正笔直的嘛。……你一个人在旁边抿着嘴笑了大半天，到现在也没搞明白到底有什么好笑的。",
    "——啊？哦，我刚才看着炉火有点走神了。你接着往下说吧，我两只耳朵都认真听着呢。"
  ],
  click: [
    "你放宽心去浇水吧，大木桶里的水我都提前给你挑得满满当当了，你提水壶不用耗费多大力气。",
    "你在摊前招揽客人不用扯着嗓子喊得那么大声，只要把装满果子的藤筐往客人跟前稍稍推一推就行。",
    "你两只爪子稍微把水壶拿得稳当一些，这水壶是我用纯铜敲出来的，不是硬石头，摔在碎石地上容易给砸出凹坑来。",
    "你刚才笑着逗我说，你力气这么丁点小居然也敢开荒种地呀。我正经跟你说种庄稼全凭耐心又不单拼蛮力。结果听完你反倒笑得更欢了。",
    "——你刚才抿嘴笑成那样，是不是又故意在拿话逗我玩呢。……算了，我不管你了，接着低头浇地去。"
  ],
  harvest: [
    "这一大筐比上一批沉实多了。地底下的肥土被你料理得很好，这可全是你的细心，半点不是我的功劳。",
    "你把果子捡进大筐里的时候别一层层摞得太高了，沉甸甸地压破了熟果皮，我看着可替你心疼。",
    "我先顺手挑出两颗长得最饱满最圆润的放在旁边布上。……你就别笑眯眯追着问了，我留着它们自然是有别的用处。",
    "我帮着把地里的重筐全都搬完就坐在树荫下歇会儿，反正这肥沃土地又不会长脚跑掉。",
    "你刚才又打趣我说，一个人搬运货筐比雇来的帮手还手脚麻利。我顺口就接了句说给自己家里搬货跟替别家干活哪里能一样。我刚说完嘴里才后知后觉，这话实在说得太露骨了。"
  ],
  craft_start: [
    "你身子往旁边稍微挪开一点，我马上要扬起大铁锤砸铁了，炉膛里的火星子容易噼里啪啦溅落出来。",
    "工棚里这堆原料我动手前已经仔仔细细清点过整整两遍了，份量绝对够用，你就踏踏实实放心吧。",
    "手打铁器这门活计我闭上眼睛都熟稔得很，全交给我一个人操办就成，你去果田里四处转转散散心吧。",
    "你在旁边可千万别急着催促我呀。急火催促赶出来的粗活一点都不经用，可不想让你拿去使唤两天就坏了手柄。",
    "——你说让我慢慢打磨别着急，说你就乐意安安静静坐在长凳上看我做完。……既然你都这么说了，那我手底下就慢慢做。"
  ],
  craft_done: [
    "我总算是全部打制好了。外头所有的棱角边线我都拿细石里外磨平整了，你伸手去拿的时候也别攥得太紧。",
    "所有的铁钉和卯榫我都严丝合缝敲牢靠了。手背上多出来的这几道红印子是我以前落下的老茧痕，不是刚才干活弄伤的，你可别皱着眉头替我挂心。",
    "往后你在地里万一不当心给使唤磕坏了，你就直接拿回工坊交给我，随时都能给你重新修整得完好如初。",
    "……我自个儿瞧着手艺还算看得过去吧。你先拿去地里试着用用看，要是哪儿握着觉得不顺手了，你再随时拿回来交给我改。",
    "你刚才凑在耳边夸这件新工具打得好看。我嘴笨不知道该怎么接话，只是低着头拿布把接缝处又反复摸了两遍。……我们打铁的爪子往往比耳朵更懂轻重。"
  ],
  trip_start: [
    "我这就收拾好行囊准备出远门了。你亲手写在羊皮纸上的采买单子，我保证一样都不会落在后头。",
    "我肯定赶在天色彻底黑下来之前走回院子。万一中途路上有事耽搁得晚了，你自个儿就先去草窝里歇息，别干等着我。",
    "家里的果田和铺子就劳你多照看着点，出门在外这一路有我自个儿盯着呢，你只管把心放宽。",
    "你交代给我的清单我出门前反反复复看了三遍，这一趟出门我肯定不多买没用的物件。……大抵上我应该能管住自个儿的手脚吧。",
    "——你说让我在路上走快些早点赶回来，还笑着说房里的陶罐底下特意给我留了两个熟透的文柚果。……既然有你这句话，那我脚底下就走得更快一些。"
  ],
  trip_return: [
    "我平安走回咱们院子里来了。所有要采买的材料全安安稳稳捆扎在背篓里呢，一件都不少。",
    "这趟在半道上确实碰上了点鸡毛蒜皮的琐碎插曲，不过好在清单上的好料子一样没漏下。别的事你就别追着细问了，你追着问我也怪不好意思开口的。",
    "这包沉甸甸的东西先递给你拿着。我这会儿手爪微微有点发颤，纯粹是刚才一路把重货扛在肩膀上累出来的，歇口气就缓过来了。",
    "这趟出门我跟几个铺子的掌柜软磨硬泡把要价狠狠谈下来了不少，咱们这趟可半点都没吃亏。",
    "——你一见我就心疼地念叨我怎么身上又被烈日晒褪了一层皮。我笨嘴笨舌地说山路上到处连个能挡太阳的大树都没有。结果你一转身就快步跑去屋里给我翻找消肿药膏了。"
  ],
  prestige: [
    "搬迁就搬迁吧，反正我又不是迈不动这双老腿跑不完这一趟路。不管日后把土垒在什么新地方，只要有你跟我在一起，咱们家就始终安安稳稳落在那儿。",
    "眼前这块老果田里的细致活儿我总算全给彻底料理完了。咱们去下个新地界开垦出来的果园，只会比眼下侍弄得更好。",
    "我特意拿干净麻布口袋装了满满三袋咱们旧果园里的肥土。你站在旁边可千万别伸手拦着我，带上这几包老土，到了新地头才是咱们开荒的真正家底。",
    "搬家这件大事全由你一人说了算，我向来什么都听你的，你只要冲我轻轻点一下头，立刻扛起所有家伙什跟你走。",
    "你刚才眨着眼问我到了新天地之后还做不做铁匠。我正经跟你说当然做啊，无论走到大陆哪个偏僻角落我都乐意做铁匠。……我答完看着你的笑脸才回过味来，你刚才问我的本意压根就不是指打铁这事，又答得慢了半拍。"
  ],
  region_unlock: [
    "这眼瞧着是一片咱俩从没踏足过的新地界，等会儿我先展开翅膀飞上高空绕一圈，替你仔细探查哪处泥地平坦好起新宅子。",
    "羊皮地图上画得含含糊糊的，我自己亲自展翅飞了一整圈才切实瞧明白，这片真实的沃土可比画卷上标出来的开阔大得多了。",
    "我先飞过去替你把把关。要是脚下的土质不够肥润松软，就展开大翅膀再往山脉更深处替你多飞两趟找找看。",
    "这处新地方的泥土跟风向跟咱们先前待的林子全都不一样，我得先圈出一块小试验田，亲自挖两锄头试试深浅才行。",
    "——你出门前又笑着嘱咐我这一回可千万别再中途迷了路呀。我板着脸正经跟你辩解说上回那其实根本算不上真正的迷路。结果你顺着山路一路笑得合不拢嘴。"
  ],
  offline: [
    "你出门不在身边的这阵子，我一个人把田里该挑的水和工坊该打的铁器全操持利索了，收支账目我也一笔不落地全给记在本子上了。",
    "那几颗挂在向阳枝头上熟透软乎的大果子，我全给完完整整采摘下来了，妥妥帖帖收拢在后头最通风阴凉的地窖里呢。",
    "你平日里最喜欢吃的文柚果我也顺路给你摘回来了，拿干净布擦了三遍，正端端正正摆在厨房陶罐旁边候着你尝呢。",
    "地里栽种的每一垄新苗一颗都没少，我自己顺着田垄从头到尾仔细数过两遍了，你就放宽心吧。",
    "为了给你多备点新物料，我在两座山头之间来回跑了好几趟，腿脚虽然是泛着酸痛，但我只要坐在石阶上歇上一会儿就能缓过劲来。"
  ]
};
