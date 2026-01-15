import { GoogleGenAI, Type, Schema } from "@google/genai";
import { EconomicIndicators, GameEvent } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// Schema for the economic event generation
const eventSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    headline: {
      type: Type.STRING,
      description: "A short, punchy news headline about the economy.",
    },
    description: {
      type: Type.STRING,
      description: "A 2-sentence elaboration on the event and its potential causes.",
    },
    source: {
      type: Type.STRING,
      description: "The fictional news source (e.g., 'The Financial Ledger', 'Global Markets Daily').",
    },
    impactModifiers: {
      type: Type.OBJECT,
      description: "The immediate shock effect this event has on the economy BEFORE fed intervention.",
      properties: {
        inflation: { type: Type.NUMBER, description: "Change in inflation (e.g., 0.5 for +0.5%)." },
        unemployment: { type: Type.NUMBER, description: "Change in unemployment (e.g., -0.2)." },
        gdpGrowth: { type: Type.NUMBER, description: "Change in GDP growth (e.g., -1.0)." },
      },
      required: ["inflation", "unemployment", "gdpGrowth"],
    },
    advisorComment: {
      type: Type.STRING,
      description: "A brief comment from your economic advisor about the current situation.",
    },
  },
  required: ["headline", "description", "source", "impactModifiers", "advisorComment"],
};

export const generateEconomicEvent = async (
  currentIndicators: EconomicIndicators,
  year: number,
  quarter: number
): Promise<GameEvent> => {
  const model = "gemini-3-flash-preview";

  const prompt = `
    You are the Game Master for a Federal Reserve simulator.
    Current Year: ${year}, Q${quarter}.
    Current Stats:
    - Inflation: ${currentIndicators.inflation.toFixed(1)}% (Target: 2.0%)
    - Unemployment: ${currentIndicators.unemployment.toFixed(1)}% (Target: 4.0%)
    - GDP Growth: ${currentIndicators.gdpGrowth.toFixed(1)}%
    
    Generate a random economic news event that might affect these numbers.
    Consider the current context. If inflation is high, maybe a supply shock or wage spiral.
    If unemployment is high, maybe a recession indicator or corporate bankruptcy.
    Or it could be a completely external shock (geopolitics, tech breakthrough, natural disaster).
    
    Provide numerical modifiers representing the "Shock" value that will be added to the indicators.
    Keep modifiers realistic (e.g., +/- 0.1 to 2.0 range usually).
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: eventSchema,
        temperature: 1.1, // High temperature for variety
      },
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      return {
        id: `${year}-Q${quarter}-${Date.now()}`,
        durationTicks: 8, // Default duration, will be randomized in App.tsx
        ...data,
      };
    }
    throw new Error("No text response from Gemini");
  } catch (error) {
    console.error("Gemini API Error:", error);
    // Fallback event if API fails
    return {
      id: "fallback",
      headline: "Market Stability Continues",
      description: "Markets remain relatively calm as traders await the Fed's next move. No major shocks reported.",
      source: "System Backup",
      impactModifiers: { inflation: 0.1, unemployment: 0, gdpGrowth: 0.1 },
      advisorComment: "Steady as she goes, Chair.",
      durationTicks: 8,
    };
  }
};