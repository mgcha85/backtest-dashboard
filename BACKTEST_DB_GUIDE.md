# Backtest Database Developer Guide

## Overview

`backtest_results.db`는 암호화폐 트레이딩 전략 백테스트 결과를 저장하는 SQLite 데이터베이스입니다.

**파일 위치**: `/mnt/data/finance/backtest_results.db`

## 테이블 구조

### 1. algorithms

알고리즘(전략) 정의 및 메타데이터를 저장합니다.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | Primary key |
| `name` | TEXT | 고유 알고리즘 이름 (e.g., `tcn_multi_tf_BTCUSDT_5m_optuna`) |
| `model_type` | TEXT | 모델 타입 (아래 참조) |
| `timeframe` | TEXT | 캔들 타임프레임 (e.g., `5m`, `1h`, `5m+15m+1h+4h`) |
| `features` | TEXT | 사용된 피처셋 |
| `tp_pct` | REAL | Take Profit % (e.g., 0.01 = 1%) |
| `sl_pct` | REAL | Stop Loss % |
| `horizon_bars` | INTEGER | 예측 horizon (캔들 수) |
| `train_period` | TEXT | 학습 기간 (e.g., `2020-01-01 to 2023-12-31`) |
| `test_split` | TEXT | 테스트 분할 방식 (`walk_forward`, `fixed`) |
| `balance_method` | TEXT | 클래스 밸런싱 (`downsample_negative`, `none`) |
| `denoising` | TEXT | 디노이징 방식 (`none`, 기타) |
| `description` | TEXT | JSON 형태의 추가 파라미터 |
| `created_at` | TIMESTAMP | 생성 시각 |
| `project` | TEXT | 프로젝트명 (`hf-crypto-ml`, `rr-research` 등) |
| `ticker` | TEXT | 심볼 (`BTC`, `ETH` 등 - USDT suffix 없음) |
| `direction` | TEXT | 포지션 방향 (`LONG`, `SHORT`, NULL) |
| `prob_threshold` | REAL | 확률 임계값 (TCN 모델) |
| `hidden` | INTEGER | Hidden units (TCN 모델) |
| `tcn_layers` | INTEGER | TCN 레이어 수 |
| `lr` | REAL | Learning rate |
| `base_seq_len` | INTEGER | Base sequence length |
| `rr_ratio` | REAL | Risk-Reward ratio |

**model_type 값:**
- `baseline` - 규칙 기반 기본 전략
- `lgbm`, `lightgbm` - LightGBM 모델
- `xgboost` - XGBoost 모델
- `tabnet_hpo` - TabNet with HPO
- `tcn`, `tcn_multi_tf`, `tcn_multi_branch` - TCN 딥러닝 모델
- `cross_exchange_arb` - 거래소간 차익거래
- `usdt_premium_mean_reversion` - 김치프리미엄 평균회귀

**project 값:**
- `hf-crypto-ml` - 고빈도 암호화폐 ML
- `rr-research` - Risk-Reward 연구
- `5candle` - 5캔들 패턴
- `kimchipremium` - 김치프리미엄

**ticker 값:**
- `BTC`, `ETH`, `BNB`, `XRP`, `SOL`, `DOGE`, `ADA`, `AVAX`, `TRX`, `LINK`, `DOT`, `LTC`, `ATOM`, `XLM`

---

### 2. backtest_results

개별 백테스트 결과 (fold 단위)를 저장합니다.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | Primary key |
| `algorithm_id` | INTEGER | FK → algorithms.id |
| `fold_id` | INTEGER | Walk-forward fold 번호 |
| `auc` | REAL | AUC-ROC |
| `f1` | REAL | F1 Score |
| `precision_score` | REAL | Precision |
| `recall` | REAL | Recall |
| `win_rate` | REAL | 승률 (e.g., 0.55 = 55%) |
| `profit_factor` | REAL | 이익/손실 비율 |
| `sharpe` | REAL | Sharpe Ratio |
| `max_drawdown` | REAL | 최대 낙폭 (e.g., 0.15 = 15%) |
| `n_trades` | INTEGER | 거래 횟수 |
| `total_return` | REAL | 총 수익률 (e.g., 1.5 = 150%) |
| `avg_return_per_trade` | REAL | 거래당 평균 수익률 |
| `cagr` | REAL | 연평균 복합 성장률 |
| `fee_rate_pct` | REAL | 수수료율 (%) |
| `test_start` | TEXT | 테스트 시작일 |
| `test_end` | TEXT | 테스트 종료일 |
| `alpha` | REAL | 알파 (초과 수익) |

