import React from 'react';
import { EconomicIndicators, TurnHistoryItem } from '../types';
import { ArrowUp, ArrowDown, Minus, TrendingUp, Users, Activity, ThumbsUp } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { TARGETS } from '../constants';

interface MetricsDashboardProps {
  indicators: EconomicIndicators;
  history: TurnHistoryItem[];
}

const MetricCard: React.FC<{
  label: string;
  value: number;
  suffix: string;
  target?: number;
  icon: React.ReactNode;
  history: any[];
  dataKey: string;
  colorClass: string; // e.g., 'text-red-600'
  strokeColor: string; // e.g., '#dc2626'
  reverseColor?: boolean;
}> = ({ label, value, suffix, target, icon, history, dataKey, colorClass, strokeColor, reverseColor }) => {
  
  const prevValue = history.length > 1 ? history[history.length - 2].indicators[dataKey] : value;
  const change = value - prevValue;
  const isHigher = change > 0.01;
  const isLower = change < -0.01;
  
  let trendClass = "text-slate-400";
  if (target !== undefined) {
      const dist = Math.abs(value - target);
      const prevDist = Math.abs(prevValue - target);
      if (dist < prevDist) trendClass = "text-fed-green";
      else if (dist > prevDist) trendClass = "text-fed-red";
  } else {
      if (isHigher) trendClass = reverseColor ? "text-fed-red" : "text-fed-green";
      if (isLower) trendClass = reverseColor ? "text-fed-green" : "text-fed-red";
  }

  return (
    <div className="bg-white border border-slate-200 p-5 shadow-academic flex flex-col justify-between h-40">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider font-sans">{label}</p>
          <div className="flex items-baseline mt-1 gap-2">
            <h3 className="text-3xl font-serif font-bold text-slate-900 tracking-tight">
              {value.toFixed(1)}{suffix}
            </h3>
            {target !== undefined && (
               <span className="text-xs text-slate-400 font-mono bg-slate-50 px-1 py-0.5 rounded border border-slate-100">Target: {target}{suffix}</span>
            )}
          </div>
        </div>
        <div className={`p-2 rounded-full bg-slate-50 border border-slate-100 ${colorClass}`}>
            {icon}
        </div>
      </div>

      <div className="flex items-end justify-between mt-2">
        <div className={`flex items-center text-sm font-semibold font-mono ${trendClass}`}>
            {isHigher && <ArrowUp className="w-4 h-4 mr-1" />}
            {isLower && <ArrowDown className="w-4 h-4 mr-1" />}
            {!isHigher && !isLower && <Minus className="w-4 h-4 mr-1" />}
            {Math.abs(change).toFixed(2)}%
        </div>
        <div className="h-12 w-24 opacity-80">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history}>
                    <Line 
                        type="monotone" 
                        dataKey={`indicators.${dataKey}`} 
                        stroke={strokeColor} 
                        strokeWidth={2} 
                        dot={false}
                        isAnimationActive={true}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const MetricsDashboard: React.FC<MetricsDashboardProps> = ({ indicators, history }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <MetricCard
        label="Inflation (CPI)"
        value={indicators.inflation}
        suffix="%"
        target={TARGETS.inflation}
        icon={<TrendingUp className="w-5 h-5" />}
        history={history}
        dataKey="inflation"
        colorClass="text-red-600"
        strokeColor="#dc2626"
        reverseColor={true}
      />
      <MetricCard
        label="Unemployment"
        value={indicators.unemployment}
        suffix="%"
        target={TARGETS.unemployment}
        icon={<Users className="w-5 h-5" />}
        history={history}
        dataKey="unemployment"
        colorClass="text-blue-600"
        strokeColor="#2563eb"
        reverseColor={true}
      />
      <MetricCard
        label="GDP Growth"
        value={indicators.gdpGrowth}
        suffix="%"
        icon={<Activity className="w-5 h-5" />}
        history={history}
        dataKey="gdpGrowth"
        colorClass="text-green-600"
        strokeColor="#16a34a"
        reverseColor={false}
      />
      <MetricCard
        label="Public Approval"
        value={indicators.publicApproval}
        suffix="%"
        icon={<ThumbsUp className="w-5 h-5" />}
        history={history}
        dataKey="publicApproval"
        colorClass="text-amber-600"
        strokeColor="#d97706"
        reverseColor={false}
      />
    </div>
  );
};

export default MetricsDashboard;