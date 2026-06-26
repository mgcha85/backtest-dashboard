<script lang="ts">
  import FilterSidebar from '$lib/components/FilterSidebar.svelte';
  import { formatNumber, formatPercent, getValueClass } from '$lib/utils';
  import { goto } from '$app/navigation';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let sortColumn = $state<string>('cagr');
  let sortDirection = $state<'asc' | 'desc'>('desc');
  let searchQuery = $state<string>('');

  const sortedAlgorithms = $derived(() => {
    let sorted = [...data.algorithms];
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      sorted = sorted.filter(a => 
        a.name.toLowerCase().includes(q) || 
        a.model_type.toLowerCase().includes(q)
      );
    }

    sorted.sort((a, b) => {
      const aVal = (a as any)[sortColumn] ?? -Infinity;
      const bVal = (b as any)[sortColumn] ?? -Infinity;
      
      if (aVal === bVal) return 0;
      if (sortDirection === 'asc') {
        return aVal < bVal ? -1 : 1;
      } else {
        return aVal > bVal ? -1 : 1;
      }
    });
    return sorted;
  });

  function handleSort(column: string) {
    if (sortColumn === column) {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      sortColumn = column;
      sortDirection = 'desc';
    }
  }

  function navigateToDetail(id: number) {
    goto(`/algorithm/${id}`);
  }

  async function handleDelete(event: Event, id: number, name: string) {
    event.stopPropagation(); // 행 클릭(상세 이동) 방지
    if (!confirm(`Are you sure you want to delete '${name}'? This cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/algorithm/${id}`, { method: 'DELETE' });
      if (res.ok) {
        // 성공 시 화면 새로고침 (혹은 클라이언트 측에서 배열 필터링)
        window.location.reload();
      } else {
        const error = await res.json();
        alert(`Delete failed: ${error.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Delete request failed.');
    }
  }
</script>

<svelte:head>
  <title>Overview | Backtest Lab</title>
</svelte:head>

<div class="app-container">
  <FilterSidebar {...data.availableFilters} />

  <main class="app-main">
    <header class="app-header">
      <h1>OVERVIEW</h1>
    </header>

    <div class="app-content">
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Best CAGR</div>
          <div class="kpi-value positive">
            {formatPercent(data.kpis.best_cagr, 2)}
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-label">Best Sharpe Ratio</div>
          <div class="kpi-value positive">
            {formatNumber(data.kpis.best_sharpe, 3)}
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-label">Best Win Rate</div>
          <div class="kpi-value positive">
            {formatPercent(data.kpis.best_win_rate, 2)}
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-label">Total Algorithms</div>
          <div class="kpi-value">
            {data.kpis.total_algorithms}
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-label">Total Trades</div>
          <div class="kpi-value">
            {formatNumber(data.kpis.total_trades || 0, 0)}
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h2 class="card-title">ALGORITHM RANKING</h2>
            <p class="card-subtitle">
              {sortedAlgorithms().length} algorithms • Click column headers to sort • Click row to view details
            </p>
          </div>
          <div class="search-box">
            <input 
              type="text" 
              placeholder="Search algorithms..." 
              bind:value={searchQuery}
              style="padding: 0.5rem; border-radius: 4px; border: 1px solid var(--color-border); background: var(--color-bg-secondary); color: var(--color-text); min-width: 250px;"
            />
          </div>
        </div>

        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th class="sortable" class:sorted-asc={sortColumn === 'name' && sortDirection === 'asc'} 
                    class:sorted-desc={sortColumn === 'name' && sortDirection === 'desc'} 
                    onclick={() => handleSort('name')}>
                  Name
                </th>
                <th class="sortable" class:sorted-asc={sortColumn === 'model_type' && sortDirection === 'asc'} 
                    class:sorted-desc={sortColumn === 'model_type' && sortDirection === 'desc'} 
                    onclick={() => handleSort('model_type')}>
                  Model
                </th>
                <th class="sortable" class:sorted-asc={sortColumn === 'timeframe' && sortDirection === 'asc'} 
                    class:sorted-desc={sortColumn === 'timeframe' && sortDirection === 'desc'} 
                    onclick={() => handleSort('timeframe')}>
                  TF
                </th>
                <th class="sortable" class:sorted-asc={sortColumn === 'cagr' && sortDirection === 'asc'} 
                    class:sorted-desc={sortColumn === 'cagr' && sortDirection === 'desc'} 
                    onclick={() => handleSort('cagr')}>
                  CAGR
                </th>
                <th class="sortable" class:sorted-asc={sortColumn === 'avg_sharpe' && sortDirection === 'asc'} 
                    class:sorted-desc={sortColumn === 'avg_sharpe' && sortDirection === 'desc'} 
                    onclick={() => handleSort('avg_sharpe')}>
                  Sharpe
                </th>
                <th class="sortable" class:sorted-asc={sortColumn === 'avg_return' && sortDirection === 'asc'} 
                    class:sorted-desc={sortColumn === 'avg_return' && sortDirection === 'desc'} 
                    onclick={() => handleSort('avg_return')}>
                  Return
                </th>
                <th class="sortable" class:sorted-asc={sortColumn === 'avg_win_rate' && sortDirection === 'asc'} 
                    class:sorted-desc={sortColumn === 'avg_win_rate' && sortDirection === 'desc'} 
                    onclick={() => handleSort('avg_win_rate')}>
                  Win Rate
                </th>
                <th class="sortable" class:sorted-asc={sortColumn === 'avg_profit_factor' && sortDirection === 'asc'} 
                    class:sorted-desc={sortColumn === 'avg_profit_factor' && sortDirection === 'desc'} 
                    onclick={() => handleSort('avg_profit_factor')}>
                  PF
                </th>
                <th class="sortable" class:sorted-asc={sortColumn === 'avg_mdd' && sortDirection === 'asc'} 
                    class:sorted-desc={sortColumn === 'avg_mdd' && sortDirection === 'desc'} 
                    onclick={() => handleSort('avg_mdd')}>
                  MDD
                </th>
                <th class="sortable" class:sorted-asc={sortColumn === 'total_trades' && sortDirection === 'asc'} 
                    class:sorted-desc={sortColumn === 'total_trades' && sortDirection === 'desc'} 
                    onclick={() => handleSort('total_trades')}>
                  Trades
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {#each sortedAlgorithms() as algo}
                <tr onclick={() => navigateToDetail(algo.id)} style="cursor: pointer;">
                  <td>{algo.name}</td>
                  <td>{algo.model_type}</td>
                  <td>{algo.timeframe}</td>
                  <td class={getValueClass(algo.cagr)}>{formatPercent(algo.cagr, 2)}</td>
                  <td class={getValueClass(algo.avg_sharpe)}>{formatNumber(algo.avg_sharpe, 3)}</td>
                  <td class={getValueClass(algo.avg_return)}>{formatPercent(algo.avg_return, 2)}</td>
                  <td class={getValueClass(algo.avg_win_rate)}>{formatPercent(algo.avg_win_rate, 2)}</td>
                  <td class={getValueClass(algo.avg_profit_factor)}>{formatNumber(algo.avg_profit_factor, 2)}</td>
                  <td class="negative">{formatPercent(algo.avg_mdd, 2)}</td>
                  <td>{formatNumber(algo.total_trades, 0)}</td>
                  <td>
                    <button 
                      class="btn-delete" 
                      onclick={(e) => handleDelete(e, algo.id, algo.name)}
                      title="Delete algorithm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </main>
</div>

<style>
  .btn-delete {
    background: transparent;
    color: var(--color-text-muted);
    border: 1px solid var(--color-border);
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.75rem;
    transition: all 0.2s ease;
  }
  .btn-delete:hover {
    background: rgba(244, 63, 94, 0.2);
    color: rgb(244, 63, 94);
    border-color: rgba(244, 63, 94, 0.5);
  }
</style>