---

### 3. backtest_summary

알고리즘별 집계 결과를 저장합니다. `backtest_results`의 평균값.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | Primary key |
| `algorithm_id` | INTEGER | FK → algorithms.id (UNIQUE) |
| `n_folds` | INTEGER | Fold 수 |
| `avg_auc` | REAL | 평균 AUC |
| `avg_f1` | REAL | 평균 F1 |
| `avg_win_rate` | REAL | 평균 승률 |
| `avg_profit_factor` | REAL | 평균 Profit Factor |
| `avg_sharpe` | REAL | 평균 Sharpe |
| `avg_return` | REAL | 평균 수익률 |
| `total_trades` | INTEGER | 총 거래 횟수 |
| `cagr` | REAL | CAGR |
| `fee_rate_pct` | REAL | 수수료율 |
| `test_start` | TEXT | 테스트 시작일 |
| `test_end` | TEXT | 테스트 종료일 |
| `max_drawdown` | REAL | 최대 낙폭 |
| `alpha` | REAL | 알파 |

---

### 4. monthly_returns

월별 수익률 시계열 데이터를 저장합니다.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | Primary key |
| `algorithm_id` | INTEGER | FK → algorithms.id |
| `year_month` | TEXT | 연월 (e.g., `2024-01`) |
| `return_pct` | REAL | 월간 수익률 (%) |
| `trades` | INTEGER | 해당 월 거래 횟수 |
| `win_rate` | REAL | 해당 월 승률 |
| `equity_start` | REAL | 월초 자산 |
| `equity_end` | REAL | 월말 자산 |

**Unique constraint**: `(algorithm_id, year_month)`

---

## 주요 쿼리 예제

### 상위 10개 전략 조회 (CAGR 기준)

```sql
SELECT 
  a.name,
  a.model_type,
  a.ticker,
  a.direction,
  s.cagr,
  s.avg_sharpe,
  s.avg_win_rate,
  s.total_trades
FROM algorithms a
JOIN backtest_summary s ON a.id = s.algorithm_id
WHERE s.avg_return > 0 AND s.avg_sharpe > 0
ORDER BY s.cagr DESC
LIMIT 10;
```

### 특정 티커의 전략 조회

```sql
SELECT a.name, a.model_type, s.cagr, s.avg_sharpe
FROM algorithms a
JOIN backtest_summary s ON a.id = s.algorithm_id
WHERE a.ticker = 'BTC'
ORDER BY s.cagr DESC;
```

### LONG/SHORT 전략 비교

```sql
SELECT 
  a.direction,
  COUNT(*) as count,
  AVG(s.cagr) as avg_cagr,
  AVG(s.avg_sharpe) as avg_sharpe
FROM algorithms a
JOIN backtest_summary s ON a.id = s.algorithm_id
WHERE a.direction IS NOT NULL
GROUP BY a.direction;
```

### 월별 수익률 시계열

```sql
SELECT year_month, return_pct, trades
FROM monthly_returns
WHERE algorithm_id = 286
ORDER BY year_month;
```

### 모델 타입별 성과 비교

```sql
SELECT 
  a.model_type,
  COUNT(*) as count,
  AVG(s.cagr) as avg_cagr,
  AVG(s.avg_sharpe) as avg_sharpe,
  AVG(s.avg_win_rate) as avg_win_rate
FROM algorithms a
JOIN backtest_summary s ON a.id = s.algorithm_id
WHERE s.avg_return > 0
GROUP BY a.model_type
ORDER BY avg_cagr DESC;
```

### TCN 모델 파라미터 조회

```sql
SELECT 
  name,
  direction,
  rr_ratio,
  prob_threshold,
  hidden,
  tcn_layers,
  lr,
  base_seq_len
FROM algorithms
WHERE model_type = 'tcn_multi_tf'
ORDER BY name;
```

