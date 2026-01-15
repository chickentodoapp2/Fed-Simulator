import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, FedTools, EconomicIndicators, GameEvent } from './types';
import { INITIAL_GAME_STATE, SIMULATION, TARGETS, TICK_RATE_MS, TICKS_PER_QUARTER } from './constants';
import MetricsDashboard from './components/MetricsDashboard';
import FedToolsPanel from './components/FedToolsPanel';
import EventDisplay from './components/EventDisplay';
import HistoricalChart from './components/HistoricalChart';
import { generateEconomicEvent } from './services/geminiService';
import { Play, Pause, RotateCcw, AlertTriangle } from 'lucide-react';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(INITIAL_GAME_STATE);
  
  // Refs for loop state to avoid closure staleness issues in setInterval
  const stateRef = useRef<GameState>(INITIAL_GAME_STATE);
  const requestingEventRef = useRef<boolean>(false);

  // Sync ref with state
  useEffect(() => {
    stateRef.current = gameState;
  }, [gameState]);

  // Initial Data Point
  useEffect(() => {
    const initialHistoryItem = {
      timestamp: Date.now(),
      label: "Start",
      indicators: INITIAL_GAME_STATE.indicators,
      tools: INITIAL_GAME_STATE.tools
    };
    setGameState(prev => ({ ...prev, history: [initialHistoryItem] }));
  }, []);

  // --- The Game Loop ---
  useEffect(() => {
    const tick = async () => {
      const current = stateRef.current;
      if (!current.isPlaying || current.gameOver) return;

      // 1. Calculate Time
      const newTick = current.currentTick + 1;
      const newDate = new Date(current.currentDate.getTime());
      // Advance date by ~1 month per tick
      newDate.setMonth(newDate.getMonth() + 1);
      
      const isQuarterStart = newTick % TICKS_PER_QUARTER === 0;
      const quarter = Math.floor(newDate.getMonth() / 3) + 1;
      const year = newDate.getFullYear();
      const label = `Q${quarter} '${year.toString().slice(2)}`;

      // 2. Event Lifecycle Management
      let event = current.currentEvent;
      let eventQueue = [...current.eventQueue];
      let eventActiveTicks = current.eventActiveTicks;

      // If no event, try to pop from queue
      if (!event && eventQueue.length > 0) {
        event = eventQueue.shift() || null;
        eventActiveTicks = 0;
      }

      // If event active, check expiry (random duration or fixed)
      if (event) {
        eventActiveTicks++;
        // Events last for 6-12 ticks (6-12 months)
        const duration = event.durationTicks || 8; 
        if (eventActiveTicks > duration) {
          event = null;
          eventActiveTicks = 0;
        }
      }

      // 3. Fetch new events if queue is empty and we aren't already
      if (eventQueue.length === 0 && !requestingEventRef.current && Math.random() > 0.7) {
        requestingEventRef.current = true;
        generateEconomicEvent(current.indicators, year, quarter)
          .then(newEvent => {
             // Add random duration between 6 and 12 ticks
             newEvent.durationTicks = 6 + Math.floor(Math.random() * 6);
             setGameState(prev => ({
               ...prev,
               eventQueue: [...prev.eventQueue, newEvent]
             }));
             requestingEventRef.current = false;
          })
          .catch(err => {
             console.error(err);
             requestingEventRef.current = false;
          });
      }

      // 4. PHYSICS ENGINE: Calculate Dynamics
      // d(Indicator) / dt = Sensitivity * (Tool - Neutral) + EventPressure + Noise
      const tools = current.tools;
      const stats = current.indicators;

      // Rate Delta (Basis Points difference normalized)
      // Rate 5.0 vs Neutral 3.5 = +1.5 pressure
      const ratePressure = tools.fedFundsRate - SIMULATION.NEUTRAL_RATE;
      
      // OMO Pressure (-100 to 100)
      const omoPressure = tools.openMarketOperations;

      // Calculate Derivatives
      let dInflation = 
        (ratePressure * SIMULATION.SENSITIVITY.INFLATION_RATE) + 
        (omoPressure * SIMULATION.SENSITIVITY.INFLATION_OMO) +
        ((Math.random() - 0.5) * SIMULATION.NOISE);

      let dUnemployment = 
        (ratePressure * SIMULATION.SENSITIVITY.UNEMPLOYMENT_RATE) + 
        (omoPressure * SIMULATION.SENSITIVITY.UNEMPLOYMENT_OMO) +
        ((Math.random() - 0.5) * SIMULATION.NOISE);

      let dGDP = 
        (ratePressure * SIMULATION.SENSITIVITY.GDP_RATE) + 
        (omoPressure * SIMULATION.SENSITIVITY.GDP_OMO) +
        ((Math.random() - 0.5) * SIMULATION.NOISE);

      // Apply Event Modifiers (Continuous pressure while event is active)
      if (event) {
        // We divide by duration to spread the "Shock" over the duration
        // Or we treat the modifier as a Rate of Change modifier.
        // Let's treat modifier as "Monthly Impact"
        dInflation += (event.impactModifiers.inflation / 10); 
        dUnemployment += (event.impactModifiers.unemployment / 10);
        dGDP += (event.impactModifiers.gdpGrowth / 10);
      }

      // Integrate
      let newInflation = stats.inflation + dInflation;
      let newUnemployment = stats.unemployment + dUnemployment;
      let newGDP = stats.gdpGrowth + dGDP;

      // Soft Bounds (Elasticity)
      // Economy resists going below 0 inflation or 0 unemployment
      if (newInflation < 0.5) newInflation += 0.1;
      if (newUnemployment < 2.0) newUnemployment += 0.1;

      // Approval Calculation
      const infDist = Math.abs(newInflation - TARGETS.inflation);
      const ueDist = Math.abs(newUnemployment - TARGETS.unemployment);
      // Approval moves towards the target approval based on performance
      const targetApproval = 100 - (infDist * 10) - (ueDist * 10) + (newGDP * 2);
      // Smooth transition of approval
      const newApproval = stats.publicApproval + ((targetApproval - stats.publicApproval) * 0.1);

      const newIndicators: EconomicIndicators = {
        inflation: newInflation,
        unemployment: newUnemployment,
        gdpGrowth: newGDP,
        publicApproval: Math.max(0, Math.min(100, newApproval))
      };

      // 5. Check Game Over
      let gameOver = false;
      let gameWon = false;
      if (newInflation > 20 || newUnemployment > 20 || newInflation < -5) {
        gameOver = true;
      }

      // 6. Update State
      setGameState(prev => ({
        ...prev,
        currentTick: newTick,
        currentDate: newDate,
        indicators: newIndicators,
        currentEvent: event,
        eventQueue: eventQueue,
        eventActiveTicks: eventActiveTicks,
        gameOver: gameOver,
        gameWon: gameWon,
        history: [
          ...prev.history,
          {
            timestamp: Date.now(),
            label: isQuarterStart ? label : "", // Only label quarters to avoid clutter
            indicators: newIndicators,
            tools: tools
          }
        ]
      }));
    };

    const intervalId = setInterval(tick, TICK_RATE_MS);
    return () => clearInterval(intervalId);
  }, []);

  // Tools Handlers
  const handleToolsChange = (newTools: FedTools) => {
    // Immediate update to state so the simulation picks it up next tick
    setGameState(prev => ({ ...prev, tools: newTools }));
  };

  const togglePlay = () => {
    setGameState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
  };

  const resetGame = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-6 md:p-12">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-center mb-8 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-3xl font-serif font-black text-slate-900 tracking-tight flex items-center">
            <div className="w-10 h-10 border-2 border-slate-900 flex items-center justify-center mr-4 text-slate-900 text-xl font-serif">
                $
            </div>
            FED<span className="font-light mx-2">|</span>SIMULATOR
          </h1>
          <p className="text-slate-500 mt-2 font-serif text-sm italic">Live Stochastic Monetary Policy Engine</p>
        </div>
        
        <div className="flex items-center gap-6 mt-4 md:mt-0">
            {/* Play/Pause Control */}
            <button 
                onClick={togglePlay}
                className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold uppercase tracking-wider text-sm transition-all shadow-lg ${gameState.isPlaying ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-fed-blue text-white hover:bg-blue-700'}`}
            >
                {gameState.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {gameState.isPlaying ? "Pause Simulation" : "Start Simulation"}
            </button>

            <div className="bg-white px-6 py-3 shadow-sm border border-slate-200 text-right">
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Date</div>
                <div className="text-lg font-serif text-slate-900">
                    {gameState.currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </div>
            </div>
        </div>
      </header>

      {/* Game Over Modal */}
      {gameState.gameOver && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white border-2 border-red-800 p-10 max-w-lg w-full text-center shadow-2xl animate-in fade-in zoom-in duration-300">
                <AlertTriangle className="w-16 h-16 text-red-800 mx-auto mb-6" />
                <h2 className="text-3xl font-serif font-bold text-slate-900 mb-4">Economic Collapse</h2>
                <p className="text-slate-600 mb-8 font-serif leading-relaxed">
                    The economy has spiraled out of control. 
                    {gameState.indicators.inflation > 20 ? " Hyperinflation has destroyed the currency." : " The economy has entered a deep depression."}
                </p>
                <button 
                    onClick={resetGame}
                    className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold transition-colors flex items-center justify-center gap-2 uppercase tracking-widest text-sm"
                >
                    <RotateCcw className="w-4 h-4" /> Initialize New Term
                </button>
            </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="max-w-[1400px] mx-auto space-y-6">
        
        <MetricsDashboard indicators={gameState.indicators} history={gameState.history} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-auto lg:h-[550px]">
           {/* Event Feed */}
           <div className="lg:col-span-3 h-full">
              <EventDisplay event={gameState.currentEvent} loading={false} />
           </div>

           {/* Chart Area */}
           <div className="lg:col-span-6 h-full relative">
               {/* Overlay status if paused */}
               {!gameState.isPlaying && !gameState.gameOver && (
                   <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 backdrop-blur-[1px] rounded-lg">
                       <div className="bg-white p-4 shadow-xl border border-slate-200 rounded-lg flex items-center gap-3">
                           <Pause className="w-5 h-5 text-slate-400" />
                           <span className="font-serif italic text-slate-600">Simulation Paused</span>
                       </div>
                   </div>
               )}
               <HistoricalChart history={gameState.history} />
           </div>

           {/* Controls */}
           <div className="lg:col-span-3 h-full">
              <FedToolsPanel 
                tools={gameState.tools} 
                onChange={handleToolsChange} 
                disabled={gameState.gameOver} // Always enabled unless game over, allows adjusting while paused
              />
           </div>
        </div>
      </div>
    </div>
  );
};

export default App;
