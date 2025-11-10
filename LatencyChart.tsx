import React from 'react';
import { PingResult } from './types';

interface LatencyChartProps {
  results: PingResult[];
}

const LatencyChart: React.FC<LatencyChartProps> = ({ results }) => {
  // Filter for successful results and reverse to have oldest data first for a left-to-right chart
  const chartData = results.filter(r => r.time !== null).reverse();

  // Don't render a chart if there isn't enough data to draw a line
  if (chartData.length < 2) {
    return null;
  }

  const width = 500;
  const height = 150;
  const padding = 25; // Increased padding for labels

  const times = chartData.map(r => r.time!);
  const maxTime = Math.max(...times);
  const minTime = Math.min(...times);

  // Function to scale data points to chart coordinates
  const getX = (index: number) => {
    return (index / (chartData.length - 1)) * (width - padding * 2) + padding;
  };

  const getY = (time: number) => {
    // If all values are the same, prevent division by zero and center the line
    if (maxTime === minTime) {
      return height / 2;
    }
    const yRange = maxTime - minTime;
    // Scale time to fit within the padded height of the chart
    return height - padding - ((time - minTime) / yRange) * (height - padding * 2);
  };
  
  // Create the SVG path string for the line
  const linePath = chartData
    .map((point, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(point.time!)}`)
    .join(' ');

  // Create the SVG path string for the area under the line, closing the shape at the bottom
  const areaPath = `${linePath} L ${getX(chartData.length - 1)} ${height - padding} L ${getX(0)} ${height - padding} Z`;

  return (
    <div className="mt-8 bg-gray-900/50 rounded-lg border border-gray-800 p-4 sm:p-6">
       <h2 className="text-lg font-semibold mb-4">Latency Over Time (ms)</h2>
       <div className="w-full h-[150px]">
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#60a5fa" /> {/* blue-400 */}
              <stop offset="100%" stopColor="#2dd4bf" /> {/* teal-300 */}
            </linearGradient>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#2dd4bf" stopOpacity={0} />
            </linearGradient>
          </defs>
          
          {/* Grid lines and labels */}
          <line x1={padding} y1={getY(maxTime)} x2={width - padding} y2={getY(maxTime)} stroke="#4b5563" strokeWidth="0.5" strokeDasharray="2,2" />
          <text x={padding - 5} y={getY(maxTime)} dy="0.3em" fill="#9ca3af" fontSize="10" textAnchor="end">{Math.round(maxTime)}</text>

          {minTime !== maxTime && (
            <>
              <line x1={padding} y1={getY(minTime)} x2={width-padding} y2={getY(minTime)} stroke="#4b5563" strokeWidth="0.5" strokeDasharray="2,2" />
              <text x={padding - 5} y={getY(minTime)} dy="0.3em" fill="#9ca3af" fontSize="10" textAnchor="end">{Math.round(minTime)}</text>
            </>
          )}

          {/* Area under the line */}
          <path d={areaPath} fill="url(#areaGradient)" />
          
          {/* The line */}
          <path d={linePath} fill="none" stroke="url(#lineGradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
       </div>
    </div>
  );
};

export default LatencyChart;
