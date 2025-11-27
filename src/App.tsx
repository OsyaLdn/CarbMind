import { useState, useEffect, useRef } from 'react';
import type { AssistantStep } from './types/assistant';
import type { BoiledDishInput, BoiledDishResult, BoiledDishHistoryItem } from './types/boiledDish';
import type { DishIngredient, DishResult, DishHistoryItem } from './types/dish';
import { loadHistory, saveHistory } from './lib/historyStorage';
import { loadDishHistory, saveDishHistory } from './lib/dishHistoryStorage';
import { getCarbsForProduct } from './lib/carbsLookup';
import { calculateBoiledDish } from './lib/calculateBoiledDish';
import { calcIngredientCarbs, calcDishTotals } from './lib/calculateDish';
import { addUserFoodItem, loadUserFoodDb } from './lib/userFoodDb';
import { SYSTEM_FOOD_ITEMS } from './lib/systemFoodDb';

type CalculatorMode = 'single' | 'dish';

function App() {
  // Calculator mode
  const [mode, setMode] = useState<CalculatorMode>('single');
  
  // Core assistant state (for single product)
  const [step, setStep] = useState<AssistantStep>('idle');
  const [currentInput, setCurrentInput] = useState<Partial<BoiledDishInput> | null>(null);
  const [currentResult, setCurrentResult] = useState<BoiledDishResult | null>(null);
  const [mealName, setMealName] = useState('');
  const [shouldSaveFood, setShouldSaveFood] = useState(true);
  const [foodFoundInDb, setFoodFoundInDb] = useState(false);
  
  // Load history from localStorage on mount (lazy initialization)
  const [history, setHistory] = useState<BoiledDishHistoryItem[]>(() => loadHistory());
  
  // Dish calculator state
  const [useBowl, setUseBowl] = useState<boolean>(true);
  const [dishEmptyBowlWeight, setDishEmptyBowlWeight] = useState<number>(0);
  const [dishIngredients, setDishIngredients] = useState<DishIngredient[]>([]);
  const [dishFullBowlWeight, setDishFullBowlWeight] = useState<number>(0);
  const [dishResult, setDishResult] = useState<DishResult | null>(null);
  const [dishName, setDishName] = useState('');
  const [dishHistory, setDishHistory] = useState<DishHistoryItem[]>(() => loadDishHistory());
  
  // Ingredient form state
  const [ingredientProductName, setIngredientProductName] = useState('');
  const [ingredientRawWeight, setIngredientRawWeight] = useState('');
  const [ingredientRawCarbsPer100g, setIngredientRawCarbsPer100g] = useState('');
  const [dishError, setDishError] = useState('');

  // Temporary input state for current question
  const [inputValue, setInputValue] = useState('');
  
  // Error message state for validation
  const [errorMessage, setErrorMessage] = useState('');
  
  // Autocomplete suggestions state
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  
  // Selected history item for detail popup
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<BoiledDishHistoryItem | null>(null);

  // Wizard steps configuration
  const wizardSteps = [
    { id: 'askEmptyBowlWeight', label: 'Тара', icon: '🥣' },
    { id: 'askProduct', label: 'Продукт', icon: '🥘' },
    { id: 'askRawCarbsPer100g', label: 'Вуглеводи', icon: '📊' },
    { id: 'askRawWeight', label: 'Вага сирого', icon: '⚖️' },
    { id: 'askFullBowlWeight', label: 'З стравою', icon: '🍲' },
    { id: 'askMealName', label: 'Назва страви', icon: '✏️' },
    { id: 'showResult', label: 'Результат', icon: '✅' },
  ];

  const getCurrentStepIndex = () => {
    return wizardSteps.findIndex(s => s.id === step);
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
    setErrorMessage('');
    
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
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Start assistant handler
  const handleStartAssistant = () => {
    setCurrentInput({});
    setCurrentResult(null);
    setMealName('');
    setShouldSaveFood(true);
    setFoodFoundInDb(false);
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
    if (targetStepIndex < currentStepIndex) {
      setStep(targetStep);
      setInputValue('');
      setErrorMessage('');
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
    
    const value = parseFloat(inputValue);
    
    if (isNaN(value) || value < 0) {
      setErrorMessage('Введіть коректне значення (0 або більше)');
      return;
    }

    setCurrentInput(prev => ({ ...prev, emptyBowlWeight: value }));
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

    if (currentInput && value <= (currentInput.emptyBowlWeight || 0)) {
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
      setStep('askMealName');
    } catch {
      setErrorMessage('Помилка розрахунку. Перевірте введені дані');
    }
  };

  // Handle meal name submission
  const handleMealNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMealName(inputValue.trim());
    setInputValue('');
    setStep('showResult');
  };

  // Skip meal name
  const handleSkipMealName = () => {
    setMealName('');
    setStep('showResult');
  };

  // Handle save to history
  const handleSaveToHistory = () => {
    if (!currentInput || !currentResult) return;

    const now = new Date();
    const timeOfDay = now.toLocaleTimeString('uk-UA', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    const historyItem: BoiledDishHistoryItem = {
      ...(currentInput as BoiledDishInput),
      ...currentResult,
      id: Date.now().toString(),
      createdAt: now.toISOString(),
      mealName: mealName || undefined,
      timeOfDay,
    };

    const newHistory = [historyItem, ...history];
    setHistory(newHistory);
    saveHistory(newHistory);

    // Reset and go to idle
    setStep('idle');
    setCurrentInput(null);
    setCurrentResult(null);
    setMealName('');
  };

  // Handle new dish calculation
  const handleNewDish = () => {
    setCurrentInput({});
    setCurrentResult(null);
    setMealName('');
    setShouldSaveFood(true);
    setFoodFoundInDb(false);
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
    setMealName('');
    setInputValue('');
    setErrorMessage('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // Handle delete from history
  const handleDeleteFromHistory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newHistory = history.filter(item => item.id !== id);
    setHistory(newHistory);
    saveHistory(newHistory);
  };

  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('uk-UA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
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
  
  // Handle saving dish to history
  const handleSaveDish = () => {
    if (!dishResult) return;
    
    if (!dishName.trim()) {
      setDishError('Введіть назву страви');
      return;
    }
    
    const now = new Date();
    const timeOfDay = now.toLocaleTimeString('uk-UA', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    const historyItem: DishHistoryItem = {
      id: Date.now().toString(),
      dishName: dishName.trim(),
      createdAt: now.toISOString(),
      timeOfDay,
      emptyBowlWeight: dishEmptyBowlWeight,
      fullBowlWeight: dishFullBowlWeight,
      ingredients: dishIngredients,
      result: dishResult,
    };
    
    const newHistory = [historyItem, ...dishHistory];
    setDishHistory(newHistory);
    saveDishHistory(newHistory);
    
    // Reset form
    setDishEmptyBowlWeight(0);
    setDishIngredients([]);
    setDishFullBowlWeight(0);
    setDishResult(null);
    setDishName('');
    setDishError('');
  };
  
  // Handle deleting dish from history
  const handleDeleteDish = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newHistory = dishHistory.filter(item => item.id !== id);
    setDishHistory(newHistory);
    saveDishHistory(newHistory);
  };
  
  // Handle new dish calculation
  const handleNewDishCalc = () => {
    setUseBowl(true);
    setDishEmptyBowlWeight(0);
    setDishIngredients([]);
    setDishFullBowlWeight(0);
    setDishResult(null);
    setDishName('');
    setDishError('');
    setIngredientProductName('');
    setIngredientRawWeight('');
    setIngredientRawCarbsPer100g('');
  };
  
  // Auto-fill carbs when ingredient name changes
  const handleIngredientNameChange = (value: string) => {
    setIngredientProductName(value);
    const carbs = getCarbsForProduct(value.trim());
    if (carbs !== null) {
      setIngredientRawCarbsPer100g(carbs.toString());
    }
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
                        {currentInput.emptyBowlWeight !== undefined && (
                          <div>✓ Порожня тара: <strong>{currentInput.emptyBowlWeight}г</strong></div>
                        )}
                        {currentInput.productName && (
                          <div>✓ Продукт: <strong className="text-capitalize">{currentInput.productName}</strong></div>
                        )}
                        {currentInput.rawCarbsPer100g !== undefined && (
                          <div>✓ Вуглеводів у 100г сирого: <strong>{currentInput.rawCarbsPer100g}г</strong></div>
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
                                  <th>Назва</th>
                                  <th className="text-end">Сирі г</th>
                                  <th className="text-end">Вугл/100г</th>
                                  <th className="text-end">Вугл всього</th>
                                  <th></th>
                                </tr>
                              </thead>
                              <tbody>
                                {dishIngredients.map((ing) => (
                                  <tr key={ing.id}>
                                    <td className="text-capitalize">{ing.productName}</td>
                                    <td className="text-end">{ing.rawWeight}г</td>
                                    <td className="text-end">{ing.rawCarbsPer100g}г</td>
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
                          <div className="row g-2 mb-2">
                            <div className="col-12 col-md-4">
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                placeholder="Назва продукту"
                                value={ingredientProductName}
                                onChange={(e) => handleIngredientNameChange(e.target.value)}
                              />
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
                        
                        {/* Save to History */}
                        <div className="mb-3">
                          <label className="form-label">Назва страви:</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Наприклад: Борщ з м'ясом"
                            value={dishName}
                            onChange={(e) => setDishName(e.target.value)}
                          />
                        </div>
                        
                        <div className="d-grid gap-2">
                          <button onClick={handleSaveDish} className="btn btn-success btn-lg">
                            💾 Зберегти в історію
                          </button>
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
                    <h3 className="h5 mb-3">Скільки важить порожня тара?</h3>
                    <p className="text-muted small mb-3">
                      Спочатку зважте порожню миску, в якій будете готувати
                    </p>
                    <form onSubmit={handleEmptyBowlWeightSubmit}>
                      <div className="mb-3">
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
                    <h3 className="h5 mb-3">Скільки важить миска з готовою стравою?</h3>
                    <form onSubmit={handleFullBowlWeightSubmit}>
                      <div className="mb-3">
                        <input
                          type="number"
                          step="0.1"
                          className="form-control form-control-lg"
                          placeholder="Наприклад: 800"
                          value={inputValue}
                          onChange={(e) => {
                            setInputValue(e.target.value);
                            setErrorMessage('');
                          }}
                          autoFocus
                        />
                        <small className="text-muted">Вага в грамах (миска + готова страва)</small>
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

                {/* Step: askMealName */}
                {step === 'askMealName' && currentResult && (
                  <div>
                    <h3 className="h5 mb-3">Дайте назву своїй страві (необов'язково)</h3>
                    <p className="text-muted small mb-3">
                      Це допоможе вам швидше знайти цю страву в історії
                    </p>
                    <form onSubmit={handleMealNameSubmit}>
                      <div className="mb-3">
                        <input
                          type="text"
                          className="form-control form-control-lg"
                          placeholder="Наприклад: Гречана каша на сніданок"
                          value={inputValue}
                          onChange={(e) => {
                            setInputValue(e.target.value);
                            setErrorMessage('');
                          }}
                          autoFocus
                        />
                      </div>
                      <div className="d-flex gap-2">
                        <button type="button" onClick={handleSkipMealName} className="btn btn-outline-secondary">
                          Пропустити
                        </button>
                        <button type="submit" className="btn btn-primary flex-grow-1">
                          Далі
                        </button>
                      </div>
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
                      {mealName && <h2 className="h4 mb-2">{mealName}</h2>}
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
                      <button onClick={handleSaveToHistory} className="btn btn-success btn-lg">
                        💾 Зберегти в історію
                      </button>
                      <button onClick={handleNewDish} className="btn btn-outline-primary">
                        Порахувати ще одну страву
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Single Product History Section */}
            {history.length > 0 && (
              <div className="card shadow-lg border-0 rounded-4">
                <div className="card-body p-4">
                  <h2 className="h4 mb-3">Історія</h2>
                  <div className="list-group list-group-flush">
                    {history.map((item) => (
                      <div
                        key={item.id}
                        className="list-group-item list-group-item-action border-0 rounded-3 mb-2 d-flex justify-content-between align-items-center"
                      >
                        <button
                          onClick={() => setSelectedHistoryItem(item)}
                          className="btn btn-link text-decoration-none flex-grow-1 d-flex justify-content-between align-items-center text-start p-0"
                        >
                          <div>
                            {item.mealName && (
                              <h6 className="mb-0 text-dark">{item.mealName}</h6>
                            )}
                            <small className="text-capitalize text-muted">
                              {item.productName}
                              {item.timeOfDay && ` • ${item.timeOfDay}`}
                            </small>
                            <br />
                            <small className="text-muted">{formatDate(item.createdAt)}</small>
                          </div>
                          <div className="text-end me-3">
                            <div className="d-flex flex-column gap-3">
                              <div>
                                <div className="h5 mb-0 text-success fw-bold">
                                  {item.carbsPer100gCooked.toFixed(1)}
                                </div>
                              </div>
                              <div className="">
                                <div className="h5 mb-0 text-warning fw-bold">
                                  {(item.carbsPer100gCooked / 12).toFixed(2)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </button>
                        <button
                          onClick={(e) => handleDeleteFromHistory(item.id, e)}
                          className="btn btn-sm btn-outline-danger border-0"
                          title="Видалити"
                          aria-label="Видалити"
                        >
                          <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                            <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* Dish History Section */}
            {dishHistory.length > 0 && (
              <div className="card shadow-lg border-0 rounded-4 mt-4">
                <div className="card-body p-4">
                  <h2 className="h4 mb-3">Історія страв</h2>
                  <div className="list-group list-group-flush">
                    {dishHistory.map((item) => (
                      <div
                        key={item.id}
                        className="list-group-item list-group-item-action border-0 rounded-3 mb-2 d-flex justify-content-between align-items-center"
                      >
                        <div className="flex-grow-1">
                          <h6 className="mb-0 text-dark">{item.dishName}</h6>
                          <small className="text-muted">
                            {formatDate(item.createdAt)}
                            {item.timeOfDay && ` • ${item.timeOfDay}`}
                          </small>
                          <br />
                          <small className="text-muted">{item.ingredients.length} інгредієнтів</small>
                          
                          {/* Expandable ingredients list */}
                          <details className="mt-2">
                            <summary className="text-primary small" style={{ cursor: 'pointer', listStyle: 'none', outline: 'none' }}>
                              ▼ Показати інгредієнти
                            </summary>
                            <div className="mt-2">
                              <table className="table table-sm table-borderless mb-0">
                                <thead>
                                  <tr className="small text-muted">
                                    <th>Назва</th>
                                    <th className="text-end">Вага</th>
                                    <th className="text-end">Вугл/100г</th>
                                    <th className="text-end">ХО/100г</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {item.ingredients.map((ing) => (
                                    <tr key={ing.id} className="small">
                                      <td className="text-capitalize">{ing.productName}</td>
                                      <td className="text-end">{ing.rawWeight}г</td>
                                      <td className="text-end">{ing.rawCarbsPer100g.toFixed(1)}г</td>
                                      <td className="text-end">{(ing.rawCarbsPer100g / 12).toFixed(2)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </details>
                        </div>
                        
                        <div className="text-end me-3">
                          <div className="d-flex flex-column gap-3">
                            <div>
                              <div className="h5 mb-0 text-success fw-bold">
                                {item.result.carbsPer100gDish.toFixed(1)}
                              </div>
                            </div>
                            <div className="">
                              <div className="h5 mb-0 text-warning fw-bold">
                                {(item.result.carbsPer100gDish / 12).toFixed(2)}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <button
                          onClick={(e) => handleDeleteDish(item.id, e)}
                          className="btn btn-sm btn-outline-danger border-0"
                          title="Видалити"
                          aria-label="Видалити"
                        >
                          <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                            <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* History Item Detail Modal */}
      {selectedHistoryItem && (
        <div 
          className="modal d-block" 
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setSelectedHistoryItem(null)}
        >
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content rounded-4">
              <div className="modal-header border-0">
                <div>
                  {selectedHistoryItem.mealName && (
                    <h5 className="modal-title mb-1">{selectedHistoryItem.mealName}</h5>
                  )}
                  <h6 className="text-capitalize text-muted mb-0">{selectedHistoryItem.productName}</h6>
                  <small className="text-muted">
                    {formatDate(selectedHistoryItem.createdAt)}
                    {selectedHistoryItem.timeOfDay && ` о ${selectedHistoryItem.timeOfDay}`}
                  </small>
                </div>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setSelectedHistoryItem(null)}
                ></button>
              </div>
              <div className="modal-body">
                <h6 className="mb-3">📊 Вихідні дані:</h6>
                <div className="row g-2 mb-4">
                  <div className="col-6">
                    <div className="card bg-light border-0">
                      <div className="card-body p-2">
                        <small className="text-muted d-block">Вага сирого</small>
                        <strong>{selectedHistoryItem.rawWeight}г</strong>
                      </div>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="card bg-light border-0">
                      <div className="card-body p-2">
                        <small className="text-muted d-block">Вуглеводів/100г</small>
                        <strong>{selectedHistoryItem.rawCarbsPer100g}г</strong>
                      </div>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="card bg-light border-0">
                      <div className="card-body p-2">
                        <small className="text-muted d-block">Порожня тара</small>
                        <strong>{selectedHistoryItem.emptyBowlWeight}г</strong>
                      </div>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="card bg-light border-0">
                      <div className="card-body p-2">
                        <small className="text-muted d-block">З стравою</small>
                        <strong>{selectedHistoryItem.fullBowlWeight}г</strong>
                      </div>
                    </div>
                  </div>
                </div>

                <h6 className="mb-3">✅ Результати:</h6>
                <div className="row g-2">
                  <div className="col-12">
                    <div className="card bg-primary bg-opacity-10 border-0">
                      <div className="card-body p-2 text-center">
                        <small className="text-primary d-block">Всього вуглеводів</small>
                        <strong className="text-primary">{selectedHistoryItem.totalCarbs.toFixed(1)}г</strong>
                      </div>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="card bg-success bg-opacity-10 border-0">
                      <div className="card-body p-2 text-center">
                        <small className="text-success d-block">На 100г</small>
                        <strong className="text-success">{selectedHistoryItem.carbsPer100gCooked.toFixed(1)}г</strong>
                      </div>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="card bg-warning bg-opacity-10 border-0">
                      <div className="card-body p-2 text-center">
                        <small className="text-warning d-block">ХО всього</small>
                        <strong className="text-warning">{(selectedHistoryItem.totalCarbs / 12).toFixed(1)}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="card bg-light border-0">
                      <div className="card-body p-2 text-center">
                        <small className="text-muted d-block">Вага готової страви</small>
                        <strong>{selectedHistoryItem.cookedWeight.toFixed(0)}г</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer border-0">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setSelectedHistoryItem(null)}
                >
                  Закрити
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
