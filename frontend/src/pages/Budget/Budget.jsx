import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Budget.css';

const Budget = ({ logout }) => {
  const navigate = useNavigate();
  const [budget, setBudget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    categories: [
      { name: 'Food', label: 'Food & Dining', allocated: 0, icon: '🍔', color: '#FF6B6B' },
      { name: 'Transportation', label: 'Transportation', allocated: 0, icon: '🚗', color: '#4ECDC4' },
      { name: 'Entertainment', label: 'Entertainment', allocated: 0, icon: '🎬', color: '#FFD166' },
      { name: 'Shopping', label: 'Shopping', allocated: 0, icon: '🛍️', color: '#06D6A0' },
      { name: 'Bills', label: 'Bills & Utilities', allocated: 0, icon: '💡', color: '#118AB2' },
      { name: 'Healthcare', label: 'Healthcare', allocated: 0, icon: '🏥', color: '#EF476F' },
      { name: 'Education', label: 'Education', allocated: 0, icon: '📚', color: '#073B4C' },
      { name: 'Other', label: 'Others', allocated: 0, icon: '📦', color: '#6A0572' }
    ]
  });

  useEffect(() => {
    fetchBudget();
  }, []);

  const fetchBudget = async () => {
    try {
      const response = await axios.get('/budget');
      setBudget(response.data);
      // Map backend categories to our format with icons and colors
      setFormData(prev => ({
        ...prev,
        amount: response.data.amount,
        categories: prev.categories.map(cat => {
          const backendCat = response.data.categories.find(bc => bc.name === cat.name);
          return {
            ...cat,
            allocated: backendCat?.allocated || 0
          };
        })
      }));
    } catch (err) {
      if (err.response?.status === 404) {
        setBudget(null);
      } else if (err.response?.status === 401) {
        logout();
      } else {
        setError('Failed to load budget');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'amount') {
      setFormData({
        ...formData,
        [name]: parseFloat(value) || 0
      });
    }
  };

  const handleCategoryChange = (index, value) => {
    const newCategories = [...formData.categories];
    newCategories[index].allocated = parseFloat(value) || 0;
    setFormData({
      ...formData,
      categories: newCategories
    });
  };

  const calculateRemaining = () => {
    const totalAllocated = formData.categories.reduce((sum, cat) => sum + cat.allocated, 0);
    return formData.amount - totalAllocated;
  };

  const validateBudget = () => {
    const totalAllocated = formData.categories.reduce((sum, cat) => sum + cat.allocated, 0);
    
    if (formData.amount <= 0) {
      setError('Budget amount must be greater than ₹0');
      return false;
    }

    if (totalAllocated > formData.amount) {
      setError(`Total allocated (₹${totalAllocated}) exceeds budget amount (₹${formData.amount})`);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateBudget()) {
      return;
    }

    try {
      const method = budget ? 'put' : 'post';
      const response = await axios[method]('/budget', {
        amount: formData.amount,
        categories: formData.categories.map(({ name, allocated }) => ({
          name,
          allocated,
          spent: 0
        }))
      });
      setBudget(response.data);
      setEditing(false);
      alert(budget ? 'Budget updated successfully!' : 'Budget created successfully!');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save budget');
    }
  };

  // Get spent amount from budget data (already calculated in backend)
  const getCategorySpent = (categoryName) => {
    if (!budget) return 0;
    const category = budget.categories.find(cat => cat.name === categoryName);
    return category ? category.spent : 0;
  };

  const getTotalSpent = () => {
    if (!budget) return 0;
    return budget.categories.reduce((sum, cat) => sum + (cat.spent || 0), 0);
  };

  const getTotalAllocated = () => {
    if (!budget) return 0;
    return budget.categories.reduce((sum, cat) => sum + (cat.allocated || 0), 0);
  };

  if (loading) {
    return (
      <div className="budget-loading">
        <div className="spinner"></div>
        <p>Loading your budget...</p>
      </div>
    );
  }

  return (
    <div className="budget-container">
      {/* Header */}
      <header className="budget-header">
        <div className="header-content">
          <div className="logo-section">
            <h1>💰 Budget Planner</h1>
            <p className="subtitle">Manage your monthly expenses effectively</p>
          </div>
          <div className="header-actions">
            <button 
              onClick={() => navigate('/dashboard')}
              className="btn btn-secondary"
            >
              ← Dashboard
            </button>
            <button 
              onClick={() => {
                if (window.confirm('Are you sure you want to logout?')) {
                  logout();
                }
              }} 
              className="btn btn-danger"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {error && <div className="error-alert">{error}</div>}

      <div className="budget-content">
        {/* Main Budget Card */}
        <div className="main-budget-card">
          <div className="budget-card-header">
            <div>
              <h2>Monthly Budget Overview</h2>
              <p className="budget-date">
                {budget ? `Created: ${new Date(budget.createdAt).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}` : 'No budget set for this month'}
              </p>
            </div>
            <button 
              onClick={() => setEditing(!editing)}
              className={`btn ${editing ? 'btn-secondary' : 'btn-primary'}`}
            >
              {budget && !editing ? '✏️ Edit Budget' : editing ? '❌ Cancel' : '➕ Create Budget'}
            </button>
          </div>

          {budget && !editing ? (
            <div className="budget-display">
              <div className="budget-summary">
                <div className="total-budget">
                  <span className="budget-label">Total Budget</span>
                  <span className="budget-value">₹{budget.amount.toLocaleString('en-IN')}</span>
                </div>
                <div className="budget-stats">
                  <div className="stat-item">
                    <span className="stat-label">Total Spent</span>
                    <span className="stat-value spent">₹{getTotalSpent().toLocaleString('en-IN')}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Remaining</span>
                    <span className="stat-value remaining">
                      ₹{(budget.amount - getTotalSpent()).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Utilization</span>
                    <span className="stat-value">
                      {((getTotalSpent() / budget.amount) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="progress-container">
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ 
                      width: `${Math.min((getTotalSpent() / budget.amount) * 100, 100)}%`,
                      backgroundColor: getTotalSpent() > budget.amount ? '#EF4444' : '#10B981'
                    }}
                  ></div>
                </div>
                <div className="progress-labels">
                  <span>0%</span>
                  <span>{Math.min(Math.round((getTotalSpent() / budget.amount) * 100), 100)}%</span>
                  <span>100%</span>
                </div>
              </div>

              <div className="categories-grid">
                {formData.categories.map((category, index) => {
                  // Get spent amount from budget data
                  const spent = getCategorySpent(category.name);
                  const allocated = category.allocated;
                  const percentage = allocated > 0 ? (spent / allocated) * 100 : 0;
                  const isExceeded = spent > allocated;
                  const isWarning = spent > allocated * 0.8;

                  return (
                    <div key={index} className="category-card">
                      <div className="category-header">
                        <div className="category-icon" style={{ backgroundColor: category.color }}>
                          {category.icon}
                        </div>
                        <div>
                          <h4>{category.label}</h4>
                          <p className="category-subtitle">
                            Spent: ₹{spent.toLocaleString('en-IN')} / ₹{allocated.toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>
                      
                      <div className="category-progress">
                        <div className="progress-bar small">
                          <div 
                            className="progress-fill"
                            style={{ 
                              width: `${Math.min(percentage, 100)}%`,
                              backgroundColor: isExceeded ? '#EF4444' : isWarning ? '#F59E0B' : '#10B981'
                            }}
                          ></div>
                        </div>
                        <div className="progress-info">
                          <span className="percentage">{percentage.toFixed(1)}%</span>
                          {isExceeded && <span className="exceeded-badge">Over Budget</span>}
                        </div>
                      </div>

                      <div className="category-details">
                        <div className="detail-item">
                          <span>Allocated</span>
                          <strong>₹{allocated.toLocaleString('en-IN')}</strong>
                        </div>
                        <div className="detail-item">
                          <span>Spent</span>
                          <strong className={isExceeded ? 'exceeded' : ''}>
                            ₹{spent.toLocaleString('en-IN')}
                          </strong>
                        </div>
                        <div className="detail-item">
                          <span>Remaining</span>
                          <strong>₹{Math.max(0, allocated - spent).toLocaleString('en-IN')}</strong>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="budget-form">
              <div className="form-group">
                <label className="form-label">
                  <span>Total Monthly Budget (₹)</span>
                  <span className="hint">Enter your total budget for the month</span>
                </label>
                <div className="amount-input-container">
                  <span className="currency-symbol">₹</span>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    required
                    min="0"
                    step="100"
                    placeholder="50000"
                    className="amount-input"
                  />
                  <div className="quick-amounts">
                    {[10000, 25000, 50000, 100000].map(amount => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => setFormData({...formData, amount})}
                        className="quick-amount-btn"
                      >
                        ₹{amount.toLocaleString('en-IN')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Category Allocation</h3>
                <p className="section-description">Distribute your budget across different spending categories</p>
                
                <div className="categories-allocation">
                  {formData.categories.map((category, index) => (
                    <div key={index} className="allocation-item">
                      <div className="allocation-header">
                        <div className="category-icon small" style={{ backgroundColor: category.color }}>
                          {category.icon}
                        </div>
                        <span className="category-name">{category.label}</span>
                      </div>
                      <div className="allocation-input-group">
                        <span className="currency-input">₹</span>
                        <input
                          type="number"
                          value={category.allocated}
                          onChange={(e) => handleCategoryChange(index, e.target.value)}
                          min="0"
                          step="100"
                          placeholder="0"
                          className="allocation-input"
                        />
                      </div>
                      <span className="allocation-value">
                        ₹{category.allocated.toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="allocation-summary">
                <div className="summary-item">
                  <span>Total Allocated</span>
                  <strong>₹{formData.categories.reduce((sum, cat) => sum + cat.allocated, 0).toLocaleString('en-IN')}</strong>
                </div>
                <div className="summary-item">
                  <span>Remaining</span>
                  <strong className={calculateRemaining() < 0 ? 'negative' : 'positive'}>
                    ₹{calculateRemaining().toLocaleString('en-IN')}
                  </strong>
                </div>
                <div className="summary-item">
                  <span>Total Budget</span>
                  <strong>₹{formData.amount.toLocaleString('en-IN')}</strong>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" onClick={() => setEditing(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {budget ? 'Update Budget' : 'Create Budget'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Sidebar */}
        <div className="budget-sidebar">
          <div className="sidebar-card">
            <h3>📈 Budget Statistics</h3>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">💰</div>
                <div className="stat-content">
                  <span className="stat-title">Avg. Daily Spend</span>
                  <span className="stat-value">
                    ₹{(getTotalSpent() / new Date().getDate()).toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🎯</div>
                <div className="stat-content">
                  <span className="stat-title">On Track</span>
                  <span className="stat-value">
                    {budget && ((budget.amount / 30) * new Date().getDate() > getTotalSpent()) ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="sidebar-card">
            <h3>💡 Budget Tips</h3>
            <div className="tip-list">
              <div className="tip-item">
                <div className="tip-icon">📊</div>
                <div className="tip-content">
                  <strong>Review Weekly</strong>
                  <p>Check your spending every Sunday to stay on track</p>
                </div>
              </div>
              <div className="tip-item">
                <div className="tip-icon">🎯</div>
                <div className="tip-content">
                  <strong>Set Realistic Goals</strong>
                  <p>Adjust categories based on your actual spending patterns</p>
                </div>
              </div>
              <div className="tip-item">
                <div className="tip-icon">🔔</div>
                <div className="tip-content">
                  <strong>Enable Alerts</strong>
                  <p>Get notified when you reach 80% of any category</p>
                </div>
              </div>
            </div>
          </div>

          <div className="sidebar-card">
            <h3>🚨 Budget Alerts</h3>
            <div className="alert-list">
              {budget && formData.categories.map((category, index) => {
                const spent = getCategorySpent(category.name);
                const allocated = category.allocated;
                
                if (spent > allocated) {
                  return (
                    <div key={index} className="alert-item alert-danger">
                      <div className="alert-icon">⚠️</div>
                      <div className="alert-content">
                        <strong>{category.label}</strong>
                        <p>Exceeded by ₹{(spent - allocated).toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                  );
                } else if (spent > allocated * 0.8) {
                  return (
                    <div key={index} className="alert-item alert-warning">
                      <div className="alert-icon">⚠️</div>
                      <div className="alert-content">
                        <strong>{category.label}</strong>
                        <p>Close to limit ({((spent/allocated)*100).toFixed(1)}%)</p>
                      </div>
                    </div>
                  );
                }
                return null;
              }).filter(alert => alert)}

              {(!budget || formData.categories.every(cat => getCategorySpent(cat.name) <= cat.allocated * 0.8)) && (
                <div className="alert-item alert-success">
                  <div className="alert-icon">✅</div>
                  <div className="alert-content">
                    <strong>All Good!</strong>
                    <p>All categories are within budget limits</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Budget;