# The Universal Strategy Engine — technical architecture & logic

> Original engineering draft, reformatted from `The Engine Logic.docx`. Content preserved as
> written. Several mathematical formulas did not survive the original document's export and were
> blank in the source; those are flagged inline as **[formula not specified in source]**.
>
> ⚠️ Note: this describes the *original* "brute-force universal solver" approach. During later
> design work we deliberately moved away from parts of this (no GPU, no full enumeration; a
> templated, vectorized CPU search instead; and a different, coherent scoring objective). See
> [DECISIONS.md](DECISIONS.md) for what was kept, changed, and cut, and why.

**Companion document to:** [The Big Idea](the-big-idea.md)
**Status (original):** Engineering draft
**Core innovation (as originally framed):** the universal solver (brute-force optimization)

## 1. The core philosophy: the inverse problem

Standard trading tools solve the **forward problem**: the user selects a strategy, and the tool
calculates the profit. This engine solves the **inverse problem** using a universal solver.

- **Old way (competitors):** rigid decision trees ("if bullish → buy call").
- **Our way:** generate everything → score everything → rank.

We do not "pick" strategies based on rules. We generate a massive matrix of every possible
trade structure (stock, options, synthetics, combinations) and mathematically rank them against
the user's prediction. The "bad" strategies are not filtered out; they simply receive a
mathematically terrible score and drop to the bottom.

## 2. The input layer: progressive disclosure

The UI follows a strict progressive-disclosure philosophy. The default view is simple, but the
engine allows for deep "power user" overrides via an advanced menu.

### 2.1 The "intuitive" view (default)

The user provides the objective-function variables via the chart canvas:

- Price target (via click)
- Target date (via click)
- Confidence interval (via circle resize)

### 2.2 The "advanced" view (the overrides)

Hidden behind an "Advanced Settings" toggle, the user can override the foundational assumptions
used by the solver. These inputs directly modify the variables in the universal matrix before
scoring.

**1. Fundamental overrides (the "event" layer)**
- **Dividend yield:**
  - Default: live market data.
  - Override: user inputs "0%" (expecting a cut) or "5%" (expecting a special dividend).
  - Effect: drastically changes the score of long stock vs. calls. If the user inputs a high
    dividend, the engine immediately penalizes call options (which miss the dividend).

**2. Volatility overrides (the "fear" layer)**
- **Implied volatility (IV) adjustment:**
  - Default: current market IV.
  - Override: "IV will crush" (post-earnings) or "IV will spike."
  - Effect: if the user predicts "IV crush," the engine prioritizes short strategies (credit
    spreads / iron condors) over long options.

**3. Execution preferences (the "friction" layer)**
- **Slippage tolerance:**
  - Default: mid-point pricing.
  - Override: "Aggressive" (market order) or "Patient" (limit order).
  - Effect: adjusts the spread penalty. "Patient" reduces the penalty on wide spreads,
    potentially recommending deeper OTM options.

## 3. The processing layer: the universal matrix

This is the engine's core. It relies on vectorization (GPU / NumPy) to test millions of
strategies simultaneously without "wasting power" on slow iterative loops.

### Step A — massive candidate generation (the "universe")

We do not limit the search based on the user's target. We generate the entire tradeable universe
for the ticker to ensure no "hidden gems" are missed.

The matrix dimensions:

- **Rows:** every tradeable asset and combination (e.g., ~1M rows).
  - Row 1: long stock
  - Row 2: short stock
  - Rows 3…1000: every single call & put strike
  - Rows 1001…1M: combinations (verticals, calendars, iron condors, synthetics)
- **Columns:** the variables needed for scoring (bid, ask, Greeks, implied vol, expiration).

### Step B — the vectorized "shadow cost" filter (ranking fast)

We do not use `if` statements to check for bad trades. We apply a vectorized penalty function to
the entire matrix at once. This naturally pushes "bad" trades (illiquid, irrational, or
dangerous) to the bottom instantly.

**The universal scoring formula:** applied to the entire matrix in a single GPU operation —
**[formula not specified in source].**

**The penalty vector ("bad things as bad").** We assign a mathematical "cost" to undesirable
traits:

- **Liquidity penalty:** **[formula not specified in source].**
  Result: illiquid options (wide spreads) automatically get a massive penalty score. We don't
  need a rule to "exclude low volume." The math makes them un-selectable.
- **Time-decay penalty:** **[formula not specified in source].**
  Result: short-term options held for long periods naturally score low because the decay cost
  exceeds the potential profit.
- **Risk penalty:** **[formula not specified in source].**
  Result: strategies with infinite risk (naked calls) receive an infinite denominator, driving
  their score to near zero unless the user explicitly allows them.

## 4. Unified asset scoring (no favors)

We do not have separate logic for stock vs. options. They are just rows in the same matrix. The
engine compares them apples-to-apples using the universal formula.

How the math differentiates them:

- **Long stock row:** profit linear (moderate); theta penalty 0 (stock has no decay); liquidity
  penalty near 0 (tight spreads); capital cost high (requires margin). Score: high if the user
  has a long time horizon (where theta kills options).
- **Synthetic long row:** profit linear (moderate); theta penalty low (put/call parity cancels
  decay); capital cost low (leverage). Score: high if the user has a medium horizon and wants
  leverage.
- **OTM call option row:** profit exponential (high); theta penalty high (decay is rapid). Score:
  high only if the target date is very soon (profit outweighs decay).

The result: the "best strategy" bubbles to the top not because we programmed a rule to favor it,
but because it survived the math better than the others.

## 5. Implementation specs (high performance)

- **Hardware:** local high-performance PC with NVIDIA GPU.
- **Compute method:** GPU acceleration (CUDA).
  - The engine loads the matrix into VRAM.
  - The "scoring" operation is a single matrix-multiplication step.
  - Execution time: < 50ms.
- **Data handling:**
  - Entire option chain downloaded to RAM.
  - Combinations generated on-the-fly using vectorized broadcasting.
