export type BoiledDishInput = {
  productName: string;
  rawWeight: number;
  rawCarbsPer100g: number;
  emptyBowlWeight: number;
  fullBowlWeight: number;
};

export type BoiledDishResult = {
  cookedWeight: number;
  totalCarbs: number;
  carbsPer100gCooked: number;
};

export type BoiledDishHistoryItem = BoiledDishInput & BoiledDishResult & {
  id: string;
  createdAt: string;
};

