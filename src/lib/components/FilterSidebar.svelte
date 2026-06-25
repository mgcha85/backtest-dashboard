<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';

  interface Props {
    projects: string[];
    timeframes: string[];
    tickers: string[];
    directions: string[];
  }

  let { projects, timeframes, tickers, directions }: Props = $props();

  let selectedProjects = $state<string[]>([]);
  let selectedTimeframes = $state<string[]>([]);
  let selectedTickers = $state<string[]>([]);
  let selectedDirections = $state<string[]>([]);
  let currentPath = $state('');

  $effect(() => {
    const params = $page.url.searchParams;
    currentPath = $page.url.pathname;
    
    selectedProjects = params.getAll('project');
    selectedTimeframes = params.getAll('timeframe');
    selectedTickers = params.getAll('ticker');
    selectedDirections = params.getAll('direction');
  });

  function updateFilters() {
    const params = new URLSearchParams();

    selectedProjects.forEach(v => params.append('project', v));
    selectedTimeframes.forEach(v => params.append('timeframe', v));
    selectedTickers.forEach(v => params.append('ticker', v));
    selectedDirections.forEach(v => params.append('direction', v));

    goto(`${currentPath}?${params.toString()}`, { replaceState: true, noScroll: true });
  }

  function toggleProject(value: string) {
    if (selectedProjects.includes(value)) {
      selectedProjects = selectedProjects.filter(v => v !== value);
    } else {
      selectedProjects = [...selectedProjects, value];
    }
    updateFilters();
  }

  function toggleTimeframe(value: string) {
    if (selectedTimeframes.includes(value)) {
      selectedTimeframes = selectedTimeframes.filter(v => v !== value);
    } else {
      selectedTimeframes = [...selectedTimeframes, value];
    }
    updateFilters();
  }

  function toggleTicker(value: string) {
    if (selectedTickers.includes(value)) {
      selectedTickers = selectedTickers.filter(v => v !== value);
    } else {
      selectedTickers = [...selectedTickers, value];
    }
    updateFilters();
  }

  function toggleDirection(value: string) {
    if (selectedDirections.includes(value)) {
      selectedDirections = selectedDirections.filter(v => v !== value);
    } else {
      selectedDirections = [...selectedDirections, value];
    }
    updateFilters();
  }

  function clearFilters() {
    selectedProjects = [];
    selectedTimeframes = [];
    selectedTickers = [];
    selectedDirections = [];
    goto(currentPath, { replaceState: true, noScroll: true });
  }
</script>

<div class="app-sidebar">
  <div class="nav-header">
    <h1 class="nav-title">BACKTEST LAB</h1>
  </div>

  <nav>
    <ul class="nav-list">
      <li class="nav-item">
        <a href="/" class="nav-link" class:active={currentPath === '/'}>
          Overview
        </a>
      </li>
      <li class="nav-item">
        <a href="/compare" class="nav-link" class:active={currentPath === '/compare'}>
          Compare
        </a>
      </li>
    </ul>
  </nav>

  <div style="padding: var(--space-6); border-top: 1px solid var(--color-border);">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4);">
      <h3 style="font-size: var(--text-lg); color: var(--color-text-primary); font-family: var(--font-display);">
        FILTERS
      </h3>
      <button class="btn-ghost" style="padding: var(--space-1) var(--space-2); font-size: var(--text-xs);" onclick={clearFilters}>
        Clear
      </button>
    </div>

    <div class="filter-section">
      <div class="filter-label">Algorithm</div>
      <div class="checkbox-group">
        {#each projects as project}
          <div class="checkbox-item">
            <input 
              type="checkbox" 
              id="project-{project}"
              checked={selectedProjects.includes(project)}
              onchange={() => toggleProject(project)}
            />
            <label for="project-{project}">{project}</label>
          </div>
        {/each}
      </div>
    </div>

    <div class="filter-section">
      <div class="filter-label">Timeframe</div>
      <div class="checkbox-group">
        {#each timeframes as tf}
          <div class="checkbox-item">
            <input 
              type="checkbox" 
              id="timeframe-{tf}"
              checked={selectedTimeframes.includes(tf)}
              onchange={() => toggleTimeframe(tf)}
            />
            <label for="timeframe-{tf}">{tf}</label>
          </div>
        {/each}
      </div>
    </div>

    <div class="filter-section">
      <div class="filter-label">Ticker</div>
      <div class="checkbox-group">
        {#each tickers as ticker}
          <div class="checkbox-item">
            <input 
              type="checkbox" 
              id="ticker-{ticker}"
              checked={selectedTickers.includes(ticker)}
              onchange={() => toggleTicker(ticker)}
            />
            <label for="ticker-{ticker}">{ticker}</label>
          </div>
        {/each}
      </div>
    </div>

    {#if directions.length > 0}
    <div class="filter-section">
      <div class="filter-label">Direction</div>
      <div class="checkbox-group">
        {#each directions as direction}
          <div class="checkbox-item">
            <input 
              type="checkbox" 
              id="direction-{direction}"
              checked={selectedDirections.includes(direction)}
              onchange={() => toggleDirection(direction)}
            />
            <label for="direction-{direction}">{direction}</label>
          </div>
        {/each}
      </div>
    </div>
    {/if}
  </div>
</div>
