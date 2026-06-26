import { json } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ params }) => {
  const id = parseInt(params.id);

  if (isNaN(id)) {
    return json({ error: 'Invalid algorithm ID' }, { status: 400 });
  }

  try {
    const db = getDb(false);
    
    const runTx = db.transaction(() => {
      db.prepare('DELETE FROM trade_details WHERE algorithm_id = ?').run(id);
      db.prepare('DELETE FROM monthly_returns WHERE algorithm_id = ?').run(id);
      db.prepare('DELETE FROM backtest_summary WHERE algorithm_id = ?').run(id);
      db.prepare('DELETE FROM backtest_results WHERE algorithm_id = ?').run(id);
      const result = db.prepare('DELETE FROM algorithms WHERE id = ?').run(id);
      
      if (result.changes === 0) {
        throw new Error('Algorithm not found');
      }
    });

    runTx();
    db.close();

    return json({ success: true });
  } catch (error: any) {
    console.error('Delete error:', error);
    if (error.message === 'Algorithm not found') {
      return json({ error: 'Algorithm not found' }, { status: 404 });
    }
    return json({ error: 'Internal Server Error' }, { status: 500 });
  }
};
