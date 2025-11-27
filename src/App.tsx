import { useState, useEffect, useRef } from 'react';
import type { AssistantStep } from './types/assistant';
import type { BoiledDishInput, BoiledDishResult } from './types/boiledDish';
import type { DishIngredient, DishResult } from './types/dish';
import type { UserSavedDish } from './types/userDish';
import { getCarbsForProduct } from './lib/carbsLookup';
import { calculateBoiledDish } from './lib/calculateBoiledDish';
import { calcIngredientCarbs, calcDishTotals } from './lib/calculateDish';
import { addUserFoodItem, loadUserFoodDb } from './lib/userFoodDb';
import { SYSTEM_FOOD_ITEMS } from './lib/systemFoodDb';
import { useUserDishes } from './hooks/useUserDishes';
import { SaveDishButton } from './components/SaveDishButton';
import { UserDishLibrary } from './components/UserDishLibrary';
import { IngredientSourceSelector } from './components/IngredientSourceSelector';

type CalculatorMode = 'single' | 'dish';

function App() {
  // Calculator mode
  const [mode, setMode] = useState<CalculatorMode>('single');
  
  // Core assistant state (for single product)
  const [step, setStep] = useState<AssistantStep>('idle');
  const [currentInput, setCurrentInput] = useState<Partial<BoiledDishInput> | null>(null);
  const [currentResult, setCurrentResult] = useState<BoiledDishResult | null>(null);
  const [shouldSaveFood, setShouldSaveFood] = useState(true);
  const [foodFoundInDb, setFoodFoundInDb] = useState(false);
  const [singleUseBowl, setSingleUseBowl] = useState<boolean>(true);
  
  // Dish calculator state
  const [useBowl, setUseBowl] = useState<boolean>(true);
  const [dishEmptyBowlWeight, setDishEmptyBowlWeight] = useState<number>(0);
  const [dishIngredients, setDishIngredients] = useState<DishIngredient[]>([]);
  const [dishFullBowlWeight, setDishFullBowlWeight] = useState<number>(0);
  const [dishResult, setDishResult] = useState<DishResult | null>(null);
  
  // Ingredient form state
  const [ingredientProductName, setIngredientProductName] = useState('');
  const [ingredientRawWeight, setIngredientRawWeight] = useState('');
  const [ingredientRawCarbsPer100g, setIngredientRawCarbsPer100g] = useState('');
  const [dishError, setDishError] = useState('');
  const [showIngredientSourceSelector, setShowIngredientSourceSelector] = useState(false);
  
  // User dishes library
  const { userDishes, addDish, deleteDish } = useUserDishes();

  // Temporary input state for current question
  const [inputValue, setInputValue] = useState('');
  
  // Error message state for validation
  const [errorMessage, setErrorMessage] = useState('');
  
  // Autocomplete suggestions state (single product)
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  
  // Autocomplete suggestions state (multi-ingredient input)
  const [ingredientSuggestions, setIngredientSuggestions] = useState<string[]>([]);
  const [showIngredientSuggestions, setShowIngredientSuggestions] = useState(false);
  const ingredientSuggestionsRef = useRef<HTMLDivElement>(null);
  
  // Wizard steps configuration
  const wizardSteps = [
    { id: 'askEmptyBowlWeight', label: 'Тара', icon: '🥣' },
    { id: 'askProduct', label: 'Продукт', icon: '🥘' },
    { id: 'askRawCarbsPer100g', label: 'Вуглеводи', icon: '📊' },
    { id: 'askRawWeight', label: 'Вага сирого', icon: '⚖️' },
    { id: 'askFullBowlWeight', label: 'З стравою', icon: '🍲' },
    { id: 'showResult', label: 'Результат', icon: '✅' },
  ];

  const getCurrentStepIndex = () => {
    const idx = wizardSteps.findIndex(s => s.id === step);
    return idx === -1 ? 0 : idx;
  };
  
  const formatNumber = (
    value: number | string | null | undefined,
    decimals = 2
  ): string => {
    if (value === null || value === undefined) return '0';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (!Number.isFinite(num)) return '0';
    return Number(num.toFixed(decimals)).toString();
  };

  // Validate product name
  const validateProductName = (name: string): boolean => {
    const trimmed = name.trim();
    // Must have at least 2 characters and contain only letters, numbers, and spaces
    if (trimmed.length < 2) return false;
    // Must contain at least some letters
    const hasLetters = /[а-яіїєґА-ЯІЇЄҐa-zA-Z]/.test(trimmed);
    return hasLetters;
  };

  // Get suggestions from both databases
  const getSuggestions = (query: string): string[] => {
    if (!query || query.trim().length < 2) {
      return [];
    }
    
    const normalizedQuery = query.toLowerCase().trim();
    const userDb = loadUserFoodDb();
    const allItems: string[] = [];
    
    // Add user database items first (priority)
    userDb.forEach(item => {
      if (item.name.toLowerCase().includes(normalizedQuery)) {
        allItems.push(item.name);
      }
    });
    
    // Add system database items
    SYSTEM_FOOD_ITEMS.forEach(item => {
      if (item.name.toLowerCase().includes(normalizedQuery) && !allItems.includes(item.name)) {
        allItems.push(item.name);
      }
    });
    
    // Return max 5 suggestions
    return allItems.slice(0, 5);
  };
  
  // Handle input change with autocomplete
  const handleProductInputChange = (value: string) => {
    setInputValue(value);
    
    // Revalidate on change if there was an error
    if (errorMessage) {
      if (!validateProductName(value)) {
        setErrorMessage('Введіть коректну назву продукту (мінімум 2 літери)');
      } else {
        setErrorMessage('');
      }
    }
    
    const filtered = getSuggestions(value);
    setSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
  };
  
  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    setShowSuggestions(false);
    setSuggestions([]);
  };
  
  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!showSuggestions) return;
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSuggestions]);
  
  useEffect(() => {
    const handleIngredientClickOutside = (event: MouseEvent) => {
      if (!showIngredientSuggestions) return;
      if (
        ingredientSuggestionsRef.current &&
        !ingredientSuggestionsRef.current.contains(event.target as Node)
      ) {
        setShowIngredientSuggestions(false);
      }
    };
    
    document.addEventListener('mousedown', handleIngredientClickOutside);
    return () => document.removeEventListener('mousedown', handleIngredientClickOutside);
  }, [showIngredientSuggestions]);

  // Start assistant handler
  const handleStartAssistant = () => {
    setCurrentInput({});
    setCurrentResult(null);
    setShouldSaveFood(true);
    setFoodFoundInDb(false);
    setSingleUseBowl(true);
    setInputValue('');
    setErrorMessage('');
    setSuggestions([]);
    setShowSuggestions(false);
    setStep('askEmptyBowlWeight');
  };

  // Navigate to a specific step (for editing)
  const handleEditStep = (stepId: string) => {
    const targetStep = stepId as AssistantStep;
    const currentStepIndex = getCurrentStepIndex();
    const targetStepIndex = wizardSteps.findIndex(s => s.id === stepId);
    
    // Only allow navigating to completed steps
    if (targetStepIndex < currentStepIndex && currentInput) {
      setStep(targetStep);
      setErrorMessage('');
      
      // Prefill inputValue with the existing value for that step
      if (targetStep === 'askEmptyBowlWeight') {
        if (currentInput.emptyBowlWeight != null) {
          setInputValue(String(currentInput.emptyBowlWeight));
          setSingleUseBowl(true);
        } else {
          setSingleUseBowl(false);
          setInputValue('');
        }
      } else if (targetStep === 'askProduct' && currentInput.productName) {
        setInputValue(currentInput.productName);
      } else if (targetStep === 'askRawCarbsPer100g' && currentInput.rawCarbsPer100g != null) {
        setInputValue(String(currentInput.rawCarbsPer100g));
      } else if (targetStep === 'askRawWeight' && currentInput.rawWeight != null) {
        setInputValue(String(currentInput.rawWeight));
      } else if (targetStep === 'askFullBowlWeight' && currentInput.fullBowlWeight != null) {
        setInputValue(String(currentInput.fullBowlWeight));
      } else {
        setInputValue('');
      }
    }
  };

  // Handle product submission
  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setShowSuggestions(false);
    setSuggestions([]);
    
    if (!inputValue.trim()) {
      setErrorMessage('Введіть назву продукту');
      return;
    }

    if (!validateProductName(inputValue)) {
      setErrorMessage('Введіть коректну назву продукту (мінімум 2 літери)');
      return;
    }

    const productName = inputValue.trim();
    const carbsValue = getCarbsForProduct(productName);

    setCurrentInput(prev => ({ ...prev, productName }));
    setInputValue(carbsValue !== null ? carbsValue.toString() : '');
    setFoodFoundInDb(carbsValue !== null);
    setShouldSaveFood(carbsValue === null); // Default to saving if not found
    setStep('askRawCarbsPer100g');
  };

  // Handle raw carbs per 100g submission (always shown)
  const handleRawCarbsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    
    const value = parseFloat(inputValue);
    
    if (isNaN(value) || value < 0) {
      setErrorMessage('Введіть коректне значення (0 або більше)');
      return;
    }

    // Save to user food database only if user wants to save and food is new
    if (currentInput?.productName && shouldSaveFood && !foodFoundInDb) {
      addUserFoodItem({
        name: currentInput.productName.toLowerCase().trim(),
        rawCarbsPer100g: value,
        createdAt: new Date().toISOString(),
      });
    }

    setCurrentInput(prev => ({ ...prev, rawCarbsPer100g: value }));
    setInputValue('');
    setStep('askRawWeight');
  };

  // Handle raw weight submission
  const handleRawWeightSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    
    const value = parseFloat(inputValue);
    
    if (isNaN(value) || value <= 0) {
      setErrorMessage('Введіть коректне значення більше 0');
      return;
    }

    setCurrentInput(prev => ({ ...prev, rawWeight: value }));
    setInputValue('');
    setStep('askFullBowlWeight');
  };

  // Handle empty bowl weight submission
  const handleEmptyBowlWeightSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    
    let value = 0;
    
    if (singleUseBowl) {
      value = parseFloat(inputValue);
      if (isNaN(value) || value < 0) {
        setErrorMessage('Введіть коректне значення (0 або більше)');
        return;
      }
    }

    // Reset fullBowlWeight and result when changing emptyBowlWeight
    // This prevents confusing mismatches if user edits this step later
    setCurrentInput(prev => ({ 
      ...prev, 
      emptyBowlWeight: value,
      fullBowlWeight: undefined,
    }));
    setCurrentResult(null);
    setInputValue('');
    setStep('askProduct');
  };

  // Handle full bowl weight submission
  const handleFullBowlWeightSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    
    const value = parseFloat(inputValue);
    
    if (isNaN(value) || value <= 0) {
      setErrorMessage('Введіть коректне значення більше 0');
      return;
    }

    if (singleUseBowl && currentInput && value <= (currentInput.emptyBowlWeight || 0)) {
      setErrorMessage('Вага готової страви має бути більшою за вагу порожньої миски');
      return;
    }

    const updatedInput = {
      ...currentInput!,
      fullBowlWeight: value,
    } as BoiledDishInput;

    try {
      const result = calculateBoiledDish(updatedInput);
      setCurrentResult(result);
      setCurrentInput(updatedInput);
      setInputValue('');
      setStep('showResult');
    } catch {
      setErrorMessage('Помилка розрахунку. Перевірте введені дані');
    }
  };

  // Handle save single product to user dishes
  const handleSaveSingleProduct = (dish: UserSavedDish) => {
    addDish(dish);
    // Reset and go to idle
    setStep('idle');
    setCurrentInput(null);
    setCurrentResult(null);
  };

  // Handle new dish calculation
  const handleNewDish = () => {
    setCurrentInput({});
    setCurrentResult(null);
    setShouldSaveFood(true);
    setFoodFoundInDb(false);
    setSingleUseBowl(true);
    setInputValue('');
    setErrorMessage('');
    setSuggestions([]);
    setShowSuggestions(false);
    setStep('askEmptyBowlWeight');
  };

  // Handle cancel - return to idle
  const handleCancel = () => {
    setStep('idle');
    setCurrentInput(null);
    setCurrentResult(null);
    setInputValue('');
    setErrorMessage('');
    setSuggestions([]);
    setShowSuggestions(false);
  };


  // === DISH CALCULATOR HANDLERS ===
  
  // Handle adding ingredient
  const handleAddIngredient = () => {
    setDishError('');
    
    // Validate fields
    if (!ingredientProductName.trim()) {
      setDishError('Введіть назву інгредієнта');
      return;
    }
    
    const rawWeight = parseFloat(ingredientRawWeight);
    const carbsPer100g = parseFloat(ingredientRawCarbsPer100g);
    
    if (isNaN(rawWeight) || rawWeight <= 0) {
      setDishError('Введіть коректну вагу (більше 0)');
      return;
    }
    
    if (isNaN(carbsPer100g) || carbsPer100g < 0) {
      setDishError('Введіть коректну кількість вуглеводів (0 або більше)');
      return;
    }
    
    // Calculate total carbs for this ingredient
    const totalCarbs = calcIngredientCarbs(rawWeight, carbsPer100g);
    
    // Create new ingredient
    const newIngredient: DishIngredient = {
      id: Date.now().toString(),
      productName: ingredientProductName.trim(),
      rawWeight,
      rawCarbsPer100g: carbsPer100g,
      totalCarbs,
    };
    
    // Add to ingredients list
    setDishIngredients(prev => [...prev, newIngredient]);
    
    // Reset form
    setIngredientProductName('');
    setIngredientRawWeight('');
    setIngredientRawCarbsPer100g('');
    setIngredientSuggestions([]);
    setShowIngredientSuggestions(false);
  };
  
  // Handle deleting ingredient
  const handleDeleteIngredient = (id: string) => {
    setDishIngredients(prev => prev.filter(ing => ing.id !== id));
  };
  
  // Handle calculating dish
  const handleCalculateDish = () => {
    setDishError('');
    
    // Validate
    if (dishIngredients.length === 0) {
      setDishError('Додайте хоча б один інгредієнт');
      return;
    }
    
    if (dishEmptyBowlWeight < 0) {
      setDishError('Введіть коректну вагу порожньої тари (0 або більше)');
      return;
    }
    
    if (dishFullBowlWeight <= 0) {
      setDishError('Введіть коректну вагу страви з тарою (більше 0)');
      return;
    }
    
    if (dishFullBowlWeight <= dishEmptyBowlWeight) {
      setDishError('Вага страви з тарою має бути більшою за вагу порожньої тари');
      return;
    }
    
    try {
      const result = calcDishTotals(dishIngredients, dishEmptyBowlWeight, dishFullBowlWeight);
      setDishResult(result);
    } catch {
      setDishError('Помилка розрахунку. Перевірте введені дані');
    }
  };
  
  // Handle new dish calculation
  const handleNewDishCalc = () => {
    setUseBowl(true);
    setDishEmptyBowlWeight(0);
    setDishIngredients([]);
    setDishFullBowlWeight(0);
    setDishResult(null);
    setDishError('');
    setIngredientProductName('');
    setIngredientRawWeight('');
    setIngredientRawCarbsPer100g('');
    setShowIngredientSourceSelector(false);
    setIngredientSuggestions([]);
    setShowIngredientSuggestions(false);
  };
  
  // Handler for saving dish to library
  const handleSaveDishToLibrary = (dish: UserSavedDish) => {
    addDish(dish);
  };
  
  // Auto-fill carbs when ingredient name changes
  const handleIngredientNameChange = (value: string) => {
    setIngredientProductName(value);
    const carbs = getCarbsForProduct(value.trim());
    if (carbs !== null) {
      setIngredientRawCarbsPer100g(carbs.toString());
    }
    
    const filtered = getSuggestions(value);
    setIngredientSuggestions(filtered);
    setShowIngredientSuggestions(filtered.length > 0);
  };
  
  const handleIngredientSuggestionClick = (suggestion: string) => {
    setIngredientProductName(suggestion);
    const carbs = getCarbsForProduct(suggestion.trim());
    if (carbs !== null) {
      setIngredientRawCarbsPer100g(carbs.toString());
    }
    setIngredientSuggestions([]);
    setShowIngredientSuggestions(false);
  };

  return (
    <div className="min-vh-100 bg-light py-4">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-md-8 col-lg-6">
            {/* Header */}
            <div className="text-center mb-4">
              <div className="d-inline-block bg-white rounded-pill shadow-sm px-4 py-2 mb-3">
                <h1 className="h3 mb-0 text-primary fw-bold">CarbMind</h1>
              </div>
              <p className="text-muted">Калькулятор вуглеводів у вареній страві</p>
              
              {/* Mode Selector - Always visible */}
              <div className="d-flex justify-content-center gap-2 mt-3">
                <button
                  onClick={() => {
                    setMode('single');
                    // Reset dish state when switching to single
                    if (mode === 'dish') {
                      handleNewDishCalc();
                    }
                  }}
                  className={`btn btn-sm ${mode === 'single' ? 'btn-primary' : 'btn-outline-primary'}`}
                >
                  🥘 Один продукт
                </button>
                <button
                  onClick={() => {
                    setMode('dish');
                    // Reset single product state when switching to dish
                    if (mode === 'single' && step !== 'idle') {
                      setStep('idle');
                      setCurrentInput(null);
                      setCurrentResult(null);
                    }
                  }}
                  className={`btn btn-sm ${mode === 'dish' ? 'btn-primary' : 'btn-outline-primary'}`}
                >
                  🍲 Страва з інгредієнтів
                </button>
              </div>
            </div>
            
            {/* Main Card */}
            <div className="card shadow-xs border-0 rounded-4 mb-4">
              <div className="card-body p-4">
                
                {/* Wizard Step Indicator - Horizontal 2 Rows */}
                {step !== 'idle' && (
                  <div className="mb-4">
                    {/* First Row - 3 steps */}
                    <div className="d-flex justify-content-center align-items-center mb-3">
                      {wizardSteps.slice(0, 3).map((wizardStep, index) => {
                        const currentStepIndex = getCurrentStepIndex();
                        const isCompleted = index < currentStepIndex;
                        const isCurrent = index === currentStepIndex;
                        const isEditable = isCompleted;
                        
                        return (
                          <div key={wizardStep.id} className="d-flex align-items-center">
                            <button
                              onClick={() => isEditable && handleEditStep(wizardStep.id)}
                              disabled={!isEditable}
                              className={`btn rounded-circle p-0 ${
                                isCurrent ? 'btn-primary' : 
                                isCompleted ? 'btn-success' : 
                                'btn-light'
                              } ${isEditable ? '' : 'pe-none'}`}
                              style={{ 
                                width: '40px', 
                                height: '40px',
                                cursor: isEditable ? 'pointer' : 'default',
                                fontSize: '16px'
                              }}
                              title={wizardStep.label}
                            >
                              {isCompleted ? '✓' : wizardStep.icon}
                            </button>
                            {index < 2 && (
                              <div 
                                className={`mx-2 ${isCompleted ? 'bg-success' : 'bg-light'}`} 
                                style={{ height: '2px', width: '60px' }}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Second Row - 3 steps */}
                    <div className="d-flex justify-content-center align-items-center">
                      {wizardSteps.slice(3, 6).map((wizardStep, index) => {
                        const actualIndex = index + 3;
                        const currentStepIndex = getCurrentStepIndex();
                        const isCompleted = actualIndex < currentStepIndex;
                        const isCurrent = actualIndex === currentStepIndex;
                        const isEditable = isCompleted;
                        
                        return (
                          <div key={wizardStep.id} className="d-flex align-items-center">
                            <button
                              onClick={() => isEditable && handleEditStep(wizardStep.id)}
                              disabled={!isEditable}
                              className={`btn rounded-circle p-0 ${
                                isCurrent ? 'btn-primary' : 
                                isCompleted ? 'btn-success' : 
                                'btn-light'
                              } ${isEditable ? '' : 'pe-none'}`}
                              style={{ 
                                width: '40px', 
                                height: '40px',
                                cursor: isEditable ? 'pointer' : 'default',
                                fontSize: '16px'
                              }}
                              title={wizardStep.label}
                            >
                              {isCompleted ? '✓' : wizardStep.icon}
                            </button>
                            {index < 2 && (
                              <div 
                                className={`mx-2 ${isCompleted ? 'bg-success' : 'bg-light'}`} 
                                style={{ height: '2px', width: '60px' }}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* Summary Card */}
                {currentInput && step !== 'idle' && step !== 'askEmptyBowlWeight' && (
                  <div className="card bg-light border-0 mb-3">
                    <div className="card-body p-3">
                      <h6 className="mb-2" style={{ fontSize: '12px' }}>📝 Введені дані:</h6>
                      <div className="small text-muted">
                        {singleUseBowl && currentInput.emptyBowlWeight !== undefined && currentInput.emptyBowlWeight > 0 && (
                          <div>✓ Порожня тара: <strong>{currentInput.emptyBowlWeight}г</strong></div>
                        )}
                        {!singleUseBowl && (
                          <div>✓ Без тари (прямо на вазі)</div>
                        )}
                        {currentInput.productName && (
                          <div>✓ Продукт: <strong className="text-capitalize">{currentInput.productName}</strong></div>
                        )}
                        {currentInput.rawCarbsPer100g !== undefined && (
                          <div>
                            ✓ Вуглеводів у 100г сирого:{' '}
                            <strong>{formatNumber(currentInput.rawCarbsPer100g)}г</strong>
                          </div>
                        )}
                        {currentInput.rawWeight && (
                          <div>✓ Вага сирого продукту: <strong>{currentInput.rawWeight}г</strong></div>
                        )}
                        {currentInput.fullBowlWeight && (
                          <div>✓ Вага з готовою стравою: <strong>{currentInput.fullBowlWeight}г</strong></div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Step: idle */}
                {step === 'idle' && mode === 'single' && (
                  <div className="text-center">
                    <div className="d-flex justify-content-center mb-4">
                      <div className="bg-primary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center" style={{ width: '80px', height: '80px' }}>
                        <svg width="40" height="40" fill="currentColor" className="text-primary" viewBox="0 0 16 16">
                          <path d="M11 1.5v1h3.5a.5.5 0 0 1 0 1h-.538l-.853 10.66A2 2 0 0 1 11.115 16h-6.23a2 2 0 0 1-1.994-1.84L2.038 3.5H1.5a.5.5 0 0 1 0-1H5v-1A1.5 1.5 0 0 1 6.5 0h3A1.5 1.5 0 0 1 11 1.5Zm-5 0v1h4v-1a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5ZM4.5 5.029l.5 8.5a.5.5 0 1 0 .998-.06l-.5-8.5a.5.5 0 1 0-.998.06Zm6.53-.528a.5.5 0 0 0-.528.47l-.5 8.5a.5.5 0 0 0 .998.058l.5-8.5a.5.5 0 0 0-.47-.528ZM8 4.5a.5.5 0 0 0-.5.5v8.5a.5.5 0 0 0 1 0V5a.5.5 0 0 0-.5-.5Z"/>
                        </svg>
                      </div>
                    </div>
                    <h2 className="h4 mb-3">Порахуємо вуглеводи</h2>
                    <p className="text-muted mb-4">Один продукт - прості розрахунки</p>
                    <button onClick={handleStartAssistant} className="btn btn-primary btn-lg w-100">
                      Почати
                    </button>
                  </div>
                )}
                
                {/* DISH CALCULATOR MODE */}
                {mode === 'dish' && (
                  <div>
                    <h2 className="h4 mb-4 text-center">Калькулятор страви з інгредієнтів</h2>
                    
                    {/* Empty Bowl Weight */}
                    <div className="card bg-light border-0 mb-3">
                      <div className="card-body">
                        <h6 className="mb-3">🥣 Вага порожньої тари</h6>
                        
                        {/* Radio buttons for bowl selection */}
                        <div className="mb-3">
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="radio"
                              name="bowlOption"
                              id="withBowl"
                              checked={useBowl}
                              onChange={() => {
                                setUseBowl(true);
                                setDishEmptyBowlWeight(0);
                              }}
                            />
                            <label className="form-check-label" htmlFor="withBowl">
                              З тарою
                            </label>
                          </div>
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="radio"
                              name="bowlOption"
                              id="noBowl"
                              checked={!useBowl}
                              onChange={() => {
                                setUseBowl(false);
                                setDishEmptyBowlWeight(0);
                              }}
                            />
                            <label className="form-check-label" htmlFor="noBowl">
                              Без тари (прямо на вазі)
                            </label>
                          </div>
                        </div>
                        
                        {/* Show input only if using bowl */}
                        {useBowl && (
                          <div>
                            <input
                              type="number"
                              step="0.1"
                              className="form-control"
                              placeholder="Наприклад: 300"
                              value={dishEmptyBowlWeight || ''}
                              onChange={(e) => setDishEmptyBowlWeight(parseFloat(e.target.value) || 0)}
                            />
                            <small className="text-muted">Грамів</small>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Ingredients Section */}
                    <div className="card border-0 mb-3">
                      <div className="card-body">
                        <h6 className="mb-3">🥘 Інгредієнти</h6>
                        
                        {/* Ingredients Table */}
                        {dishIngredients.length > 0 && (
                          <div className="table-responsive mb-3">
                            <table className="table table-sm">
                              <thead>
                                <tr>
                                  <th className="small">Назва</th>
                                  <th className="text-end small">Сирі(г)</th>
                                  <th className="text-end small">в/100г</th>
                                  <th className="text-end small">всього</th>
                                  <th></th>
                                </tr>
                              </thead>
                              <tbody>
                                {dishIngredients.map((ing) => (
                                  <tr key={ing.id}>
                                    <td className="text-capitalize">{ing.productName}</td>
                                    <td className="text-end">{formatNumber(ing.rawWeight, 2)}г</td>
                                    <td className="text-end">{formatNumber(ing.rawCarbsPer100g)}г</td>
                                    <td className="text-end fw-bold">{ing.totalCarbs.toFixed(1)}г</td>
                                    <td className="text-end">
                                      <button
                                        onClick={() => handleDeleteIngredient(ing.id)}
                                        className="btn btn-sm btn-outline-danger border-0"
                                        title="Видалити"
                                      >
                                        ×
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                        
                        {/* Add Ingredient Form */}
                        <div className="border-top pt-3">
                          {!showIngredientSourceSelector ? (
                            <>
                              <div className="row g-2 mb-2">
                                <div className="col-12 col-md-4">
                                  <div className="position-relative" ref={ingredientSuggestionsRef}>
                                    <input
                                      type="text"
                                      className="form-control form-control-sm"
                                      placeholder="Назва продукту"
                                      value={ingredientProductName}
                                      onChange={(e) => handleIngredientNameChange(e.target.value)}
                                    />
                                    {showIngredientSuggestions && ingredientSuggestions.length > 0 && (
                                      <div className="list-group position-absolute w-100 mt-1 shadow-lg" style={{ zIndex: 1000 }}>
                                        {ingredientSuggestions.map((suggestion, index) => (
                                          <button
                                            key={index}
                                            type="button"
                                            className="list-group-item list-group-item-action text-capitalize"
                                            onClick={() => handleIngredientSuggestionClick(suggestion)}
                                          >
                                            {suggestion}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="col-6 col-md-3">
                                  <input
                                    type="number"
                                    step="0.1"
                                    className="form-control form-control-sm"
                                    placeholder="Вугл/100г"
                                    value={ingredientRawCarbsPer100g}
                                    onChange={(e) => setIngredientRawCarbsPer100g(e.target.value)}
                                  />
                                </div>
                                <div className="col-6 col-md-3">
                                  <input
                                    type="number"
                                    step="0.1"
                                    className="form-control form-control-sm"
                                    placeholder="Вага г"
                                    value={ingredientRawWeight}
                                    onChange={(e) => setIngredientRawWeight(e.target.value)}
                                  />
                                </div>
                                <div className="col-12 col-md-2">
                                  <button
                                    onClick={handleAddIngredient}
                                    className="btn btn-sm btn-success w-100"
                                  >
                                    + Додати
                                  </button>
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  setShowIngredientSourceSelector(true);
                                  setShowIngredientSuggestions(false);
                                }}
                                className="btn btn-sm btn-outline-primary w-100"
                              >
                                📚 Або вибрати з моїх збережених страв ({userDishes.length})
                              </button>
                            </>
                          ) : (
                            <div>
                              <IngredientSourceSelector
                                userDishes={userDishes}
                                onIngredientSelected={(productName, carbsPer100g) => {
                                  setIngredientProductName(productName);
                                  setIngredientRawCarbsPer100g(carbsPer100g.toString());
                                  // Don't close immediately - show the selected item
                                }}
                              />
                              
                              {/* Show selected ingredient with weight input */}
                              {ingredientProductName && ingredientRawCarbsPer100g && (
                                <div className="card bg-success bg-opacity-10 border-success mt-3">
                                  <div className="card-body">
                                    <h6 className="text-success mb-2">✅ Вибрано:</h6>
                                    <div className="mb-2">
                                      <strong>{ingredientProductName}</strong>
                                      <small className="text-muted d-block">
                                        {formatNumber(ingredientRawCarbsPer100g || 0)} г вуглеводів / 100г
                                      </small>
                                    </div>
                                    <div className="mb-2">
                                      <label className="form-label small mb-1">Скільки грамів ви використовуєте?</label>
                                      <div className="input-group">
                                        <input
                                          type="number"
                                          step="0.1"
                                          className="form-control"
                                          placeholder="Вага"
                                          value={ingredientRawWeight}
                                          onChange={(e) => setIngredientRawWeight(e.target.value)}
                                          autoFocus
                                        />
                                        <span className="input-group-text">г</span>
                                      </div>
                                    </div>
                                    <div className="d-flex gap-2">
                                      <button
                                        onClick={() => {
                                          setIngredientProductName('');
                                          setIngredientRawCarbsPer100g('');
                                          setIngredientRawWeight('');
                                          setShowIngredientSuggestions(false);
                                          setIngredientSuggestions([]);
                                          setShowIngredientSourceSelector(false);
                                        }}
                                        className="btn btn-secondary"
                                      >
                                        Скасувати
                                      </button>
                                      <button
                                        onClick={handleAddIngredient}
                                        className="btn btn-success flex-grow-1"
                                        disabled={!ingredientRawWeight}
                                      >
                                        ✅ Додати інгредієнт
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              {!ingredientProductName && (
                                <button
                                  onClick={() => {
                                    setShowIngredientSourceSelector(false);
                                    setShowIngredientSuggestions(false);
                                  }}
                                  className="btn btn-sm btn-secondary w-100 mt-2"
                                >
                                  ← Повернутись до ручного вводу
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Full Bowl Weight */}
                    <div className="card bg-light border-0 mb-3">
                      <div className="card-body">
                        <h6 className="mb-2">🍲 {useBowl ? 'Загальна вага страви з тарою' : 'Вага готової страви'}</h6>
                        <input
                          type="number"
                          step="0.1"
                          className="form-control"
                          placeholder={useBowl ? "Наприклад: 800" : "Наприклад: 500"}
                          value={dishFullBowlWeight || ''}
                          onChange={(e) => setDishFullBowlWeight(parseFloat(e.target.value) || 0)}
                        />
                        <small className="text-muted">
                          {useBowl ? 'Грамів (миска + готова страва)' : 'Грамів (тільки страва)'}
                        </small>
                      </div>
                    </div>
                    
                    {/* Error Message */}
                    {dishError && (
                      <div className="alert alert-danger py-2 mb-3">{dishError}</div>
                    )}
                    
                    {/* Calculate Button */}
                    {!dishResult && (
                      <button
                        onClick={handleCalculateDish}
                        className="btn btn-primary w-100 mb-3"
                      >
                        Порахувати страву
                      </button>
                    )}
                    
                    {/* Result Block */}
                    {dishResult && (
                      <div>
                        <div className="text-center mb-4">
                          <div className="d-inline-flex align-items-center justify-content-center bg-success bg-opacity-10 rounded-circle mb-3" style={{ width: '64px', height: '64px' }}>
                            <svg width="32" height="32" fill="currentColor" className="text-success" viewBox="0 0 16 16">
                              <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/>
                            </svg>
                          </div>
                          <p className="text-muted mb-1">Готово!</p>
                        </div>

                        <div className="row g-3 mb-4">
                          <div className="col-12">
                            <div className="card bg-primary bg-opacity-10 border-primary border-opacity-25">
                              <div className="card-body text-center">
                                <small className="text-primary d-block mb-1">Вуглеводів у всій страві:</small>
                                <h3 className="display-5 fw-bold text-primary mb-0">
                                  {dishResult.totalCarbs.toFixed(1)} <small className="fs-5">г</small>
                                </h3>
                              </div>
                            </div>
                          </div>
                          
                          <div className="col-12">
                            <div className="card bg-success bg-opacity-10 border-success border-opacity-25">
                              <div className="card-body text-center">
                                <small className="text-success d-block mb-1">У 100 г готової страви:</small>
                                <h3 className="display-5 fw-bold text-success mb-0">
                                  {dishResult.carbsPer100gDish.toFixed(1)} <small className="fs-5">г</small>
                                </h3>
                              </div>
                            </div>
                          </div>
                          
                          <div className="col-12">
                            <div className="card bg-warning bg-opacity-10 border-warning border-opacity-25">
                              <div className="card-body text-center">
                                <small className="text-warning d-block mb-1">Хлібні одиниці у всій страві</small>
                                <h3 className="display-5 fw-bold text-warning mb-0">
                                  {(dishResult.totalCarbs / 12).toFixed(1)} <small className="fs-5">ХО</small>
                                </h3>
                              </div>
                            </div>
                          </div>
                          
                          <div className="col-12">
                            <div className="card bg-info bg-opacity-10 border-info border-opacity-25">
                              <div className="card-body text-center">
                                <small className="text-info d-block mb-1">ХО на 100 г готової страви</small>
                                <h3 className="display-5 fw-bold text-info mb-0">
                                  {(dishResult.carbsPer100gDish / 12).toFixed(2)} <small className="fs-5">ХО</small>
                                </h3>
                              </div>
                            </div>
                          </div>
                          
                          <div className="col-12">
                            <div className="card bg-light">
                              <div className="card-body text-center">
                                <small className="text-muted">
                                  Вага готової страви: <strong>{dishResult.cookedWeight.toFixed(0)} г</strong>
                                </small>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="d-grid gap-2">
                          {/* Save Button */}
                          <SaveDishButton
                            ingredients={dishIngredients}
                            carbsPer100g={dishResult.carbsPer100gDish}
                            breadUnitsPer100g={dishResult.carbsPer100gDish / 12}
                            onSave={handleSaveDishToLibrary}
                          />
                          
                          <button onClick={handleNewDishCalc} className="btn btn-outline-primary">
                            Порахувати ще одну страву
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Step: askEmptyBowlWeight */}
                {step === 'askEmptyBowlWeight' && (
                  <div>
                    <h3 className="h5 mb-3">Вага порожньої тари</h3>
                    <p className="text-muted small mb-3">
                      Оберіть, чи використовуєте ви тару для приготування
                    </p>
                    <form onSubmit={handleEmptyBowlWeightSubmit}>
                      <div className="mb-3">
                        <div className="d-flex flex-column gap-3 mb-3">
                          <div className="form-check">
                            <input
                              type="radio"
                              className="form-check-input"
                              name="singleBowlOption"
                              id="singleWithBowl"
                              checked={singleUseBowl}
                              onChange={() => {
                                setSingleUseBowl(true);
                                setInputValue('');
                                setErrorMessage('');
                              }}
                            />
                            <label className="form-check-label" htmlFor="singleWithBowl">
                              З тарою
                            </label>
                          </div>
                          <div className="form-check">
                            <input
                              type="radio"
                              className="form-check-input"
                              name="singleBowlOption"
                              id="singleNoBowl"
                              checked={!singleUseBowl}
                              onChange={() => {
                                setSingleUseBowl(false);
                                setInputValue('');
                                setErrorMessage('');
                              }}
                            />
                            <label className="form-check-label" htmlFor="singleNoBowl">
                              Без тари (прямо на вазі)
                            </label>
                          </div>
                        </div>
                        
                        {singleUseBowl && (
                          <div>
                            <input
                              type="number"
                              step="0.1"
                              className="form-control form-control-lg"
                              placeholder="Наприклад: 300"
                              value={inputValue}
                              onChange={(e) => {
                                setInputValue(e.target.value);
                                setErrorMessage('');
                              }}
                              autoFocus
                            />
                            <small className="text-muted">Вага в грамах (можна 0, якщо тари немає)</small>
                          </div>
                        )}
                      </div>
                      {errorMessage && (
                        <div className="alert alert-danger py-2">{errorMessage}</div>
                      )}
                      <div className="d-flex gap-2">
                        <button type="button" onClick={handleCancel} className="btn btn-outline-secondary">
                          Скасувати
                        </button>
                        <button type="submit" className="btn btn-primary flex-grow-1">
                          Далі
                        </button>
                      </div>
                    </form>
                  </div>
                )}
                
                {/* Step: askProduct */}
                {step === 'askProduct' && (
                  <div>
                    <h3 className="h5 mb-3">Який продукт ви варили?</h3>
                    <form onSubmit={handleProductSubmit}>
                      <div className="mb-3 position-relative" ref={suggestionsRef}>
                        <input
                          type="text"
                          className="form-control form-control-lg"
                          placeholder="Наприклад: гречка, рис, макарони"
                          value={inputValue}
                          onChange={(e) => handleProductInputChange(e.target.value)}
                          autoFocus
                        />
                        {showSuggestions && suggestions.length > 0 && (
                          <div className="list-group position-absolute w-100 mt-1 shadow-lg" style={{ zIndex: 1000 }}>
                            {suggestions.map((suggestion, index) => (
                              <button
                                key={index}
                                type="button"
                                className="list-group-item list-group-item-action text-capitalize"
                                onClick={() => handleSuggestionClick(suggestion)}
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {errorMessage && (
                        <div className="alert alert-danger py-2">{errorMessage}</div>
                      )}
                      <div className="d-flex gap-2">
                        <button type="button" onClick={handleCancel} className="btn btn-outline-secondary">
                          Скасувати
                        </button>
                        <button type="submit" className="btn btn-primary flex-grow-1">
                          Далі
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Step: askRawCarbsPer100g */}
                {step === 'askRawCarbsPer100g' && (
                  <div>
                    <h3 className="h5 mb-3">Скільки вуглеводів у 100 г сирого продукту?</h3>
                    <p className="text-muted small mb-3">
                      Продукт: <strong className="text-capitalize">{currentInput?.productName}</strong>
                      {foodFoundInDb && inputValue && (
                        <span className="d-block text-success mt-1">✓ Знайдено збережене значення</span>
                      )}
                      {!foodFoundInDb && (
                        <span className="d-block text-info mt-1">ℹ️ Новий продукт - не знайдено в базі</span>
                      )}
                    </p>
                    <form onSubmit={handleRawCarbsSubmit}>
                      <div className="mb-3">
                        <input
                          type="number"
                          step="0.1"
                          className="form-control form-control-lg"
                          placeholder="Наприклад: 62.3"
                          value={inputValue}
                          onChange={(e) => {
                            setInputValue(e.target.value);
                            setErrorMessage('');
                          }}
                          autoFocus
                        />
                        <small className="text-muted">Грамів вуглеводів на 100г продукту</small>
                      </div>

                      {/* Show save option only for new foods */}
                      {!foodFoundInDb && (
                        <div className="card bg-light border-0 mb-3">
                          <div className="card-body p-3">
                            <div className="form-check">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id="saveFood"
                                checked={shouldSaveFood}
                                onChange={(e) => setShouldSaveFood(e.target.checked)}
                              />
                              <label className="form-check-label" htmlFor="saveFood">
                                <strong>💾 Зберегти цей продукт для майбутнього</strong>
                                <small className="d-block text-muted mt-1">
                                  Якщо зберегти, наступного разу вуглеводи підставляться автоматично
                                </small>
                              </label>
                            </div>
                          </div>
                        </div>
                      )}

                      {errorMessage && (
                        <div className="alert alert-danger py-2">{errorMessage}</div>
                      )}
                      <div className="d-flex gap-2">
                        <button type="button" onClick={handleCancel} className="btn btn-outline-secondary">
                          Скасувати
                        </button>
                        <button type="submit" className="btn btn-primary flex-grow-1">
                          Далі
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Step: askRawWeight */}
                {step === 'askRawWeight' && (
                  <div>
                    <h3 className="h5 mb-3">Скільки грамів сирого продукту ви взяли?</h3>
                    <form onSubmit={handleRawWeightSubmit}>
                      <div className="mb-3">
                        <input
                          type="number"
                          step="0.1"
                          className="form-control form-control-lg"
                          placeholder="Наприклад: 200"
                          value={inputValue}
                          onChange={(e) => {
                            setInputValue(e.target.value);
                            setErrorMessage('');
                          }}
                          autoFocus
                        />
                        <small className="text-muted">Вага в грамах</small>
                      </div>
                      {errorMessage && (
                        <div className="alert alert-danger py-2">{errorMessage}</div>
                      )}
                      <div className="d-flex gap-2">
                        <button type="button" onClick={handleCancel} className="btn btn-outline-secondary">
                          Скасувати
                        </button>
                        <button type="submit" className="btn btn-primary flex-grow-1">
                          Далі
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Step: askFullBowlWeight */}
                {step === 'askFullBowlWeight' && (
                  <div>
                    <h3 className="h5 mb-3">
                      {singleUseBowl ? 'Скільки важить миска з готовою стравою?' : 'Скільки важить готова страва?'}
                    </h3>
                    <form onSubmit={handleFullBowlWeightSubmit}>
                      <div className="mb-3">
                        <input
                          type="number"
                          step="0.1"
                          className="form-control form-control-lg"
                          placeholder={singleUseBowl ? "Наприклад: 800" : "Наприклад: 500"}
                          value={inputValue}
                          onChange={(e) => {
                            setInputValue(e.target.value);
                            setErrorMessage('');
                          }}
                          autoFocus
                        />
                        <small className="text-muted">
                          {singleUseBowl ? 'Вага в грамах (миска + готова страва)' : 'Вага в грамах (тільки страва)'}
                        </small>
                      </div>
                      {errorMessage && (
                        <div className="alert alert-danger py-2">{errorMessage}</div>
                      )}
                      <button type="submit" className="btn btn-primary w-100">
                        Розрахувати
                      </button>
                    </form>
                  </div>
                )}
                
                {/* Step: showResult */}
                {step === 'showResult' && currentInput && currentResult && (
                  <div>
                    <div className="text-center mb-4">
                      <div className="d-inline-flex align-items-center justify-content-center bg-success bg-opacity-10 rounded-circle mb-3" style={{ width: '64px', height: '64px' }}>
                        <svg width="32" height="32" fill="currentColor" className="text-success" viewBox="0 0 16 16">
                          <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/>
                        </svg>
                      </div>
                      <p className="text-muted mb-1">Готово!</p>
                      <h3 className="h5 text-capitalize text-muted">{currentInput.productName}</h3>
                    </div>

                    <div className="row g-3 mb-4">
                      <div className="col-12">
                        <div className="card bg-primary bg-opacity-10 border-primary border-opacity-25">
                          <div className="card-body text-center">
                            <small className="text-primary d-block mb-1">Вуглеводів у всій готовій страві:</small>
                            <h3 className="display-5 fw-bold text-primary mb-0">
                              {currentResult.totalCarbs.toFixed(1)} <small className="fs-5">г</small>
                            </h3>
                          </div>
                        </div>
                      </div>
                      
                      <div className="col-12">
                        <div className="card bg-success bg-opacity-10 border-success border-opacity-25">
                          <div className="card-body text-center">
                            <small className="text-success d-block mb-1">У 100 г готової страви:</small>
                            <h3 className="display-5 fw-bold text-success mb-0">
                              {currentResult.carbsPer100gCooked.toFixed(1)} <small className="fs-5">г</small>
                            </h3>
                          </div>
                        </div>
                      </div>
                      
                      <div className="col-12">
                        <div className="card bg-warning bg-opacity-10 border-warning border-opacity-25">
                          <div className="card-body text-center">
                            <small className="text-warning d-block mb-1">Хлібні одиниці у всій страві</small>
                            <h3 className="display-5 fw-bold text-warning mb-0">
                              {(currentResult.totalCarbs / 12).toFixed(1)} <small className="fs-5">ХО</small>
                            </h3>
                          </div>
                        </div>
                      </div>
                      
                      <div className="col-12">
                        <div className="card bg-info bg-opacity-10 border-info border-opacity-25">
                          <div className="card-body text-center">
                            <small className="text-info d-block mb-1">ХО на 100 г готової страви</small>
                            <h3 className="display-5 fw-bold text-info mb-0">
                              {(currentResult.carbsPer100gCooked / 12).toFixed(2)} <small className="fs-5">ХО</small>
                            </h3>
                          </div>
                        </div>
                      </div>
                      
                      <div className="col-12">
                        <div className="card bg-light">
                          <div className="card-body text-center">
                            <small className="text-muted">
                              Вага готової страви: <strong>{currentResult.cookedWeight.toFixed(0)} г</strong>
                            </small>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="d-grid gap-2">
                      {/* Save single product as dish */}
                      {currentInput && currentResult && 
                       currentInput.productName && 
                       currentInput.rawWeight !== undefined && 
                       currentInput.rawCarbsPer100g !== undefined && (() => {
                        const ingredient: DishIngredient = {
                          id: 'single-product',
                          productName: currentInput.productName,
                          rawWeight: currentInput.rawWeight,
                          rawCarbsPer100g: currentInput.rawCarbsPer100g,
                          totalCarbs: calcIngredientCarbs(currentInput.rawWeight, currentInput.rawCarbsPer100g),
                        };
                        return (
                          <SaveDishButton
                            ingredients={[ingredient]}
                            carbsPer100g={currentResult.carbsPer100gCooked}
                            breadUnitsPer100g={currentResult.carbsPer100gCooked / 12}
                            onSave={handleSaveSingleProduct}
                          />
                        );
                      })()}
                      <button onClick={handleNewDish} className="btn btn-outline-primary">
                        Порахувати ще одну страву
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* User Dishes Library Section */}
            {userDishes.length > 0 && (
              <div className="card shadow-lg border-0 rounded-4 mt-4">
                <div className="card-body p-4">
                  <UserDishLibrary
                    userDishes={userDishes}
                    onDelete={deleteDish}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
