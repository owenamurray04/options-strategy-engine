# Thesis — an idea-first options strategy generator

> Working name. Early prototype.

Most options tools make you pick the strategy first, then show you its risk profile.
**Thesis flips that:** you express a plain-English market view — *where* you think a stock
is headed, *when*, and *how sure you are* — and the engine returns a small set of ranked,
risk-managed options strategies that express that view.

The core interaction is a **prediction canvas**: you draw your belief as a smooth 2D
probability cloud over price × time (draggable, skewable, and tiltable into a 3D surface).
That cloud is a real probability distribution, which the engine integrates every candidate
strategy's payoff against to rank them.

## Status

Single-file browser prototype. **No build step, no server, no dependencies.**

- ✅ Step 1 — pick a market view (up / down / flat / pairs)
- ✅ Step 2 — the prediction canvas (2D density + 3D tilt + drag-to-rotate, with skew)
- ✅ Step 3 — strategies ranked **live** from the distribution you draw
- ⚠️ Strikes, premiums, and Greeks are **illustrative / hardcoded** — there is **no live
  option-chain data yet**, so the dollar figures are representative, not tradeable.

## Run it

Open `index.html` in any modern browser (double-click it, or drag it into Chrome).
That's it.

## How it works (short version)

- The prediction cloud is a **split (two-piece) 2D normal** over price and time — separate
  spreads above/below your most-likely point, and earlier/later, so it can be skewed.
- Strategies are scored on a **risk-adjusted, per-capital** objective:
  `score = (expected P/L − λ · CVaR₅%(loss)) / capital`, i.e. reward minus worst-case
  tail, per dollar tied up. Probability of profit and Greeks are shown but are *not* the
  ranking criterion.

## Roadmap

1. **Real option-chain data** (yfinance / Tradier) so strikes/premiums/IV are real.
2. **Calibration** — define what the cloud's spread means (68% / 95% bands).
3. **Validation** — tune the objective against expert judgment.
4. Portfolio-aware mode, presets vs. advanced dials, naming/identity.

## Disclaimer

Educational and informational only. **Not financial advice.** All figures in the current
prototype are illustrative. See `CLAUDE.md` for full design context and decisions.
