import React from 'react';
import { GameEvent } from '../types';
import { Newspaper, Radio, AlertCircle } from 'lucide-react';

interface EventDisplayProps {
  event: GameEvent | null;
  loading: boolean;
}

const EventDisplay: React.FC<EventDisplayProps> = ({ event, loading }) => {
  if (loading) {
    return (
      <div className="bg-white border border-slate-200 p-8 shadow-academic h-full flex flex-col items-center justify-center animate-pulse">
        <div className="h-4 bg-slate-200 w-3/4 mb-4 rounded"></div>
        <div className="h-3 bg-slate-100 w-1/2 rounded"></div>
        <p className="text-slate-400 mt-4 text-sm font-mono">Retrieving market data...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="bg-white border border-slate-200 p-8 shadow-academic h-full flex flex-col items-center justify-center">
        <div className="text-center opacity-50">
           <Newspaper className="w-16 h-16 text-slate-300 mx-auto mb-4" />
           <h3 className="text-xl font-serif font-bold text-slate-700">No Active Data</h3>
           <p className="text-slate-500 mt-2">System initialized. Waiting for cycle start.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 shadow-academic h-full flex flex-col relative overflow-hidden">
      {/* Decorative top bar */}
      <div className="h-1 bg-slate-900 w-full top-0 absolute"></div>
      
      <div className="p-6 flex flex-col h-full">
        <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-widest border border-slate-300 px-2 py-1">
                {event.source}
                </span>
            </div>
            <div className="flex items-center text-xs font-mono text-red-600 bg-red-50 px-2 py-1 rounded">
                <Radio className="w-3 h-3 mr-2 animate-pulse" />
                LIVE WIRE
            </div>
        </div>

        <h2 className="text-2xl font-serif font-bold text-slate-900 mb-4 leading-tight">
            {event.headline}
        </h2>
        
        <div className="prose prose-slate text-sm text-slate-600 leading-relaxed mb-6 font-serif flex-grow">
            <p>{event.description}</p>
        </div>

        {event.advisorComment && (
            <div className="bg-slate-50 p-4 border-l-4 border-slate-400 mt-auto">
            <div className="flex items-center mb-2">
                <AlertCircle className="w-4 h-4 text-slate-600 mr-2" />
                <span className="text-xs font-bold text-slate-700 uppercase">Advisor Assessment</span>
            </div>
            <p className="text-sm text-slate-600 italic font-serif">"{event.advisorComment}"</p>
            </div>
        )}
        
        <div className="mt-6 pt-4 border-t border-slate-100">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Projected Impact</div>
            <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-slate-50 border border-slate-100 p-2">
                    <div className="text-[10px] text-slate-500 uppercase">Inflation</div>
                    <div className={`font-mono text-sm font-bold ${event.impactModifiers.inflation > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {event.impactModifiers.inflation > 0 ? '+' : ''}{event.impactModifiers.inflation}%
                    </div>
                </div>
                <div className="bg-slate-50 border border-slate-100 p-2">
                    <div className="text-[10px] text-slate-500 uppercase">Unemployment</div>
                    <div className={`font-mono text-sm font-bold ${event.impactModifiers.unemployment > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {event.impactModifiers.unemployment > 0 ? '+' : ''}{event.impactModifiers.unemployment}%
                    </div>
                </div>
                <div className="bg-slate-50 border border-slate-100 p-2">
                    <div className="text-[10px] text-slate-500 uppercase">GDP</div>
                    <div className={`font-mono text-sm font-bold ${event.impactModifiers.gdpGrowth < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {event.impactModifiers.gdpGrowth > 0 ? '+' : ''}{event.impactModifiers.gdpGrowth}%
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default EventDisplay;