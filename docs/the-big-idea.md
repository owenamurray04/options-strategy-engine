# The Big Idea

> Original concept pitch, reformatted from `The Big Idea.docx`. Content preserved as written;
> only structure and formatting were cleaned up. For how the concept evolved since, see
> [DECISIONS.md](DECISIONS.md).

## The problem

A vast number of retail investors are drawn to the financial markets with a desire to act on
their predictions about where an asset's price is headed. This has given rise to massive
online communities, like Reddit's r/wallstreetbets, where millions share market opinions, yet
often lack the sophisticated tools to act on them effectively. Options contracts, their tool
of choice, offer a powerful, capital-efficient way to achieve outsized returns, but this
potential comes with significant complexity.

The learning curve for options is steep, and this knowledge gap leads to suboptimal and often
financially catastrophic decisions:

- **Excessive risk:** Investors might buy simple call or put options without understanding the
  impact of time decay or implied volatility, exposing them to a high probability of total
  loss even if their directional bet is roughly correct.
- **Inefficient trades:** They may select the wrong strategy or strike prices, leaving
  significant potential profit on the table or failing to properly define their risk.

The core issue is a disconnect between having a market opinion and knowing how to structure
the mathematically optimal trade to express it. The platform bridges this gap.

## The solution: the engine

The platform is engineered to be the most intuitive bridge from a simple market prediction to
a sophisticated, optimized trade. The core philosophy is that any investor, regardless of
their options knowledge, should be able to translate their market thesis into action. This is
achieved by abstracting away the complex mathematics and confusing jargon. The user interface
is clean and guided, asking for inputs in plain English. For those curious to learn more,
integrated help icons (?) provide on-demand explanations of advanced concepts without
cluttering the primary workflow.

## The user journey: a simple, guided workflow

The platform transforms the daunting task of creating an options strategy into a simple,
4-step process that feels more like a conversation than a complex calculation.

### 1. "What's your big idea?" (choose market stance)

This first step is designed to bypass the intimidating jargon of options trading. Instead of
asking a user if they want a 'strangle' or a 'condor', the platform asks a simple question
about their core belief. Do you think a stock will go up or down? Or do you have a more
nuanced view, like one company will outperform another? The user selects their fundamental
view without needing to know the name of a single options strategy.

- **Directional (correlated):** This is the most straightforward bet. You're predicting that a
  stock's price will move in a specific direction (up or down). Your success is directly tied,
  or correlated, to that movement.
- **Market-neutral (uncorrelated):** This is a more sophisticated bet on the relative
  performance between two assets, making your trade's success independent of the overall
  market's direction. For example: "I think Apple will outperform Microsoft." Even if the
  entire market crashes and both stocks go down, your trade can be profitable as long as
  Apple's stock goes down less than Microsoft's. This is a common strategy used by hedge funds
  to generate returns while avoiding the risk of a market crash.

### 2. "Tell us the specifics." (define the prediction)

This step simply captures the details the investor likely already has in mind. There's no
complex calculation needed from the user; they're just telling the engine the basic parameters
of their market thesis.

- **Asset:** Stock ticker (e.g., TSLA).
- **Price target:** "Where do you think the price will be?"
- **Target date:** "When do you think this will happen?"

### 3. "How confident are you?" (set confidence & risk)

This is where the platform truly shines. Instead of asking for abstract inputs, the user
interacts with a dynamic profit/loss chart — they literally draw their prediction on the
screen.

