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
      a.id, a.name, a.model_type, a.timeframe, a.denoising,
      s.n_folds,
      s.avg_auc,
      s.avg_f1,
      s.avg_win_rate,
      s.avg_profit_factor,
      s.avg_sharpe,
      s.avg_return,
      s.total_trades,
      s.cagr
    FROM algorithms a
    LEFT JOIN backtest_summary s ON a.id = s.algorithm_id
    ${where}
    ORDER BY a.name
  `).all(...params);

  const availableFilters = {
    projects: db.prepare<[], { project: string }>('SELECT DISTINCT project FROM algorithms ORDER BY project').all().map(r => r.project),
    timeframes: db.prepare<[], { timeframe: string }>('SELECT DISTINCT timeframe FROM algorithms ORDER BY timeframe').all().map(r => r.timeframe),
    tickers: db.prepare<[], { ticker: string }>('SELECT DISTINCT ticker FROM algorithms ORDER BY ticker').all().map(r => r.ticker),
    directions: db.prepare<[], { direction: string }>('SELECT DISTINCT direction FROM algorithms WHERE direction IS NOT NULL ORDER BY direction').all().map(r => r.direction)
  };

  db.close();

  return {
    algorithms,
    availableFilters
  };
};
