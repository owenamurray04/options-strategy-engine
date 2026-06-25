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
- `js/data.js` — the **`STOCKS` registry** (real per-ticker option-chain snapshots; TSLA is
  real today) + spot-relative `STRATS` templates + `searchSymbols()`/`getChain()`. This is the
  data seam: in production these two functions become async calls to the data backend.
- `js/engine.js` — pure math: resolve spot-relative strikes → build strategies, integrate
  payoff vs. the view distribution, rank; plus `payoffSVG`/`money` helpers. No DOM.
- `js/canvas.js` — the prediction cloud (state + render + interaction); price axis re-centers
  per stock. Exposes `getView()` for the engine, `setChain()`/`setActiveExp()` to point at a
  ticker+expiry, and `setOnChange()` so the stepper can re-rank **live while dragging**.
- `js/stepper.js` — the 2-step flow (search → workspace), Simple/Advanced, expiration
  selector, live results rendering.
- `js/main.js` — bootstrap that wires it together.

**Now uses ES modules** (`<script type="module">`), so it **must be served** (GitHub Pages or
the local preview both do); double-clicking the file from Finder no longer works. Inter is
loaded from Google Fonts with a system-font fallback. Local preview is configured in
`.claude/launch.json` and runs `.claude/devserver.py` — a **no-cache** static server (plain
`http.server` made browsers serve stale ES modules after edits; that wasted real debugging
time). Production cache-busting for returning visitors is still an open follow-up (no build step).

## Who it's for (audience is a spectrum → progressive disclosure)

- Launch wedge: retail / WSB crowd — jargon hidden, fully guided.
- But the owner (Owen) works at a hedge fund and wants to use it himself and show his boss,
  so it **must also scale up to genuinely advanced/pro features**.
- Resolution: **clean & friendly on the surface; serious depth under an "Advanced" toggle.**
  Simple users get 2–3 presets; advanced users get the dials.

## Current state

The app is a **2-step flow** (Owen cut the stance pickers 2026-06-25 — "if I draw it going up,
that IS up"; the only upfront choice is the ticker):

1. **Pick stock** — a **search box** (`searchSymbols()`); selecting a result loads its chain
   and re-centers the chart on its spot.
2. **Predict & strategies** — ONE merged workspace: the prediction canvas on top, and the
   ranked strategies below that **reorder live as you drag** the cloud. Strategies are
   spot-relative (ATM, ±8%, …) resolved to the nearest real listed strike, so the library
   works on any ticker.

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
3. 🔜 **ACTIVE — production data backend (any-ticker live data).** Owen relaxed the
   free/no-backend guardrail (2026-06-25): he wants something that **scales into a profitable
   production app**. Plan: a small serverless service (Vercel/Cloudflare free tier) that holds
   a provider key, fetches chains for any ticker, **caches** (cost control = profitability),
   and serves the app clean JSON via `searchSymbols()`/`getChain()`. Recommended provider:
   **Tradier** (chains WITH Greeks/IV in one call; free delayed sandbox; ~$10/mo real-time;
   brokerage-execution upgrade path). Polygon.io is the alt. Verified in-browser that direct
   feed calls are CORS-blocked and public proxies are flaky → our own proxy is correct.
   **BLOCKED ON OWEN: needs a provider account + API key.** UI/engine are already ticker-ready.
4. ✅ **DONE:** removed stance pickers → stock search; merged into one workspace with **live
   reordering as you drag**; generalized the engine to spot-relative strikes + per-stock axis.
5. **Validation pass** — scenarios + the engine's top picks; Owen critiques; tune defaults
   (`λ`, factor weights). Owen is the ideal validator (hedge-fund domain expert).
6. Wire the **edge-vs-market** factor (market-implied PoP/σ vs. the user's view) and the
   **Advanced** factor dials into the UI.
7. Production ES-module **cache-busting** for returning visitors; naming / visual identity.

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

Educational / paper-only **for now** — no order placement / no real money yet. **UPDATE
2026-06-25:** the "100% free, no backend, free-delayed-only" guardrail is **lifted** — Owen
wants a path to a **profitable production app**, so a real data backend + paid data tiers +
(eventually) brokerage execution are in scope; build accordingly (cache, keys server-side,
scalable serverless). Still: get securities counsel before anything money-connected. No
GPU/"universal solver" — a templated, vectorized CPU search is plenty.

## Source documents (in `docs/`)

- `docs/DECISIONS.md` — full decisions log + rationale + what changed from the originals.
- `docs/the-big-idea.md` — the original concept pitch (reformatted).
- `docs/the-engine-logic.md` — the original engineering draft (reformatted; note: its
  brute-force/GPU approach was superseded — see DECISIONS.md).
