import { useState } from 'react';
import type { DishIngredient } from '../types/dish';
import type { UserSavedDish } from '../types/userDish';

type SaveDishButtonProps = {
  ingredients: DishIngredient[];
  carbsPer100g: number;
  breadUnitsPer100g: number;
  onSave: (dish: UserSavedDish) => void;
};

export function SaveDishButton({ ingredients, carbsPer100g, breadUnitsPer100g, onSave }: SaveDishButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [dishName, setDishName] = useState('');
  const [notes, setNotes] = useState('');

  const handleSave = () => {
    if (!dishName.trim()) {
      alert('Будь ласка, введіть назву страви');
      return;
    }

    const newDish: UserSavedDish = {
      id: `user-dish-${Date.now()}`,
      name: dishName.trim(),
      carbsPer100g,
      breadUnitsPer100g,
      createdAt: new Date().toISOString(),
      ingredients: ingredients.map(ing => ({ ...ing })), // Deep copy
      notes: notes.trim() || undefined,
    };

    onSave(newDish);
    setShowModal(false);
    setDishName('');
    setNotes('');
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="btn btn-success w-100 mt-3"
      >
        💾 Зберегти як мій рецепт
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

