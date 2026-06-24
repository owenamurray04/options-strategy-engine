# Design decisions & rationale

A record of what we decided while turning the original pitch ([The Big Idea](the-big-idea.md))
and engineering draft ([The Engine Logic](the-engine-logic.md)) into the working prototype.
This is the human-readable "why"; [`../CLAUDE.md`](../CLAUDE.md) is the terse machine-readable
handoff. Last updated 2026-06-24.

---

## 1. Scope: a focused prototype, not the whole platform

The original vision (brokerage integration, portfolio dashboards, GPU "universal solver",
monetization, B2B acquisition) is large. We deliberately narrowed to **one provable thesis**:

> *Type in a market view → get back a small set of sane, ranked options strategies, with
> charts.*

Everything that doesn't serve proving that was cut or deferred.

**Locked scope guardrails:**
- Educational / paper-only. **No brokerage connection, no order placement, no real money.**
- **Free / delayed data** only (e.g. yfinance, Tradier sandbox) — no real-time OPRA licensing.
- **No GPU, no full brute-force enumeration.** A templated, vectorized CPU search is plenty.

---

## 2. Audience: a spectrum, handled by progressive disclosure

- Launch wedge: retail / r/wallstreetbets — jargon hidden, fully guided.
- But it must **also scale up to genuinely advanced/pro use** (the owner works at a hedge fund
  and wants to use it himself and show colleagues).
- **Decision:** clean & friendly on the surface; serious depth under an **Advanced** toggle.
  Simple users get 2–3 presets (e.g. Cautious / Balanced / Aggressive); advanced users get the
  individual dials (tail level, slippage, IV/dividend overrides, factor weights, etc.).

---

## 3. The core interaction: the prediction canvas

This is the heart of the product and where most iteration happened.

**What it is now:** the user's belief is drawn as a **smooth 2D probability density "cloud"**
over price × time — densest at the most-likely outcome, fading to a faint coat everywhere else.

Key decisions, in the order we made them:

1. **Idea-first, plain English.** Step 1 asks "what's your big idea?" (up / down / flat / pairs),
   never strategy names.
2. **Merge "specifics" and "confidence" into one chart.** Asking *where/when* separately from
   *how sure* was artificial — they're one act.
3. **Draw it, don't slider it.** The prediction is placed directly on a price/time chart.
4. **Render the actual distribution, not a proxy shape.** We started with a draggable oval, then
   replaced it with a true **2D Gaussian density heatmap** — the same object the engine consumes.
5. **Support skew.** The distribution is a **split / two-piece normal**: independent spreads for
   upside vs. downside (price) and earlier vs. later (time). Skew is meaningful — upside-skew
   should push the engine toward call-side convexity; downside-skew toward protection.
6. **Interaction = one dot + grab-to-pull.** A single draggable dot is the most-likely point (the
   peak is always welded to it). To change the spread, grab anywhere else and pull; pull one side
   further for skew. No discrete resize handles.
7. **2D and 3D are one tilting view.** 2D is the surface seen from straight above. Toggling 3D
   smoothly tilts the whole board (gridlines, history, axes included) so the bell rises out of
   it; you can drag to rotate. 2D lays it flat to edit. It should feel like it was always 3D and
   you were just looking down.

**Critical architecture note:** everything is drawn on **one `<canvas>`** in a single coordinate
system. An earlier version split the density (canvas) from the dot/grid (an SVG overlay); the two
layers didn't map to identical screen pixels, so the dense peak visibly drifted off the dot. One
layer fixes this *by construction*. Do not reintroduce a second layer for chart chrome.

---

## 4. The scoring objective (the make-or-break)

The objective function decides which strategies rank highest — it *is* the product. The original
draft left the formula blank; we designed it.

**Decision — a principled multi-factor score with a mean–CVaR backbone, ranked per capital:**

```
score = ( E[π]  −  λ · CVaR₅%(loss) )  /  capital
```

- `E[π]` — expected profit/loss under the user's drawn distribution (the reward).
- `CVaR₅%` — the average loss in the worst 5% of outcomes (the coherent "how bad is bad"). For
  defined-risk trades this is just the max loss; for naked risk it's large, so those sink.
- `λ` — the user's single risk-aversion knob (Advanced exposes more dials; Simple users get
  presets).
- `/ capital` — so a $200 trade and a $25k trade compete fairly, and it slots into the
  Low/Medium/High capital buckets.

