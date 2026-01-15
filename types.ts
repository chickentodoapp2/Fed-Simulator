export interface EconomicIndicators {
  inflation: number; // CPI YoY %
  unemployment: number; // %
  gdpGrowth: number; // %
  publicApproval: number; // 0-100
}

export interface FedTools {
  fedFundsRate: number; // %
  reserveRequirement: number; // %
  openMarketOperations: number; // -100 to 100
}

export interface GameEvent {
  id: string;
  headline: string;
  description: string;
  source: string;
  // Modifiers now represent a continuous pressure per tick
  impactModifiers: {
    inflation: number;
    unemployment: number;
    gdpGrowth: number;
  };
  durationTicks: number; // How long this event exerts pressure
  advisorComment?: string;
}

export interface TurnHistoryItem {
  timestamp: number; // Unix timestamp or logical tick
  label: string; // "Q1 2024" etc
  indicators: EconomicIndicators;
  tools: FedTools;
}

export interface GameState {
  currentTick: number;
  currentDate: Date;
  indicators: EconomicIndicators;
  tools: FedTools;
  history: TurnHistoryItem[];
  currentEvent: GameEvent | null;
  eventQueue: GameEvent[]; // Pre-fetched events
  isPlaying: boolean;
  gameOver: boolean;
  gameWon: boolean;
  eventActiveTicks: number; // How long current event has been active
}
