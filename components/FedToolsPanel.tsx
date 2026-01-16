import React from 'react';
import { FedTools } from '../types';
import { Briefcase, Sliders } from 'lucide-react';

interface FedToolsPanelProps {
  tools: FedTools;
  onChange: (newTools: FedTools) => void;
  disabled: boolean;
}

const FedToolsPanel: React.FC<FedToolsPanelProps> = ({ tools, onChange, disabled }) => {
  
  const handleRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...tools, fedFundsRate: parseFloat(e.target.value) });
  };

  const handleReserveChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...tools, reserveRequirement: parseFloat(e.target.value) });
  };

  const handleOMOChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...tools, openMarketOperations: parseFloat(e.target.value) });
  };

  const getOMOLabel = (val: number) => {
    if (Math.abs(val) < 5) return "Neutral";
    if (val > 0) return `Buying (+${val})`;
    return `Selling (${val})`;
  };

  return (
    <div className="bg-white border border-slate-200 p-6 shadow-academic h-full flex flex-col">
      <h2 className="text-lg font-bold font-serif text-slate-900 mb-6 flex items-center border-b border-slate-100 pb-4">
        <Sliders className="w-5 h-5 mr-2 text-slate-700" />
        Policy Controls
      </h2>
      
      <p className="text-sm text-slate-500 font-serif italic mb-6">
        Adjust levers to influence the real-time trajectory. Changes apply immediately.
      </p>

      <div className="space-y-8 flex-grow">
        {/* Tool 1 */}
        <div className="group">
          <div className="flex justify-between mb-2">
            <label className="text-sm font-semibold text-slate-700">Federal Funds Rate</label>
            <span className="text-xl font-mono font-bold text-amber-600">{tools.fedFundsRate.toFixed(2)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="12"
            step="0.25"
            value={tools.fedFundsRate}
            onChange={handleRateChange}
            disabled={disabled}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-600 disabled:opacity-50 hover:bg-slate-300 transition-colors"
          />
          <div className="flex justify-between mt-1 text-[10px] text-slate-400 font-mono">
            <span>0%</span>
            <span>12%</span>
          </div>
          <p className="text-xs text-slate-500 mt-2 font-sans leading-tight">
            Raise to curb inflation. Lower to stimulate growth.
          </p>
        </div>

        <div className="h-px bg-slate-100" />

        {/* Tool 2 */}
        <div className="group">
          <div className="flex justify-between mb-2">
            <label className="text-sm font-semibold text-slate-700">Reserve Ratio</label>
            <span className="text-xl font-mono font-bold text-fed-green">{tools.reserveRequirement.toFixed(1)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="20"
            step="0.5"
            value={tools.reserveRequirement}
            onChange={handleReserveChange}
            disabled={disabled}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-green-600 disabled:opacity-50 hover:bg-slate-300 transition-colors"
          />
          <p className="text-xs text-slate-500 mt-2 font-sans leading-tight">
            Capital banks must hold. Higher ratio tightens money supply.
          </p>
        </div>

        <div className="h-px bg-slate-100" />

        {/* Tool 3 - Now a slider for smoothness */}
        <div className="group">
          <div className="flex justify-between mb-2">
            <label className="text-sm font-semibold text-slate-700">Open Market Ops</label>
            <span className={`text-xs font-bold px-2 py-1 rounded border ${tools.openMarketOperations > 5 ? 'bg-green-50 text-green-700 border-green-200' : tools.openMarketOperations < -5 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
              {getOMOLabel(tools.openMarketOperations)}
            </span>
          </div>
          
          <input
            type="range"
            min="-100"
            max="100"
            step="5"
            value={tools.openMarketOperations}
            onChange={handleOMOChange}
            disabled={disabled}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-600 disabled:opacity-50 hover:bg-slate-300 transition-colors"
          />
          <div className="flex justify-between mt-1 text-[10px] text-slate-400 font-mono">
            <span>Sell (Tighten)</span>
            <span>Buy (Ease)</span>
          </div>
          <p className="text-xs text-slate-500 mt-2 font-sans leading-tight">
            Asset purchasing program intensity.
          </p>
        </div>

      </div>
    </div>
  );
};

export default FedToolsPanel;