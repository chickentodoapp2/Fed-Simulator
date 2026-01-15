import React from 'react';
import { TurnHistoryItem } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface HistoricalChartProps {
  history: TurnHistoryItem[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 p-3 shadow-lg text-xs font-sans">
        <p className="text-slate-900 font-bold mb-2 border-b border-slate-100 pb-1">{label}</p>
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

const HistoricalChart: React.FC<HistoricalChartProps> = ({ history }) => {
  // Keep only the last N points to maintain performance and scrolling effect
  const WINDOW_SIZE = 40;
  const visibleHistory = history.slice(-WINDOW_SIZE);

  const data = visibleHistory.map(h => ({
    name: h.label,
    timestamp: h.timestamp,
    Inflation: h.indicators.inflation,
    Unemployment: h.indicators.unemployment,
    Rate: h.tools.fedFundsRate
  }));

  return (
    <div className="bg-white border border-slate-200 p-4 shadow-academic h-[400px]">
      <h3 className="text-slate-900 font-serif font-bold mb-4 ml-2 border-b border-slate-100 pb-2 flex justify-between">
        <span>Figure 1: Real-time Economic Trajectory</span>
        <span className="text-xs font-sans font-normal text-slate-500 self-end">T = {history.length} ticks</span>
      </h3>
      <ResponsiveContainer width="100%" height="85%">
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
            dataKey="name" 
            stroke="#64748b" 
            tick={{fontSize: 10, fontFamily: 'Inter'}} 
            tickLine={false}
            axisLine={{stroke: '#cbd5e1'}}
            interval="preserveStartEnd"
          />
          <YAxis 
            stroke="#64748b" 
            tick={{fontSize: 11, fontFamily: 'Inter'}} 
            tickLine={false}
            axisLine={false}
            domain={['auto', 'auto']}
          />
          <Tooltip content={<CustomTooltip />} isAnimationActive={false} />
          <Legend wrapperStyle={{ paddingTop: '20px', fontFamily: 'Inter', fontSize: '12px' }} iconType="rect" />
          
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
  );
};

export default HistoricalChart;
