<script lang="ts">
  import { onMount } from 'svelte';
  import FilterSidebar from '$lib/components/FilterSidebar.svelte';
  import { formatNumber, formatPercent } from '$lib/utils';
  import type { PageData } from './$types';
  import { Chart, RadarController, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend, BarController, BarElement, CategoryScale, LinearScale } from 'chart.js';

  Chart.register(RadarController, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend, BarController, BarElement, CategoryScale, LinearScale);

  let { data }: { data: PageData } = $props();

  let selectedAlgorithmIds = $state<number[]>([]);
  let radarCanvas = $state<HTMLCanvasElement | undefined>(undefined);
  let barCanvas = $state<HTMLCanvasElement | undefined>(undefined);
  let radarChart: Chart | null = null;
  let barChart: Chart | null = null;

  const selectedAlgorithms = $derived(() => {
    return data.algorithms.filter(a => selectedAlgorithmIds.includes(a.id));
  });

  function toggleAlgorithm(id: number) {
    if (selectedAlgorithmIds.includes(id)) {
      selectedAlgorithmIds = selectedAlgorithmIds.filter(i => i !== id);
    } else {
      if (selectedAlgorithmIds.length >= 5) {
        alert('Maximum 5 algorithms can be compared at once');
        return;
      }
      selectedAlgorithmIds = [...selectedAlgorithmIds, id];
    }
  }

  function normalizeValue(value: number | null, min: number, max: number): number {
    if (value === null || value === undefined) return 0;
    if (max === min) return 0.5;
    return (value - min) / (max - min);
  }

  function updateCharts() {
    if (!radarCanvas || !barCanvas || selectedAlgorithms().length === 0) {
      radarChart?.destroy();
      barChart?.destroy();
      radarChart = null;
      barChart = null;
      return;
    }

    const metrics = ['avg_sharpe', 'avg_return', 'avg_win_rate', 'avg_profit_factor', 'avg_auc', 'avg_f1'];
    const metricLabels = ['Sharpe', 'Return', 'Win Rate', 'Profit Factor', 'AUC', 'F1'];

    const allValues = metrics.map(metric => 
      data.algorithms.map(a => (a as any)[metric]).filter((v: any) => v !== null && v !== undefined)
    );

    const minMax = metrics.map((_, idx) => ({
      min: Math.min(...allValues[idx]),
      max: Math.max(...allValues[idx])
    }));

    const colors = [
      'rgba(0, 217, 255, 0.6)',
      'rgba(124, 58, 237, 0.6)',
      'rgba(244, 63, 94, 0.6)',
      'rgba(16, 185, 129, 0.6)',
      'rgba(245, 158, 11, 0.6)'
    ];

    const borderColors = [
      'rgba(0, 217, 255, 1)',
      'rgba(124, 58, 237, 1)',
      'rgba(244, 63, 94, 1)',
      'rgba(16, 185, 129, 1)',
      'rgba(245, 158, 11, 1)'
    ];

    const radarDatasets = selectedAlgorithms().map((algo, idx) => ({
      label: algo.name,
      data: metrics.map((metric, metricIdx) => 
        normalizeValue((algo as any)[metric], minMax[metricIdx].min, minMax[metricIdx].max)
      ),
      backgroundColor: colors[idx],
      borderColor: borderColors[idx],
      borderWidth: 2,
      pointBackgroundColor: borderColors[idx],
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: borderColors[idx]
    }));

    if (radarChart) {
      radarChart.destroy();
    }

    radarChart = new Chart(radarCanvas, {
      type: 'radar',
      data: {
        labels: metricLabels,
        datasets: radarDatasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            beginAtZero: true,
            max: 1,
            ticks: {
              display: false,
              stepSize: 0.2
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            angleLines: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            pointLabels: {
              color: '#cbd5e1',
              font: {
                size: 13,
                family: "'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace",
                weight: 600
              }
            }
          }
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: '#cbd5e1',
              font: {
                size: 12,
                family: "'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace"
              },
              padding: 15
            }
          },
          tooltip: {
            backgroundColor: 'rgba(22, 33, 62, 0.95)',
            titleColor: '#f8fafc',
            bodyColor: '#cbd5e1',
            borderColor: '#334155',
            borderWidth: 1,
            padding: 12,
            displayColors: true,
            titleFont: {
              size: 13,
              family: "'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace",
              weight: 'bold'
            },
            bodyFont: {
              size: 12,
              family: "'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace"
            }
          }
        }
      }
    });

    const barDatasets = metrics.map((metric, metricIdx) => ({
      label: metricLabels[metricIdx],
      data: selectedAlgorithms().map(algo => (algo as any)[metric] || 0),
      backgroundColor: colors[metricIdx % colors.length],
      borderColor: borderColors[metricIdx % borderColors.length],
      borderWidth: 1
    }));

    if (barChart) {
      barChart.destroy();
    }

    barChart = new Chart(barCanvas, {
      type: 'bar',
      data: {
        labels: selectedAlgorithms().map(a => a.name),
        datasets: barDatasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            ticks: {
              color: '#cbd5e1',
              font: {
                size: 11,
                family: "'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace"
              }
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.05)'
            }
          },
          y: {
            ticks: {
              color: '#cbd5e1',
              font: {
                size: 11,
                family: "'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace"
              }
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            }
          }
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: '#cbd5e1',
              font: {
                size: 12,
                family: "'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace"
              },
              padding: 15
            }
          },
          tooltip: {
            backgroundColor: 'rgba(22, 33, 62, 0.95)',
            titleColor: '#f8fafc',
            bodyColor: '#cbd5e1',
            borderColor: '#334155',
            borderWidth: 1,
            padding: 12,
            displayColors: true,
            titleFont: {
              size: 13,
              family: "'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace",
              weight: 'bold'
            },
            bodyFont: {
              size: 12,
              family: "'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace"
            }
          }
        }
      }
    });
  }

  $effect(() => {
    if (radarCanvas && barCanvas) {
      updateCharts();
    }
  });

  onMount(() => {
    return () => {
      radarChart?.destroy();
      barChart?.destroy();
    };
  });
