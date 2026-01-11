import axios from 'axios'

const API = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

API.interceptors.response.use(
  (response) => response,
  (error) => {
    // Let App.jsx handle auth + routing
    return Promise.reject(error)
  }
)

export const budgetAPI = {
  getCurrentBudget: () => API.get('/budget'),
  createBudget: (data) => API.post('/budget', data),
  updateBudget: (data) => API.put('/budget', data),
}

export const expenseAPI = {
  getExpenses: () => API.get('/expenses'),
  createExpense: (data) => API.post('/expenses', data),
  deleteExpense: (id) => API.delete(`/expenses/${id}`),
}

export default API