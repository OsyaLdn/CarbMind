import { useState, useEffect, useRef } from 'react';
import type { AssistantStep } from './types/assistant';
import type { BoiledDishInput, BoiledDishResult, BoiledDishHistoryItem } from './types/boiledDish';
import { loadHistory, saveHistory } from './lib/historyStorage';
import { getCarbsForProduct } from './lib/carbsLookup';
import { calculateBoiledDish } from './lib/calculateBoiledDish';
import { addUserFoodItem, loadUserFoodDb } from './lib/userFoodDb';
import { SYSTEM_FOOD_ITEMS } from './lib/systemFoodDb';

function App() {
  // Core assistant state
  const [step, setStep] = useState<AssistantStep>('idle');
  const [currentInput, setCurrentInput] = useState<BoiledDishInput | null>(null);
  const [currentResult, setCurrentResult] = useState<BoiledDishResult | null>(null);
  // Load history from localStorage on mount (lazy initialization)
  const [history, setHistory] = useState<BoiledDishHistoryItem[]>(() => loadHistory());

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
    // Reset current input and result
    setCurrentInput(null);
    setCurrentResult(null);
    setInputValue('');
    setErrorMessage('');
    setSuggestions([]);
    setShowSuggestions(false);
    // Start the conversation flow
    setStep('askProduct');
  };

  // Parse product input - extract product name and optional weight
  const parseProductInput = (input: string): { productName: string; rawWeight: number | null } => {
    const trimmed = input.trim();
    
    // Try to extract weight pattern like "100 грам гречки" or "100г гречки" or "100 гречки"
    const weightPatterns = [
      /(\d+(?:[.,]\d+)?)\s*(?:г|грам|грама|грамів)?\s+(.+)/i,
      /(.+?)\s+(\d+(?:[.,]\d+)?)\s*(?:г|грам|грама|грамів)?$/i,
    ];
    
    for (const pattern of weightPatterns) {
      const match = trimmed.match(pattern);
      if (match) {
        const weightStr = match[1].replace(',', '.');
        const productPart = match[2];
        const weight = parseFloat(weightStr);
        
        if (!isNaN(weight) && weight > 0) {
          // Extract only letters (Cyrillic and Latin)
          const productName = productPart.replace(/[^а-яіїєґА-ЯІЇЄҐa-zA-Z\s]/g, '').trim();
          if (productName) {
            return { productName, rawWeight: weight };
          }
        }
      }
    }
    
    // No weight found, extract only product name (letters only)
    const productName = trimmed.replace(/[^а-яіїєґА-ЯІЇЄҐa-zA-Z\s]/g, '').trim();
    return { productName, rawWeight: null };
  };

  // Handle product submission (step: askProduct)
  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setShowSuggestions(false);
    setSuggestions([]);
    
    if (!inputValue.trim()) {
      setErrorMessage('Введіть назву продукту');
      return;
    }

    const { productName, rawWeight } = parseProductInput(inputValue);
    
    if (!productName) {
      setErrorMessage('Не вдалося розпізнати назву продукту');
      return;
    }

    // Look up product in system database
    const carbsValue = getCarbsForProduct(productName);

    // Initialize or update currentInput
    const newInput: Partial<BoiledDishInput> = {
      productName,
      ...(rawWeight !== null && { rawWeight }),
      ...(carbsValue !== null && { rawCarbsPer100g: carbsValue }),
    };
    
    setCurrentInput(prev => ({ ...prev, ...newInput } as BoiledDishInput));
    setInputValue('');

    // Determine next step based on what we found
    if (rawWeight !== null) {
      // Weight was parsed
      if (carbsValue !== null) {
        // Product found in DB, weight provided → ask for empty bowl weight
        setStep('askEmptyBowlWeight');
      } else {
        // Product not found, weight provided → ask for carbs per 100g
        setStep('askRawCarbsPer100g');
      }
    } else {
      // Weight not parsed
      if (carbsValue !== null) {
        // Product found in DB, no weight → ask for raw weight
        setStep('maybeAskRawWeight');
      } else {
        // Product not found, no weight → ask for carbs per 100g first
        setStep('askRawCarbsPer100g');
      }
    }
  };

  // Handle raw carbs per 100g submission
  const handleRawCarbsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    
    const value = parseFloat(inputValue);
    
    if (isNaN(value) || value <= 0) {
      setErrorMessage('Введіть коректне значення більше 0');
      return;
    }

    // Save to user food database
    if (currentInput?.productName) {
      addUserFoodItem({
        name: currentInput.productName.toLowerCase().trim(),
        rawCarbsPer100g: value,
        createdAt: new Date().toISOString(),
      });
    }

    // Update currentInput with the carbs value
    setCurrentInput(prev => ({
      ...prev!,
      rawCarbsPer100g: value,
    }));
    setInputValue('');

    // Check if we already have rawWeight
    if (currentInput?.rawWeight) {
      // We have weight, proceed to bowl weight
      setStep('askEmptyBowlWeight');
    } else {
      // No weight yet, ask for it
      setStep('maybeAskRawWeight');
    }
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

    setCurrentInput(prev => ({
      ...prev!,
      rawWeight: value,
    }));
    setInputValue('');
    setStep('askEmptyBowlWeight');
  };

  // Handle empty bowl weight submission
  const handleEmptyBowlWeightSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    
    const value = parseFloat(inputValue);
    
    if (isNaN(value) || value <= 0) {
      setErrorMessage('Введіть коректне значення більше 0');
      return;
    }

    setCurrentInput(prev => ({
      ...prev!,
      emptyBowlWeight: value,
    }));
    setInputValue('');
    setStep('askFullBowlWeight');
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

    // Check if cooked weight would be valid
    if (currentInput && value <= currentInput.emptyBowlWeight) {
      setErrorMessage('Вага готової страви має бути більшою за вагу порожньої миски');
      return;
    }

    const updatedInput = {
      ...currentInput!,
      fullBowlWeight: value,
    };

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

  // Handle save to history
  const handleSaveToHistory = () => {
    if (!currentInput || !currentResult) return;

    const historyItem: BoiledDishHistoryItem = {
      ...currentInput,
      ...currentResult,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };

    const newHistory = [historyItem, ...history];
    setHistory(newHistory);
    saveHistory(newHistory);

    // Reset and go to idle
    setStep('idle');
    setCurrentInput(null);
    setCurrentResult(null);
  };

  // Handle new dish calculation
  const handleNewDish = () => {
    setCurrentInput(null);
    setCurrentResult(null);
    setInputValue('');
    setErrorMessage('');
    setSuggestions([]);
    setShowSuggestions(false);
    setStep('askProduct');
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
            </div>
            
            {/* Main Card */}
            <div className="card shadow-xs border-0 rounded-4 mb-4">
              <div className="card-body p-4">
                
                {/* Step: idle */}
                {step === 'idle' && (
                  <div className="text-center">
                    <div className="d-flex justify-content-center mb-4">
                      <div className="bg-primary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center" style={{ width: '80px', height: '80px' }}>
                        <svg width="40" height="40" fill="currentColor" className="text-primary" viewBox="0 0 16 16">
                          <path d="M11 1.5v1h3.5a.5.5 0 0 1 0 1h-.538l-.853 10.66A2 2 0 0 1 11.115 16h-6.23a2 2 0 0 1-1.994-1.84L2.038 3.5H1.5a.5.5 0 0 1 0-1H5v-1A1.5 1.5 0 0 1 6.5 0h3A1.5 1.5 0 0 1 11 1.5Zm-5 0v1h4v-1a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5ZM4.5 5.029l.5 8.5a.5.5 0 1 0 .998-.06l-.5-8.5a.5.5 0 1 0-.998.06Zm6.53-.528a.5.5 0 0 0-.528.47l-.5 8.5a.5.5 0 0 0 .998.058l.5-8.5a.5.5 0 0 0-.47-.528ZM8 4.5a.5.5 0 0 0-.5.5v8.5a.5.5 0 0 0 1 0V5a.5.5 0 0 0-.5-.5Z"/>
                        </svg>
                      </div>
                    </div>
                    <h2 className="h4 mb-3">Порахуємо вуглеводи</h2>
                    <p className="text-muted mb-4">Дізнайся, скільки вуглеводів у твоїй вареній страві</p>
                    <button onClick={handleStartAssistant} className="btn btn-primary btn-lg w-100">
                      Почати
                    </button>
                  </div>
                )}
                
                {/* Step: askProduct */}
                {step === 'askProduct' && (
                  <div>
                    <div className="mb-3">
                      <span className="badge bg-secondary mb-2">Крок 1/4</span>
                      <h2 className="h4 mb-0">Що ти хочеш приготувати?</h2>
                    </div>
                    <form onSubmit={handleProductSubmit}>
                      <div className="mb-3 position-relative" ref={suggestionsRef}>
                        <input
                          type="text"
                          value={inputValue}
                          onChange={(e) => handleProductInputChange(e.target.value)}
                          onFocus={() => {
                            if (suggestions.length > 0) {
                              setShowSuggestions(true);
                            }
                          }}
                          placeholder="гречка, рис, макарони..."
                          className={`form-control form-control-lg ${errorMessage ? 'is-invalid' : ''}`}
                          autoFocus
                        />
                        
                        {/* Autocomplete Suggestions */}
                        {showSuggestions && suggestions.length > 0 && (
                          <div className="autocomplete-suggestions">
                            {suggestions.map((suggestion, index) => (
                              <div
                                key={index}
                                onClick={() => handleSuggestionClick(suggestion)}
                                className="autocomplete-item"
                              >
                                {suggestion}
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {errorMessage && (
                          <div className="invalid-feedback d-block">{errorMessage}</div>
                        )}
                        <div className="form-text">Підказка: можна вказати вагу, наприклад "100 грам рису"</div>
                      </div>
                      <button type="submit" className="btn btn-primary btn-lg w-100">
                        Продовжити
                      </button>
                    </form>
                  </div>
                )}
                
                {/* Step: askRawCarbsPer100g */}
                {step === 'askRawCarbsPer100g' && (
                  <div>
                    <div className="mb-3">
                      <h2 className="h4 mb-2">Не знайшов «{currentInput?.productName}»</h2>
                      <p className="text-muted">Скільки вуглеводів у 100 г сирого продукту?</p>
                    </div>
                    <div className="alert alert-info">
                      <small>Збережу твою відповідь і запам'ятаю наступного разу</small>
                    </div>
                    <form onSubmit={handleRawCarbsSubmit}>
                      <div className="mb-3">
                        <label className="form-label">Грамів вуглеводів на 100г</label>
                        <input
                          type="number"
                          step="0.1"
                          inputMode="decimal"
                          value={inputValue}
                          onChange={(e) => {
                            setInputValue(e.target.value);
                            setErrorMessage('');
                          }}
                          placeholder="77"
                          className={`form-control form-control-lg ${errorMessage ? 'is-invalid' : ''}`}
                          autoFocus
                        />
                        {errorMessage && (
                          <div className="invalid-feedback d-block">{errorMessage}</div>
                        )}
                        <div className="form-text">Можна знайти на упаковці продукту</div>
                      </div>
                      <button type="submit" className="btn btn-primary btn-lg w-100">
                        Продовжити
                      </button>
                    </form>
                  </div>
                )}
                
                {/* Step: maybeAskRawWeight */}
                {step === 'maybeAskRawWeight' && (
                  <div>
                    <div className="mb-3">
                      <span className="badge bg-secondary mb-2">Крок 2/4</span>
                      <h2 className="h4 mb-2">Скільки грамів сирого {currentInput?.productName}?</h2>
                      <p className="text-muted">До готування</p>
                    </div>
                    <form onSubmit={handleRawWeightSubmit}>
                      <div className="mb-3">
                        <input
                          type="number"
                          step="0.1"
                          inputMode="decimal"
                          value={inputValue}
                          onChange={(e) => {
                            setInputValue(e.target.value);
                            setErrorMessage('');
                          }}
                          placeholder="100"
                          className={`form-control form-control-lg ${errorMessage ? 'is-invalid' : ''}`}
                          autoFocus
                        />
                        {errorMessage && (
                          <div className="invalid-feedback d-block">{errorMessage}</div>
                        )}
                      </div>
                      <button type="submit" className="btn btn-primary btn-lg w-100">
                        Продовжити
                      </button>
                    </form>
                  </div>
                )}
                
                {/* Step: askEmptyBowlWeight */}
                {step === 'askEmptyBowlWeight' && (
                  <div>
                    <div className="mb-3">
                      <span className="badge bg-secondary mb-2">Крок 3/4</span>
                      <h2 className="h4 mb-2">Скільки важить порожня миска?</h2>
                      <p className="text-muted">В якій будеш варити</p>
                    </div>
                    <form onSubmit={handleEmptyBowlWeightSubmit}>
                      <div className="mb-3">
                        <input
                          type="number"
                          step="0.1"
                          inputMode="decimal"
                          value={inputValue}
                          onChange={(e) => {
                            setInputValue(e.target.value);
                            setErrorMessage('');
                          }}
                          placeholder="500"
                          className={`form-control form-control-lg ${errorMessage ? 'is-invalid' : ''}`}
                          autoFocus
                        />
                        {errorMessage && (
                          <div className="invalid-feedback d-block">{errorMessage}</div>
                        )}
                      </div>
                      <button type="submit" className="btn btn-primary btn-lg w-100">
                        Продовжити
                      </button>
                    </form>
                  </div>
                )}
                
                {/* Step: askFullBowlWeight */}
                {step === 'askFullBowlWeight' && (
                  <div>
                    <div className="mb-3">
                      <span className="badge bg-secondary mb-2">Крок 4/4</span>
                      <h2 className="h4 mb-2">Скільки важить миска з готовою стравою?</h2>
                      <p className="text-muted">Після приготування</p>
                    </div>
                    <form onSubmit={handleFullBowlWeightSubmit}>
                      <div className="mb-3">
                        <input
                          type="number"
                          step="0.1"
                          inputMode="decimal"
                          value={inputValue}
                          onChange={(e) => {
                            setInputValue(e.target.value);
                            setErrorMessage('');
                          }}
                          placeholder="750"
                          className={`form-control form-control-lg ${errorMessage ? 'is-invalid' : ''}`}
                          autoFocus
                        />
                        {errorMessage && (
                          <div className="invalid-feedback d-block">{errorMessage}</div>
                        )}
                      </div>
                      <button type="submit" className="btn btn-success btn-lg w-100">
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
                      <h2 className="h3 text-capitalize mb-4">{currentInput.productName}</h2>
                    </div>

                    <div className="row g-3 mb-4">
                      <div className="col-12">
                        <div className="card bg-primary bg-opacity-10 border-primary border-opacity-25">
                          <div className="card-body text-center">
                            <small className="text-primary d-block mb-1">У всій страві</small>
                            <h3 className="display-5 fw-bold text-primary mb-0">
                              {currentResult.totalCarbs.toFixed(1)} <small className="fs-5">г</small>
                            </h3>
                          </div>
                        </div>
                      </div>
                      
                      <div className="col-12">
                        <div className="card bg-success bg-opacity-10 border-success border-opacity-25">
                          <div className="card-body text-center">
                            <small className="text-success d-block mb-1">У 100 г готової</small>
                            <h3 className="display-5 fw-bold text-success mb-0">
                              {currentResult.carbsPer100gCooked.toFixed(1)} <small className="fs-5">г</small>
                            </h3>
                          </div>
                        </div>
                      </div>
                      
                      <div className="col-12">
                        <div className="card bg-warning bg-opacity-10 border-warning border-opacity-25">
                          <div className="card-body text-center">
                            <small className="text-warning d-block mb-1">Хлібні одиниці</small>
                            <h3 className="display-5 fw-bold text-warning mb-0">
                              {(currentResult.totalCarbs / 12).toFixed(1)} <small className="fs-5">ХО</small>
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
                        Зберегти в історію
                      </button>
                      <button onClick={handleNewDish} className="btn btn-outline-secondary btn-lg">
                        Нова страва
                      </button>
                    </div>
                  </div>
                )}
                
              </div>
            </div>
            
            {/* History Section */}
            {history.length > 0 && (
              <div className="card shadow-lg border-0 rounded-4">
                <div className="card-body p-4">
                  <h2 className="h4 mb-3">Історія</h2>
                  <div className="list-group list-group-flush">
                    {history.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setSelectedHistoryItem(item)}
                        className="list-group-item list-group-item-action d-flex justify-content-between align-items-center border-0 rounded-3 mb-2"
                      >
      <div>
                          <h6 className="mb-1 text-capitalize">{item.productName}</h6>
                          <small className="text-muted">{formatDate(item.createdAt)}</small>
                        </div>
                        <div className="text-end">
                          <div className="h5 mb-0 text-success fw-bold">
                            {item.carbsPer100gCooked.toFixed(1)}
                          </div>
                          <small className="text-muted">г / 100г</small>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
          </div>
        </div>
      </div>
      
      {/* History Detail Modal */}
      {selectedHistoryItem && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setSelectedHistoryItem(null)}>
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content rounded-4">
              <div className="modal-header border-0">
                <div>
                  <h5 className="modal-title text-capitalize">{selectedHistoryItem.productName}</h5>
                  <small className="text-muted">{formatDate(selectedHistoryItem.createdAt)}</small>
                </div>
                <button type="button" className="btn-close" onClick={() => setSelectedHistoryItem(null)}></button>
              </div>
              <div className="modal-body">
                <div className="card bg-light mb-3">
                  <div className="card-body">
                    <h6 className="card-title">Вхідні дані</h6>
                    <div className="small">
                      <div className="d-flex justify-content-between mb-1">
                        <span className="text-muted">Сирий продукт</span>
                        <strong>{selectedHistoryItem.rawWeight} г</strong>
                      </div>
                      <div className="d-flex justify-content-between mb-1">
                        <span className="text-muted">Вуглеводи (сирий)</span>
                        <strong>{selectedHistoryItem.rawCarbsPer100g} г/100г</strong>
                      </div>
                      <div className="d-flex justify-content-between mb-1">
                        <span className="text-muted">Порожня миска</span>
                        <strong>{selectedHistoryItem.emptyBowlWeight} г</strong>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">Повна миска</span>
                        <strong>{selectedHistoryItem.fullBowlWeight} г</strong>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="card bg-success bg-opacity-10 border-success">
                  <div className="card-body">
                    <h6 className="card-title">Результати</h6>
                    <div className="small">
                      <div className="d-flex justify-content-between mb-1">
                        <span className="text-muted">Вага готової</span>
                        <strong className="text-success">{selectedHistoryItem.cookedWeight.toFixed(0)} г</strong>
                      </div>
                      <div className="d-flex justify-content-between mb-1">
                        <span className="text-muted">Всього вуглеводів</span>
                        <strong className="text-primary">{selectedHistoryItem.totalCarbs.toFixed(1)} г</strong>
                      </div>
                      <div className="d-flex justify-content-between mb-1">
                        <span className="text-muted">На 100г готової</span>
                        <strong className="text-success">{selectedHistoryItem.carbsPer100gCooked.toFixed(1)} г</strong>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">Хлібні одиниці</span>
                        <strong className="text-warning">{(selectedHistoryItem.totalCarbs / 12).toFixed(1)} ХО</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer border-0">
                <button type="button" className="btn btn-secondary w-100" onClick={() => setSelectedHistoryItem(null)}>
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
