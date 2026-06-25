import { json } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const data = await request.json();
    const { algorithm, summary, monthly_returns = [], trade_details = [] } = data;

    if (!algorithm || !algorithm.name) {
      return json({ error: 'Missing algorithm.name' }, { status: 400 });
    }

    const db = getDb(false);
    db.pragma('journal_mode = WAL');

    const insertAlgo = db.prepare(`
      INSERT INTO algorithms (
        name, model_type, timeframe, features, tp_pct, sl_pct, horizon_bars,
        train_period, test_split, balance_method, denoising, description,
        project, ticker, prob_threshold, hidden, tcn_layers, lr, base_seq_len,
        rr_ratio, direction
      ) VALUES (
        @name, @model_type, @timeframe, @features, @tp_pct, @sl_pct, @horizon_bars,
        @train_period, @test_split, @balance_method, @denoising, @description,
        @project, @ticker, @prob_threshold, @hidden, @tcn_layers, @lr, @base_seq_len,
        @rr_ratio, @direction
      )
      ON CONFLICT(name) DO UPDATE SET
        model_type=excluded.model_type, timeframe=excluded.timeframe, features=excluded.features,
        tp_pct=excluded.tp_pct, sl_pct=excluded.sl_pct, horizon_bars=excluded.horizon_bars,
        train_period=excluded.train_period, test_split=excluded.test_split,
        balance_method=excluded.balance_method, denoising=excluded.denoising,
        description=excluded.description, project=excluded.project, ticker=excluded.ticker,
        prob_threshold=excluded.prob_threshold, hidden=excluded.hidden, tcn_layers=excluded.tcn_layers,
        lr=excluded.lr, base_seq_len=excluded.base_seq_len, rr_ratio=excluded.rr_ratio,
        direction=excluded.direction
    `);

    const insertSummary = db.prepare(`
      INSERT INTO backtest_summary (
        algorithm_id, n_folds, avg_auc, avg_f1, avg_win_rate, avg_profit_factor,
        avg_sharpe, avg_return, total_trades, cagr, fee_rate_pct, max_drawdown,
        test_start, test_end, alpha
      ) VALUES (
        @algorithm_id, @n_folds, @avg_auc, @avg_f1, @avg_win_rate, @avg_profit_factor,
        @avg_sharpe, @avg_return, @total_trades, @cagr, @fee_rate_pct, @max_drawdown,
        @test_start, @test_end, @alpha
      )
      ON CONFLICT(algorithm_id) DO UPDATE SET
        n_folds=excluded.n_folds, avg_auc=excluded.avg_auc, avg_f1=excluded.avg_f1,
        avg_win_rate=excluded.avg_win_rate, avg_profit_factor=excluded.avg_profit_factor,
        avg_sharpe=excluded.avg_sharpe, avg_return=excluded.avg_return,
        total_trades=excluded.total_trades, cagr=excluded.cagr, fee_rate_pct=excluded.fee_rate_pct,
        max_drawdown=excluded.max_drawdown, test_start=excluded.test_start,
        test_end=excluded.test_end, alpha=excluded.alpha
    `);

    const insertMonthly = db.prepare(`
      INSERT INTO monthly_returns (
        algorithm_id, year_month, return_pct, trades, win_rate, equity_start, equity_end
      ) VALUES (
        @algorithm_id, @year_month, @return_pct, @trades, @win_rate, @equity_start, @equity_end
      )
      ON CONFLICT(algorithm_id, year_month) DO UPDATE SET
        return_pct=excluded.return_pct, trades=excluded.trades, win_rate=excluded.win_rate,
        equity_start=excluded.equity_start, equity_end=excluded.equity_end
    `);

    const insertTrade = db.prepare(`
      INSERT INTO trade_details (
        algorithm_id, ticker, open_time, open_price, close_time, close_price,
        prob, profit, profit_pct, exit_type, features
      ) VALUES (
        @algorithm_id, @ticker, @open_time, @open_price, @close_time, @close_price,
        @prob, @profit, @profit_pct, @exit_type, @features
      )
    `);

    const deleteOldTrades = db.prepare(`DELETE FROM trade_details WHERE algorithm_id = ?`);

    const safeAlgo = {
      model_type: 'unknown',
      timeframe: '1h',
      features: 'none',
      tp_pct: null,
      sl_pct: null,
      horizon_bars: 1,
      train_period: 'unknown',
      test_split: 'walk_forward',
      balance_method: 'downsample_negative',
      denoising: 'none',
      description: null,
      project: 'default',
      ticker: 'BTC',
      prob_threshold: null,
      hidden: null,
      tcn_layers: null,
      lr: null,
      base_seq_len: null,
      rr_ratio: null,
      direction: null,
      ...algorithm
    };

    const runTx = db.transaction(() => {
      insertAlgo.run(safeAlgo);
      
      const algoRow = db.prepare(`SELECT id FROM algorithms WHERE name = ?`).get(algorithm.name) as { id: number };
      const algoId = algoRow.id;

      if (summary) {
        insertSummary.run({
          algorithm_id: algoId,
          n_folds: null, avg_auc: null, avg_f1: null, avg_win_rate: null,
          avg_profit_factor: null, avg_sharpe: null, avg_return: null,
          total_trades: null, cagr: null, fee_rate_pct: null, max_drawdown: null,
          test_start: null, test_end: null, alpha: null,
          ...summary
        });
      }

      for (const m of monthly_returns) {
        insertMonthly.run({
          algorithm_id: algoId,
          year_month: m.year_month,
          return_pct: m.return_pct,
          trades: m.trades,
          win_rate: m.win_rate ?? null,
          equity_start: m.equity_start ?? null,
          equity_end: m.equity_end ?? null
        });
      }

      if (trade_details && trade_details.length > 0) {
        deleteOldTrades.run(algoId);
        for (const t of trade_details) {
          insertTrade.run({
            algorithm_id: algoId,
            ticker: t.ticker || safeAlgo.ticker,
            open_time: t.open_time,
            open_price: t.open_price,
            close_time: t.close_time,
            close_price: t.close_price,
            prob: t.prob ?? null,
            profit: t.profit,
            profit_pct: t.profit_pct,
            exit_type: t.exit_type,
            features: t.features ?? null
          });
        }
      }
    });

    runTx();
    db.close();

    return json({ success: true, message: `Successfully saved backtest for ${algorithm.name}` });

  } catch (error: any) {
    console.error('API Error:', error);
    return json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
};
