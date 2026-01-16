import React from 'react';
import { TurnHistoryItem } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface HistoricalChartProps {
  history: TurnHistoryItem[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const dataItem = payload[0].payload;
    
    return (
      <div className="bg-white border border-slate-200 p-3 shadow-lg text-xs font-sans z-50">
        <p className="text-slate-900 font-bold mb-2 border-b border-slate-100 pb-1">{dataItem.label || label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 mb-1">
             <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.stroke }} />
             <span className="text-slate-600">{entry.name}: </span>
             <span className="text-slate-900 font-mono font-medium">{entry.value.toFixed(2)}%</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// Custom Axis Tick: Displays Month on top line, Year/Q on bottom line if applicable
const CustomXAxisTick = ({ x, y, payload }: any) => {
  const date = new Date(payload.value);
  const month = date.toLocaleString('default', { month: 'short' });
  const monthIndex = date.getMonth(); // 0-11
  const year = date.getFullYear();

  // Determine if we need the Year/Q sub-label
  let subLabel = null;
  // Quarter Starts: Jan (0), Apr (3), Jul (6), Oct (9)
  if (monthIndex % 3 === 0) {
      const q = Math.floor(monthIndex / 3) + 1;
      subLabel = `${year} Q${q}`;
  }

  return (
    <g transform={`translate(${x},${y})`}>
      {/* Month Name (Always shown) */}
      <text x={0} y={0} dy={12} textAnchor="middle" fill="#64748b" fontSize={10} fontFamily="Inter">
        {month}
      </text>
      
      {/* Quarter/Year Label (Only on quarter start) */}
      {subLabel && (
        <text x={0} y={0} dy={24} textAnchor="middle" fill="#94a3b8" fontSize={9} fontFamily="Inter" fontWeight="bold">
          {subLabel}
        </text>
      )}
    </g>
  );
};

const HistoricalChart: React.FC<HistoricalChartProps> = ({ history }) => {
  if (!history || history.length === 0) {
      return (
          <div className="bg-white border border-slate-200 p-4 shadow-academic h-full flex items-center justify-center">
              <span className="text-slate-400 text-sm">Initializing chart...</span>
          </div>
      );
  }

  // Window size limited to 10 months as requested
  const WINDOW_SIZE = 10; 
  const visibleHistory = history.slice(-WINDOW_SIZE);

  const data = visibleHistory.map(h => ({
    label: h.label,
    timestamp: h.timestamp,
    Inflation: h.indicators.inflation,
    Unemployment: h.indicators.unemployment,
    Rate: h.tools.fedFundsRate
  }));

  // Explicitly calculate ticks to force Recharts to render every single data point
  const ticks = data.map(d => d.timestamp);

  return (
    <div className="bg-white border border-slate-200 p-4 shadow-academic h-full flex flex-col">
      <h3 className="text-slate-900 font-serif font-bold mb-4 ml-2 border-b border-slate-100 pb-2 flex justify-between flex-shrink-0">
        <span>Figure 1: Real-time Economic Trajectory</span>
        <span className="text-xs font-sans font-normal text-slate-500 self-end">T = {history.length} months</span>
      </h3>
      <div className="flex-grow min-h-0 w-full">
        <div style={{ width: '100%', height: '100%', minHeight: '200px' }}>
            <ResponsiveContainer width="100%" height="100%">
                {/* Increase bottom margin to accommodate the 2-line labels */}
                <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 30 }}>
                <defs>
                    <linearGradient id="colorInf" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#dc2626" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#dc2626" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorUn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d97706" stopOpacity={0.05}/>
                    <stop offset="95%" stopColor="#d97706" stopOpacity={0}/>
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis 
                    dataKey="timestamp" 
                    type="number"
                    scale="time"
                    domain={['dataMin', 'dataMax']}
                    ticks={ticks} 
                    tick={<CustomXAxisTick />}
                    interval={0} // Force every tick to render
                    stroke="#64748b" 
                    tickLine={false}
                    axisLine={{stroke: '#cbd5e1'}}
                />
                <YAxis 
                    stroke="#64748b" 
                    tick={{fontSize: 11, fontFamily: 'Inter'}} 
                    tickLine={false}
                    axisLine={false}
                    domain={['auto', 'auto']}
                />
                <Tooltip content={<CustomTooltip />} isAnimationActive={false} />
                <Legend wrapperStyle={{ paddingTop: '10px', fontFamily: 'Inter', fontSize: '12px' }} iconType="rect" />
                
                <Area 
                    type="monotone" 
                    dataKey="Inflation" 
                    stroke="#dc2626" 
                    fillOpacity={1} 
                    fill="url(#colorInf)" 
                    strokeWidth={2} 
                    isAnimationActive={true}
                    animationDuration={500}
                    animationEasing="linear"
                />
                <Area 
                    type="monotone" 
                    dataKey="Unemployment" 
                    stroke="#2563eb" 
                    fillOpacity={1} 
                    fill="url(#colorUn)" 
                    strokeWidth={2} 
                    isAnimationActive={true}
                    animationDuration={500}
                    animationEasing="linear"
                />
                <Area 
                    type="stepAfter" 
                    dataKey="Rate" 
                    stroke="#d97706" 
                    fillOpacity={1} 
                    fill="url(#colorRate)" 
                    strokeWidth={2} 
                    strokeDasharray="4 2" 
                    isAnimationActive={true}
                    animationDuration={500}
                    animationEasing="linear"
                />
                </AreaChart>
            </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default HistoricalChart;