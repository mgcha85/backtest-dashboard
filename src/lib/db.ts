import Database from 'better-sqlite3';

const DB_PATH = process.env.DB_PATH || '/mnt/data/finance/backtest_results.db';

export function getDb(readonly = true) {
  const db = new Database(DB_PATH, { readonly, fileMustExist: readonly });
  return db;
}

export interface Algorithm {
  id: number;
  name: string;
  model_type: string;
  timeframe: string;
  features: string;
  tp_pct: number;
  sl_pct: number;
  horizon_bars: number;
  train_period: string;
  test_split: string;
  balance_method: string;
  denoising: string;
  description: string | null;
  created_at: string;
  source_root: string | null;
  market: string | null;
  project: string | null;
  ticker: string | null;
  direction: string | null;
  // Optimized parameters
  prob_threshold: number | null;
  hidden: number | null;
  tcn_layers: number | null;
  lr: number | null;
  base_seq_len: number | null;
  rr_ratio: number | null;
}

export interface BacktestResult {
  id: number;
  algorithm_id: number;
  fold_id: number | null;
  auc: number | null;
  f1: number | null;
  precision_score: number | null;
  recall: number | null;
  win_rate: number | null;
  profit_factor: number | null;
  sharpe: number | null;
  max_drawdown: number | null;
  n_trades: number | null;
  total_return: number | null;
  avg_return_per_trade: number | null;
}

export interface BacktestSummary {
  id: number;
  algorithm_id: number;
  n_folds: number | null;
  avg_auc: number | null;
  avg_f1: number | null;
  avg_win_rate: number | null;
  avg_profit_factor: number | null;
  avg_sharpe: number | null;
  avg_return: number | null;
  total_trades: number | null;
}

export interface AlgorithmWithSummary extends Algorithm {
  n_folds: number | null;
  avg_auc: number | null;
  avg_f1: number | null;
  avg_win_rate: number | null;
  avg_profit_factor: number | null;
  avg_sharpe: number | null;
  avg_return: number | null;
  total_trades: number | null;
}

export interface Filters {
  projects: string[];
  timeframes: string[];
  tickers: string[];
  directions: string[];
}

export function buildWhereClause(filters: Filters): { where: string; params: string[] } {
  const conditions: string[] = [];
  const params: string[] = [];

  if (filters.projects.length > 0) {
    conditions.push(`a.project IN (${filters.projects.map(() => '?').join(',')})`);
    params.push(...filters.projects);
  }

  if (filters.timeframes.length > 0) {
    conditions.push(`a.timeframe IN (${filters.timeframes.map(() => '?').join(',')})`);
    params.push(...filters.timeframes);
  }

  if (filters.tickers.length > 0) {
    conditions.push(`a.ticker IN (${filters.tickers.map(() => '?').join(',')})`);
    params.push(...filters.tickers);
  }

  if (filters.directions.length > 0) {
    conditions.push(`a.direction IN (${filters.directions.map(() => '?').join(',')})`);
    params.push(...filters.directions);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { where, params };
}

export { formatNumber, formatPercent, getValueClass } from './utils';
