<script lang="ts">
  import { goto } from '$app/navigation';
  import { formatNumber, formatPercent } from '$lib/utils';
  import type { PageData } from './$types';
  import { Chart, BarController, BarElement, LinearScale, CategoryScale, Tooltip, Legend } from 'chart.js';
  import annotationPlugin from 'chartjs-plugin-annotation';

  Chart.register(BarController, BarElement, LinearScale, CategoryScale, Tooltip, Legend, annotationPlugin);

  let { data }: { data: PageData } = $props();

  let activeTab = $state<'monthly' | 'weekly' | 'daily' | 'trades'>('monthly');
  let monthlyReturnsCanvas = $state<HTMLCanvasElement | undefined>(undefined);
  let weeklyReturnsCanvas = $state<HTMLCanvasElement | undefined>(undefined);
  let dailyReturnsCanvas = $state<HTMLCanvasElement | undefined>(undefined);

  let monthlyReturnsChart: Chart | null = null;
  let weeklyReturnsChart: Chart | null = null;
  let dailyReturnsChart: Chart | null = null;

  let tradeSortColumn = $state<string>('open_time');
  let tradeSortDirection = $state<'asc' | 'desc'>('desc');
  let tradeFilterExitType = $state<string>('all');
  let tradeFilterMonth = $state<string>('all');
  let tradePage = $state<number>(1);
  const tradesPerPage = 100;

  const availableMonths = $derived(() => {
    if (!data.tradeDetails || data.tradeDetails.length === 0) return [];
    const months = new Set<string>();
    for (const t of data.tradeDetails) {
      const m = t.open_time.substring(0, 7);
      months.add(m);
    }
    return Array.from(months).sort();
  });

  const dailyReturns = $derived(() => {
    if (!data.tradeDetails || data.tradeDetails.length === 0) return [];
    const dailyMap = new Map<string, { return_pct: number; trades: number; wins: number }>();
    
    for (const t of data.tradeDetails) {
      const date = t.close_time.substring(0, 10);
      if (!dailyMap.has(date)) {
        dailyMap.set(date, { return_pct: 0, trades: 0, wins: 0 });
      }
      const dayData = dailyMap.get(date)!;
      dayData.return_pct += t.profit_pct;
      dayData.trades += 1;
      if (t.profit > 0) {
        dayData.wins += 1;
      }
    }
    
    return Array.from(dailyMap.entries()).map(([date, d]) => ({
      date,
      return_pct: d.return_pct,
      trades: d.trades,
      win_rate: d.trades > 0 ? d.wins / d.trades : 0
    })).sort((a, b) => a.date.localeCompare(b.date));
  });

  const weeklyReturns = $derived(() => {
    if (!data.tradeDetails || data.tradeDetails.length === 0) return [];
    const weeklyMap = new Map<string, { return_pct: number; trades: number; wins: number }>();
    
    for (const t of data.tradeDetails) {
      const dateStr = t.close_time.substring(0, 10);
      const dateObj = new Date(dateStr);
      if (isNaN(dateObj.getTime())) continue;
      
      const day = dateObj.getDay();
      const diff = dateObj.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(dateObj.setDate(diff));
      const mondayStr = monday.toISOString().substring(0, 10);
      
      if (!weeklyMap.has(mondayStr)) {
        weeklyMap.set(mondayStr, { return_pct: 0, trades: 0, wins: 0 });
      }
      const weekData = weeklyMap.get(mondayStr)!;
      weekData.return_pct += t.profit_pct;
      weekData.trades += 1;
      if (t.profit > 0) {
        weekData.wins += 1;
      }
    }
    
    return Array.from(weeklyMap.entries()).map(([week_start, w]) => ({
      week_start,
      return_pct: w.return_pct,
      trades: w.trades,
      win_rate: w.trades > 0 ? w.wins / w.trades : 0
    })).sort((a, b) => a.week_start.localeCompare(b.week_start));
  });

  const filteredTrades = $derived(() => {
    if (!data.tradeDetails) return [];
    let trades = [...data.tradeDetails];
    
    if (tradeFilterExitType !== 'all') {
      trades = trades.filter(t => t.exit_type === tradeFilterExitType);
    }
    
    if (tradeFilterMonth !== 'all') {
      trades = trades.filter(t => t.open_time.startsWith(tradeFilterMonth));
    }
    
    return trades;
  });

  const sortedTrades = $derived(() => {
    const trades = [...filteredTrades()];
    trades.sort((a, b) => {
      const aVal = (a as any)[tradeSortColumn];
      const bVal = (b as any)[tradeSortColumn];
      
      if (aVal === bVal) return 0;
      if (tradeSortDirection === 'asc') {
        return aVal < bVal ? -1 : 1;
      } else {
        return aVal > bVal ? -1 : 1;
      }
    });
    return trades;
  });

  const paginatedTrades = $derived(() => {
    const start = (tradePage - 1) * tradesPerPage;
    return sortedTrades().slice(start, start + tradesPerPage);
  });

  const totalPages = $derived(() => Math.ceil(sortedTrades().length / tradesPerPage));

  const tradeStats = $derived(() => {
    const trades = filteredTrades();
    if (trades.length === 0) return { total: 0, wins: 0, losses: 0, winRate: 0, totalPnl: 0 };
    const wins = trades.filter(t => t.profit > 0).length;
    const losses = trades.filter(t => t.profit <= 0).length;
    const totalPnl = trades.reduce((sum, t) => sum + t.profit, 0);
    return {
      total: trades.length,
      wins,
      losses,
      winRate: wins / trades.length,
      totalPnl
    };
  });

  function handleTradeSort(column: string) {
    if (tradeSortColumn === column) {
      tradeSortDirection = tradeSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      tradeSortColumn = column;
      tradeSortDirection = column === 'open_time' ? 'desc' : 'desc';
    }
    tradePage = 1;
  }

  function resetFilters() {
    tradeFilterExitType = 'all';
    tradeFilterMonth = 'all';
    tradePage = 1;
  }

  function createMonthlyReturnsChart() {
    if (!monthlyReturnsCanvas || data.monthlyReturns.length === 0) return;

    if (monthlyReturnsChart) {
      monthlyReturnsChart.destroy();
    }

    const returnValues = data.monthlyReturns.map(m => m.return_pct * 100);
    const avgReturn = returnValues.reduce((a, b) => a + b, 0) / returnValues.length;

    monthlyReturnsChart = new Chart(monthlyReturnsCanvas, {
      type: 'bar',
      data: {
        labels: data.monthlyReturns.map(m => m.year_month),
        datasets: [{
          label: 'Monthly Return',
          data: returnValues,
          backgroundColor: data.monthlyReturns.map(m => 
            m.return_pct >= 0 ? 'rgba(34, 197, 94, 0.8)' : 'rgba(244, 63, 94, 0.8)'
          ),
          borderColor: data.monthlyReturns.map(m => 
            m.return_pct >= 0 ? 'rgba(34, 197, 94, 1)' : 'rgba(244, 63, 94, 1)'
          ),
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            ticks: {
              color: '#cbd5e1',
              font: { size: 11, family: "'SF Mono', monospace", weight: 600 },
              maxRotation: 45,
              minRotation: 45
            },
            grid: { color: 'rgba(255, 255, 255, 0.05)' }
          },
          y: {
            ticks: {
              color: '#cbd5e1',
              font: { size: 11, family: "'SF Mono', monospace" },
              callback: function(value) { return value + '%'; }
            },
            grid: { color: 'rgba(255, 255, 255, 0.1)' }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(22, 33, 62, 0.95)',
            titleColor: '#f8fafc',
            bodyColor: '#cbd5e1',
            borderColor: '#334155',
            borderWidth: 1,
            padding: 12,
            callbacks: {
              label: function(context) {
                return 'Return: ' + (context.parsed.y?.toFixed(2) ?? '0') + '%';
              }
            }
          },
          annotation: {
            annotations: {
              avgLine: {
                type: 'line',
                yMin: avgReturn,
                yMax: avgReturn,
                borderColor: '#fbbf24',
                borderWidth: 2,
                borderDash: [6, 4],
                label: {
                  display: true,
                  content: `Avg: ${avgReturn.toFixed(2)}%`,
                  position: 'end',
                  backgroundColor: 'rgba(251, 191, 36, 0.9)',
                  color: '#1e293b',
                  font: { size: 11, family: "'SF Mono', monospace", weight: 'bold' },
                  padding: 4
                }
              }
            }
          }
        }
      }
    });
  }

  function createWeeklyReturnsChart() {
    const dataset = weeklyReturns();
    if (!weeklyReturnsCanvas || dataset.length === 0) return;

    if (weeklyReturnsChart) {
      weeklyReturnsChart.destroy();
    }

    const returnValues = dataset.map(w => w.return_pct * 100);
    const avgReturn = returnValues.reduce((a, b) => a + b, 0) / returnValues.length;

    weeklyReturnsChart = new Chart(weeklyReturnsCanvas, {
      type: 'bar',
      data: {
        labels: dataset.map(w => w.week_start),
        datasets: [{
          label: 'Weekly Return',
          data: returnValues,
          backgroundColor: dataset.map(w => 
            w.return_pct >= 0 ? 'rgba(34, 197, 94, 0.8)' : 'rgba(244, 63, 94, 0.8)'
          ),
          borderColor: dataset.map(w => 
            w.return_pct >= 0 ? 'rgba(34, 197, 94, 1)' : 'rgba(244, 63, 94, 1)'
          ),
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            ticks: {
              color: '#cbd5e1',
              font: { size: 11, family: "'SF Mono', monospace", weight: 600 },
              maxRotation: 45,
              minRotation: 45
            },
            grid: { color: 'rgba(255, 255, 255, 0.05)' }
          },
          y: {
            ticks: {
              color: '#cbd5e1',
              font: { size: 11, family: "'SF Mono', monospace" },
              callback: function(value) { return value + '%'; }
            },
            grid: { color: 'rgba(255, 255, 255, 0.1)' }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(22, 33, 62, 0.95)',
            titleColor: '#f8fafc',
            bodyColor: '#cbd5e1',
            borderColor: '#334155',
            borderWidth: 1,
            padding: 12,
            callbacks: {
              label: function(context) {
                return 'Return: ' + (context.parsed.y?.toFixed(2) ?? '0') + '%';
              }
            }
          },
          annotation: {
            annotations: {
              avgLine: {
                type: 'line',
                yMin: avgReturn,
                yMax: avgReturn,
                borderColor: '#fbbf24',
                borderWidth: 2,
                borderDash: [6, 4],
                label: {
                  display: true,
                  content: `Avg: ${avgReturn.toFixed(2)}%`,
                  position: 'end',
                  backgroundColor: 'rgba(251, 191, 36, 0.9)',
                  color: '#1e293b',
                  font: { size: 11, family: "'SF Mono', monospace", weight: 'bold' },
                  padding: 4
                }
              }
            }
          }
        }
      }
    });
  }

  function createDailyReturnsChart() {
    const dataset = dailyReturns();
    if (!dailyReturnsCanvas || dataset.length === 0) return;

    if (dailyReturnsChart) {
      dailyReturnsChart.destroy();
    }

    const returnValues = dataset.map(d => d.return_pct * 100);
    const avgReturn = returnValues.reduce((a, b) => a + b, 0) / returnValues.length;

    dailyReturnsChart = new Chart(dailyReturnsCanvas, {
      type: 'bar',
      data: {
        labels: dataset.map(d => d.date),
        datasets: [{
          label: 'Daily Return',
          data: returnValues,
          backgroundColor: dataset.map(d => 
            d.return_pct >= 0 ? 'rgba(34, 197, 94, 0.8)' : 'rgba(244, 63, 94, 0.8)'
          ),
          borderColor: dataset.map(d => 
            d.return_pct >= 0 ? 'rgba(34, 197, 94, 1)' : 'rgba(244, 63, 94, 1)'
          ),
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            ticks: {
              color: '#cbd5e1',
              font: { size: 10, family: "'SF Mono', monospace", weight: 500 },
              maxRotation: 90,
              minRotation: 90
            },
            grid: { color: 'rgba(255, 255, 255, 0.05)' }
          },
          y: {
            ticks: {
              color: '#cbd5e1',
              font: { size: 11, family: "'SF Mono', monospace" },
              callback: function(value) { return value + '%'; }
            },
            grid: { color: 'rgba(255, 255, 255, 0.1)' }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(22, 33, 62, 0.95)',
            titleColor: '#f8fafc',
            bodyColor: '#cbd5e1',
            borderColor: '#334155',
            borderWidth: 1,
            padding: 12,
            callbacks: {
              label: function(context) {
                return 'Return: ' + (context.parsed.y?.toFixed(2) ?? '0') + '%';
              }
            }
          },
          annotation: {
            annotations: {
              avgLine: {
                type: 'line',
                yMin: avgReturn,
                yMax: avgReturn,
                borderColor: '#fbbf24',
                borderWidth: 2,
                borderDash: [6, 4],
                label: {
                  display: true,
                  content: `Avg: ${avgReturn.toFixed(2)}%`,
                  position: 'end',
                  backgroundColor: 'rgba(251, 191, 36, 0.9)',
                  color: '#1e293b',
                  font: { size: 11, family: "'SF Mono', monospace", weight: 'bold' },
                  padding: 4
                }
              }
            }
          }
        }
      }
    });
  }

  $effect(() => {
    if (activeTab === 'monthly' && monthlyReturnsCanvas) {
      createMonthlyReturnsChart();
      return () => {
        monthlyReturnsChart?.destroy();
        monthlyReturnsChart = null;
      };
    }
  });

  $effect(() => {
    if (activeTab === 'weekly' && weeklyReturnsCanvas) {
      createWeeklyReturnsChart();
      return () => {
        weeklyReturnsChart?.destroy();
        weeklyReturnsChart = null;
      };
    }
  });

  $effect(() => {
    if (activeTab === 'daily' && dailyReturnsCanvas) {
      createDailyReturnsChart();
      return () => {
        dailyReturnsChart?.destroy();
        dailyReturnsChart = null;
      };
    }
  });
