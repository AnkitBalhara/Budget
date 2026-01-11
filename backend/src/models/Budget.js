const mongoose = require('mongoose');
const CATEGORIES = require('../constants/categories');

const BudgetSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  month: {
    type: String,
    required: true,
    default: () => {
      const date = new Date();
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }
  },

  amount: {
    type: Number,
    required: true,
    min: 0
  },

  categories: [
    {
      name: {
        type: String,
        required: true,
        enum: Object.values(CATEGORIES)
      },
      allocated: {
        type: Number,
        required: true,
        min: 0
      },
      spent: {
        type: Number,
        default: 0
      }
    }
  ],

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Budget', BudgetSchema);
