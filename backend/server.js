const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

/* Middleware */
app.use(cors({
  origin: [
    process.env.FRONTEND_URL
  ].filter(Boolean), // removes undefined
  credentials: true
}));

app.use(express.json());

/* MongoDB */
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log("MongoDB Connection Error:", err));

/* Routes */
app.use("/api", require("./src/routes/api"));

/* Test Route */
app.get("/", (req, res) => {
  res.send("Budget Tracker API is running...");
});

/* Server */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);
