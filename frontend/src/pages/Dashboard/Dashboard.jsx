import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend);

const Dashboard = ({ logout }) => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [newExpense, setNewExpense] = useState({
    amount: '',
    description: '',
    category: 'Food'
  });

  const categories = ['Food', 'Transportation', 'Entertainment', 'Shopping', 'Bills', 'Healthcare', 'Education', 'Other'];

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        logout();
        return;
      }

      const response = await axios.get('/dashboard');
      setDashboardData(response.data);
      setShowBudgetForm(!response.data.budget);
    } catch (err) {
      if (err.response?.status === 401) {
        logout();
      } else {
        setError('Failed to load dashboard data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExpenseChange = (e) => {
    const { name, value } = e.target;
    setNewExpense({
      ...newExpense,
      [name]: name === 'amount' ? parseFloat(value) || '' : value
    });
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    
    if (!newExpense.amount || !newExpense.description) {
      setError('Please fill all fields');
      return;
    }

    try {
      await axios.post('/expenses', newExpense);
      setNewExpense({ amount: '', description: '', category: 'Food' });
      fetchDashboardData();
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add expense');
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) {
      return;
    }

    try {
      await axios.delete(`/expenses/${id}`);
      fetchDashboardData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete expense');
    }
  };

  const handleBudgetSubmit = async (e) => {
    e.preventDefault();
    const totalAmount = parseFloat(e.target.amount.value) || 0;
    
    if (totalAmount <= 0) {
      setError('Budget amount must be greater than 0');
      return;
    }

    // Default equal distribution
    const categoryAmount = totalAmount / categories.length;
    const budgetData = {
      amount: totalAmount,
      categories: categories.map(cat => ({
        name: cat,
        allocated: parseFloat(categoryAmount.toFixed(2)),
        spent: 0
      }))
    };

    try {
      await axios.post('/budget', budgetData);
      setShowBudgetForm(false);
      fetchDashboardData();
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create budget');
    }
  };

  if (loading) {
    return (
      <div className="auth-container">
        <div className="spinner"></div>
      </div>
    );
  }

  const chartData = {
    labels: dashboardData?.categorySpending?.map(item => item._id) || [],
    datasets: [
      {
        data: dashboardData?.categorySpending?.map(item => item.total) || [],
        backgroundColor: [
          '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
          '#9966FF', '#FF9F40', '#C9CBCF', '#4D5360'
        ],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
      },
    },
  };

  return (
    <div className="container">
      <nav className="navbar">
        <div>
          <h1 style={{ margin: 0 }}>💰 Budget Tracker</h1>
          <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#718096' }}>
            Welcome back! Track your spending wisely.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => navigate('/budget')}
            className="logout-btn"
            style={{ background: '#4299e1' }}
          >
            Budget
          </button>
          <button 
            onClick={() => {
              if (window.confirm('Are you sure you want to logout?')) {
                logout();
              }
            }} 
            className="logout-btn"
          >
            Logout
          </button>
        </div>
      </nav>

      {error && <div className="error">{error}</div>}

      {showBudgetForm ? (
        <div className="card">
          <h2>Set Up Your Monthly Budget</h2>
          <p style={{ color: '#718096', marginBottom: '20px' }}>
            Start by setting your monthly budget. You can adjust categories later.
          </p>
          
          <form onSubmit={handleBudgetSubmit}>
            <div className="form-group">
              <label>Total Monthly Budget (₹)</label>
              <input
                type="number"
                name="amount"
                required
                min="0"
                step="0.01"
                placeholder="5000"
                className="form-control"
              />
            </div>
            
            <div style={{ marginTop: '30px' }}>
              <h4>Quick Setup Options</h4>
              <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                {[1000, 2000, 3000, 5000].map(amount => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => {
                      document.getElementsByName('amount')[0].value = amount;
                    }}
                    style={{
                      padding: '10px 20px',
                      background: '#e2e8f0',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: 'pointer'
                    }}
                  >
                    ₹{amount}
                  </button>
                ))}
              </div>
            </div>
            
            <button type="submit" className="btn" style={{ marginTop: '30px' }}>
              Create Budget
            </button>
          </form>
        </div>
      ) : (
        <>
          <div className="dashboard-grid">
            <div className="card budget-card">
              <h3>Monthly Budget</h3>
              {dashboardData?.budget ? (
                <>
                  <div className="budget-amount">
                    ₹{dashboardData.budget.amount.toFixed(2)}
                  </div>
                  <div style={{ marginTop: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Spent:</span>
                      <span>₹{dashboardData.totalSpent.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
                      <span>Remaining:</span>
                      <span style={{ color: '#48bb78', fontWeight: 'bold' }}>
                        ₹{(dashboardData.budget.amount - dashboardData.totalSpent).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  
                  <div style={{ marginTop: '20px' }}>
                    <div style={{ 
                      width: '100%', 
                      height: '10px', 
                      background: 'rgba(255,255,255,0.2)', 
                      borderRadius: '5px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${Math.min((dashboardData.totalSpent / dashboardData.budget.amount) * 100, 100)}%`,
                        height: '100%',
                        background: dashboardData.totalSpent > dashboardData.budget.amount ? '#fc8181' : '#48bb78',
                      }}></div>
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      fontSize: '12px',
                      marginTop: '5px',
                      color: 'rgba(255,255,255,0.8)'
                    }}>
                      <span>0%</span>
                      <span>{
                        Math.min(Math.round((dashboardData.totalSpent / dashboardData.budget.amount) * 100), 100)
                      }%</span>
                      <span>100%</span>
                    </div>
                  </div>
                </>
              ) : (
                <p>No budget set</p>
              )}
            </div>

            <div className="card">
              <h3>Quick Actions</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
                <button 
                  onClick={() => navigate('/budget')}
                  className="btn"
                  style={{ background: '#4299e1' }}
                >
                  📊 Manage Budget
                </button>
                <button 
                  onClick={() => document.getElementById('expense-form').scrollIntoView({ behavior: 'smooth' })}
                  className="btn"
                  style={{ background: '#48bb78' }}
                >
                  ➕ Add Expense
                </button>
                <button 
                  onClick={fetchDashboardData}
                  className="btn"
                  style={{ background: '#ed8936' }}
                >
                  🔄 Refresh Data
                </button>
              </div>
            </div>

            <div className="card">
              <h3>Spending by Category</h3>
              <div style={{ height: '250px', marginTop: '15px' }}>
                {dashboardData?.categorySpending?.length > 0 ? (
                  <Pie data={chartData} options={chartOptions} />
                ) : (
                  <p style={{ textAlign: 'center', marginTop: '50px', color: '#718096' }}>
                    No spending data yet
                  </p>
                )}
              </div>
            </div>
          </div>

          {dashboardData?.budget && (
            <div className="card" style={{ marginTop: '30px' }}>
              <h3>🔔 Budget Alerts</h3>
              <div style={{ marginTop: '15px' }}>
                {dashboardData.budget.categories.map((category, index) => {
                  if (category.spent > category.allocated) {
                    return (
                      <div key={index} className="alert">
                        ⚠️ <strong>{category.name}</strong>: Exceeded by ₹
                        {(category.spent - category.allocated).toFixed(2)}
                      </div>
                    );
                  } else if (category.spent > category.allocated * 0.8) {
                    return (
                      <div key={index} className="alert warning">
                        ⚠️ <strong>{category.name}</strong>: Close to limit (₹{category.spent.toFixed(2)} / ₹{category.allocated.toFixed(2)})
                      </div>
                    );
                  }
                  return null;
                }).filter(alert => alert)}
                
                {dashboardData.totalSpent > dashboardData.budget.amount * 0.9 && (
                  <div className="alert warning">
                    ⚠️ <strong>Overall Budget</strong>: You've used {Math.round((dashboardData.totalSpent / dashboardData.budget.amount) * 100)}% of your monthly budget
                  </div>
                )}
              </div>
            </div>
          )}

          <div id="expense-form" className="card" style={{ marginTop: '30px' }}>
            <h3>➕ Add New Expense</h3>
            <form onSubmit={handleAddExpense} className="expense-form">
              <div className="form-group">
                <label>Amount (₹)</label>
                <input
                  type="number"
                  name="amount"
                  value={newExpense.amount}
                  onChange={handleExpenseChange}
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
                  value={newExpense.description}
                  onChange={handleExpenseChange}
                  required
                  placeholder="What was this for?"
                />
              </div>

              <div className="form-group">
                <label>Category</label>
                <select
                  name="category"
                  value={newExpense.category}
                  onChange={handleExpenseChange}
                  required
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <button type="submit" className="btn">
                Add Expense
              </button>
            </form>
          </div>

          <div className="card" style={{ marginTop: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>📝 Recent Expenses</h3>
              <span style={{ color: '#718096', fontSize: '14px' }}>
                Last 10 transactions
              </span>
            </div>
            
            {dashboardData?.recentExpenses?.length > 0 ? (
              <div style={{ marginTop: '20px' }}>
                {dashboardData.recentExpenses.map(expense => (
                  <div key={expense._id} className="expense-item">
                    <div className="expense-info">
                      <h4>{expense.description}</h4>
                      <div style={{ display: 'flex', gap: '15px', marginTop: '5px' }}>
                        <span className="expense-category" style={{
                          background: '#e2e8f0',
                          padding: '2px 8px',
                          borderRadius: '3px',
                          fontSize: '12px'
                        }}>
                          {expense.category}
                        </span>
                        <span style={{ color: '#718096', fontSize: '14px' }}>
                          {new Date(expense.date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="expense-right">
                      <span className="expense-amount">₹{expense.amount.toFixed(2)}</span>
                      <button
                        onClick={() => handleDeleteExpense(expense._id)}
                        className="delete-btn"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ textAlign: 'center', padding: '30px', color: '#718096' }}>
                No expenses recorded yet.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;