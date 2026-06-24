# Project context for Claude (handoff)

This file lets a fresh Claude session pick up where the last one left off. Read it fully
before working. Last updated 2026-06-24.

## What this is

**Thesis** (working name) — an *idea-first* options strategy generator. The user expresses a
plain-English market view; the engine returns a small set of ranked, risk-managed options
strategies that express it. The differentiator vs. competitors (OptionStrat, etc.): they
make you choose the strategy first; we choose it for you from your belief.

The whole product currently lives in one file: **`index.html`** (vanilla HTML/CSS/JS, no
build step, no dependencies, opens directly in a browser). Inter is loaded from Google Fonts
with a system-font fallback.

## Who it's for (audience is a spectrum → progressive disclosure)

- Launch wedge: retail / WSB crowd — jargon hidden, fully guided.
- But the owner (Owen) works at a hedge fund and wants to use it himself and show his boss,
  so it **must also scale up to genuinely advanced/pro features**.
- Resolution: **clean & friendly on the surface; serious depth under an "Advanced" toggle.**
  Simple users get 2–3 presets; advanced users get the dials.

## Current state

`index.html` assembles the full 3-step flow:

1. **Your view** — four plain-English stances (up / down / flat / pairs). Picking one
   pre-positions the prediction cloud.
2. **Your prediction** — the prediction canvas (see architecture below).
3. **Strategies** — ranked **live** from the drawn distribution.

What's real vs. placeholder:
- ✅ The distribution model, the payoff integration, and the ranking are real and reactive.
- ⚠️ Strikes, premiums, and Greeks are **hardcoded illustrative TSLA values**. There is **no
  live option-chain data** yet, so dollar figures are representative, not tradeable. This is
  the single biggest gap between the prototype and something true.

## Architecture of `index.html`

Three independent JS modules inside one IIFE: the stepper, the prediction canvas, the engine.

### Prediction canvas (the heart of the product)
- Rendered as a **smooth 2D Gaussian density heatmap** — a probability *cloud* that lightly
  coats the whole price×time chart and is densest at the most-likely (price, date). NOT an
  oval/shape with hard edges.
- **Everything is drawn on ONE `<canvas>`** in a single coordinate system (density + grid +
  axes + history + the dot). This is deliberate and important: an earlier version split the
  density onto a canvas and the dot/grid onto an overlaid SVG, and the two layers did not map
  to identical screen pixels, so the peak drifted off the dot. **One layer ⇒ the peak is on
  the dot by construction. Do not reintroduce a second layer for chart chrome.**
- Coordinates are **normalized board space** `u ∈ [0,1]` (time) × `v ∈ [0,1]` (price),
  `w ∈ [0,1]` (density height). `price(v) = 150 + v*210`; time axis spans day −60..+95 with
  "now" at `fNow`.
- The density is a **split / two-piece 2D normal**: separate sigmas for up vs down (price)
  and left vs right (time) → the cloud can be **skewed**. Skew is meaningful, not cosmetic:
  upside-skew should push the engine toward call-side convexity; downside-skew toward
  protection.
- **Interaction (no handles):** one central **draggable dot = the mode** (always on the
  densest point). **Grab anywhere else and pull** to stretch the spread in that direction
  (deadzone ~0.02; relative drag). Pull one side further than the other for skew.
- **2D/3D is one tilting view:** 2D is the surface seen from straight above. The **3D** button
  animates a camera tilt (pitch + slight yaw, eased over ~650ms) so the whole board tips back
  and the bell rises; **drag-to-rotate** is enabled in 3D. **2D** lays it flat to edit.
  Editing only happens at the flat state; the flat state uses the smooth ImageData heatmap,
  tilted/3D uses a shaded quad mesh.

### Engine (Step 3)
- Builds a **price distribution** from the cloud (split-normal over price using the mode and
  the up/down price sigmas).
