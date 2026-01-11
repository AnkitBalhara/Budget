import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../App.css';

const Expenses = () => {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [budget, setBudget] = useState(null);
  const [filters, setFilters] = useState({
    category: 'all',
    month: new Date().toISOString().slice(0, 7), // YYYY-MM
    search: ''
  });
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    category: 'Food',
    date: new Date().toISOString().slice(0, 16) // YYYY-MM-DDTHH:mm
  });

  const categories = ['Food', 'Transportation', 'Entertainment', 'Shopping', 'Bills', 'Healthcare', 'Education', 'Other'];

  useEffect(() => {
    checkAuth();
    fetchData();
  }, []);

  useEffect(() => {
    filterExpenses();
  }, [expenses, filters]);

  const checkAuth = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    }
  };

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch expenses
      const expensesResponse = await axios.get('http://localhost:5000/api/expenses', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Fetch budget for category limits
      try {
        const budgetResponse = await axios.get('http://localhost:5000/api/budget', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setBudget(budgetResponse.data);
      } catch (budgetErr) {
        // Budget might not exist yet
        console.log('No budget set yet');
      }

      setExpenses(expensesResponse.data);
      setFilteredExpenses(expensesResponse.data);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        setError('Failed to load expenses');
      }
    } finally {
      setLoading(false);
    }
  };

  const filterExpenses = () => {
    let filtered = [...expenses];

    // Filter by category
    if (filters.category !== 'all') {
      filtered = filtered.filter(exp => exp.category === filters.category);
    }

    // Filter by month
    if (filters.month) {
      filtered = filtered.filter(exp => {
        const expenseDate = new Date(exp.date);
        return expenseDate.getFullYear() === parseInt(filters.month.slice(0, 4)) &&
               (expenseDate.getMonth() + 1) === parseInt(filters.month.slice(5, 7));
      });
    }

    // Filter by search term
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(exp =>
        exp.description.toLowerCase().includes(searchTerm) ||
        exp.category.toLowerCase().includes(searchTerm)
      );
    }

    setFilteredExpenses(filtered);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({
      ...filters,
      [name]: value
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'amount' ? parseFloat(value) || '' : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.amount || !formData.description) {
      setError('Please fill all required fields');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const expenseData = {
        ...formData,
        amount: parseFloat(formData.amount),
        date: new Date(formData.date).toISOString()
      };

      await axios.post('http://localhost:5000/api/expenses', expenseData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Reset form
      setFormData({
        amount: '',
        description: '',
        category: 'Food',
        date: new Date().toISOString().slice(0, 16)
      });

      // Refresh data
      fetchData();
      
      // Show success message
      setError('');
      alert('Expense added successfully!');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add expense');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/expenses/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete expense');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const getCategorySpent = (categoryName) => {
    return filteredExpenses
      .filter(exp => exp.category === categoryName)
      .reduce((sum, exp) => sum + exp.amount, 0);
  };

  const getCategoryLimit = (categoryName) => {
    if (!budget) return 0;
    const category = budget.categories.find(cat => cat.name === categoryName);
    return category ? category.allocated : 0;
  };

  const getTotalSpent = () => {
    return filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="auth-container">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Navigation Bar */}
      <nav className="navbar">
        <div>
          <h1 style={{ margin: 0 }}>📝 Expense Manager</h1>
          <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#718096' }}>
            Track and manage all your expenses
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => navigate('/dashboard')}
            className="logout-btn"
            style={{ background: '#4299e1' }}
          >
            Dashboard
          </button>
          <button 
            onClick={() => navigate('/budget')}
            className="logout-btn"
            style={{ background: '#48bb78' }}
          >
            Budget
          </button>
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </nav>

      {error && <div className="error">{error}</div>}

      <div className="dashboard-grid">
        {/* Add Expense Form */}
        <div className="card">
          <h3>➕ Add New Expense</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Amount ($)</label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                required
                min="0"
                step="0.01"
                placeholder="0.00"
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <input
                type="text"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
                placeholder="What was this for?"
              />
            </div>

            <div className="form-group">
              <label>Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                required
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Date & Time</label>
              <input
                type="datetime-local"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                required
              />
            </div>

            <button type="submit" className="btn">
              Add Expense
            </button>
          </form>
        </div>

        {/* Category Summary */}
        <div className="card">
          <h3>📊 Category Summary</h3>
          <div style={{ marginTop: '15px' }}>
            {categories.map(category => {
              const spent = getCategorySpent(category);
              const limit = getCategoryLimit(category);
              const percentage = limit > 0 ? (spent / limit) * 100 : 0;
              const isExceeded = limit > 0 && spent > limit;
              
              return (
                <div key={category} style={{ marginBottom: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{category}</span>
                    <span style={{ fontWeight: 'bold' }}>
                      ${spent.toFixed(2)}
                      {limit > 0 && ` / $${limit.toFixed(2)}`}
                    </span>
                  </div>
                  
                  {limit > 0 && (
                    <>
                      <div style={{
                        width: '100%',
                        height: '6px',
                        background: '#e2e8f0',
                        borderRadius: '3px',
                        marginTop: '5px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${Math.min(percentage, 100)}%`,
                          height: '100%',
                          background: isExceeded ? '#fc8181' : percentage > 80 ? '#ed8936' : '#48bb78'
                        }}></div>
                      </div>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '12px',
                        color: '#718096',
                        marginTop: '3px'
                      }}>
                        <span>${spent.toFixed(2)}</span>
                        <span>{percentage.toFixed(1)}%</span>
                        <span>${limit.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
            
            <div style={{
              marginTop: '20px',
              padding: '15px',
              background: '#f7fafc',
              borderRadius: '5px',
              borderLeft: '4px solid #4299e1'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>Total This Month:</strong>
                <strong style={{ color: '#4299e1', fontSize: '18px' }}>
                  ${getTotalSpent().toFixed(2)}
                </strong>
              </div>
              {budget && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '5px',
                  fontSize: '14px'
                }}>
                  <span>Monthly Budget:</span>
                  <span>${budget.amount.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginTop: '30px' }}>
        <h3>🔍 Filter Expenses</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginTop: '15px' }}>
          <div className="form-group">
            <label>Category</label>
            <select
              name="category"
              value={filters.category}
              onChange={handleFilterChange}
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Month</label>
            <input
              type="month"
              name="month"
              value={filters.month}
              onChange={handleFilterChange}
            />
          </div>

          <div className="form-group">
            <label>Search</label>
            <input
              type="text"
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Search expenses..."
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              onClick={() => setFilters({
                category: 'all',
                month: new Date().toISOString().slice(0, 7),
                search: ''
              })}
              className="logout-btn"
              style={{ width: '100%', background: '#718096' }}
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Expenses List */}
      <div className="card" style={{ marginTop: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>📋 All Expenses</h3>
          <span style={{ color: '#718096' }}>
            {filteredExpenses.length} expense{filteredExpenses.length !== 1 ? 's' : ''} found
          </span>
        </div>

        {filteredExpenses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>📭</div>
            <h4>No expenses found</h4>
            <p style={{ color: '#718096', marginTop: '10px' }}>
              {filters.category !== 'all' || filters.search || filters.month !== new Date().toISOString().slice(0, 7)
                ? 'Try changing your filters'
                : 'Add your first expense using the form above'}
            </p>
          </div>
        ) : (
          <div style={{ marginTop: '20px' }}>
            {filteredExpenses.map(expense => {
              const categoryLimit = getCategoryLimit(expense.category);
              const categorySpent = getCategorySpent(expense.category);
              const isOverLimit = categoryLimit > 0 && categorySpent > categoryLimit;
              
              return (
                <div key={expense._id} className="expense-item">
                  <div className="expense-info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <h4 style={{ margin: 0 }}>{expense.description}</h4>
                      {isOverLimit && expense.category === expense.category && (
                        <span style={{
                          background: '#fed7d7',
                          color: '#c53030',
                          fontSize: '12px',
                          padding: '2px 8px',
                          borderRadius: '3px'
                        }}>
                          OVER BUDGET
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '15px', marginTop: '5px', flexWrap: 'wrap' }}>
                      <span className="expense-category" style={{
                        background: '#e2e8f0',
                        padding: '2px 8px',
                        borderRadius: '3px',
                        fontSize: '12px'
                      }}>
                        {expense.category}
                      </span>
                      <span style={{ color: '#718096', fontSize: '14px' }}>
                        {formatDate(expense.date)}
                      </span>
                      {categoryLimit > 0 && (
                        <span style={{ color: '#718096', fontSize: '14px' }}>
                          Limit: ${categoryLimit.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="expense-right">
                    <div style={{ textAlign: 'right' }}>
                      <span className="expense-amount">${expense.amount.toFixed(2)}</span>
                      <div style={{ marginTop: '5px' }}>
                        <button
                          onClick={() => handleDelete(expense._id)}
                          className="delete-btn"
                          style={{ fontSize: '12px', padding: '5px 10px' }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary Stats */}
      {filteredExpenses.length > 0 && (
        <div className="card" style={{ marginTop: '30px' }}>
          <h3>📈 Expense Statistics</h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
            gap: '20px',
            marginTop: '20px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4299e1' }}>
                {filteredExpenses.length}
              </div>
              <div style={{ fontSize: '14px', color: '#718096', marginTop: '5px' }}>
                Total Expenses
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#48bb78' }}>
                ${getTotalSpent().toFixed(2)}
              </div>
              <div style={{ fontSize: '14px', color: '#718096', marginTop: '5px' }}>
                Total Amount
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ed8936' }}>
                ${(getTotalSpent() / filteredExpenses.length).toFixed(2)}
              </div>
              <div style={{ fontSize: '14px', color: '#718096', marginTop: '5px' }}>
                Average per Expense
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#9f7aea' }}>
                {categories.reduce((maxCat, cat) => {
                  const catSpent = getCategorySpent(cat);
                  const maxSpent = getCategorySpent(maxCat);
                  return catSpent > maxSpent ? cat : maxCat;
                }, categories[0])}
              </div>
              <div style={{ fontSize: '14px', color: '#718096', marginTop: '5px' }}>
                Highest Spending Category
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;