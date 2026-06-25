/* Real TSLA option-chain snapshot — captured 2026-06-24 ~market close, spot $375.39.
   Each contract: [mid mark, delta, theta, vega, IV]. Premiums/Greeks are live, not illustrative.
   This is the single data seam: replace MKT with a live feed later and nothing downstream changes. */
export const MKT = {
  spot: 375.39, prevClose: 381.61, asof: 'Jun 24, 2026',
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
};

/* Strategy templates: legs reference [type,strike,sign] (sign +1 long, −1 short). 'stock' = 100 shares.
   Payoff, capital-at-risk, and Greeks all derive from the same legs + real premiums — nothing hardcoded. */
export const STRATS = [
  { n: 'Defined-risk bet', t: 'Bull call spread', legs: [['c', 375, 1], ['c', 405, -1]] },
  { n: 'Leveraged upside', t: 'Long call', legs: [['c', 375, 1]] },
  { n: 'Downside protection', t: 'Long put', legs: [['p', 375, 1]] },
  { n: 'Bearish, defined', t: 'Bear put spread', legs: [['p', 375, 1], ['p', 345, -1]] },
  { n: 'Collect premium', t: 'Put credit spread', legs: [['p', 350, -1], ['p', 330, 1]] },
  { n: 'Bet on calm', t: 'Iron condor', legs: [['p', 340, -1], ['p', 320, 1], ['c', 410, -1], ['c', 430, 1]] },
  { n: 'Big move either way', t: 'Long straddle', legs: [['c', 375, 1], ['p', 375, 1]] },
  { n: 'Own the move', t: 'Long stock', legs: [['stock', 0, 1]] }
];