</script>

<svelte:head>
  <title>Compare | Backtest Lab</title>
</svelte:head>

<div class="app-container">
  <FilterSidebar {...data.availableFilters} />

  <main class="app-main">
    <header class="app-header">
      <h1>COMPARE ALGORITHMS</h1>
    </header>

    <div class="app-content">
      <div class="card mb-8">
        <div class="card-header">
          <h2 class="card-title">SELECT ALGORITHMS</h2>
          <p class="card-subtitle">
            Select up to 5 algorithms to compare • {selectedAlgorithmIds.length}/5 selected
          </p>
        </div>

        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th style="width: 60px;">Select</th>
                <th>Name</th>
                <th>Model</th>
                <th>Timeframe</th>
                <th>Sharpe</th>
                <th>Win Rate</th>
                <th>Return</th>
              </tr>
            </thead>
            <tbody>
              {#each data.algorithms as algo}
                <tr onclick={() => toggleAlgorithm(algo.id)}>
                  <td>
                    <input 
                      type="checkbox" 
                      checked={selectedAlgorithmIds.includes(algo.id)}
                      onchange={() => toggleAlgorithm(algo.id)}
                      onclick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td>{algo.name}</td>
                  <td>{algo.model_type}</td>
                  <td>{algo.timeframe}</td>
                  <td>{formatNumber(algo.avg_sharpe, 3)}</td>
                  <td>{formatPercent(algo.avg_win_rate, 2)}</td>
                  <td>{formatPercent(algo.avg_return, 2)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>

      {#if selectedAlgorithms().length > 0}
        <div class="chart-container">
          <h3 class="card-title mb-4">NORMALIZED METRICS (RADAR)</h3>
          <div class="chart-wrapper">
            <canvas bind:this={radarCanvas}></canvas>
          </div>
        </div>

        <div class="chart-container">
          <h3 class="card-title mb-4">ABSOLUTE METRICS (BAR)</h3>
          <div class="chart-wrapper">
            <canvas bind:this={barCanvas}></canvas>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title">DETAILED COMPARISON</h3>
          </div>

          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Algorithm</th>
                  <th>Sharpe</th>
                  <th>Return</th>
                  <th>Win Rate</th>
                  <th>Profit Factor</th>
                  <th>Max DD</th>
                  <th>AUC</th>
                  <th>F1</th>
                  <th>Trades</th>
                </tr>
              </thead>
              <tbody>
                {#each selectedAlgorithms() as algo}
                  <tr>
                    <td>{algo.name}</td>
                    <td>{formatNumber(algo.avg_sharpe, 3)}</td>
                    <td>{formatPercent(algo.avg_return, 2)}</td>
                    <td>{formatPercent(algo.avg_win_rate, 2)}</td>
                    <td>{formatNumber(algo.avg_profit_factor, 2)}</td>
                    <td>{formatPercent((algo as any).max_drawdown, 2)}</td>
                    <td>{formatNumber(algo.avg_auc, 3)}</td>
                    <td>{formatNumber(algo.avg_f1, 3)}</td>
                    <td>{formatNumber(algo.total_trades, 0)}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      {/if}
    </div>
  </main>
</div>
