export type SystemFoodItem = {
  name: string;
  rawCarbsPer100g: number;
};

export const SYSTEM_FOOD_ITEMS: SystemFoodItem[] = [
  // Grains and cereals
  { name: "гречка", rawCarbsPer100g: 72 },
  { name: "рис", rawCarbsPer100g: 77.2 },
  { name: "овес", rawCarbsPer100g: 60 },
  { name: "крупа вівсяна сквирянка плющена", rawCarbsPer100g: 59.5 },
  { name: "макарони", rawCarbsPer100g: 75 },
  { name: "перловка", rawCarbsPer100g: 73 },
  { name: "пшоно", rawCarbsPer100g: 69 },
  { name: "горох", rawCarbsPer100g: 60 },
  { name: "фасоля", rawCarbsPer100g: 61 },
  { name: "сочевиця", rawCarbsPer100g: 60 },
  
  // Vegetables
  { name: "картопля", rawCarbsPer100g: 18 },
  { name: "цибуля", rawCarbsPer100g: 10.4 },
  { name: "порей", rawCarbsPer100g: 6.3 },
  { name: "морква", rawCarbsPer100g: 7.2 },
  { name: "помідор", rawCarbsPer100g: 3.8 },
  { name: "буряк", rawCarbsPer100g: 10.8 },
  { name: "капуста", rawCarbsPer100g: 4.3 },
  { name: "баклажан", rawCarbsPer100g: 5 },
  { name: "кабачок", rawCarbsPer100g: 5 },
  { name: "солодкий перець", rawCarbsPer100g: 5.9 },
  { name: "перець білозірка", rawCarbsPer100g: 5.2 },
  { name: "огірок", rawCarbsPer100g: 1.8 },
  { name: "пекінська капуста", rawCarbsPer100g: 2.3 },
  { name: "гарбуз", rawCarbsPer100g: 4.5 },
  { name: "цвітна капуста", rawCarbsPer100g: 5 },
  { name: "брокколі", rawCarbsPer100g: 5 },
  { name: "кукурудза з качаном", rawCarbsPer100g: 12 },
  { name: "щавель", rawCarbsPer100g: 1 },
  
  // Fruits and berries
  { name: "кавун", rawCarbsPer100g: 8 },
  { name: "полуниця", rawCarbsPer100g: 8 },
  { name: "яблуко", rawCarbsPer100g: 10 },
  { name: "груша", rawCarbsPer100g: 10 },
  { name: "банан", rawCarbsPer100g: 22 },
  { name: "апельсин", rawCarbsPer100g: 8 },
  { name: "мандарин", rawCarbsPer100g: 8 },
  { name: "лохина", rawCarbsPer100g: 8 },
  { name: "смородина", rawCarbsPer100g: 8 },
  { name: "червона смородина", rawCarbsPer100g: 8 },
  { name: "абрикос", rawCarbsPer100g: 10 },
  { name: "диня", rawCarbsPer100g: 10 },
  { name: "виноград", rawCarbsPer100g: 18 },
  { name: "гранат", rawCarbsPer100g: 12 },
  { name: "слива", rawCarbsPer100g: 10 },
  { name: "обліпиха", rawCarbsPer100g: 8 },
  { name: "персик", rawCarbsPer100g: 10 },
  { name: "авокадо", rawCarbsPer100g: 8.5 },
  { name: "черешня", rawCarbsPer100g: 12 },
  
  // Dairy products
  { name: "молоко казкове молокія 2,5%", rawCarbsPer100g: 4.7 },
  { name: "молоко селянське 2,5%", rawCarbsPer100g: 4.7 },
  { name: "молоко радимо 2,5%", rawCarbsPer100g: 4.7 },
  { name: "сир кисломолочний галичина 5%", rawCarbsPer100g: 1.8 },
  
  // Sauces
  { name: "соус томатний barilla basilico", rawCarbsPer100g: 6.8 },
];

