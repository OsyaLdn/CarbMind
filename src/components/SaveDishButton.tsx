import { useState } from 'react';
import type { DishIngredient, DishHistoryItem, DishResult } from '../types/dish';
import type { UserSavedDish } from '../types/userDish';

type SaveDishButtonProps = {
  ingredients: DishIngredient[];
  carbsPer100g: number;
  breadUnitsPer100g: number;
  onSave: (dish: UserSavedDish) => void;
  // Optional: for saving to dish history as well
  dishResult?: DishResult;
  emptyBowlWeight?: number;
  fullBowlWeight?: number;
  onSaveToHistory?: (historyItem: DishHistoryItem) => void;
};

export function SaveDishButton({ 
  ingredients, 
  carbsPer100g, 
  breadUnitsPer100g, 
  onSave,
  dishResult,
  emptyBowlWeight,
  fullBowlWeight,
  onSaveToHistory
}: SaveDishButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [dishName, setDishName] = useState('');
  const [notes, setNotes] = useState('');
  const [saveToHistory, setSaveToHistory] = useState(true); // Default to true

  const handleSave = () => {
    if (!dishName.trim()) {
      alert('Будь ласка, введіть назву страви');
      return;
    }

    const now = new Date();
    const timestamp = Date.now();
    
    // Save to library (always)
    const newDish: UserSavedDish = {
      id: `user-dish-${timestamp}`,
      name: dishName.trim(),
      carbsPer100g,
      breadUnitsPer100g,
      createdAt: now.toISOString(),
      ingredients: ingredients.map(ing => ({ ...ing })), // Deep copy
      notes: notes.trim() || undefined,
    };

    onSave(newDish);

    // Also save to history if requested and all required data is available
    let savedToHistory = false;
    if (saveToHistory && onSaveToHistory && dishResult && emptyBowlWeight !== undefined && fullBowlWeight !== undefined) {
      const timeOfDay = now.toLocaleTimeString('uk-UA', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });

      const historyItem: DishHistoryItem = {
        id: timestamp.toString(),
        dishName: dishName.trim(),
        createdAt: now.toISOString(),
        timeOfDay,
        emptyBowlWeight,
        fullBowlWeight,
        ingredients: ingredients.map(ing => ({ ...ing })),
        result: dishResult,
      };

      onSaveToHistory(historyItem);
      savedToHistory = true;
    }

    // Show success message
    if (savedToHistory) {
      alert(`✅ "${dishName.trim()}" збережено в бібліотеку та історію!`);
    } else {
      alert(`✅ "${dishName.trim()}" збережено в бібліотеку!`);
    }

    setShowModal(false);
    setDishName('');
    setNotes('');
    setSaveToHistory(true);
  };

  const canSaveToHistory = onSaveToHistory && dishResult && emptyBowlWeight !== undefined && fullBowlWeight !== undefined;

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="btn btn-success w-100 mt-3"
      >
        💾 Зберегти страву
      </button>

      {showModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">💾 Зберегти рецепт</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label fw-bold">Назва страви *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Наприклад: М'ясний соус для лазаньї"
                    value={dishName}
                    onChange={(e) => setDishName(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-bold">Примітки (необов'язково)</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="Особливі інгредієнти, спосіб приготування..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                {canSaveToHistory && (
                  <div className="mb-3">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="saveToHistory"
                        checked={saveToHistory}
                        onChange={(e) => setSaveToHistory(e.target.checked)}
                      />
                      <label className="form-check-label" htmlFor="saveToHistory">
                        📜 Також зберегти в історію обчислень
                      </label>
                    </div>
                  </div>
                )}

                <div className="alert alert-info py-2 small">
                  <strong>ℹ️ Підказка:</strong> Ця страва буде доступна як інгредієнт для інших страв!
                  <div className="mt-2">
                    <strong>Вуглеводи:</strong> {carbsPer100g.toFixed(2)} г/100г | 
                    <strong> ХО:</strong> {breadUnitsPer100g.toFixed(2)} на 100г
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Скасувати
                </button>
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={handleSave}
                >
                  💾 Зберегти
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

