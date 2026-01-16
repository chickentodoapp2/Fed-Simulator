import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, FedTools, EconomicIndicators, GameEvent, ModalState, TurnHistoryItem } from './types';
import { INITIAL_GAME_STATE, SIMULATION, TARGETS, TICK_RATE_MS, TICKS_PER_QUARTER, INITIAL_DATE, INITIAL_INDICATORS, INITIAL_TOOLS } from './constants';
import MetricsDashboard from './components/MetricsDashboard';
import FedToolsPanel from './components/FedToolsPanel';
import EventDisplay from './components/EventDisplay';
import HistoricalChart from './components/HistoricalChart';
import { generateEconomicEvent } from './services/geminiService';
import { Play, Pause, RotateCcw, AlertTriangle, Award, UserCheck, UserX, CheckCircle } from 'lucide-react';

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
    // Only set initial history if it's empty (first load)
    if (gameState.history.length === 0) {
        const initialHistoryItem: TurnHistoryItem = {
            timestamp: INITIAL_DATE.getTime(),
            label: "Start",
            indicators: INITIAL_INDICATORS,
            tools: INITIAL_TOOLS
        };
        setGameState(prev => ({ ...prev, history: [initialHistoryItem] }));
    }
  }, []); // Only run on mount

  // --- The Game Loop ---
  useEffect(() => {
    const tick = async () => {
      const current = stateRef.current;
      if (!current.isPlaying || current.modalState !== 'none') return;

      // 1. Calculate Time
      const newTick = current.currentTick + 1;
      const newDate = new Date(current.currentDate.getTime());
      // Advance date by ~1 month per tick
      newDate.setMonth(newDate.getMonth() + 1);
      
      const isQuarterStart = newTick % TICKS_PER_QUARTER === 0;
      const quarter = Math.floor(newDate.getMonth() / 3) + 1;
      const year = newDate.getFullYear();
      
      // Label for Tooltip
      const label = `${newDate.toLocaleString('default', { month: 'short' })} '${year.toString().slice(2)}`;

      // 2. Term Logic
      // 4 years = 48 months (ticks). 8 years = 96 months.
      const monthsElapsed = (year - INITIAL_DATE.getFullYear()) * 12 + newDate.getMonth();
      const isTerm1End = monthsElapsed === 48; // 4 years exactly
      const isTerm2End = monthsElapsed === 96; // 8 years exactly

      if (isTerm1End && current.termNumber === 1) {
          // Trigger Re-election Logic
          const isApprovalGood = current.indicators.publicApproval > 45;
          const isEconomyOkay = current.indicators.inflation < 6 && current.indicators.unemployment < 8;
          
          let newModalState: ModalState = 'reelection_fail';
          if (isApprovalGood && isEconomyOkay) {
              newModalState = 'reelection_success';
          }
          
          setGameState(prev => ({
              ...prev,
              isPlaying: false,
              modalState: newModalState,
              currentDate: newDate, 
          }));
          return; // Stop tick
      }

      if (isTerm2End) {
          setGameState(prev => ({
              ...prev,
              isPlaying: false,
              modalState: 'retirement',
              gameWon: true,
              currentDate: newDate,
          }));
          return; // Stop tick
      }

      // 3. Event Lifecycle Management
      let event = current.currentEvent;
      let eventQueue = [...current.eventQueue];
      let eventActiveTicks = current.eventActiveTicks;

      if (!event && eventQueue.length > 0) {
        event = eventQueue.shift() || null;
        eventActiveTicks = 0;
      }

      if (event) {
        eventActiveTicks++;
        const duration = event.durationTicks || 8; 
        if (eventActiveTicks > duration) {
          event = null;
          eventActiveTicks = 0;
        }
      }

      // 4. Fetch new events
      if (eventQueue.length === 0 && !requestingEventRef.current && Math.random() > 0.7) {
        requestingEventRef.current = true;
        generateEconomicEvent(current.indicators, year, quarter)
          .then(newEvent => {
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

      // 5. PHYSICS ENGINE
      const tools = current.tools;
      const stats = current.indicators;

      const ratePressure = tools.fedFundsRate - SIMULATION.NEUTRAL_RATE;
      const omoPressure = tools.openMarketOperations;

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

      if (event) {
        dInflation += (event.impactModifiers.inflation / 10); 
        dUnemployment += (event.impactModifiers.unemployment / 10);
        dGDP += (event.impactModifiers.gdpGrowth / 10);
      }

      let newInflation = stats.inflation + dInflation;
      let newUnemployment = stats.unemployment + dUnemployment;
      let newGDP = stats.gdpGrowth + dGDP;

      if (newInflation < 0.5) newInflation += 0.1;
      if (newUnemployment < 2.0) newUnemployment += 0.1;

      const infDist = Math.abs(newInflation - TARGETS.inflation);
      const ueDist = Math.abs(newUnemployment - TARGETS.unemployment);
      const targetApproval = 100 - (infDist * 10) - (ueDist * 10) + (newGDP * 2);
      const newApproval = stats.publicApproval + ((targetApproval - stats.publicApproval) * 0.1);

      const newIndicators: EconomicIndicators = {
        inflation: newInflation,
        unemployment: newUnemployment,
        gdpGrowth: newGDP,
        publicApproval: Math.max(0, Math.min(100, newApproval))
      };

      // 6. Check Crash
      let modalState: ModalState = current.modalState;
      if (newInflation > 20 || newUnemployment > 20 || newInflation < -5) {
        modalState = 'crash';
      }

      // 7. Update State
      setGameState(prev => ({
        ...prev,
        currentTick: newTick,
        currentDate: newDate,
        indicators: newIndicators,
        currentEvent: event,
        eventQueue: eventQueue,
        eventActiveTicks: eventActiveTicks,
        modalState: modalState,
        // Auto-pause if we hit a quarter start (and it's not the initial 0 state)
        isPlaying: isQuarterStart ? false : prev.isPlaying,
        history: [
          ...prev.history,
          {
            timestamp: newDate.getTime(), // Use simulated time for chart X-axis
            label: label, 
            indicators: newIndicators,
            tools: tools
          }
        ]
      }));
    };

    const intervalId = setInterval(tick, TICK_RATE_MS);
    return () => clearInterval(intervalId);
  }, []);

  const handleToolsChange = (newTools: FedTools) => {
    setGameState(prev => ({ ...prev, tools: newTools }));
  };

  const togglePlay = () => {
    setGameState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
  };

  const startSecondTerm = () => {
      setGameState(prev => ({
          ...prev,
          termNumber: 2,
          modalState: 'none',
          isPlaying: true
      }));
  };

  const resetGame = () => {
    // Manually reset state to avoid reload issues
    const initialHistoryItem: TurnHistoryItem = {
        timestamp: INITIAL_DATE.getTime(),
        label: "Start",
        indicators: INITIAL_INDICATORS,
        tools: INITIAL_TOOLS
    };

    setGameState({
        ...INITIAL_GAME_STATE,
        history: [initialHistoryItem],
        currentDate: new Date(INITIAL_DATE), // Ensure fresh Date object
        indicators: { ...INITIAL_INDICATORS }, // Copy objects to avoid ref issues
        tools: { ...INITIAL_TOOLS },
    });
  };

  // --- Modals ---
  const renderModal = () => {
      if (gameState.modalState === 'none') return null;

      const baseClasses = "fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4";
      const cardClasses = "bg-white border-2 p-10 max-w-lg w-full text-center shadow-2xl animate-in fade-in zoom-in duration-300";

      if (gameState.modalState === 'crash') {
          return (
            <div className={baseClasses}>
                <div className={`${cardClasses} border-red-800`}>
                    <AlertTriangle className="w-16 h-16 text-red-800 mx-auto mb-6" />
                    <h2 className="text-3xl font-serif font-bold text-slate-900 mb-4">Economic Collapse</h2>
                    <p className="text-slate-600 mb-8 font-serif leading-relaxed">
                        The economy has spiraled out of control. 
                        {gameState.indicators.inflation > 20 ? " Hyperinflation has destroyed the currency." : " The economy has entered a deep depression."}
                    </p>
                    <button onClick={resetGame} className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold transition-colors flex items-center justify-center gap-2 uppercase tracking-widest text-sm">
                        <RotateCcw className="w-4 h-4" /> Try Again
                    </button>
                </div>
            </div>
          );
      }

      if (gameState.modalState === 'reelection_success') {
          return (
            <div className={baseClasses}>
                <div className={`${cardClasses} border-fed-blue`}>
                    <UserCheck className="w-16 h-16 text-fed-blue mx-auto mb-6" />
                    <h2 className="text-3xl font-serif font-bold text-slate-900 mb-4">Re-nominated</h2>
                    <p className="text-slate-600 mb-8 font-serif leading-relaxed">
                        The President has nominated you for a second term, and the Senate has confirmed. 
                        Your stewardship of the economy has been deemed satisfactory.
                    </p>
                    <div className="grid grid-cols-2 gap-4 mb-8 text-left bg-slate-50 p-6 border border-slate-200">
                        <div><span className="text-xs uppercase text-slate-400 font-bold">Approval</span><br/><span className="text-fed-blue font-mono text-xl">{gameState.indicators.publicApproval.toFixed(0)}%</span></div>
                        <div><span className="text-xs uppercase text-slate-400 font-bold">Inflation</span><br/><span className="text-fed-blue font-mono text-xl">{gameState.indicators.inflation.toFixed(1)}%</span></div>
                    </div>
                    <button onClick={startSecondTerm} className="w-full py-3 bg-fed-blue hover:bg-blue-700 text-white font-bold transition-colors flex items-center justify-center gap-2 uppercase tracking-widest text-sm">
                        <CheckCircle className="w-4 h-4" /> Accept 2nd Term
                    </button>
                </div>
            </div>
          );
      }

      if (gameState.modalState === 'reelection_fail') {
          return (
            <div className={baseClasses}>
                <div className={`${cardClasses} border-slate-400`}>
                    <UserX className="w-16 h-16 text-slate-400 mx-auto mb-6" />
                    <h2 className="text-3xl font-serif font-bold text-slate-900 mb-4">Term Ended</h2>
                    <p className="text-slate-600 mb-8 font-serif leading-relaxed">
                        The President has decided to nominate a new Chair. Your performance metrics did not meet the administration's standards for re-appointment.
                    </p>
                    <div className="grid grid-cols-2 gap-4 mb-8 text-left bg-slate-50 p-6 border border-slate-200">
                        <div><span className="text-xs uppercase text-slate-400 font-bold">Approval</span><br/><span className="text-red-600 font-mono text-xl">{gameState.indicators.publicApproval.toFixed(0)}%</span></div>
                        <div><span className="text-xs uppercase text-slate-400 font-bold">Inflation</span><br/><span className="text-slate-600 font-mono text-xl">{gameState.indicators.inflation.toFixed(1)}%</span></div>
                    </div>
                    <button onClick={resetGame} className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold transition-colors flex items-center justify-center gap-2 uppercase tracking-widest text-sm">
                        <RotateCcw className="w-4 h-4" /> Start New Career
                    </button>
                </div>
            </div>
          );
      }

      if (gameState.modalState === 'retirement') {
          return (
            <div className={baseClasses}>
                <div className={`${cardClasses} border-fed-green`}>
                    <Award className="w-16 h-16 text-fed-green mx-auto mb-6" />
                    <h2 className="text-3xl font-serif font-bold text-slate-900 mb-4">Retired with Honors</h2>
                    <p className="text-slate-600 mb-8 font-serif leading-relaxed">
                        Congratulations, Chair. You have successfully navigated two full terms (8 years) at the helm of the global economy. 
                        Time to write your memoirs and give paid speeches.
                    </p>
                    <button onClick={resetGame} className="w-full py-3 bg-fed-green hover:bg-green-700 text-white font-bold transition-colors flex items-center justify-center gap-2 uppercase tracking-widest text-sm">
                        <RotateCcw className="w-4 h-4" /> Play Again
                    </button>
                </div>
            </div>
          );
      }
      return null;
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
                disabled={gameState.modalState !== 'none'}
                className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold uppercase tracking-wider text-sm transition-all shadow-lg ${gameState.isPlaying ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-fed-blue text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'}`}
            >
                {gameState.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {gameState.isPlaying ? "Pause Simulation" : "Start Simulation"}
            </button>

            <div className="bg-white px-6 py-3 shadow-sm border border-slate-200 text-right">
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Term {gameState.termNumber}</div>
                <div className="text-lg font-serif text-slate-900">
                    {gameState.currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </div>
            </div>
        </div>
      </header>

      {/* Modal Overlay */}
      {renderModal()}

      {/* Main Grid */}
      <div className="max-w-[1400px] mx-auto space-y-6">
        
        <MetricsDashboard indicators={gameState.indicators} history={gameState.history} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-auto lg:h-[550px]">
           {/* Event Feed */}
           <div className="lg:col-span-3 h-[400px] lg:h-full">
              <EventDisplay event={gameState.currentEvent} loading={false} />
           </div>

           {/* Chart Area */}
           <div className="lg:col-span-6 h-[400px] lg:h-full relative">
               {/* Pause Indicator */}
               {!gameState.isPlaying && gameState.modalState === 'none' && (
                   <div className="absolute top-4 right-4 z-20 pointer-events-none">
                       <div className="bg-white/95 px-4 py-2 shadow-academic border border-slate-200 rounded-full flex items-center gap-2">
                           <Pause className="w-4 h-4 text-slate-500" />
                           <span className="font-sans text-xs font-bold text-slate-600 uppercase tracking-wider">Simulation Paused</span>
                       </div>
                   </div>
               )}
               <HistoricalChart history={gameState.history} />
           </div>

           {/* Controls */}
           <div className="lg:col-span-3 h-auto lg:h-full">
              <FedToolsPanel 
                tools={gameState.tools} 
                onChange={handleToolsChange} 
                disabled={gameState.modalState !== 'none'} 
              />
           </div>
        </div>
      </div>
    </div>
  );
};

export default App;