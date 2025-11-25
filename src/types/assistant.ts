/**
 * Defines the steps in the assistant conversation flow for calculating boiled dish carbs.
 * 
 * Flow:
 * 1. idle - Initial state, waiting to start
 * 2. askProduct - Ask user for product name
 * 3. maybeAskRawWeight - Ask for raw weight (may skip if product found in system DB)
 * 4. askEmptyBowlWeight - Ask for empty bowl weight
 * 5. askFullBowlWeight - Ask for full bowl weight
 * 6. askRawCarbsPer100g - Ask for raw carbs per 100g (only if product not in system DB)
 * 7. showResult - Display the calculation results
 */
export type AssistantStep =
  | "idle"
  | "askProduct"
  | "maybeAskRawWeight"
  | "askEmptyBowlWeight"
  | "askFullBowlWeight"
  | "askRawCarbsPer100g"
  | "showResult";

