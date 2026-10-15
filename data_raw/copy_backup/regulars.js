// 常客数据。性格决定口味偏好（官方设定，来源：神奇宝贝百科《性格》页性格列表）。
// 每项 { 喜: 喜欢的口味, 厌: 不喜欢的口味 }；null 表示中立（不影响口味偏好，不给常客使用）。
// flavor 必须等于 G.NATURES[nature].喜，dislike 必须等于 G.NATURES[nature].厌。
// 字段说明见 DESIGN.md 3.3。id/dex 为全国图鉴编号，region 为首次出现的区域。
window.G = window.G || {};
G.NATURES = {
  "勤奋": null, "坦率": null, "害羞": null, "浮躁": null, "认真": null,
  "怕寂寞": { "喜": "辣", "厌": "酸" },
  "固执":   { "喜": "辣", "厌": "涩" },
  "顽皮":   { "喜": "辣", "厌": "苦" },
  "勇敢":   { "喜": "辣", "厌": "甜" },
  "大胆":   { "喜": "酸", "厌": "辣" },
  "淘气":   { "喜": "酸", "厌": "涩" },
  "乐天":   { "喜": "酸", "厌": "苦" },
  "悠闲":   { "喜": "酸", "厌": "甜" },
  "内敛":   { "喜": "涩", "厌": "辣" },
  "慢吞吞": { "喜": "涩", "厌": "酸" },
  "马虎":   { "喜": "涩", "厌": "苦" },
  "冷静":   { "喜": "涩", "厌": "甜" },
  "温和":   { "喜": "苦", "厌": "辣" },
  "温顺":   { "喜": "苦", "厌": "酸" },
  "慎重":   { "喜": "苦", "厌": "涩" },
  "自大":   { "喜": "苦", "厌": "甜" },
  "胆小":   { "喜": "甜", "厌": "辣" },
  "急躁":   { "喜": "甜", "厌": "酸" },
  "爽朗":   { "喜": "甜", "厌": "涩" },
  "天真":   { "喜": "甜", "厌": "苦" }
};
G.REGULARS = [
  // ---- R1 繁盛之森：林间空地，起步与基础五果 ----
  {
    id: 190,
    dex: 190,
    name: "长尾怪手",
    region: 1,
    nature: "淘气",
    flavor: "酸",
    dislike: "涩",
    title: "爱顺手牵羊的采摘客",
    desc: "尾巴比手还灵活，路过果架总要摸走一颗。",
    unlock: { type: "harvest", value: 100 },
    lines: {
      greet: [
        "刚摘的果子，我闻着味儿就过来了。",
        "尾巴闲着也是闲着，帮你摇摇树枝吧。"
      ],
      like: [
        "这酸味蹿上鼻子，我眼睛都亮了。",
        "酸得舌尖发紧，这种果子才够劲。"
      ],
      dislike: [
        "涩的，涩得我尾巴都发软。"
      ],
      order: [
        "捎一篮酸口的果子，我回去慢慢啃。"
      ]
    }
  },
  {
    id: 204,
    dex: 204,
    name: "榛果球",
    region: 1,
    nature: "慎重",
    flavor: "苦",
    dislike: "涩",
    title: "挂在枝头的硬壳",
    desc: "外壳硬得能挡下暴雨，挂在枝上一动不动。",
    unlock: { type: "harvest", value: 250 },
    lines: {
      greet: [
        "我在这儿挂了很久了，谁也没发现我。",
        "别碰我，我得先看看你是不是顺路。"
      ],
      like: [
        "苦味慢慢渗进来，壳里也跟着安静。",
        "这种苦，够我在壳里想一整夜。"
      ],
      dislike: [
        "涩的果子在壳里嚼不动，我不喜欢。"
      ],
      order: [
        "帮我留点苦果，我要囤到冬天。"
      ]
    }
  },
  {
    id: 273,
    dex: 273,
    name: "橡实果",
    region: 1,
    nature: "固执",
    flavor: "辣",
    dislike: "涩",
    title: "树梢上的小哨兵",
    desc: "一天到晚挂在树梢，谁从树下过都要盯一眼。",
    unlock: { type: "harvest", value: 400 },
    lines: {
      greet: [
        "你从东边来的，身上有新的土味。",
        "我就守在这棵树上，哪儿也不去。"
      ],
      like: [
        "辣得外壳发烫，正好提提神。",
        "这个辣劲，够我盯一整天的树。"
      ],
      dislike: [
        "涩的，涩得我牙根发麻，走开。"
      ],
      order: [
        "来一篮辣的，我今晚要守夜。"
      ]
    }
  },
  {
    id: 285,
    dex: 285,
    name: "蘑蘑菇",
    region: 1,
    nature: "温顺",
    flavor: "苦",
    dislike: "酸",
    title: "落叶堆里的沉默客",
    desc: "缩在落叶底下，开口前总是先想一想。",
    unlock: { type: "harvest", value: 600 },
    lines: {
      greet: [
        "……啊，你来了。我先看看果子。",
        "我走得慢，让我慢慢挑。"
      ],
      like: [
        "苦味好，安安静静的，像雨天的林子。",
        "这口苦下去，心里就踏实了。"
      ],
      dislike: [
        "太酸了，我腮帮子发紧，先放一放。"
      ],
      order: [
        "给我几颗苦果，我带回落叶堆里。"
      ]
    }
  },
  {
    id: 163,
    dex: 163,
    name: "咕咕",
    region: 1,
    nature: "冷静",
    flavor: "涩",
    dislike: "甜",
    title: "值夜的独眼钟",
    desc: "一只脚站着打盹，夜里数着树影报时。",
    unlock: { type: "harvest", value: 800 },
    lines: {
      greet: [
        "天快黑了，我这才醒来。",
        "脚步轻些，露水刚下来。"
      ],
      like: [
        "涩味醒神，正好熬过长夜。",
        "这涩得干净，像清晨的溪水。"
      ],
      dislike: [
        "甜的，甜得我眼皮更沉了。"
      ],
      order: [
        "备几颗涩果，我要守到天亮。"
      ]
    }
  },
  {
    id: 267,
    dex: 267,
    name: "狩猎凤蝶",
    region: 1,
    nature: "天真",
    flavor: "甜",
    dislike: "苦",
    title: "花田上空的采粉匠",
    desc: "翅膀上的花纹沾满花粉，只挑最甜的果子落脚。",
    unlock: { type: "harvest", value: 1100 },
    lines: {
      greet: [
        "你的花开了吗，我一路闻过来的。",
        "让我看看，这一季的果子好不好。"
      ],
      like: [
        "甜丝丝的，我翅膀都轻了。",
        "这味道好，我要带些回去分。"
      ],
      dislike: [
        "苦得我舌头打卷，快给我口水。"
      ],
      order: [
        "挑最甜的几颗，我明早来取。"
      ]
    }
  },

  // ---- R2 繁盛村：村口集市，第一批常客 ----
  {
    id: 399,
    dex: 399,
    name: "大牙狸",
    region: 2,
    nature: "固执",
    flavor: "辣",
    dislike: "涩",
    title: "村口扛木头的力气",
    desc: "一口牙能咬断树根，谁的筐子歪了它都要顶上去。",
    unlock: { type: "harvest", value: 2000 },
    lines: {
      greet: [
        "要搬筐子吗，我牙口好使。",
        "我嘴笨，可我看得懂果子。"
      ],
      like: [
        "辣的上头，干活才带劲。",
        "这辣味，啃一口能顶半天。"
      ],
      dislike: [
        "涩的，涩得我牙都咬不动。"
      ],
      order: [
        "给我装点辣的，我搬完再吃。"
      ]
    }
  },
  {
    id: 427,
    dex: 427,
    name: "卷卷耳",
    region: 2,
    nature: "急躁",
    flavor: "甜",
    dislike: "酸",
    title: "集市上的急性子",
    desc: "耳朵一竖就跑，摊位前永远排第一个。",
    unlock: { type: "species", value: 7 },
    lines: {
      greet: [
        "快点快点，后面的还等着呢。",
        "我排了很久了，先给我挑。"
      ],
      like: [
        "甜的，甜得我耳朵都立起来了。",
        "这个味道好，不用再想了。"
      ],
      dislike: [
        "酸死了，等这么久就给我这个。"
      ],
      order: [
        "甜的都给我，我这就带走。"
      ]
    }
  },
  {
    id: 403,
    dex: 403,
    name: "小猫怪",
    region: 2,
    nature: "淘气",
    flavor: "酸",
    dislike: "涩",
    title: "磨牙的小小发电",
    desc: "尾巴一甩就冒火花，喜欢酸硬的果子磨牙。",
    unlock: { type: "harvest", value: 4500 },
    lines: {
      greet: [
        "喂，你筐里有酸口的吗。",
        "我牙齿痒，正好找点硬的。"
      ],
      like: [
        "酸的刺牙，咬起来才过瘾。",
        "这个酸劲，磨牙刚刚好。"
      ],
      dislike: [
        "涩的嚼不烂，我一咬就烦了。"
      ],
      order: [
        "来一把酸的，我要磨一晚上。"
      ]
    }
  },
  {
    id: 504,
    dex: 504,
    name: "探探鼠",
    region: 2,
    nature: "慎重",
    flavor: "苦",
    dislike: "涩",
    title: "蹲在屋顶的哨兵",
    desc: "蹲在屋脊上守夜，任何动静都逃不过它的眼睛。",
    unlock: { type: "species", value: 9 },
    lines: {
      greet: [
        "先站着别动，我看看四周。",
        "路口没有生面孔，你可以说了。"
      ],
      like: [
        "苦的提神，守夜全靠它。",
        "这苦味稳当，我信得过。"
      ],
      dislike: [
        "涩的糊嗓子，我不敢碰。"
      ],
      order: [
        "苦果来一份，我夜里守着。"
      ]
    }
  },
  {
    id: 506,
    dex: 506,
    name: "小约克",
    region: 2,
    nature: "勇敢",
    flavor: "辣",
    dislike: "甜",
    title: "敢拦长毛猪的小家伙",
    desc: "个头不大，见着谁都先站直了再说。",
    unlock: { type: "crafted", value: 200 },
    lines: {
      greet: [
        "你站住，报一下从哪儿来。",
        "别看我小，我看东西很准。"
      ],
      like: [
        "辣的够劲，我尾巴都竖起来了。",
        "这口辣下去，什么我都不怕。"
      ],
      dislike: [
        "甜的让我缩起来了，不要。"
      ],
      order: [
        "给我辣的，多来两颗。"
      ]
    }
  },
  {
    id: 519,
    dex: 519,
    name: "咕咕鸽",
    region: 2,
    nature: "天真",
    flavor: "甜",
    dislike: "苦",
    title: "集市角落的笨鸽子",
    desc: "记不住路，闻到甜味就能找回家。",
    unlock: { type: "revenue", value: 60000 },
    lines: {
      greet: [
        "这是你家吗，我好像又走错了。",
        "我闻到甜味，是从这儿出来的吧。"
      ],
      like: [
        "甜的好，我永远不会记错这个味。",
        "这味道让我想起我家屋顶。"
      ],
      dislike: [
        "苦的呛鼻子，我打了一路喷嚏。"
      ],
      order: [
        "我要甜的，越多越好。"
      ]
    }
  },

  // ---- R3 瀑布之森：水汽弥漫的溪谷 ----
  {
    id: 270,
    dex: 270,
    name: "莲叶童子",
    region: 3,
    nature: "悠闲",
    flavor: "酸",
    dislike: "甜",
    title: "顶着一片叶子的渡口",
    desc: "头顶的叶子就是它的船，顺水漂一天也不着急。",
    unlock: { type: "crafted", value: 300 },
    lines: {
      greet: [
        "水流把你带到这儿啦，坐会儿。",
        "我这儿不急，你慢慢看。"
      ],
      like: [
        "酸酸的，像溪底的青苔味。",
        "这味道淡，可我记住了。"
      ],
      dislike: [
        "甜的腻口，我不太习惯。"
      ],
      order: [
        "酸口的给我留些，我顺水来取。"
      ]
    }
  },
  {
    id: 283,
    dex: 283,
    name: "溜溜糖球",
    region: 3,
    nature: "胆小",
    flavor: "甜",
    dislike: "辣",
    title: "水面划圈的小身影",
    desc: "在水面上滑来滑去，一有大响动就钻进草里。",
    unlock: { type: "revenue", value: 100000 },
    lines: {
      greet: [
        "那个……我只是路过看看。",
        "别靠太近，我会跑的。"
      ],
      like: [
        "甜的，甜得我敢多待一会儿。",
        "这个味道让我不那么怕了。"
      ],
      dislike: [
        "辣的呛得我腿一软，掉水里就完了。"
      ],
      order: [
        "甜的放门口就好，我自己来拿。"
      ]
    }
  },
  {
    id: 418,
    dex: 418,
    name: "泳圈鼬",
    region: 3,
    nature: "顽皮",
    flavor: "辣",
    dislike: "苦",
    title: "逆流冲浪的捣蛋鬼",
    desc: "脖子上那圈浮囊鼓起来，就敢往最急的浪里冲。",
    unlock: { type: "crafted", value: 700 },
    lines: {
      greet: [
        "下水吗，我带你冲最急的那段。",
        "你怎么浑身干着就来了。"
      ],
      like: [
        "辣的带劲，泡冷水里才痛快。",
        "这辣味够冲，我喜欢。"
      ],
      dislike: [
        "苦的黏牙，冲浪时最烦这个。"
      ],
      order: [
        "辣的，我上岸就吃。"
      ]
    }
  },
  {
    id: 183,
    dex: 183,
    name: "玛力露",
    region: 3,
    nature: "爽朗",
    flavor: "甜",
    dislike: "涩",
    title: "尾巴当浮漂的乐天派",
    desc: "尾巴里的油比水轻，泡一天也沉不下去。",
    unlock: { type: "species", value: 14 },
    lines: {
      greet: [
        "你来啦，溪水今天特别清。",
        "我在这儿游了半天，就等果子。"
      ],
      like: [
        "甜的，甜得我想在水里翻跟头。",
        "这味道好，我尾巴都翘起来了。"
      ],
      dislike: [
        "涩的，涩得我整张脸都皱了。"
      ],
      order: [
        "挑甜的来，我今天心情好。"
      ]
    }
  },
  {
    id: 339,
    dex: 339,
    name: "泥泥鳅",
    region: 3,
    nature: "内敛",
    flavor: "涩",
    dislike: "辣",
    title: "从泥里探头的小胡子",
    desc: "藏在河底淤泥里，只把两根胡须露在外头。",
    unlock: { type: "revenue", value: 250000 },
    lines: {
      greet: [
        "……我先冒个头，你别急着走。",
        "泥里暖和，你要不要也下来。"
      ],
      like: [
        "涩涩的，像水底的嫩草根。",
        "这味道不张扬，我喜欢。"
      ],
      dislike: [
        "辣的，我在泥里直打滚。"
      ],
      order: [
        "涩口的搁岸边就行，我自己拖进去。"
      ]
    }
  },
  {
    id: 456,
    dex: 456,
    name: "萤光鱼",
    region: 3,
    nature: "温和",
    flavor: "苦",
    dislike: "辣",
    title: "夜里点灯的小鱼",
    desc: "尾鳍的纹路会发光，夜里替过路的照一段水路。",
    unlock: { type: "revenue", value: 450000 },
    lines: {
      greet: [
        "你要过河吗，我给你照一段。",
        "我这光不亮，可够看清脚下。"
      ],
      like: [
        "苦味沉静，像夜里的凉水。",
        "这味道我记在心里了。"
      ],
      dislike: [
        "辣的，辣得我光都暗了。"
      ],
      order: [
        "苦的来几颗，我照夜路用。"
      ]
    }
  },

  // ---- R4 盐风镇：海岛港口，贸易与海风 ----
  {
    id: 278,
    dex: 278,
    name: "长翅鸥",
    region: 4,
    nature: "乐天",
    flavor: "酸",
    dislike: "苦",
    title: "迎着海风送信的翅膀",
    desc: "翅膀一展就驮着包裹飞过整片海湾，从不怕风。",
    unlock: { type: "crafted", value: 1200 },
    lines: {
      greet: [
        "海风正好，你的果子我闻见了。",
        "我刚从对岸回来，捎东西吗。"
      ],
      like: [
        "带点酸的，迎着风才嚼得香。",
        "这个酸味，跟海边的沙子一个脾气。"
      ],
      dislike: [
        "苦的塞牙，飞起来还打嗝。"
      ],
      order: [
        "酸的装两袋，我明早出海。"
      ]
    }
  },
  {
    id: 341,
    dex: 341,
    name: "龙虾小兵",
    region: 4,
    nature: "顽皮",
    flavor: "辣",
    dislike: "苦",
    title: "港口横着走的钳子",
    desc: "钳子夹得住船缆，也夹得住偷果子的家伙。",
    unlock: { type: "revenue", value: 800000 },
    lines: {
      greet: [
        "站住，报上来意，我钳子可不长眼。",
        "码头上我说了算，果子拿来我看看。"
      ],
      like: [
        "辣的够狠，我钳子都发烫了。",
        "这辣味，横着走都带风。"
      ],
      dislike: [
        "苦的，我钳子一夹就没了胃口。"
      ],
      order: [
        "辣的给我堆一堆，别抠门。"
      ]
    }
  },
  {
    id: 363,
    dex: 363,
    name: "海豹球",
    region: 4,
    nature: "悠闲",
    flavor: "酸",
    dislike: "甜",
    title: "滚着走的圆胖搬运工",
    desc: "圆得没法走路，靠滚把货从码头送回仓里。",
    unlock: { type: "crafted", value: 2200 },
    lines: {
      greet: [
        "我滚过来的，路上撞了三回。",
        "别推我，我自己会滚到摊前。"
      ],
      like: [
        "酸的，嚼起来像晒干的鱼皮。",
        "这味道我滚一路都在想。"
      ],
      dislike: [
        "甜的，我圆滚滚的滚得更快。"
      ],
      order: [
        "酸的给我装一筐，我滚回去。"
      ]
    }
  },
  {
    id: 370,
    dex: 370,
    name: "爱心鱼",
    region: 4,
    nature: "温和",
    flavor: "苦",
    dislike: "辣",
    title: "礁石间的成对游鱼",
    desc: "总是两只一起游，谁也拆不开它们。",
    unlock: { type: "affinity", value: 1 },
    lines: {
      greet: [
        "你今天是自己来的吗，真难得。",
        "我们俩都闻到了，果子在你这儿。"
      ],
      like: [
        "苦的，像海水里那点凉。",
        "这味道好，我们俩都喜欢。"
      ],
      dislike: [
        "辣得我们俩都躲进礁石缝。"
      ],
      order: [
        "苦的来一对，我们分着吃。"
      ]
    }
  },
  {
    id: 211,
    dex: 211,
    name: "千针鱼",
    region: 4,
    nature: "自大",
    flavor: "苦",
    dislike: "甜",
    title: "一身刺的码头老手",
    desc: "谁碰它一下，它就鼓成一团刺球，从不认输。",
    unlock: { type: "revenue", value: 1600000 },
    lines: {
      greet: [
        "站远点，我心情好了才卖你面子。",
        "这码头我混得最久，别跟我耍花样。"
      ],
      like: [
        "苦的才够格，甜腻的东西少来。",
        "这苦味有骨头，我认。"
      ],
      dislike: [
        "甜得我浑身发软，刺都立不起来。"
      ],
      order: [
        "苦的，按我说的量来。"
      ]
    }
  },
  {
    id: 594,
    dex: 594,
    name: "保母曼波",
    region: 4,
    nature: "温顺",
    flavor: "苦",
    dislike: "酸",
    title: "把伤员驮回浅湾",
    desc: "身体是软垫，受伤的邻居都往它怀里靠。",
    unlock: { type: "revenue", value: 2500000 },
    lines: {
      greet: [
        "你气色不太好，先坐下歇歇。",
        "我把浅湾清出来了，果子放那儿就成。"
      ],
      like: [
        "苦味养身，我给他们都备着。",
        "这苦的好，伤口好得快些。"
      ],
      dislike: [
        "酸的伤身，我不能收。"
      ],
      order: [
        "苦的来一筐，浅湾那边等着。"
      ]
    }
  },

  // ---- R5 沃雷奥斯岛：传说中的花田，稀有花系树果 ----
  {
    id: 175,
    dex: 175,
    name: "波克比",
    region: 5,
    nature: "爽朗",
    flavor: "甜",
    dislike: "涩",
    title: "花田里蹦跳的小壳",
    desc: "壳里装着说不清的福气，谁挨近它谁顺一整天。",
    unlock: { type: "crafted", value: 2500 },
    lines: {
      greet: [
        "咦，你来啦，我等你好久了。",
        "花田里今天开了很多，你看见没。"
      ],
      like: [
        "甜的好甜，我要在这里转三圈。",
        "这味道让我浑身暖融融的。"
      ],
      dislike: [
        "涩的，我的壳都缩紧了。"
      ],
      order: [
        "甜的，挑最圆的那几颗。"
      ]
    }
  },
  {
    id: 173,
    dex: 173,
    name: "皮宝宝",
    region: 5,
    nature: "温和",
    flavor: "苦",
    dislike: "辣",
    title: "跟着星星走的小家伙",
    desc: "夜里对着星星晃身体，说是在跟谁打招呼。",
    unlock: { type: "revenue", value: 4000000 },
    lines: {
      greet: [
        "星星今天出来得早，你也看到了吧。",
        "我认得你，你是常来的那个。"
      ],
      like: [
        "苦的沉沉的，像夜里落下来的味道。",
        "这味道很轻，可我记住了。"
      ],
      dislike: [
        "辣的，我晃身体的节奏都乱了。"
      ],
      order: [
        "苦的留一份，我晚上来拿。"
      ]
    }
  },
  {
    id: 298,
    dex: 298,
    name: "露力丽",
    region: 5,
    nature: "天真",
    flavor: "甜",
    dislike: "苦",
    title: "用尾巴弹跳的小球",
    desc: "尾巴又软又有劲，一弹能跳过整片花丛。",
    unlock: { type: "crafted", value: 4000 },
    lines: {
      greet: [
        "你从哪儿来呀，我怎么没见过你。",
        "我在数花，数到一半你来了。"
      ],
      like: [
        "甜甜的，我要抱着滚一圈。",
        "这个味道，我记得住。"
      ],
      dislike: [
        "苦苦的，我脸都皱成一团了。"
      ],
      order: [
        "甜的我都要，我跳着回去。"
      ]
    }
  },
  {
    id: 447,
    dex: 447,
    name: "利欧路",
    region: 5,
    nature: "勇敢",
    flavor: "辣",
    dislike: "甜",
    title: "对着海浪练拳的小个子",
    desc: "每天对着礁石挥拳，说要把浪打退三步。",
    unlock: { type: "affinity", value: 2 },
    lines: {
      greet: [
        "等我打完这十下，我马上过来。",
        "你有事就说，我站着听。"
      ],
      like: [
        "辣的够冲，配得上我练拳的劲。",
        "这味道，让我想再打一百下。"
      ],
      dislike: [
        "甜的让我松劲，练功时不吃。"
      ],
      order: [
        "辣的备好，我练完就来取。"
      ]
    }
  },
  {
    id: 587,
    dex: 587,
    name: "电飞鼠",
    region: 5,
    nature: "淘气",
    flavor: "酸",
    dislike: "涩",
    title: "滑翔时带静电的贼",
    desc: "披风一展开就带电，专挑熟透的果子下手。",
    unlock: { type: "revenue", value: 7000000 },
    lines: {
      greet: [
        "别伸手，我身上还带着电呢。",
        "我从坡上滑下来的，正好顺路。"
      ],
      like: [
        "酸的嚼着有嚼头，放电都有劲。",
        "这个酸味，我认准了。"
      ],
      dislike: [
        "涩的让我翅膜发麻，不好使。"
      ],
      order: [
        "酸的挑一篮，我滑翔来取。"
      ]
    }
  },
  {
    id: 235,
    dex: 235,
    name: "图图犬",
    region: 5,
    nature: "马虎",
    flavor: "涩",
    dislike: "苦",
    title: "花田里作画的尾巴",
    desc: "尾巴尖上的颜色，能把一整季的花都记下来。",
    unlock: { type: "revenue", value: 10000000 },
    lines: {
      greet: [
        "别动，你站的位置光正好。",
        "我在画这片花田，你踩着线了。"
      ],
      like: [
        "涩味像赭石，画出来是暖的。",
        "这味道有意思，我要调进颜色里。"
      ],
      dislike: [
        "太苦了，颜色都暗得发闷。"
      ],
      order: [
        "涩口的来两份，我画完就用。"
      ]
    }
  },

  // ---- R6 天顶山：高海拔梯田，温差与苦味系树果 ----
  {
    id: 397,
    dex: 397,
    name: "姆克鸟",
    region: 6,
    nature: "勇敢",
    flavor: "辣",
    dislike: "甜",
    title: "守着梯田的哨翅",
    desc: "在高空绕圈巡田，见着偷果子的就俯冲下去。",
    unlock: { type: "crafted", value: 4000 },
    lines: {
      greet: [
        "这片田归我看着，你走慢点。",
        "风向变了，今天会有寒气。"
      ],
      like: [
        "辣的驱寒，山头就靠这个过夜。",
        "这辣味，配上风才够。"
      ],
      dislike: [
        "甜的，冻硬了硌牙，不好。"
      ],
      order: [
        "辣的备两袋，我要巡夜。"
      ]
    }
  },
  {
    id: 304,
    dex: 304,
    name: "可可多拉",
    region: 6,
    nature: "慎重",
    flavor: "苦",
    dislike: "涩",
    title: "吃铁长大的小家伙",
    desc: "拿矿石当饭，壳是它一层层啃出来的。",
    unlock: { type: "revenue", value: 20000000 },
    lines: {
      greet: [
        "这块地底下有铁，我闻出来了。",
        "先让我看看你的筐结不结实。"
      ],
      like: [
        "苦的踏实，像啃矿石的味。",
        "这苦味，我这壳认得。"
      ],
      dislike: [
        "涩的渣子多，吃了肚子发沉。"
      ],
      order: [
        "苦果来一份，我慢慢啃。"
      ]
    }
  },
  {
    id: 322,
    dex: 322,
    name: "呆火驼",
    region: 6,
    nature: "慢吞吞",
    flavor: "涩",
    dislike: "酸",
    title: "背上驮着热汤的慢客",
    desc: "背上的驼峰存着热，雪落上去也化成水。",
    unlock: { type: "crafted", value: 7000 },
    lines: {
      greet: [
        "我走得慢，你别催我。",
        "山上风大，我背这儿暖和。"
      ],
      like: [
        "涩的干爽，配着热气正好。",
        "这味道我嚼了半天，越来越香。"
      ],
      dislike: [
        "酸的，我背上的热压不住了。"
      ],
      order: [
        "涩的搁我背上，我自己扛走。"
      ]
    }
  },
  {
    id: 324,
    dex: 324,
    name: "煤炭龟",
    region: 6,
    nature: "自大",
    flavor: "苦",
    dislike: "甜",
    title: "守着窑口的闷壳",
    desc: "壳里烧着煤，一呼一吸都往外冒白烟。",
    unlock: { type: "affinity", value: 3 },
    lines: {
      greet: [
        "别站在下风口，我这烟又浓又呛。",
        "来了就坐，我这儿暖和。"
      ],
      like: [
        "苦味顺气，我这烟也清些。",
        "这苦的够沉，我留着夜里吃。"
      ],
      dislike: [
        "太甜的东西，烧起来全是焦味。"
      ],
      order: [
        "苦的给我，我拿烟换。"
      ]
    }
  },
  {
    id: 207,
    dex: 207,
    name: "天蝎",
    region: 6,
    nature: "淘气",
    flavor: "酸",
    dislike: "涩",
    title: "顺着山壁滑行的刺尾",
    desc: "贴着崖壁滑翔，尾巴上的钩子挂住什么都行。",
    unlock: { type: "revenue", value: 30000000 },
    lines: {
      greet: [
        "我从上面滑下来的，没吓着你吧。",
        "山壁上那些果子，我都够得着。"
      ],
      like: [
        "酸的带着一点土味，正合我意。",
        "这个酸味，滑行时嚼最好。"
      ],
      dislike: [
        "涩的黏在钩子上，洗不掉。"
      ],
      order: [
        "酸的挂我尾巴上，我带走。"
      ]
    }
  },
  {
    id: 333,
    dex: 333,
    name: "青绵鸟",
    region: 6,
    nature: "温和",
    flavor: "苦",
    dislike: "辣",
    title: "停在肩头理羽毛",
    desc: "一身绒毛像云，落下来能把整根枝条盖住。",
    unlock: { type: "revenue", value: 45000000 },
    lines: {
      greet: [
        "你翅膀上落灰了，我帮你理。",
        "山上的云今天很低，我差点撞上。"
      ],
      like: [
        "苦味清爽，理羽毛时最舒服。",
        "这味道，我记了很久了。"
      ],
      dislike: [
        "辣的，我绒毛都要竖起来。"
      ],
      order: [
        "苦的来一份，我带回巢里。"
      ]
    }
  },

  // ---- R7 三元山：矿脉与温泉，温室与矿物肥料 ----
  {
    id: 218,
    dex: 218,
    name: "熔岩虫",
    region: 7,
    nature: "慢吞吞",
    flavor: "涩",
    dislike: "酸",
    title: "在温泉边慢慢化开",
    desc: "身体是流动的岩浆，走一步就留一道热痕。",
    unlock: { type: "crafted", value: 9000 },
    lines: {
      greet: [
        "你踩我那道热痕了，烫不烫。",
        "我走得慢，可我不会停。"
      ],
      like: [
        "涩的沉，正好压住我这一身热。",
        "这味道慢，跟我一个脾气。"
      ],
      dislike: [
        "酸的，我本来就不喜欢凉东西。"
      ],
      order: [
        "涩的放着，我挪过去取。"
      ]
    }
  },
  {
    id: 449,
    dex: 449,
    name: "沙河马",
    region: 7,
    nature: "悠闲",
    flavor: "酸",
    dislike: "甜",
    title: "在矿道上打滚的大口",
    desc: "张着大嘴慢慢挪，沙土从身上过一遍就干净了。",
    unlock: { type: "revenue", value: 120000000 },
    lines: {
      greet: [
        "路上灰大，你要不要也滚一圈。",
        "我躺了半天了，就等果子来。"
      ],
      like: [
        "酸的带沙感，嚼着才够味。",
        "这味道，跟我身上一个样。"
      ],
      dislike: [
        "甜的一沾沙就腻住了。"
      ],
      order: [
        "酸的堆我旁边就行。"
      ]
    }
  },
  {
    id: 524,
    dex: 524,
    name: "石丸子",
    region: 7,
    nature: "固执",
    flavor: "辣",
    dislike: "涩",
    title: "石头里长出的耳朵",
    desc: "全身是石，只有中间那个洞能听见很远的声音。",
    unlock: { type: "crafted", value: 15000 },
    lines: {
      greet: [
        "我听见你脚步了，从坡下上来。",
        "别踢我，我还得在这儿长。"
      ],
      like: [
        "辣的冲，正好像地底下的热。",
        "这辣味，我认准不换。"
      ],
      dislike: [
        "涩的，会把我这层石皮泡松。"
      ],
      order: [
        "辣的来一袋，我扛回矿洞。"
      ]
    }
  },
  {
    id: 529,
    dex: 529,
    name: "螺钉地鼠",
    region: 7,
    nature: "急躁",
    flavor: "甜",
    dislike: "酸",
    title: "转眼挖穿一条矿道",
    desc: "两只爪子转得比风车快，一天能挖穿半座山。",
    unlock: { type: "affinity", value: 4 },
    lines: {
      greet: [
        "别挡道别挡道，我赶着挖。",
        "说重点，我爪子停不下来。"
      ],
      like: [
        "甜的顶饿，挖起来才有力气。",
        "这味道好，我三口就吃完。"
      ],
      dislike: [
        "酸的让我停下来，最烦这个。"
      ],
      order: [
        "甜的给我塞着，我边挖边吃。"
      ]
    }
  },
  {
    id: 631,
    dex: 631,
    name: "熔蚁兽",
    region: 7,
    nature: "自大",
    flavor: "苦",
    dislike: "甜",
    title: "舌头一卷就搬空矿山",
    desc: "长长的舌头能吸走整条矿脉的热气，什么都不怕。",
    unlock: { type: "revenue", value: 200000000 },
    lines: {
      greet: [
        "让开点，别挡着我找热源。",
        "这矿道我说了算，果子拿来。"
      ],
      like: [
        "苦的够冲，配我这口气正好。",
        "这味道有火气，我收下了。"
      ],
      dislike: [
        "甜得发腻，我的舌头不认。"
      ],
      order: [
        "苦的按份来，别让我等。"
      ]
    }
  },
  {
    id: 632,
    dex: 632,
    name: "铁蚁",
    region: 7,
    nature: "勇敢",
    flavor: "辣",
    dislike: "甜",
    title: "排着队搬矿的工蚁",
    desc: "一条队能延到山脚，搬起矿石比谁都稳。",
    unlock: { type: "revenue", value: 300000000 },
    lines: {
      greet: [
        "排队排队，一个一个来。",
        "我今天搬了三趟，还能再搬。"
      ],
      like: [
        "辣的提劲，队伍不能停。",
        "这辣味够狠，我腿都不酸了。"
      ],
      dislike: [
        "甜的，我夹不住就掉了。"
      ],
      order: [
        "辣的装好，全队等着分。"
      ]
    }
  },

  // ---- R8 水晶洞穴：地下发光农场，昼夜无关 ----
  {
    id: 303,
    dex: 303,
    name: "大嘴娃",
    region: 8,
    nature: "大胆",
    flavor: "酸",
    dislike: "辣",
    title: "用后脑的角吓唬访客",
    desc: "背后那张大嘴只是壳，真正的脸小得很。",
    unlock: { type: "crafted", value: 12000 },
    lines: {
      greet: [
        "敢往洞里走，你胆子不小。",
        "别怕那张嘴，它咬不到你。"
      ],
      like: [
        "酸的够劲，我后面那张嘴爱啃。",
        "这个酸味，我留着慢慢咬。"
      ],
      dislike: [
        "辣的，那张嘴嫌冲，不吃。"
      ],
      order: [
        "酸的来两把，我要磨角。"
      ]
    }
  },
  {
    id: 302,
    dex: 302,
    name: "勾魂眼",
    region: 8,
    nature: "淘气",
    flavor: "酸",
    dislike: "涩",
    title: "专挖亮石头的老手",
    desc: "胸口的宝石会吃光，洞里的亮石头都归它收。",
    unlock: { type: "revenue", value: 500000000 },
    lines: {
      greet: [
        "嘿嘿，你身上有亮东西吗。",
        "我在这儿挖了半辈子，哪儿有货我清楚。"
      ],
      like: [
        "酸的脆，跟我啃的石头一个味。",
        "这味道好，我要多挖几颗。"
      ],
      dislike: [
        "涩的糊嘴，挖矿最忌讳这个。"
      ],
      order: [
        "酸的给我，我拿亮石头换。"
      ]
    }
  },
  {
    id: 436,
    dex: 436,
    name: "铜镜怪",
    region: 8,
    nature: "慎重",
    flavor: "苦",
    dislike: "涩",
    title: "悬在洞顶的老镜",
    desc: "镜面转一转，就知道洞里哪儿会塌。",
    unlock: { type: "crafted", value: 20000 },
    lines: {
      greet: [
        "先别往里走，前面那块要落。",
        "我照过你了，你不是坏东西。"
      ],
      like: [
        "苦味稳稳的，正合我这面镜子。",
        "这苦的，我把影子都照清楚了。"
      ],
      dislike: [
        "涩的照出来发花，看不清路。"
      ],
      order: [
        "苦的放我下面，我照着。"
      ]
    }
  },
  {
    id: 433,
    dex: 433,
    name: "铃铛响",
    region: 8,
    nature: "爽朗",
    flavor: "甜",
    dislike: "涩",
    title: "洞里响个不停的小铃",
    desc: "一跳就响一声，声音能在水晶洞里绕很久。",
    unlock: { type: "affinity", value: 4 },
    lines: {
      greet: [
        "叮——你听见了吗，是我在叫你。",
        "这洞太大了，我得响着才敢走。"
      ],
      like: [
        "甜的，我一高兴就响个不停。",
        "这味道让我响得更好听。"
      ],
      dislike: [
        "涩的，我的声音都哑了。"
      ],
      order: [
        "甜的来一份，我要一路响回去。"
      ]
    }
  },
  {
    id: 355,
    dex: 355,
    name: "夜巡灵",
    region: 8,
    nature: "冷静",
    flavor: "涩",
    dislike: "甜",
    title: "举着灯巡夜的影子",
    desc: "眼睛里那点光一直盯着你，跟到田边才停。",
    unlock: { type: "revenue", value: 900000000 },
    lines: {
      greet: [
        "我一直看着你，从洞口开始。",
        "夜里的田总得看着，我来。"
      ],
      like: [
        "涩的耐放，巡夜的都靠它。",
        "这味道深，跟洞底一样。"
      ],
      dislike: [
        "甜的让我犯困，巡夜不能吃。"
      ],
      order: [
        "涩的备着，我天亮前来取。"
      ]
    }
  },
  {
    id: 607,
    dex: 607,
    name: "烛光灵",
    region: 8,
    nature: "胆小",
    flavor: "甜",
    dislike: "辣",
    title: "怕风的一小簇火",
    desc: "头顶那点火苗经不起风，走到洞口就得躲回来。",
    unlock: { type: "revenue", value: 1400000000 },
    lines: {
      greet: [
        "把门带上好吗，风会吹灭我。",
        "我走得很慢，光也照不远。"
      ],
      like: [
        "甜的，我的火苗会亮一些。",
        "这味道暖，像有谁替我挡风。"
      ],
      dislike: [
        "辣的，我的火一下子缩了。"
      ],
      order: [
        "甜的放我前面，我自己挪过去。"
      ]
    }
  },

  // ---- R9 赤沙绿洲：沙漠中的绿洲，欧亚西莉亚的故乡 ----
  {
    id: 328,
    dex: 328,
    name: "大颚蚁",
    region: 9,
    nature: "固执",
    flavor: "辣",
    dislike: "涩",
    title: "沙坑底下等猎物的嘴",
    desc: "在沙里挖个漏斗，一趴就是一整天。",
    unlock: { type: "crafted", value: 26000 },
    lines: {
      greet: [
        "别踩坑边，那是我挖的。",
        "我在等，你可以先忙别的。"
      ],
      like: [
        "辣的够烈，配得上这日头。",
        "这味道，我在沙里也闻得到。"
      ],
      dislike: [
        "涩的，我这坑里可不兴这个。"
      ],
      order: [
        "辣的扔进坑里，我自己捡。"
      ]
    }
  },
  {
    id: 329,
    dex: 329,
    name: "超音波幼虫",
    region: 9,
    nature: "大胆",
    flavor: "酸",
    dislike: "辣",
    title: "贴着沙面飞的小龙",
    desc: "翅膀扇出听不见的声音，能把沙面震出波纹。",
    unlock: { type: "revenue", value: 3500000000 },
    lines: {
      greet: [
        "听见那阵嗡嗡了吗，是我。",
        "风沙大，跟我后头走稳。"
      ],
      like: [
        "酸的干，沙子进了嘴也不怕。",
        "这味道，我飞一路都在嚼。"
      ],
      dislike: [
        "辣的呛嗓子，绿洲边上最烦。"
      ],
      order: [
        "酸的捆好，我贴着沙面驮走。"
      ]
    }
  },
  {
    id: 443,
    dex: 443,
    name: "圆陆鲨",
    region: 9,
    nature: "顽皮",
    flavor: "辣",
    dislike: "苦",
    title: "咬什么都使劲的小鲨",
    desc: "见着会动的东西就先咬一口，牙比脑子快。",
    unlock: { type: "crafted", value: 42000 },
    lines: {
      greet: [
        "让我咬一口试试，就一口。",
        "你手上那个能吃吗，闻着不错。"
      ],
      like: [
        "辣的刺舌头，我喜欢这种感觉。",
        "这味道够冲，再给我一颗。"
      ],
      dislike: [
        "苦的软趴趴，咬起来没意思。"
      ],
      order: [
        "辣的都拿来，我全都要。"
      ]
    }
  },
  {
    id: 551,
    dex: 551,
    name: "黑眼鳄",
    region: 9,
    nature: "马虎",
    flavor: "涩",
    dislike: "苦",
    title: "埋在沙里只露眼睛",
    desc: "把自己埋进沙里，只留一双眼睛看外面的动静。",
    unlock: { type: "affinity", value: 5 },
    lines: {
      greet: [
        "我在这儿呢，低头看。",
        "沙子底下舒服，你要不要试试。"
      ],
      like: [
        "涩的带点土，越嚼越有味。",
        "这味道，我在沙里泡着也想。"
      ],
      dislike: [
        "苦的黏牙，沙也洗不掉。"
      ],
      order: [
        "涩的埋我旁边，我自己挖。"
      ]
    }
  },
  {
    id: 290,
    dex: 290,
    name: "土居忍士",
    region: 9,
    nature: "内敛",
    flavor: "涩",
    dislike: "辣",
    title: "藏在树根下的十年",
    desc: "在地底下待很久很久，靠树根的汁过日子。",
    unlock: { type: "revenue", value: 6500000000 },
    lines: {
      greet: [
        "……我只是出来拿点东西。",
        "别看我，我马上回去。"
      ],
      like: [
        "涩的，像树根里渗出来的味。",
        "这味道我很熟，从小就吃。"
      ],
      dislike: [
        "辣的，我受不了，得躲回土里。"
      ],
      order: [
        "涩的搁树根边，我夜里来搬。"
      ]
    }
  },
  {
    id: 445,
    dex: 445,
    name: "烈咬陆鲨",
    region: 9,
    nature: "勇敢",
    flavor: "辣",
    dislike: "甜",
    title: "绿洲上空的沙暴之翼",
    desc: "飞过的地方会扬起一道沙线，绿洲的边界由它画。",
    unlock: { type: "revenue", value: 10000000000 },
    lines: {
      greet: [
        "这片绿洲归我巡，你站稳了。",
        "我从很远的地方来，风里有果味。"
      ],
      like: [
        "辣的够狠，配得上沙暴的劲。",
        "这味道，我一口就认下了。"
      ],
      dislike: [
        "甜的，冲淡了我要的那股烈。"
      ],
      order: [
        "辣的备足，我要带走过沙区。"
      ]
    }
  },

  // ---- R10 菲洛若亚天穹园：云海之上的天空花园，终局 ----
  {
    id: 334,
    dex: 334,
    name: "七夕青鸟",
    region: 10,
    nature: "温和",
    flavor: "苦",
    dislike: "辣",
    title: "在云里打盹的棉羽",
    desc: "羽毛像棉花，钻进云里就找不着了。",
    unlock: { type: "crafted", value: 55000 },
    lines: {
      greet: [
        "云今天厚，你别走散了。",
        "我在这儿歇了一会儿，正好看见你。"
      ],
      like: [
        "苦的清爽，像高处的风。",
        "这味道沉沉的，我记住了。"
      ],
      dislike: [
        "辣的冲，会把云吹散。"
      ],
      order: [
        "苦的来一份，我带去云上。"
      ]
    }
  },
  {
    id: 468,
    dex: 468,
    name: "波克基斯",
    region: 10,
    nature: "爽朗",
    flavor: "甜",
    dislike: "涩",
    title: "带来好消息的翅膀",
    desc: "它飞过的地方，花会开得比别处早一天。",
    unlock: { type: "revenue", value: 28000000000 },
    lines: {
      greet: [
        "你来了，我等这天等了很久。",
        "云底下有好消息，你要听吗。"
      ],
      like: [
        "甜的，甜得我想绕园子飞三圈。",
        "这味道好，我要分给云下的花。"
      ],
      dislike: [
        "涩的，会把我的好心情压下去。"
      ],
      order: [
        "甜的挑最好的，我要送出去。"
      ]
    }
  },
  {
    id: 380,
    dex: 380,
    name: "拉帝亚斯",
    region: 10,
    nature: "胆小",
    flavor: "甜",
    dislike: "辣",
    title: "云海里躲着飞的影",
    desc: "一身绒羽能映出周围的天色，谁也看不清它。",
    unlock: { type: "crafted", value: 90000 },
    lines: {
      greet: [
        "……我在这儿，你别声张。",
        "我绕了很远才敢过来。"
      ],
      like: [
        "甜的柔和，像我飞过的那片高空。",
        "这味道，我悄悄记下了。"
      ],
      dislike: [
        "辣的太张扬，我不习惯。"
      ],
      order: [
        "甜的放在石台上，我远远来取。"
      ]
    }
  },
  {
    id: 381,
    dex: 381,
    name: "拉帝欧斯",
    region: 10,
    nature: "勇敢",
    flavor: "辣",
    dislike: "甜",
    title: "穿破云层的疾风",
    desc: "收起翅膀也能飞，云层在它身后合成一条线。",
    unlock: { type: "affinity", value: 5 },
    lines: {
      greet: [
        "我飞得急，你话说短些。",
        "云上有风，我替你探过了。"
      ],
      like: [
        "辣的够劲，配得上这个高度。",
        "这味道，我要带回云上去。"
      ],
      dislike: [
        "甜的拖慢我，飞不动。"
      ],
      order: [
        "辣的备好，我取完就走。"
      ]
    }
  },
  {
    id: 490,
    dex: 490,
    name: "玛纳霏",
    region: 10,
    nature: "天真",
    flavor: "甜",
    dislike: "苦",
    title: "从云海游上来的小客",
    desc: "头顶的触须能感知远方的水，云海在它眼里也是海。",
    unlock: { type: "revenue", value: 50000000000 },
    lines: {
      greet: [
        "这上面也有海吗，我游了好久。",
        "你身上有水的味道，我认得。"
      ],
      like: [
        "甜的，我刚从很远的地方游上来。",
        "这味道让我想再游一段。"
      ],
      dislike: [
        "苦的，我在云里差点沉下去。"
      ],
      order: [
        "甜的给我一份，我要带回去。"
      ]
    }
  },
  {
    id: 384,
    dex: 384,
    name: "烈空坐",
    region: 10,
    nature: "冷静",
    flavor: "涩",
    dislike: "甜",
    title: "盘在天穹之上的长龙",
    desc: "从不落地，绕着天穹园飞一整圈就是一年。",
    unlock: { type: "revenue", value: 80000000000 },
    lines: {
      greet: [
        "我很少下来，你来得正是时候。",
        "云上安静，我不喜欢多话。"
      ],
      like: [
        "涩的够沉，配得上这条云海。",
        "这味道，我从云上就闻到了。"
      ],
      dislike: [
        "甜的腻，我飞到这儿不是为了这个。"
      ],
      order: [
        "涩的按我说的量备好，我取走。"
      ]
    }
  }
];
