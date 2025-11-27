import type { DishIngredient, DishResult } from '../types/dish';

/**
 * Calculate total carbs for a single ingredient
 * @param rawWeight - Weight of raw ingredient in grams
 * @param carbsPer100g - Carbs per 100g of raw ingredient
 * @returns Total carbs in the ingredient
 */
export function calcIngredientCarbs(rawWeight: number, carbsPer100g: number): number {
  return (rawWeight / 100) * carbsPer100g;
}

/**
 * Calculate dish totals from ingredients and bowl weights
 * @param ingredients - Array of dish ingredients
 * @param emptyBowlWeight - Weight of empty bowl in grams
 * @param fullBowlWeight - Weight of bowl with cooked dish in grams
 * @returns Dish calculation results
 * @throws Error if cooked weight is <= 0
 */
export function calcDishTotals(
  ingredients: DishIngredient[],
  emptyBowlWeight: number,
  fullBowlWeight: number
): DishResult {
  // Calculate total carbs from all ingredients
  const totalCarbs = ingredients.reduce((sum, ingredient) => {
    return sum + ingredient.totalCarbs;
  }, 0);

  // Calculate cooked weight
  const cookedWeight = fullBowlWeight - emptyBowlWeight;

  if (cookedWeight <= 0) {
    throw new Error('Cooked weight must be > 0');
  }

  // Calculate carbs per 100g of cooked dish
  const carbsPer100gDish = (totalCarbs / cookedWeight) * 100;

  return {
    cookedWeight,
    totalCarbs,
    carbsPer100gDish,
  };
}

