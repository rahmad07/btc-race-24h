// Ridgeback v2 — a long-only momentum-hold bot for cbBTC 1-minute bars.
//
// Lesson from the v1 sweep (and the kit baselines): on 1-minute bars every
// extra trade costs ~26 bps in fees, slippage and impact, and EMA crossovers
// whipsaw 26-76 times a day. The only baselines that made money bought once
// and held (buy-and-hold +$32.17, momentum +$34.94). So this bot trades
// rarely: it buys all-in once a short uptrend is confirmed, then holds and
// only exits on a decisive downtrend (trailing 24-bar return below -X%, a
// trailing stop off the peak, or the 2-hour return turning negative).
//
// Deterministic: no clock, no environment, no randomness. Floats over closes.

import { BPS, runBars, type BarsState, type BuyInput, type SellInput } from './vendor/makefun-bars.ts';

// --- tunable parameters (swept offline against the dev window) ---
const ENTRY_BPS = 25; // 24-bar return must exceed this to enter
const TRAIL_BPS = 300; // trailing stop off the peak since entry
const EXIT_LONG_BPS = 150; // 120-bar return below this (negative) exits
const MAX_SLIPPAGE_BPS = 100;
const LOOKBACK = 24;
const LONG_LOOKBACK = 120;

const closes: number[] = [];
let peak: number | null = null;

function ret(barsBack: number): number | null {
  const n = closes.length;
  if (n <= barsBack) return null;
  const then = closes[n - 1 - barsBack];
  const now = closes[n - 1];
  if (then === undefined || then <= 0 || now === undefined) return null;
  return ((now - then) / then) * 10000;
}

await runBars({
  onBatch(state: BarsState, batch) {
    for (const bar of batch.bars) closes.push(Number(bar.c));
    if (state.warmingUp) return [];
    const { caps, fees } = state.hello;
    const symbol = state.hello.symbols[0]?.symbol;
    if (symbol === undefined) return [];
    const close = state.close(symbol);
    if (close === null) return [];
    const c = Number(close);
    const held = state.positions.get(symbol);
    const r24 = ret(LOOKBACK);
    const r120 = ret(LONG_LOOKBACK);

    if (held !== undefined) {
      if (peak === null || c > peak) peak = c;
      const trailHit =
        peak !== null && BigInt(Math.floor((peak * (10000 - TRAIL_BPS)) / 10000)) >= close;
      const longDown = r120 !== null && r120 < -EXIT_LONG_BPS;
      if (trailHit || longDown) {
        peak = null;
        return [{ side: 'sell', symbol, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS }];
      }
      return [];
    }

    peak = null;
    if (r24 === null || r24 <= ENTRY_BPS) return [];
    // 2-hour trend must not be against us (once enough history exists).
    if (r120 !== null && r120 < 0) return [];
    let slice = state.cash;
    const byWeight = (BigInt(caps.max_weight_bps) * state.equity) / BPS;
    if (slice > byWeight) slice = byWeight;
    if (slice === 0n || slice < BigInt(fees.min_notional_quote_units)) return [];
    peak = c;
    return [{ side: 'buy', symbol, notional_quote_units: slice, max_slippage_bps: MAX_SLIPPAGE_BPS }];
  },
});
