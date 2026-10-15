// 数字与时间格式化。增量游戏的可读性全靠这里。
window.G = window.G || {};
(function () {
  const UNITS = ["", "万", "亿", "兆", "京", "垓", "秭", "穰", "沟", "涧", "正", "载"];

  function fmt(n, digits) {
    if (n === Infinity) return "∞";
    if (n === null || n === undefined || isNaN(n)) return "0";
    const neg = n < 0;
    n = Math.abs(n);
    const d = digits === undefined ? 1 : digits;
    let out;
    if (n < 1000) {
      out = n < 10 && n % 1 !== 0 ? n.toFixed(1) : String(Math.floor(n));
    } else if (n < 1e4) {
      out = String(Math.floor(n));
    } else {
      let i = 0;
      let v = n;
      while (v >= 1e4 && i < UNITS.length - 1) {
        v /= 1e4;
        i++;
      }
      out = (v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(d)) + UNITS[i];
    }
    return (neg ? "-" : "") + out;
  }

  // 带千分位的整数，用于小数值
  function num(n) {
    if (n === null || n === undefined || isNaN(n)) return "0";
    return Math.floor(n).toLocaleString("en-US");
  }

  // 秒 → "1小时23分"
  function time(sec) {
    sec = Math.max(0, Math.ceil(sec));
    if (sec < 60) return sec + "秒";
    const m = Math.floor(sec / 60);
    if (m < 60) return m + "分" + (sec % 60 ? (sec % 60) + "秒" : "");
    const h = Math.floor(m / 60);
    if (h < 24) return h + "小时" + (m % 60 ? (m % 60) + "分" : "");
    const day = Math.floor(h / 24);
    return day + "天" + (h % 24 ? (h % 24) + "小时" : "");
  }

  // 秒 → "01:23" / "1:02:03"
  function clock(sec) {
    sec = Math.max(0, Math.ceil(sec));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    const p = (x) => String(x).padStart(2, "0");
    return h > 0 ? h + ":" + p(m) + ":" + p(s) : p(m) + ":" + p(s);
  }

  function pct(x, digits) {
    return (x * 100).toFixed(digits === undefined ? 0 : digits) + "%";
  }

  function signed(x) {
    return (x >= 0 ? "+" : "") + x;
  }

  G.fmt = fmt;
  G.num = num;
  G.time = time;
  G.clock = clock;
  G.pct = pct;
  G.signed = signed;

  G.money = function (n) {
    return "₽" + fmt(n);
  };
})();