</script>

<svelte:head>
  <title>{data.algorithm.name} | Backtest Lab</title>
</svelte:head>

<div class="app-container">
  <main class="app-main" style="margin-left: 0;">
    <header class="app-header">
      <button class="btn-ghost" onclick={() => goto('/')}>← Back</button>
      <h1>{data.algorithm.name}</h1>
    </header>

    <div class="app-content">
      <div class="card mb-8">
        <div class="card-header">
          <h2 class="card-title">ALGORITHM METADATA</h2>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-4);">
          <div>
            <div class="text-muted" style="font-size: var(--text-xs); text-transform: uppercase; margin-bottom: var(--space-1);">Model Type</div>
            <div class="badge badge-primary">{data.algorithm.model_type}</div>
          </div>
          <div>
            <div class="text-muted" style="font-size: var(--text-xs); text-transform: uppercase; margin-bottom: var(--space-1);">Timeframe</div>
            <div class="badge badge-primary">{data.algorithm.timeframe}</div>
          </div>
          <div>
            <div class="text-muted" style="font-size: var(--text-xs); text-transform: uppercase; margin-bottom: var(--space-1);">Denoising</div>
            <div class="badge badge-primary">{data.algorithm.denoising}</div>
          </div>
          <div>
            <div class="text-muted" style="font-size: var(--text-xs); text-transform: uppercase; margin-bottom: var(--space-1);">TP %</div>
            <div class="font-mono text-primary">{formatPercent(data.algorithm.tp_pct, 2)}</div>
          </div>
          <div>
            <div class="text-muted" style="font-size: var(--text-xs); text-transform: uppercase; margin-bottom: var(--space-1);">SL %</div>
            <div class="font-mono text-primary">{formatPercent(data.algorithm.sl_pct, 2)}</div>
          </div>
          <div>
            <div class="text-muted" style="font-size: var(--text-xs); text-transform: uppercase; margin-bottom: var(--space-1);">Horizon Bars</div>
            <div class="font-mono text-primary">{data.algorithm.horizon_bars}</div>
          </div>
          <div>
            <div class="text-muted" style="font-size: var(--text-xs); text-transform: uppercase; margin-bottom: var(--space-1);">Prob Threshold</div>
            <div class="font-mono text-primary">{formatNumber(data.algorithm.prob_threshold ?? 0.5, 3)}</div>
          </div>
          {#if data.summary?.fee_rate_pct}
          <div>
            <div class="text-muted" style="font-size: var(--text-xs); text-transform: uppercase; margin-bottom: var(--space-1);">Fee Rate</div>
            <div class="font-mono text-primary">{(data.summary.fee_rate_pct * 100).toFixed(3)}%</div>
          </div>
          {/if}
        </div>

        {#if data.algorithm.rr_ratio || data.algorithm.hidden}
          <div style="margin-top: var(--space-6); padding-top: var(--space-4); border-top: 1px solid var(--color-border);">
            <div class="text-muted" style="font-size: var(--text-xs); text-transform: uppercase; margin-bottom: var(--space-3);">Optimized Parameters</div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: var(--space-4);">
              {#if data.algorithm.rr_ratio}
                <div>
                  <div class="text-muted" style="font-size: var(--text-xs); text-transform: uppercase;">RR Ratio</div>
                  <div class="font-mono text-primary">{formatNumber(data.algorithm.rr_ratio, 2)}</div>
                </div>
              {/if}
              {#if data.algorithm.hidden}
                <div>
                  <div class="text-muted" style="font-size: var(--text-xs); text-transform: uppercase;">Hidden</div>
                  <div class="font-mono text-primary">{data.algorithm.hidden}</div>
                </div>
              {/if}
              {#if data.algorithm.tcn_layers}
                <div>
                  <div class="text-muted" style="font-size: var(--text-xs); text-transform: uppercase;">TCN Layers</div>
                  <div class="font-mono text-primary">{data.algorithm.tcn_layers}</div>
                </div>
              {/if}
              {#if data.algorithm.lr}
                <div>
                  <div class="text-muted" style="font-size: var(--text-xs); text-transform: uppercase;">Learning Rate</div>
                  <div class="font-mono text-primary">{data.algorithm.lr.toExponential(2)}</div>
                </div>
              {/if}
            </div>
          </div>
        {/if}
      </div>

      {#if data.summary}
        <div class="kpi-grid mb-8">
          <div class="kpi-card">
            <div class="kpi-label">Sharpe</div>
            <div class="kpi-value positive">{formatNumber(data.summary.avg_sharpe, 3)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Win Rate</div>
            <div class="kpi-value positive">{formatPercent(data.summary.avg_win_rate, 2)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Return</div>
            <div class="kpi-value positive">{formatPercent(data.summary.avg_return, 2)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Trades</div>
            <div class="kpi-value">{formatNumber(data.summary.total_trades, 0)}</div>
          </div>
        </div>
      {/if}

      <div class="tabs mb-4">
        <button class="tab-btn" class:active={activeTab === 'monthly'} onclick={() => activeTab = 'monthly'}>
          Monthly ({data.monthlyReturns?.length || 0})
        </button>
        <button class="tab-btn" class:active={activeTab === 'weekly'} onclick={() => activeTab = 'weekly'}>
          Weekly ({weeklyReturns().length})
        </button>
        <button class="tab-btn" class:active={activeTab === 'daily'} onclick={() => activeTab = 'daily'}>
          Daily ({dailyReturns().length})
        </button>
        <button class="tab-btn" class:active={activeTab === 'trades'} onclick={() => activeTab = 'trades'}>
          Trades ({data.tradeDetails?.length || 0})
        </button>
      </div>

      <!-- Monthly Tab Content -->
      <div class="tab-content" class:hidden={activeTab !== 'monthly'}>
        {#if data.monthlyReturns && data.monthlyReturns.length > 0}
          <div class="chart-container mb-8">
            <h3 class="card-title mb-4">MONTHLY RETURNS</h3>
            <div class="chart-wrapper">
              <canvas bind:this={monthlyReturnsCanvas}></canvas>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <h3 class="card-title">MONTHLY BREAKDOWN</h3>
            </div>
            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Return</th>
                    <th>Trades</th>
                    <th>Win Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {#each data.monthlyReturns as month}
                    <tr>
                      <td>{month.year_month}</td>
                      <td class={month.return_pct >= 0 ? 'positive' : 'negative'}>{formatPercent(month.return_pct, 2)}</td>
                      <td>{formatNumber(month.trades, 0)}</td>
                      <td>{formatPercent(month.win_rate, 2)}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </div>
        {:else}
          <div class="card"><div class="card-body text-center text-muted">No monthly data.</div></div>
        {/if}
      </div>

      <!-- Weekly Tab Content -->
      <div class="tab-content" class:hidden={activeTab !== 'weekly'}>
        {#if weeklyReturns().length > 0}
          <div class="chart-container mb-8">
            <h3 class="card-title mb-4">WEEKLY RETURNS</h3>
            <div class="chart-wrapper">
              <canvas bind:this={weeklyReturnsCanvas}></canvas>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <h3 class="card-title">WEEKLY BREAKDOWN</h3>
            </div>
            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Week Start</th>
                    <th>Return</th>
                    <th>Trades</th>
                    <th>Win Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {#each weeklyReturns() as week}
                    <tr>
                      <td>{week.week_start}</td>
                      <td class={week.return_pct >= 0 ? 'positive' : 'negative'}>{formatPercent(week.return_pct, 2)}</td>
                      <td>{formatNumber(week.trades, 0)}</td>
                      <td>{formatPercent(week.win_rate, 2)}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </div>
        {:else}
          <div class="card"><div class="card-body text-center text-muted">No weekly data.</div></div>
        {/if}
      </div>

      <!-- Daily Tab Content -->
      <div class="tab-content" class:hidden={activeTab !== 'daily'}>
        {#if dailyReturns().length > 0}
          <div class="chart-container mb-8">
            <h3 class="card-title mb-4">DAILY RETURNS</h3>
            <div class="chart-wrapper">
              <canvas bind:this={dailyReturnsCanvas}></canvas>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <h3 class="card-title">DAILY BREAKDOWN</h3>
            </div>
            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Return</th>
                    <th>Trades</th>
                    <th>Win Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {#each dailyReturns() as day}
                    <tr>
                      <td>{day.date}</td>
                      <td class={day.return_pct >= 0 ? 'positive' : 'negative'}>{formatPercent(day.return_pct, 2)}</td>
                      <td>{formatNumber(day.trades, 0)}</td>
                      <td>{formatPercent(day.win_rate, 2)}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </div>
        {:else}
          <div class="card"><div class="card-body text-center text-muted">No daily data.</div></div>
        {/if}
      </div>

      <!-- Trades Tab Content -->
      <div class="tab-content" class:hidden={activeTab !== 'trades'}>
        {#if data.tradeDetails && data.tradeDetails.length > 0}
          <div class="filter-bar mb-4">
            <div class="filter-group">
              <label>Exit Type:</label>
              <select bind:value={tradeFilterExitType} onchange={() => tradePage = 1}>
                <option value="all">All</option>
                <option value="tp">TP</option>
                <option value="sl">SL</option>
                <option value="timeout">Timeout</option>
              </select>
            </div>
            <div class="filter-group">
              <label>Month:</label>
              <select bind:value={tradeFilterMonth} onchange={() => tradePage = 1}>
                <option value="all">All</option>
                {#each availableMonths() as m}
                  <option value={m}>{m}</option>
                {/each}
              </select>
            </div>
            <button class="btn-reset" onclick={resetFilters}>Reset</button>
          </div>

          <div class="stats-bar mb-4">
            <span>Showing {sortedTrades().length} trades</span>
            <span class="positive">Wins: {tradeStats().wins}</span>
            <span class="negative">Losses: {tradeStats().losses}</span>
            <span>WR: {formatPercent(tradeStats().winRate, 1)}</span>
            <span class={tradeStats().totalPnl >= 0 ? 'positive' : 'negative'}>
              PnL: ${formatNumber(tradeStats().totalPnl, 2)}
            </span>
          </div>

          <div class="card">
            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th class="sortable" class:sorted={tradeSortColumn === 'open_time'} onclick={() => handleTradeSort('open_time')}>
                      Open Time {tradeSortColumn === 'open_time' ? (tradeSortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th class="sortable" class:sorted={tradeSortColumn === 'close_time'} onclick={() => handleTradeSort('close_time')}>
                      Close Time {tradeSortColumn === 'close_time' ? (tradeSortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th class="sortable" class:sorted={tradeSortColumn === 'open_price'} onclick={() => handleTradeSort('open_price')}>
                      Open {tradeSortColumn === 'open_price' ? (tradeSortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th class="sortable" class:sorted={tradeSortColumn === 'close_price'} onclick={() => handleTradeSort('close_price')}>
                      Close {tradeSortColumn === 'close_price' ? (tradeSortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th class="sortable" class:sorted={tradeSortColumn === 'prob'} onclick={() => handleTradeSort('prob')}>
                      Prob {tradeSortColumn === 'prob' ? (tradeSortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th class="sortable" class:sorted={tradeSortColumn === 'profit'} onclick={() => handleTradeSort('profit')}>
                      Profit {tradeSortColumn === 'profit' ? (tradeSortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th class="sortable" class:sorted={tradeSortColumn === 'profit_pct'} onclick={() => handleTradeSort('profit_pct')}>
                      % {tradeSortColumn === 'profit_pct' ? (tradeSortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th class="sortable" class:sorted={tradeSortColumn === 'exit_type'} onclick={() => handleTradeSort('exit_type')}>
                      Exit {tradeSortColumn === 'exit_type' ? (tradeSortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {#each paginatedTrades() as trade}
                    <tr>
                      <td class="font-mono text-sm">{trade.open_time}</td>
                      <td class="font-mono text-sm">{trade.close_time}</td>
                      <td class="font-mono">{formatNumber(trade.open_price, 4)}</td>
                      <td class="font-mono">{formatNumber(trade.close_price, 4)}</td>
                      <td class="font-mono">{trade.prob !== null ? formatNumber(trade.prob, 3) : '-'}</td>
                      <td class={trade.profit >= 0 ? 'positive' : 'negative'}>${formatNumber(trade.profit, 2)}</td>
                      <td class={trade.profit_pct >= 0 ? 'positive' : 'negative'}>{formatPercent(trade.profit_pct, 2)}</td>
                      <td>
                        <span class="badge" class:badge-success={trade.exit_type === 'tp'} class:badge-danger={trade.exit_type === 'sl'} class:badge-warning={trade.exit_type === 'timeout'}>
                          {trade.exit_type.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>

            {#if totalPages() > 1}
              <div class="pagination">
                <button disabled={tradePage === 1} onclick={() => tradePage = 1}>«</button>
                <button disabled={tradePage === 1} onclick={() => tradePage--}>‹</button>
                <span>Page {tradePage} of {totalPages()}</span>
                <button disabled={tradePage === totalPages()} onclick={() => tradePage++}>›</button>
                <button disabled={tradePage === totalPages()} onclick={() => tradePage = totalPages()}>»</button>
              </div>
            {/if}
          </div>
        {:else}
          <div class="card"><div class="card-body text-center text-muted">No trade details.</div></div>
        {/if}
      </div>
    </div>
  </main>
</div>

<style>
  .hidden {
    display: none !important;
  }
  .tabs {
    display: flex;
    gap: 0.5rem;
    border-bottom: 1px solid var(--color-border);
  }
  .tab-btn {
    padding: 0.75rem 1.5rem;
    border: none;
    background: transparent;
    color: var(--color-text-muted);
    cursor: pointer;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    font-weight: 500;
  }
  .tab-btn:hover { color: var(--color-text); }
  .tab-btn.active {
    color: var(--color-primary);
    border-bottom-color: var(--color-primary);
  }
  .filter-bar {
    display: flex;
    gap: 1rem;
    align-items: center;
    flex-wrap: wrap;
  }
  .filter-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .filter-group label {
    font-size: 0.875rem;
    color: var(--color-text-muted);
  }
  .filter-group select {
    padding: 0.5rem;
    border-radius: 4px;
    border: 1px solid var(--color-border);
    background: var(--color-bg-secondary);
    color: var(--color-text);
    font-size: 0.875rem;
  }
  .btn-reset {
    padding: 0.5rem 1rem;
    border: 1px solid var(--color-border);
    background: transparent;
    color: var(--color-text-muted);
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.875rem;
  }
  .btn-reset:hover {
    background: var(--color-bg-secondary);
  }
  .stats-bar {
    display: flex;
    gap: 1.5rem;
    font-size: 0.875rem;
    color: var(--color-text-muted);
  }
  .sortable {
    cursor: pointer;
    user-select: none;
  }
  .sortable:hover {
    color: var(--color-primary);
  }
  .sorted {
    color: var(--color-primary);
  }
  .pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem;
    border-top: 1px solid var(--color-border);
  }
  .pagination button {
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--color-border);
    background: var(--color-bg-secondary);
    color: var(--color-text);
    border-radius: 4px;
    cursor: pointer;
  }
  .pagination button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .pagination span {
    font-size: 0.875rem;
    color: var(--color-text-muted);
  }
  .badge-success {
    background: rgba(34, 197, 94, 0.2);
    color: rgb(34, 197, 94);
  }
  .badge-danger {
    background: rgba(244, 63, 94, 0.2);
    color: rgb(244, 63, 94);
  }
  .badge-warning {
    background: rgba(251, 191, 36, 0.2);
    color: rgb(251, 191, 36);
  }
  .font-mono {
    font-family: 'SF Mono', 'Monaco', monospace;
  }
  .text-sm {
    font-size: 0.875rem;
  }
</style>
