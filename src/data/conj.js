// 共轭图纸：阿特拉斯一次只能开一副模具 —— 两张图纸刻在同一块板上，只做一张，另一张封存。
//
// 设计意图（见 DESIGN.md 3.5）：
//   游戏有两道互相扯着的门槛 ——「工位」和「树果」。同一份甜品，站在工位上看和站在
//   果子看，谁划算是不一样的：果酱占工位最划算，拿破仑最省果子。这个差距不该靠
//   「一刀切平」抹掉（那会把节奏改坏），而应该让玩家**自己选站哪一边**。
//   所以每组共轭的两侧都朝相反方向偏：一侧往「宽」走（果子多、做得多、卖得快），
//   另一侧往「精」走（单件更值钱、更省果子、慢配方更强）。
//
// 规则：
//   · 一组图纸解锁后永久拥有，随时可以看。
//   · 选定一侧之后，**同一个区域内不能改**；搬到新区域后可以重新选（挑另一边也行）。
//     所以「共轭」是每段旅程开始时的一次定调，不是一次性永久锁死。
//   · 造一副图纸要花材料和阿特拉斯的时间，占用同一个制作间。
//
// 文案：阿特拉斯（暴飞龙，铁匠）的口吻。话少、手上有活，关心都绕到工具细节上去。

