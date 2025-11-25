import type { BoiledDishInput, BoiledDishResult } from '../types/boiledDish';

/**
 * Calculates carbohydrate content for boiled/cooked dishes.
 * 
 * The calculation logic:
 * 1. Calculate total carbs from raw weight and raw carbs per 100g
 * 2. Calculate cooked weight by subtracting empty bowl weight from full bowl weight
 * 3. Calculate carbs per 100g for the cooked product
 * 
 * @param input - The input data for calculation
 * @returns The calculation results
 * @throws Error if cooked weight is <= 0
 */
export function calculateBoiledDish(input: BoiledDishInput): BoiledDishResult {
  const { rawWeight, rawCarbsPer100g, emptyBowlWeight, fullBowlWeight } = input;

  const totalCarbs = (rawWeight / 100) * rawCarbsPer100g;
  const cookedWeight = fullBowlWeight - emptyBowlWeight;

  if (cookedWeight <= 0) throw new Error("Cooked weight must be > 0");

  const carbsPer100gCooked = (totalCarbs / cookedWeight) * 100;

  return { totalCarbs, cookedWeight, carbsPer100gCooked };
}

