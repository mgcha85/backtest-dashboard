import { getDb, buildWhereClause, type AlgorithmWithSummary, type Filters } from '$lib/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
  const db = getDb();

  const filters: Filters = {
    projects: url.searchParams.getAll('project'),
    timeframes: url.searchParams.getAll('timeframe'),
    tickers: url.searchParams.getAll('ticker'),
    directions: url.searchParams.getAll('direction')
  };

  const { where, params } = buildWhereClause(filters);

  const algorithms = db.prepare<unknown[], AlgorithmWithSummary>(`
    SELECT 
      a.*,
      s.n_folds,
      s.avg_auc,
      s.avg_f1,
      s.avg_win_rate,
      s.avg_profit_factor,
      s.avg_sharpe,
      s.avg_return,
      s.total_trades,
      s.cagr,
      s.fee_rate_pct,
      COALESCE((SELECT AVG(r.max_drawdown) FROM backtest_results r WHERE r.algorithm_id = a.id), s.max_drawdown) as avg_mdd
    FROM algorithms a
    LEFT JOIN backtest_summary s ON a.id = s.algorithm_id
    ${where ? where + ' AND' : 'WHERE'} COALESCE(s.avg_return, 0) > 0 AND COALESCE(s.avg_sharpe, 0) > 0
    ORDER BY s.cagr DESC NULLS LAST
  `).all(...params);

  const baseFilter = `${where ? where + ' AND' : 'WHERE'} COALESCE(s.avg_return, 0) > 0 AND COALESCE(s.avg_sharpe, 0) > 0`;
  const kpisQuery = `SELECT 
        MAX(s.avg_sharpe) as best_sharpe,
        MAX(s.avg_win_rate) as best_win_rate,
        MAX(s.cagr) as best_cagr,
        COUNT(DISTINCT a.id) as total_algorithms,
        SUM(s.total_trades) as total_trades
      FROM algorithms a
      LEFT JOIN backtest_summary s ON a.id = s.algorithm_id
      ${baseFilter}`;
  
  const kpis = db.prepare<unknown[], {
    best_sharpe: number | null;
    best_win_rate: number | null;
    best_cagr: number | null;
    total_algorithms: number;
    total_trades: number | null;
  }>(kpisQuery).get(...params);

  const availableFilters = {
    projects: db.prepare<[], { project: string }>('SELECT DISTINCT project FROM algorithms ORDER BY project').all().map(r => r.project),
    timeframes: db.prepare<[], { timeframe: string }>('SELECT DISTINCT timeframe FROM algorithms ORDER BY timeframe').all().map(r => r.timeframe),
    tickers: db.prepare<[], { ticker: string }>('SELECT DISTINCT ticker FROM algorithms ORDER BY ticker').all().map(r => r.ticker),
    directions: db.prepare<[], { direction: string }>('SELECT DISTINCT direction FROM algorithms WHERE direction IS NOT NULL ORDER BY direction').all().map(r => r.direction)
  };

  db.close();

  return {
    algorithms,
    kpis: kpis || { best_sharpe: null, best_win_rate: null, best_cagr: null, total_algorithms: 0, total_trades: null },
    availableFilters
  };
};
