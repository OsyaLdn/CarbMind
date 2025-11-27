import type { DishIngredient } from './dish';

export type UserSavedDish = {
  id: string;
  name: string;
  carbsPer100g: number;
  breadUnitsPer100g: number;
  createdAt: string;
  ingredients: DishIngredient[];
  notes?: string;
};

export type IngredientSource = 'system' | 'user' | 'manual';

