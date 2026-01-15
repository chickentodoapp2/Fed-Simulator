import { EconomicIndicators, FedTools, GameState } from './types';

export const TICK_RATE_MS = 1000; // Update every second
export const TICKS_PER_QUARTER = 3; // 3 seconds = 1 quarter

export const INITIAL_DATE = new Date('2024-01-01');

export const INITIAL_INDICATORS: EconomicIndicators = {
  inflation: 3.4,
  unemployment: 4.1,
  gdpGrowth: 2.1,
  publicApproval: 60,
};

export const INITIAL_TOOLS: FedTools = {
  fedFundsRate: 5.25,
  reserveRequirement: 10.0,
  openMarketOperations: 0,
};

export const TARGETS = {
  inflation: 2.0,
  unemployment: 4.0,
  gdpGrowth: 2.5,
};

export const INITIAL_GAME_STATE: GameState = {
  currentTick: 0,
  currentDate: INITIAL_DATE,
  indicators: INITIAL_INDICATORS,
  tools: INITIAL_TOOLS,
  history: [],
  currentEvent: null,
  eventQueue: [],
  isPlaying: false,
  gameOver: false,
  gameWon: false,
  eventActiveTicks: 0,
};

// Continuous Simulation Constants
export const SIMULATION = {
  // The "Neutral" rate where economy is stable (r*)
  NEUTRAL_RATE: 3.5, 
  NEUTRAL_UNEMPLOYMENT: 4.0,
  NEUTRAL_GDP: 2.0,

  // Sensitivity: How much the indicator changes per tick per unit of difference
  // dx/dt = k * (Current - Neutral)
  SENSITIVITY: {
    // If Rates > Neutral, Inflation drops. 
    // Example: Rate is 5.5, Neutral 3.5. Diff = 2.0.
    // Change = 2.0 * -0.05 = -0.1 per tick.
    INFLATION_RATE: -0.05, 
    INFLATION_OMO: 0.001, // OMO impact per unit (-100 to 100)

    // If Rates > Neutral, UE rises.
    UNEMPLOYMENT_RATE: 0.03,
    UNEMPLOYMENT_OMO: -0.0005,

    // If Rates > Neutral, GDP drops.
    GDP_RATE: -0.04,
    GDP_OMO: 0.002,
  },

  // Mean Reversion / Natural Drift
  // Helps pull things back to chaos or stability? 
  // Let's use it to model structural persistence (momentum).
  MOMENTUM: 0.8, // New value relies 80% on old trend? (Simplified: integrated directly in App.tsx logic)
  
  // Random noise magnitude
  NOISE: 0.02,
};
