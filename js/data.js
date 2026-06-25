/* Data layer / seam. Today this is a real but static snapshot keyed by ticker; in production
   searchSymbols()/getChain() become async calls to our data backend (Tradier → cache → JSON),
   and nothing downstream changes. Each contract: [mid mark, delta, theta, vega, IV].
   TSLA snapshot captured 2026-06-24 ~market close, spot $375.39 — premiums/Greeks are live. */
export const STOCKS = {
  TSLA: {
    name: 'Tesla', spot: 375.39, prevClose: 381.61, asof: 'Jun 24, 2026',
    exp: {
      jul: { label: 'Jul 17', dte: 23,
        c: { 375: [17.43, .534, -.384, .374, .449], 405: [6.70, .274, -.315, .313, .447], 410: [5.65, .240, -.295, .292, .449], 430: [2.87, .137, -.213, .206, .462] },
        p: { 320: [2.12, -.091, -.167, .154, .508], 330: [3.05, -.127, -.202, .196, .485], 340: [4.45, -.178, -.242, .245, .467], 345: [5.40, -.209, -.263, .270, .460], 350: [6.53, -.244, -.282, .295, .454], 375: [15.63, -.467, -.336, .374, .434] } },
      aug: { label: 'Aug 21', dte: 58,
        c: { 375: [29.35, .552, -.259, .591, .472], 405: [17.40, .390, -.246, .574, .470], 410: [15.90, .365, -.241, .562, .471], 430: [11.00, .276, -.214, .500, .474] },
        p: { 320: [7.43, -.172, -.154, .382, .490], 330: [9.53, -.212, -.171, .434, .481], 340: [12.15, -.258, -.187, .483, .474], 345: [13.65, -.283, -.194, .506, .470], 350: [15.35, -.309, -.200, .527, .468], 375: [26.03, -.451, -.216, .592, .459] } },
      sep: { label: 'Sep 18', dte: 86,
        c: { 375: [35.50, .563, -.213, .718, .466], 405: [23.23, .426, -.207, .714, .462], 410: [21.60, .405, -.204, .706, .463], 430: [16.10, .326, -.189, .657, .465] },
        p: { 320: [10.80, -.200, -.132, .509, .476], 330: [13.35, -.237, -.144, .562, .470], 340: [16.35, -.278, -.153, .611, .464], 345: [18.03, -.300, -.157, .633, .462], 350: [19.85, -.322, -.161, .653, .460], 375: [30.95, -.442, -.171, .719, .453] } }
    }
  }
};

/* Strategy templates: legs are [type, strike-as-×spot, sign] (sign +1 long, −1 short).
   Strikes are spot-relative so the library works on any ticker; the engine resolves each
   target to the nearest real listed strike. 'stock' = 100 shares at spot. */
export const STRATS = [
  { n: 'Defined-risk bet', t: 'Bull call spread', legs: [['c', 1.00, 1], ['c', 1.08, -1]] },
  { n: 'Leveraged upside', t: 'Long call', legs: [['c', 1.00, 1]] },
  { n: 'Downside protection', t: 'Long put', legs: [['p', 1.00, 1]] },
  { n: 'Bearish, defined', t: 'Bear put spread', legs: [['p', 1.00, 1], ['p', 0.92, -1]] },
  { n: 'Collect premium', t: 'Put credit spread', legs: [['p', 0.93, -1], ['p', 0.88, 1]] },
  { n: 'Bet on calm', t: 'Iron condor', legs: [['p', 0.91, -1], ['p', 0.85, 1], ['c', 1.09, -1], ['c', 1.15, 1]] },
  { n: 'Big move either way', t: 'Long straddle', legs: [['c', 1.00, 1], ['p', 1.00, 1]] },
  { n: 'Own the move', t: 'Long stock', legs: [['stock', 1.00, 1]] }
];

/* Search interface — local filter today, an async backend call in production (same shape). */
export function searchSymbols(q) {
  q = (q || '').trim().toUpperCase();
  const all = Object.keys(STOCKS).map(function (s) { return { sym: s, name: STOCKS[s].name, spot: STOCKS[s].spot }; });
  if (!q) return all;
  return all.filter(function (x) { return x.sym.indexOf(q) >= 0 || x.name.toUpperCase().indexOf(q) >= 0; });
}
export function getChain(sym) { return STOCKS[sym]; }
