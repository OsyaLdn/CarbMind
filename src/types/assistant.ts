/**
 * Defines the steps in the assistant conversation flow for calculating boiled dish carbs.
 * 
 * Flow (Wizard Steps):
 * 1. idle - Initial state, waiting to start
 * 2. askEmptyBowlWeight - Ask for empty bowl weight (FIRST - weigh empty bowl)
 * 3. askProduct - Ask user for product name
 * 4. askRawCarbsPer100g - Ask for raw carbs per 100g (always shown with predefined value if available)
 * 5. askRawWeight - Ask for raw weight
 * 6. askFullBowlWeight - Ask for full bowl weight
 * 7. askMealName - Ask for optional meal name
 * 8. showResult - Display the calculation results
 */
export type AssistantStep =
  | "idle"
  | "askEmptyBowlWeight"
  | "askProduct"
  | "askRawCarbsPer100g"
  | "askRawWeight"
  | "askFullBowlWeight"
  | "askMealName"
  | "showResult";

