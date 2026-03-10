'use client';

interface ActivityRingProps {
  calories: { current: number; target: number };
  exercise: { current: number; target: number };
  meals: { count: number; target: number };
  size?: number;
}

export function ActivityRing({ calories, exercise, meals, size = 200 }: ActivityRingProps) {
  const rings = [
    { ...calories, color: '#10b981', bgColor: '#10b98120', label: 'カロリー', unit: 'kcal' },
    { ...exercise, color: '#06b6d4', bgColor: '#06b6d420', label: '運動', unit: '分' },
    { ...meals, current: meals.count, target: meals.target, color: '#f59e0b', bgColor: '#f59e0b20', label: '記録', unit: '回' },
  ];

  const center = size / 2;
  const strokeWidth = size * 0.07;
  const gap = strokeWidth * 1.4;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {rings.map((ring, i) => {
          const radius = center - strokeWidth / 2 - i * gap - 8;
          const circumference = 2 * Math.PI * radius;
          const progress = Math.min(ring.current / Math.max(ring.target, 1), 1);
          const dashOffset = circumference * (1 - progress);

          return (
            <g key={i}>
              {/* Background ring */}
              <circle cx={center} cy={center} r={radius} fill="none"
                stroke={ring.bgColor} strokeWidth={strokeWidth} strokeLinecap="round" />
              {/* Progress ring */}
              <circle cx={center} cy={center} r={radius} fill="none"
                stroke={ring.color} strokeWidth={strokeWidth} strokeLinecap="round"
                strokeDasharray={circumference} strokeDashoffset={dashOffset}
                className="transition-all duration-1000 ease-out" />
            </g>
          );
        })}
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-2xl font-bold text-white">
          {Math.round(((calories.current / Math.max(calories.target, 1)) * 100))}
          <span className="text-xs text-white/40">%</span>
        </div>
        <div className="text-[9px] text-white/40">目標達成率</div>
      </div>
    </div>
  );
}

// リングの凡例
export function RingLegend({ calories, exercise, meals }: {
  calories: { current: number; target: number };
  exercise: { current: number; target: number };
  meals: { count: number; target: number };
}) {
  const items = [
    { label: 'カロリー', current: calories.current, target: calories.target, unit: 'kcal', color: 'text-emerald-400', dot: 'bg-emerald-400' },
    { label: '運動', current: exercise.current, target: exercise.target, unit: '分', color: 'text-cyan-400', dot: 'bg-cyan-400' },
    { label: '記録', current: meals.count, target: meals.target, unit: '回', color: 'text-amber-400', dot: 'bg-amber-400' },
  ];

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${item.dot}`} />
            <span className="text-xs text-white/60">{item.label}</span>
          </div>
          <span className={`text-sm font-bold ${item.color}`}>
            {item.current} <span className="text-[9px] text-white/30">/ {item.target}{item.unit}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
