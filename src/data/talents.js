// 天赋树：局外加成，移民（转世）后用天赋点购买，永久保留。
window.G = window.G || {};
(function () {
  G.TALENTS = [
    { id: "growth", name: "根脉", max: 10, base: 1, desc: "开局生长速度 +15%", mod: "growSpeed", per: 0.15 },
    { id: "price", name: "议价", max: 10, base: 2, desc: "全部售价 +8%", mod: "sell", per: 0.08 },
    { id: "click", name: "掌力", max: 12, base: 1, desc: "点击收益 +25%", mod: "click", per: 0.25 },
    { id: "idle", name: "静养", max: 8, base: 3, desc: "离线收益 +20%，离线上限 +2 小时", mod: "offline", per: 0.2 },
    { id: "plots", name: "阡陌", max: 6, base: 4, desc: "每个区域开局多 1 块田", mod: "plots", per: 1 },
    { id: "seeds", name: "留种", max: 8, base: 3, desc: "种子价格 -6%", mod: "seedDiscount", per: 0.06 },
    { id: "affinity", name: "亲和", max: 8, base: 3, desc: "常客好感获取 +30%", mod: "affinity", per: 0.3 },
    { id: "craft", name: "火候", max: 8, base: 3, desc: "加工速度 +12%", mod: "craftSpeed", per: 0.12 },
    { id: "helper", name: "同行", max: 8, base: 4, desc: "帮手效率 +20%", mod: "helper", per: 0.2 },
    { id: "move", name: "轻装", max: 8, base: 5, desc: "移民费 -6%", mod: "moveDiscount", per: 0.06 },
    { id: "bond", name: "行囊", max: 10, base: 5, desc: "移民时保留 5% 的宝可元", mod: "keepMoney", per: 0.05 },
    { id: "dragon", name: "龙之祝福", max: 10, base: 8, desc: "全部收益 +5%", mod: "all", per: 0.05 }
  ];

  G.TALENT_BY_ID = {};
  G.TALENTS.forEach((t) => { G.TALENT_BY_ID[t.id] = t; });

  // 第 level+1 级的天赋点价格（level 从 0 起）
  G.talentCost = function (talent, level) {
    return Math.ceil(talent.base * Math.pow(1.65, level));
  };

  // 移民获得的天赋点：对数曲线，避免后期点数爆炸
  G.talentPointsFor = function (regionRevenue) {
    if (regionRevenue < 2000) return 0;
    return Math.max(1, Math.floor(2 + 1.6 * Math.log10(1 + regionRevenue / 1000)));
  };

  // 已经点下去的等级一共花了多少点（洗点时原样退回）
  G.talentSpentNow = function (state) {
    let sum = 0;
    (G.TALENTS || []).forEach((t) => {
      const lv = (state && state.talents && state.talents[t.id]) || 0;
      for (let i = 0; i < lv; i++) sum += G.talentCost(t, i);
    });
    return sum;
  };

  // 洗点：每个区域只能洗一次（搬到新区域后解锁）。
  // 返回 { ok, why } —— 真正动 state 的在 engine.A.respecTalents 里。
  G.canRespecTalents = function (state) {
    if (!G.talentSpentNow(state)) return { ok: false, why: "现在还没有点下去的天赋点" };
    if ((state.talentRespecAt || 0) === state.region) {
      return { ok: false, why: "这个区域已经洗过一次了，搬到新区域才能再洗" };
    }
    return { ok: true };
  };
})();