---

## 데이터 필터링 컨벤션

대시보드에서 사용하는 기본 필터:

```sql
-- 수익 > 0 AND Sharpe > 0 인 전략만 표시
WHERE COALESCE(s.avg_return, 0) > 0 
  AND COALESCE(s.avg_sharpe, 0) > 0
```

---

## 연결 예제

### Python (sqlite3)

```python
import sqlite3

DB_PATH = "/mnt/data/finance/backtest_results.db"

conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row

cursor = conn.execute("""
    SELECT a.name, s.cagr, s.avg_sharpe
    FROM algorithms a
    JOIN backtest_summary s ON a.id = s.algorithm_id
    WHERE s.cagr > 0
    ORDER BY s.cagr DESC
    LIMIT 10
""")

for row in cursor:
    print(f"{row['name']}: CAGR={row['cagr']:.2%}, Sharpe={row['avg_sharpe']:.2f}")

conn.close()
```

### Node.js (better-sqlite3)

```javascript
import Database from 'better-sqlite3';

const db = new Database('/mnt/data/finance/backtest_results.db', { 
  readonly: true, 
  fileMustExist: true 
});

const algorithms = db.prepare(`
  SELECT a.name, s.cagr, s.avg_sharpe
  FROM algorithms a
  JOIN backtest_summary s ON a.id = s.algorithm_id
  WHERE s.cagr > 0
  ORDER BY s.cagr DESC
  LIMIT 10
`).all();

console.log(algorithms);
db.close();
```

---

## 현재 데이터 통계

| Table | Row Count |
|-------|-----------|
| algorithms | 144 |
| backtest_results | 131 |
| backtest_summary | 144 |
| monthly_returns | 1,156 |

---

## 관련 파일

- **대시보드**: `/mnt/data/finance/web/` (SvelteKit)
- **DB 스키마**: 이 문서 참조
- **Klines 데이터**: `/mnt/data/finance/cryptocurrency/klines/`

---

## 주의사항

1. **ticker는 USDT suffix 없음**: `BTCUSDT` → `BTC`
2. **direction은 NULL 가능**: tcn_multi_tf 외 모델은 대부분 NULL
3. **cagr 기준 정렬**: 대시보드 기본 정렬은 CAGR DESC
4. **읽기 전용 접근 권장**: 대시보드는 readonly 모드로 연결

## HTTP API 연동 가이드

원격 환경(CI/CD, 다른 에이전트 등)에서 백테스트 결과를 삽입/업데이트할 때는 웹 대시보드의 API 엔드포인트를 사용합니다. (`algorithm.name` 기준으로 INSERT 또는 UPDATE 자동 처리)

**API Endpoint**: `POST http://146.56.115.71:8082/api/backtest`

### Python 예제 코드
```python
import requests

payload = {
    "algorithm": {
        "name": "my_new_strategy",
        "model_type": "xgboost",
        "timeframe": "1h",
        "features": "rsi,macd",
        "tp_pct": 0.05,
        "sl_pct": 0.02,
        "horizon_bars": 24,
        "train_period": "2020-2023",
        "project": "hf-crypto-ml",
        "ticker": "BTC",
        "direction": "LONG"
    },
    "summary": {
        "avg_win_rate": 0.55,
        "avg_sharpe": 1.2,
        "avg_return": 0.45,
        "total_trades": 100,
        "cagr": 0.15,
        "fee_rate_pct": 0.0006
    },
    "monthly_returns": [
        {"year_month": "2024-01", "return_pct": 0.02, "trades": 10},
        {"year_month": "2024-02", "return_pct": -0.01, "trades": 8}
    ],
    "trade_details": [
        {
            "ticker": "BTC",
            "open_time": "2024-01-01 10:00:00",
            "open_price": 42000.0,
            "close_time": "2024-01-01 14:00:00",
            "close_price": 43000.0,
            "profit": 1000.0,
            "profit_pct": 0.0238,
            "exit_type": "tp"
        }
    ]
}

response = requests.post("http://146.56.115.71:8082/api/backtest", json=payload)
print(response.json())
```