**Why this and not the obvious alternatives:**
- **Not raw expected value** — it always stampedes to maximum leverage (the "lottery ticket" /
  corner-solution trap). This was the single biggest latent flaw in the original concept.
- **Not Sharpe** — it punishes upside variance as hard as downside, which is backwards for
  asymmetric option payoffs; it over-rewards premium selling (looks pristine until the tail).
- **Multi-factor is fine — but only in commensurable units.** Weighted soups of probabilities +
  dollars + spread widths are indefensible and gameable. Keep every factor in return-on-capital.

**Supporting rules:**
- **Liquidity / transaction costs are baked into `π`** (realistic fills), never a separate
  bolted-on penalty term.
- **Probability of profit, Greeks, breakevens are display-only** — shown to the user, never the
  ranking criterion.
- **An objective function is a *preference*, not a predictive model.** There is no "accuracy" to
  maximize *in the objective itself*. Accuracy lives in (a) the inputs — distribution calibration
  and realistic pricing — and (b) validation against expert judgment.

---

## 5. Whose probabilities the engine optimizes against

**Decision:** rank under the **user's own view** (the product promise), but **also display the
market-implied (risk-neutral) fair value / probability of profit** as a reality check. The gap
between the user's view and the market's is itself a usable signal — the **"edge" factor** —
because it isolates the alpha attributable to the user's differentiated view. (The edge factor
was prototyped in demos; it is not yet wired into `index.html`.)

---

## 6. What's built vs. placeholder (as of 2026-06-24)

- ✅ The distribution model, payoff integration, and ranking are **real and reactive** — change
  the prediction and Step 3 re-ranks.
- ⚠️ Strikes, premiums, and Greeks are **hardcoded illustrative TSLA values**. There is **no live
  option-chain data yet**, so dollar figures are representative, not tradeable. This is the
  biggest gap between the prototype and something true.

---

## 7. Honest caveats / hard problems (don't lose these)

- **Data + licensing** is the real cost and the current biggest gap. Start with delayed/free data.
- **Calibration** — what does the cloud's spread *mean* (1σ? a 68%/95% band?). Undecided. This is
  what makes every downstream probability honest; settle it before claiming real numbers.
- **Regulation** — ranked, personalized trade recommendations can be construed as investment
  advice (potential RIA/FINRA exposure). Stay educational/paper-only; get real securities counsel
  before anything money-connected.
- **Timing dimension** — strategies expire on a fixed date, so "unsure about *when*" must
  eventually spread the view across multiple expirations (points toward calendar structures).

---

## 8. Roadmap (next steps, in priority order)

1. **Real option-chain data** (yfinance / Tradier sandbox) so Step 3's figures are real.
2. **Calibrate** the spread → render 68% / 95% bands so probabilities are honest.
3. **Validation pass** — generate scenarios + the engine's top picks; the owner critiques them;
   tune `λ` and factor weights to match expert judgment.
4. Wire the **edge-vs-market** factor and the **Advanced** factor dials into the app.
5. Naming / visual identity (currently the placeholder "Thesis").

---

## What changed from the original documents

| Original idea | What we decided |
|---|---|
| 4-step flow (view → specifics → confidence → results) | Kept, but **merged "specifics" + "confidence"** into one prediction canvas (now 3 steps). |
| Confidence as sliders + a green "profit zone" | Replaced with **draw-on-chart**; the input is a **2D probability density cloud**, now **skewable**, with a **2D/3D tilt**. |
| GPU "universal solver", ~1M-row brute force, <50ms, CUDA | **Cut.** Full enumeration of 3–4-leg combos is computationally explosive and unnecessary; use a **templated, vectorized CPU search**. The compute was never the hard part. |
| Black-Scholes "fair value" validation (Phase 2) | **Reframed.** Comparing market price to BS using market IV is largely circular; the real signal is the user's volatility view vs. implied. |
| Weighted score of PoP + ROI + liquidity + spread (formula left blank) | Replaced with a **coherent mean–CVaR-per-capital objective**; costs baked into payoffs; PoP/Greeks demoted to display. |
| Optimize purely for the user's prediction | Kept as the ranking basis, **plus a market-implied reality check** and an optional **edge** factor. |
| Brokerage connection, portfolio dashboard, margin simulator, monetization, B2B | **Deferred.** Out of scope for the prototype; revisit later. |
| "Avoiding financial advice liability" via disclaimers | Acknowledged as **genuinely harder than disclaimers** — treat as a real regulatory risk; stay educational/paper-only. |
