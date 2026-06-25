# Project context for Claude (handoff)

This file lets a fresh Claude session pick up where the last one left off. Read it fully
before working. Last updated 2026-06-24.

## What this is

**Thesis** (working name) — an *idea-first* options strategy generator. The user expresses a
plain-English market view; the engine returns a small set of ranked, risk-managed options
strategies that express it. The differentiator vs. competitors (OptionStrat, etc.): they
make you choose the strategy first; we choose it for you from your belief.

The product is **vanilla HTML/CSS/JS with no build step and no dependencies**, now split
across a few files (the old "one file" rule was self-imposed and dropped 2026-06-24 at Owen's
call). Layout:

- `index.html` — markup + the step scaffolding only.
- `styles.css` — all styling.
- `js/data.js` — the real `MKT` option-chain snapshot + `STRATS` templates (the data seam).
- `js/engine.js` — pure math: build strategies, integrate payoff vs. the view distribution,
  rank; plus `payoffSVG`/`money` helpers. No DOM.
- `js/canvas.js` — the prediction cloud (state + render + interaction); exposes `getView()`
  for the engine and `applyStance()` / `setActiveExp()` for the stepper.
- `js/stepper.js` — the 3-step flow, Simple/Advanced, expiration selector, results rendering.
- `js/main.js` — bootstrap that wires it together.

**Now uses ES modules** (`<script type="module">`), so it **must be served** (GitHub Pages or
the local preview both do); double-clicking the file from Finder no longer works. Inter is
loaded from Google Fonts with a system-font fallback. A local static preview is configured in
`.claude/launch.json` (`python3 -m http.server`).

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
- ✅ **Strikes, premiums, IV and Greeks are now a REAL TSLA option-chain snapshot**
  (captured 2026-06-24 ~close, spot $375.39) across **three expirations** (Jul 17 / Aug 21 /
  Sep 18), pulled live via the market-data MCP. Lives in one `MKT` object in `index.html` —
  the single data seam. Each contract is `[mark, delta, theta, vega, IV]`. Strategies are
  built leg-by-leg from these (payoff, capital-at-risk, and net Greeks all derive from the
  same legs + real premiums — nothing hardcoded). An **expiration selector** in Step 3
  re-prices and re-ranks live, and the chosen expiry is drawn as a marker on the prediction
  chart. The price axis was rescaled to real spot (`price(v)=255+v*250`).
- ✅ **The cloud's spread is now calibrated.** Locked meaning: **the point you pull to = 1σ**,
  so `[mode − 1σ_down, mode + 1σ_up]` is the **68%** band and `±2σ` is the **95%** band (a
  two-piece/split normal contains exactly 68.3% / 95.4% in those intervals regardless of skew).
  Rendered as an **error bar at the selected expiration** (thin 95% whisker + thick 68% core +
  mode dot, labeled), plus "68% range" / "95% range" chips and a plain-English readout. Crucial
  property: the displayed bands use the **same σ the engine integrates** (`getView()` →
  `priceDist`), so what you see *is* what it ranks against — probabilities are now honest.
- ⚠️ Still a **static snapshot**, not a live stream (fits the educational/paper-only scope).
  Refreshing means re-pulling the chain and replacing `MKT`. `chance_of_profit` (market-implied
  PoP) is in the snapshot source but not yet wired in — it's the raw material for the
  edge-vs-market factor (next big step).

## Architecture

Three independent ES modules + a data module (see file layout above): the stepper
(`js/stepper.js`), the prediction canvas (`js/canvas.js`), the engine (`js/engine.js`), and the
data seam (`js/data.js`). They share no globals — only explicit imports/exports. The canvas
hands the engine a plain view object via `getView()`; the stepper owns which expiration is
active and drives both.

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
- **Calibration**: ✅ RESOLVED — the pulled edge = 1σ, rendered as 68%/95% bands that match the
  engine's own σ. Open refinement: the σ is still the user's *subjective* width; we don't yet
  compare it to the market-implied σ (from IV) — that comparison is the edge-vs-market factor.
- **Regulation**: ranked, personalized trade recommendations can be construed as investment
  advice (potential RIA/FINRA exposure). Keep it educational/paper-only; get real securities
  counsel before anything live or money-connected. No brokerage connection in scope.
- **Timing dimension**: strategies expire on a fixed date, so "unsure about *when*" must
  eventually spread the view across multiple expirations (points toward calendars).

## Roadmap / good next steps

1. ✅ **DONE (snapshot):** real TSLA option-chain data (3 expirations) is embedded as `MKT`;
   strikes/premiums/IV/Greeks are real. Remaining: make it refreshable / multi-ticker, and
   eventually a live feed (OPRA fees for real-time; delayed/free for now).
2. ✅ **DONE:** calibrated the spread → pulled edge = 1σ, rendered as 68%/95% bands (error bar
   at the expiration + range chips), using the same σ the engine integrates. Probabilities now
   honest. Remaining refinement: overlay the **market-implied σ** (from IV) for comparison.
3. **Validation pass** — generate scenarios + the engine's top picks; Owen critiques; tune
   defaults (`λ`, factor weights). Owen is the ideal validator (hedge-fund domain expert).
4. Wire the **edge-vs-market** factor (market-implied PoP/σ vs. the user's view) and the
   **Advanced** factor dials into the UI. This is the natural next big step.
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

## Source documents (in `docs/`)

- `docs/DECISIONS.md` — full decisions log + rationale + what changed from the originals.
- `docs/the-big-idea.md` — the original concept pitch (reformatted).
- `docs/the-engine-logic.md` — the original engineering draft (reformatted; note: its
  brute-force/GPU approach was superseded — see DECISIONS.md).
