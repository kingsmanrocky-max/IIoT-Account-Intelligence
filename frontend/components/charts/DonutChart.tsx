'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface DonutChartData {
  name: string;
  value: number;
  color?: string;
}

interface DonutChartProps {
  data: DonutChartData[];
  title?: string;
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
  className?: string;
  showLegend?: boolean;
  showLabels?: boolean;
}

const DEFAULT_COLORS = [
  '#3B82F6', // blue
  '#10B981', // emerald
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#84CC16', // lime
];

export function DonutChart({
  data,
  title,
  height = 300,
  innerRadius = 60,
  outerRadius = 100,
  className = '',
  showLegend = true,
  showLabels = false,
}: DonutChartProps) {
  const chartData = data.map((item, index) => ({
    ...item,
    color: item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
  }));

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  const renderCustomLabel = (props: {
    cx?: number;
    cy?: number;
    midAngle?: number;
    innerRadius?: number;
    outerRadius?: number;
    percent?: number;
  }) => {
    const { cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0, percent = 0 } = props;
    if (!showLabels || percent < 0.05) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}
    >
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {title}
        </h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={2}
            dataKey="value"
            labelLine={false}
            label={renderCustomLabel}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
            formatter={(value: number, name: string) => [
              `${value} (${((value / total) * 100).toFixed(1)}%)`,
              name,
            ]}
          />
          {showLegend && (
            <Legend
              verticalAlign="bottom"
              iconType="circle"
              formatter={(value) => (
                <span className="text-sm text-gray-600 dark:text-gray-300">{value}</span>
              )}
            />
          )}
        </PieChart>
      </ResponsiveContainer>
      {/* Center total */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ marginTop: title ? '40px' : '0' }}>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{total}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
        </div>
      </div>
    </div>
  );
}

export default DonutChart;