- **Confidence bounds:** As the user drags sliders, a green "profit zone" on the chart expands
  or contracts in real-time. This visually communicates the core trade-off of options: a
  wider, more probable profit zone will naturally result in a smaller potential payoff, while
  a narrower, less probable zone will offer a higher potential return.
  *(Author's note in the original: "I can't figure out how to describe this, but a drawing
  would make it much more clear.")*
- **Set a safety net (optional):** This is not a stop-loss that sells the position. By toggling
  this on, the user instructs the engine to build a protective component directly into the
  strategy itself. This creates a "defined-risk" trade, meaning the engine will incorporate a
  pre-bought hedge that makes it impossible to lose more than a specific, predetermined amount,
  regardless of how the stock moves.

### 4. Receive the recommendations

After the user provides their inputs, the engine performs its analysis and presents a curated
list of the top strategies. These are categorized by capital requirements (e.g., Low, Medium,
High) so the user can select the one that best fits their financial situation. Each
recommendation is visualized with a profit/loss chart and a plain-English summary.

## Recommendation engine

The proprietary engine is the core of the platform. It follows a rigorous process to find the
optimal strategy.

- **Phase 1 — Strategy filtering:** The engine first narrows the universe of thousands of
  possible options strategies down to a viable subset based on the user's inputs.
- **Phase 2 — Price validation:** We compare the real-time market price of each option against
  its theoretical "fair value," calculated using a Black-Scholes model. This step is a crucial
  sanity check to ensure that the proposed options aren't wildly overpriced compared to their
  theoretical value, protecting the user from entering an inefficient trade.
- **Phase 3 — Scoring & optimization:** The engine iterates through all valid combinations,
  assigning each a proprietary score. This score is based on a weighted formula that
  prioritizes Probability of Profit (PoP) and Return on Investment (ROI), while also factoring
  in the liquidity of the specific options contracts (to ensure easy entry/exit) and the width
  of the bid-ask spread (to minimize hidden costs).

## Monetization & business model

The platform will generate revenue through two potential streams:

### B2C "Pro" subscription

A monthly/annual subscription that transforms the tool from a single strategy generator into a
holistic portfolio management assistant. By securely connecting their brokerage account, users
unlock a suite of powerful, portfolio-aware features:

- **Portfolio-aware recommendations:** The engine analyzes a user's entire portfolio to suggest
  strategies that are not just good in isolation, but are tailored to their existing holdings.
  This includes identifying hedging opportunities or trades that balance their overall market
  exposure.
- **Holistic risk dashboard:** See how any potential trade impacts the entire portfolio's
  sensitivity to key factors.
  - **Market sensitivity (Beta):** Understand if a new trade makes your portfolio too bullish
    or bearish relative to the market.
  - **Volatility risk (Vega):** See your portfolio's exposure to an "IV crush" after events
    like earnings.
  - **Time decay (Theta):** Visualize how much value your portfolio is gaining or losing from
    time decay each day.
- **Margin call simulator:** Before placing a trade, the tool will simulate its impact on your
  account's buying power and calculate your new proximity to a potential margin call, providing
  a critical layer of risk management.

### B2B partnership / sale

The entire platform is a prime acquisition target for brokerage firms looking to offer clients
a powerful, differentiating tool. This aligns perfectly with the mission of platforms like
Robinhood, which aim to democratize finance. Providing a tool that guides users from a simple
market idea to a sound, risk-managed strategy would be a natural next step in their goal of
empowering retail investors, making them a strong potential acquirer.

## The competitive landscape

While other platforms are excellent for analyzing pre-defined strategies, they place the burden
of strategy selection on the user. They answer the question, "What are the vitals of this iron
condor?" Our platform answers the preceding, more fundamental question: "I think this stock will
go up at this rate; what's the best way to trade that belief?" This unique "idea-first" approach
is a powerful differentiator, translating a simple market opinion into a mathematically
optimized strategy, something no competitor currently offers to the mass market.

## Important considerations & risks

- **Garbage in, garbage out:** The engine is a powerful calculator, not a crystal ball. The
  quality of its output is entirely dependent on the quality of the user's input. The platform
  will make it clear through disclaimers and educational content that it is optimizing a
  strategy for the user's prediction, and it does not validate whether that prediction is sound.
  The responsibility for the initial market thesis rests solely with the user.
- **Avoiding financial advice liability:** The platform is fundamentally an educational and
  informational tool, not a financial advisor. To maintain this distinction and avoid
  liability, several measures will be strictly enforced:
  - **Strategy diversification:** Instead of presenting a single "best" option, the engine will
    generate a small, curated selection of viable strategies. This presents a balanced view of
    potential actions, not a single directive.
  - **User-centric selection:** Each strategy will be accompanied by a clear breakdown of its
    risk/reward profile, allowing users to select the one that aligns with their personal risk
    tolerance and financial goals.
  - **Emphasis on user agency:** By requiring the user to make the final choice from a menu of
    options, we ensure that the responsibility for the decision remains squarely with them. The
    platform facilitates analysis; it does not dictate action.
