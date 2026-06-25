import { error } from '@sveltejs/kit';
import { getDb, type Algorithm, type BacktestResult } from '$lib/db';
import type { PageServerLoad } from './$types';

export interface MonthlyReturn {
  year_month: string;
  return_pct: number;
  trades: number;
  win_rate: number | null;
  equity_start: number | null;
  equity_end: number | null;
}

export interface TradeDetail {
  id: number;
  ticker: string;
  open_time: string;
  open_price: number;
  close_time: string;
  close_price: number;
  prob: number | null;
  profit: number;
  profit_pct: number;
  exit_type: string;
}

export const load: PageServerLoad = async ({ params }) => {
  const db = getDb();
  const algorithmId = parseInt(params.id);

  if (isNaN(algorithmId)) {
    throw error(400, 'Invalid algorithm ID');
  }

  const algorithm = db.prepare<number, Algorithm>(`
    SELECT * FROM algorithms WHERE id = ?
  `).get(algorithmId);

  if (!algorithm) {
    throw error(404, 'Algorithm not found');
  }

  const foldResults = db.prepare<number, BacktestResult>(`
    SELECT * FROM backtest_results WHERE algorithm_id = ? ORDER BY fold_id
  `).all(algorithmId);

  const monthlyReturns = db.prepare<number, MonthlyReturn>(`
    SELECT year_month, return_pct, trades, win_rate, equity_start, equity_end
    FROM monthly_returns WHERE algorithm_id = ? ORDER BY year_month
  `).all(algorithmId);

  const tradeDetails = db.prepare<number, TradeDetail>(`
    SELECT id, ticker, open_time, open_price, close_time, close_price,
           prob, profit, profit_pct, exit_type
    FROM trade_details WHERE algorithm_id = ? ORDER BY open_time
  `).all(algorithmId);

  const summary = db.prepare<number, {
    n_folds: number | null;
    avg_auc: number | null;
    avg_f1: number | null;
    avg_win_rate: number | null;
    avg_profit_factor: number | null;
    avg_sharpe: number | null;
    avg_return: number | null;
    total_trades: number | null;
    fee_rate_pct: number | null;
  }>(`
    SELECT 
      n_folds,
      avg_auc,
      avg_f1,
      avg_win_rate,
      avg_profit_factor,
      avg_sharpe,
      avg_return,
      total_trades,
      fee_rate_pct
    FROM backtest_summary
    WHERE algorithm_id = ?
  `).get(algorithmId);

  db.close();

  return {
    algorithm,
    foldResults,
    monthlyReturns,
    tradeDetails,
    summary: summary || null
  };
};