window.G = window.G || {};
(function () {
  G.CONJ = [
    {
      id: "field",
      name: "田垄之辩",
      region: 1,
      theme: "地里的活计，是往高里叠，还是往细里做。",
      materials: { wood: 10, clay: 6 },
      craftTime: 90,
      sides: [
        {
          id: "vertical", name: "立式农田", tag: "宽",
          icon: "c_vertical_farm",
          desc: "木架一层层往上叠，一块地上挂三排果藤。每次收获额外多摘 2 颗树果。",
          atlas: "架子我用最粗的木料搭的，横梁两头都打了榫，风大也晃不动。最上那一层你够不着就喊我，别自己往上蹦。",
          mods: { yieldAdd: 2 }
        },
        {
          id: "drip", name: "滴水灌溉", tag: "精",
          icon: "c_drip_irrigation",
          desc: "陶管沿着垄沟一节节埋到根底下，水一点一点渗进去，果藤长得快、糖分也攒得住。生长速度 +10%，全部售价 +12%。",
          atlas: "管子是我一节一节捏出来、一节一节烧出来的，火候差一点的全让我砸了重做。埋管那道土你千万别上手，还烫着。",
          mods: { sellBonus: 0.12, growSpeed: 0.10 }
        }
      ]
    },
    {
      id: "host",
      name: "待客之道",
      region: 3,
      theme: "客人是坐下来慢慢吃，还是装好了就带走。",
      materials: { vine: 6, copper: 4, cloth: 2 },
      craftTime: 180,
      sides: [
        {
          id: "decor", name: "店内装潢", tag: "精",
          icon: "c_decor",
          desc: "梁下挂起布幔，墙角点上灯。坐下来的人肯多付些 —— 交给常客的价钱 +15%。",
          atlas: "灯罩是我拿薄铜一点点打的，火别点太旺，会把棚顶熏黑。布幔挑的是最耐脏的那一种，你别嫌它颜色闷。",
          mods: { regularPay: 0.15 }
        },
        {
          id: "takeaway", name: "提供打包", tag: "宽",
          icon: "c_takeaway",
          desc: "门口支起交货窗口，装了就走。常客好感 +80%，订单来得勤一倍半，赏金 +35%。",
          atlas: "窗口那截台面我磨得溜平，你的爪子往上一搭就知道货该递到哪儿。捆货的绳子备了两捆，用完了跟我说。",
          mods: { affinity: 0.8, orderRate: 1.5, orderPay: 0.35 }
        }
      ]
    },
    {
      id: "forge",
      name: "炉火之争",
      region: 5,
      theme: "火是开得猛，还是压得低。",
      materials: { copper: 6, resin: 4, quartz: 2 },
      craftTime: 240,
      sides: [
        {
          id: "fast", name: "快手淬火", tag: "宽",
          icon: "c_quench",
          desc: "风箱口径改大，火苗子窜得高。加工速度 +22%，什么配方都跟着快。",
          atlas: "风箱的皮子换了新的，一压到底整块炉膛都亮。你往后站两步，火星子这会儿溅得远。",
          mods: { craftSpeed: 0.22 }
        },
        {
          id: "slow", name: "慢火细作", tag: "精",
          icon: "c_slowfire",
          desc: "炉底压上一层细灰，火只留个通红的芯。耗时 60 秒以上的配方，额外产出的概率 +40%；慢工出细活，火候也稳，这些配方快 10%。",
          atlas: "火压成这颜色最听话，锅里的东西慢慢收，收得住。急火出不了细活 —— 这话我跟你说过没有？……说过两回了。",
          mods: { slowOutput: 0.40, craftSpeed: 0.10 }
        }
      ]
    },
    {
      id: "thrift",
      name: "用料之学",
      region: 7,
      theme: "边角料是攒着再用，还是压根就少拿。",
      materials: { resin: 6, quartz: 6, ash: 3 },
      craftTime: 300,
      sides: [
        {
          id: "reuse", name: "边角复用", tag: "宽",
          icon: "c_reuse",
          desc: "切下来的碎边、刮下来的余料全收进罐子。加工时额外产出的概率 +20%。",
          atlas: "台面底下我钉了一排小罐，碎料按味道分开装。你看，一小罐也是料，扔了就是钱。",
          mods: { craftOutput: 0.20 }
        },
        {
          id: "save", name: "精打细算", tag: "精",
          icon: "c_thrift",
          desc: "配方本上重新算了一遍投料。研发出来的配方所需树果 -22%（最少还是要 2 颗）。",
          atlas: "我把你记的配方本从头翻到尾，一页一页重新核过。原来有几样根本用不着那么多 —— 多下的那些，全是在锅里白费。",
          mods: { berrySave: 0.22 }
        }
      ]
    },
    {
      id: "bonewing",
      name: "骨与翼",
      region: 9,
      theme: "剩下的力气，是留在铺子里，还是撒到路上。",
      materials: { ash: 6, salt: 4, dragonscale: 2, mooncrystal: 1 },
      craftTime: 360,
      sides: [
        {
          id: "backbone", name: "龙之股肱", tag: "在店",
          icon: "c_backbone",
          desc: "他把换下来的旧硬鳞磨成粉掺进炉料，整间工棚都跟着硬气。全部收益 +12%。",
          atlas: "那片鳞我收在工具箱底下很多年了，一直没舍得磨。……磨了就磨了，反正留在身上也不会再长厚一层。",
          mods: { allBonus: 0.12 }
        },
        {
          id: "glide", name: "长途滑翔", tag: "在外",
          icon: "c_glide",
          desc: "翅膀骨架收了收紧，滑得又远又省力。离线收益 +60%，离线上限 +3 小时。",
          atlas: "翅膀根的旧骨节重新绑过一道，落地的时候不那么震了。响动小了，你在草窝里睡着也吵不着你。",
          mods: { offline: 0.6, offlineCap: 10800 }
        }
      ]
    }
  ];

  G.CONJ_BY_ID = {};
  G.CONJ.forEach((p) => { G.CONJ_BY_ID[p.id] = p; });

  // 某副图纸的某一侧；找不到就返回 null
  G.conjSide = function (pair, sideId) {
    if (!pair || !sideId) return null;
    return (pair.sides || []).filter((s) => s.id === sideId)[0] || null;
  };

  // 当前生效的共轭加成（按图纸顺序）
  G.conjActive = function (state) {
    const out = [];
    if (!state || !state.conj) return out;
    G.CONJ.forEach((pair) => {
      const pick = state.conj[pair.id];
      if (!pick) return;
      const side = G.conjSide(pair, pick.side);
      if (side) out.push({ pair: pair, side: side });
    });
    return out;
  };

  // 这副图纸造出来了没有（没造出来的不能选）
  G.conjOwned = function (state, pairId) {
    return !!(state && state.conjOwned && state.conjOwned[pairId]);
  };

  // 现在能不能改选：没选过，或者上次选的时候不在这个区域
  G.conjCanPick = function (state, pairId) {
    const pick = state && state.conj && state.conj[pairId];
    if (!pick || !pick.side) return true;
    return pick.region !== state.region;
  };
})();
