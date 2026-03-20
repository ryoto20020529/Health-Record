/**
 * ヘルスケアデバイス連携ユーティリティ
 * 
 * Webアプリからのヘルスケアデータアクセス:
 * - Sensor API（加速度センサーなど）は利用可能な場合がある
 * - Apple Health / Google Fit は直接アクセス不可（ネイティブAPI）
 * - 代替: 手動入力 + ブラウザセンサー
 */

// 歩数トラッキングが利用可能かチェック
export function isPedometerAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  // Sensor APIのチェック（一部ブラウザで利用可能）
  return 'Accelerometer' in window || 'LinearAccelerationSensor' in window;
}

// 歩数の平均推定（加速度センサーベースの簡易推定）
// 実際のプロダクションではネイティブアプリが必要
export function estimateStepsFromDuration(walkingMinutes: number): number {
  // 平均的なウォーキング: 約100歩/分
  return Math.round(walkingMinutes * 100);
}

// 歩数から距離を推定（km）
export function estimateDistanceFromSteps(steps: number): number {
  // 平均的な歩幅: 0.7m
  return Math.round((steps * 0.7) / 1000 * 10) / 10;
}

// 日次バッチ処理: 日付変更を検知するためのユーティリティ
export class DailySyncManager {
  private lastCheckedDate: string;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private onDayChange: (previousDate: string) => void;

  constructor(onDayChange: (previousDate: string) => void) {
    this.lastCheckedDate = new Date().toISOString().split('T')[0];
    this.onDayChange = onDayChange;
  }

  start() {
    // 1分ごとに日付変更をチェック
    this.intervalId = setInterval(() => {
      const today = new Date().toISOString().split('T')[0];
      if (today !== this.lastCheckedDate) {
        // 日付が変わった → 前日の記録を確定
        this.onDayChange(this.lastCheckedDate);
        this.lastCheckedDate = today;
      }
    }, 60000); // 60秒ごと
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // ページ離脱時にも保存
  setupBeforeUnload() {
    if (typeof window === 'undefined') return;
    window.addEventListener('beforeunload', () => {
      this.onDayChange(this.lastCheckedDate);
    });
  }
}

// 歩数データのソース判別用
export type StepDataSource = 'device' | 'manual';

export interface DailyStepData {
  date: string;
  steps: number;
  walkingMinutes: number;
  caloriesBurned: number;
  source: StepDataSource;
}