- Integrates each candidate strategy's payoff against it to get expected P/L, probability of
  profit, CVaR₅% (worst-5% loss), and max loss.
- Ranks by the objective below. Candidate library is ~8 fixed strategies (long call, bull
  call spread, long put, bear put spread, put credit spread, iron condor, long straddle,
  long stock) with hardcoded strikes/premiums.

## Locked design decisions

- **Scoring objective = principled multi-factor with a mean–CVaR backbone, per capital:**
  `score = (E[π] − λ · CVaR₅%(loss)) / capital`.
  - Why not raw expected value: it always stampedes to max leverage (the "lottery ticket" /
    corner-solution trap).
  - Why not Sharpe: it punishes upside variance as hard as downside, which is wrong for
    asymmetric option payoffs (it over-rewards premium selling until the tail hits).
  - Multi-factor is fine **only if every factor is in commensurable units** (return on
    capital). Avoid weighted soups of probabilities + dollars + spread widths.
  - `λ` = the user's single risk knob (the "Advanced" dials expose more; Simple users get
    presets).
  - **Liquidity/transaction costs are baked into the payoff `π`** (realistic fills), never a
    separate weighted penalty term.
  - PoP, Greeks, breakevens are **display only**, not ranking inputs.
- **An objective function is a preference, not a predictive model** — there is no "accuracy"
  to maximize in it. Accuracy lives in (a) the inputs (distribution calibration + realistic
  pricing) and (b) validation against expert judgment.
- **Probabilities:** rank under the **user's view** distribution, but also show
  **market-implied (risk-neutral) fair value / PoP** as a reality check. The view-vs-market
  divergence ("edge") is itself a usable factor — it isolates the alpha from the user's
  differentiated view. (Edge factor was prototyped in earlier demos; not yet in `index.html`.)

## Honest caveats / hard problems (do not lose these)

- **Data + licensing** is the real cost and the current biggest gap (OPRA fees for real-time;
  use delayed/free yfinance or Tradier sandbox to start).
- **Calibration**: what does the cloud's spread mean — 1σ? a 68%/95% band? Undecided. This
  makes every downstream number honest; do it before claiming real probabilities.
- **Regulation**: ranked, personalized trade recommendations can be construed as investment
  advice (potential RIA/FINRA exposure). Keep it educational/paper-only; get real securities
  counsel before anything live or money-connected. No brokerage connection in scope.
- **Timing dimension**: strategies expire on a fixed date, so "unsure about *when*" must
  eventually spread the view across multiple expirations (points toward calendars).

## Roadmap / good next steps

1. **Real option-chain data** (yfinance / Tradier sandbox) so strikes/premiums/IV are real.
2. **Calibrate** the spread → render 68%/95% bands.
3. **Validation pass** — generate scenarios + the engine's top picks; Owen critiques; tune
   defaults (`λ`, factor weights). Owen is the ideal validator (hedge-fund domain expert).
4. Wire the **edge-vs-market** factor and the **Advanced** factor dials into `index.html`.
5. Naming / visual identity (currently placeholder "Thesis", logo is a "◆").

## How to work with Owen (important)

- Owen is **non-technical in CODING only** — he cannot code and relies on Claude to do 100%
  of implementation. But he **works at a hedge fund and is finance-sophisticated**: talk
  Greeks, IV, CVaR, skew with him directly.
- He is the **product owner / art director** and is **particular** about look and behavior.
- **Bias toward more effort for better looks** — his words: "always assume I want more work
  for it to look better." Never offer the low-effort option as the default.
- **Show, don't tell**: prefer rendered visuals/mockups over describing UI in words.
- **Check in often** with concrete choices; build in small, visible slices; don't run far
  ahead before confirming direction.

## Scope guardrails (decided)

Educational / paper-only. No brokerage connection, no order placement, no real money. Free
delayed data only. No GPU/"universal solver" — a templated, vectorized CPU search is plenty.
