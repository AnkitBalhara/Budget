const mongoose = require('mongoose');
const CATEGORIES = require('../constants/categories');

const alertSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  budgetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Budget'
  },

  type: {
    type: String,
    required: true,
    enum: [
      'budget_exceeded',
      'category_exceeded',
      'monthly_summary',
      'warning'
    ]
  },

  message: {
    type: String,
    required: true
  },

  category: {
    type: String,
    enum: [...Object.values(CATEGORIES), null],
    default: null
  },

  threshold: {
    type: Number
  },

  currentAmount: {
    type: Number
  },

  isRead: {
    type: Boolean,
    default: false
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Alert', alertSchema);
