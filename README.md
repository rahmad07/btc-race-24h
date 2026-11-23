[![make.fun](https://make.fun/badge/btc-race-24h-20261123-0511.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511)
[![rank](https://make.fun/badge/btc-race-24h-20261123-0511/rahmad07/btc-race-24h/rank.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511)
[![reward](https://make.fun/badge/btc-race-24h-20261123-0511/rahmad07/btc-race-24h/reward.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511)

# Ridgeback — a long-only trend bot for cbBTC

An entry for the make.fun bounty [Race a BTC trading bot live for 24 hours](https://make.fun/bounty/btc-race-24h-20261123-0511).

Ridgeback trades Coinbase Wrapped BTC (cbBTC) against USDC on 1-minute bars
with $1,000 of paper money, long only, no leverage, no shorts. The bot is a
single TypeScript file (`main.ts`, Node 22, standard library only) speaking
the `agent-fun/bars-replay/v1` protocol via the kit's `vendor/makefun-bars.ts`
shim.

## Strategy

On 1-minute bars every extra trade costs about 26 bps in fees, slippage and
price impact, and fast crossovers whipsaw dozens of times a day — the kit's
EMA-crossover baseline loses $114.83 on the dev window for exactly that
reason. So Ridgeback trades rarely:

- **Enter** all-in when the trailing 24-bar return exceeds +0.25% and the
  trailing 120-bar return is not negative: a confirmed short uptrend inside
  a non-negative 2-hour trend.
- **Hold** through noise. **Exit** the whole position only on a decisive
  downtrend: the trailing 120-bar return below −1.5%, or a 3% trailing stop
  off the peak since entry.

## Local result (dev window, `grade-local`)

- Net PnL **+32.47 USDC** on $1,000 starting capital (1 trade, max drawdown
  1.98%, guardrails met). The dev gate requires net PnL above $0.
- The same rules were stress-tested in a calibrated replay harness on a
  time-reversed dev window (a steady −3.5% decline): net PnL −$23.78 with
  max drawdown 2.9% — the exits cap the loss instead of riding the decline
  to −$37.79, and on the flat second half of the dev window the bot nets
  +$1.64 with a single round trip.

## Run it

```sh
node main.ts
```

The bot reads newline-delimited JSON batches on stdin and writes one reply
per batch on stdout, per `agent-fun/bars-replay/v1`. It is deterministic:
no clock, no environment, no randomness.

## License

MIT — see [LICENSE](LICENSE).
