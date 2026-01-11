const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Budget = require("../models/Budget");
const Expense = require("../models/Expense");
const auth = require("../middleware/auth.middleware.js");
const { body, validationResult } = require("express-validator");

// User Registration
router.post(
  "/register",
  [
    body("name").notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, email, password } = req.body;

      // Check if user exists
      let user = await User.findOne({ email });
      if (user) {
        return res.status(400).json({ error: "User already exists" });
      }

      // Create user
      user = new User({ name, email, password });
      await user.save();

      // Generate token
      const token = user.generateAuthToken();

      res.status(201).json({ user: { id: user._id, name, email }, token });
    } catch (err) {
      console.error("REGISTER ERROR:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// User Login
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      // Find user
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ error: "Invalid credentials" });
      }

      // Check password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(400).json({ error: "Invalid credentials" });
      }

      // Generate token
      const token = user.generateAuthToken();

      res.json({
        user: { id: user._id, name: user.name, email: user.email },
        token,
      });
    } catch (err) {
      res.status(500).json({ error: "Server error" });
    }
  }
);

// Get user profile
router.get("/profile", auth, async (req, res) => {
  res.json(req.user);
});

// Budget Routes
router.post(
  "/budget",
  auth,
  [
    body("amount").isFloat({ min: 0 }).withMessage("Amount must be positive"),
    body("categories").isArray().withMessage("Categories must be an array"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { amount, categories } = req.body;

      // Check if budget exists for this month
      const existingBudget = await Budget.findOne({
        user: req.user._id,
        month: new Date().toISOString().slice(0, 7),
      });

      if (existingBudget) {
        return res
          .status(400)
          .json({ error: "Budget already set for this month" });
      }

      const budget = new Budget({
        user: req.user._id,
        amount,
        categories: categories.map((cat) => ({
          name: cat.name,
          allocated: cat.allocated,
          spent: 0,
        })),
      });

      await budget.save();
      res.status(201).json(budget);
    } catch (err) {
      res.status(500).json({ error: "Server error" });
    }
  }
);

router.get("/budget", auth, async (req, res) => {
  try {
    const budget = await Budget.findOne({
      user: req.user._id,
      month: new Date().toISOString().slice(0, 7),
    });

    if (!budget) {
      return res.status(404).json({ error: "No budget set for this month" });
    }

    res.json(budget);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Update Budget (PUT)
router.put(
  "/budget",
  auth,
  [
    body("amount").isFloat({ min: 0 }).withMessage("Amount must be positive"),
    body("categories").isArray().withMessage("Categories must be an array"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { amount, categories } = req.body;

      const budget = await Budget.findOne({
        user: req.user._id,
        month: new Date().toISOString().slice(0, 7),
      });

      if (!budget) {
        return res.status(404).json({ error: "Budget not found for this month" });
      }

      budget.amount = amount;
      budget.categories = categories.map((cat) => ({
        name: cat.name,
        allocated: cat.allocated,
        spent: cat.spent || 0,
      }));

      await budget.save();

      res.json(budget);
    } catch (err) {
      console.error("UPDATE BUDGET ERROR:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);


// Expense Routes
router.post(
  "/expenses",
  auth,
  [
    body("amount").isFloat({ min: 0 }).withMessage("Amount must be positive"),
    body("description").notEmpty().withMessage("Description is required"),
    body("category").notEmpty().withMessage("Category is required"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { amount, description, category } = req.body;

      // Create expense
      const expense = new Expense({
        user: req.user._id,
        amount,
        description,
        category,
      });

      await expense.save();

      // Update budget if exists
      const budget = await Budget.findOne({
        user: req.user._id,
        month: new Date().toISOString().slice(0, 7),
      });

      if (budget) {
        const categoryIndex = budget.categories.findIndex(
          (cat) => cat.name === category
        );
        if (categoryIndex !== -1) {
          budget.categories[categoryIndex].spent += amount;
          await budget.save();
        }
      }

      res.status(201).json(expense);
    } catch (err) {
      res.status(500).json({ error: "Server error" });
    }
  }
);

router.get("/expenses", auth, async (req, res) => {
  try {
    const expenses = await Expense.find({ user: req.user._id })
      .sort({ date: -1 })
      .limit(50);

    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/expenses/:id", auth, async (req, res) => {
  try {
    const expense = await Expense.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!expense) {
      return res.status(404).json({ error: "Expense not found" });
    }

    // Update budget
    const budget = await Budget.findOne({
      user: req.user._id,
      month: new Date().toISOString().slice(0, 7),
    });

    if (budget) {
      const categoryIndex = budget.categories.findIndex(
        (cat) => cat.name === expense.category
      );
      if (categoryIndex !== -1) {
        budget.categories[categoryIndex].spent -= expense.amount;
        await budget.save();
      }
    }

    res.json({ message: "Expense deleted" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Dashboard data
router.get("/dashboard", auth, async (req, res) => {
  try {
    const budget = await Budget.findOne({
      user: req.user._id,
      month: new Date().toISOString().slice(0, 7),
    });

    const expenses = await Expense.find({ user: req.user._id })
      .sort({ date: -1 })
      .limit(10);

    const totalSpent = await Expense.aggregate([
      { $match: { user: req.user._id } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const categorySpending = await Expense.aggregate([
      { $match: { user: req.user._id } },
      { $group: { _id: "$category", total: { $sum: "$amount" } } },
    ]);

    res.json({
      budget,
      recentExpenses: expenses,
      totalSpent: totalSpent[0]?.total || 0,
      categorySpending,
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
