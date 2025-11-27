// Multi-ingredient dish types

export type DishIngredient = {
  id: string;
  productName: string;
  rawWeight: number;
  rawCarbsPer100g: number;
  totalCarbs: number; // calculated: rawWeight * rawCarbsPer100g / 100
};

export type DishResult = {
  cookedWeight: number;
  totalCarbs: number;
  carbsPer100gDish: number;
};

export type DishHistoryItem = {
  id: string;
  dishName: string;
  createdAt: string;
  timeOfDay?: string;
  emptyBowlWeight: number;
  fullBowlWeight: number;
  ingredients: DishIngredient[];
  result: DishResult;
};

