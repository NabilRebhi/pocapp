const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT;

// ─────────────────────────────────────────────
// PostgreSQL connection
// In Railway: add a Postgres service and it will
// auto-inject DATABASE_URL into your Node service.
// ─────────────────────────────────────────────
const pool = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  ssl: { rejectUnauthorized: false }
});



pool.connect((err, client, release) => {
  if (err) {
    console.error("❌ Database connection failed:", err.message);
  } else {
    console.log("✅ Database connected successfully");
    release();
  }
});
 
// ─────────────────────────────────────────────
// HELPER
// ─────────────────────────────────────────────
async function getUserByUsername(username) {
  const result = await pool.query(
    "SELECT * FROM users WHERE username = $1 AND is_active = TRUE",
    [username]
  );
  return result.rows[0] || null;
}
 
// ─────────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ message: "Zitouna Bank API is running" });
});
 
// ─────────────────────────────────────────────
// USER PROFILE
// POST /users/profile
// Body: { "username": "mohamedali.bensalah" }
// ─────────────────────────────────────────────
app.post("/users/profile", async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ message: "username requis" });
 
  try {
    const user = await getUserByUsername(username);
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable" });
 
    const { keycloak_id, ...safeUser } = user;
    res.json(safeUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur", detail: err.message });
  }
});
 
// ─────────────────────────────────────────────
// ACCOUNTS
// POST /accounts
// Body: { "username": "mohamedali.bensalah" }
// ─────────────────────────────────────────────
app.post("/accounts", async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ message: "username requis" });
 
  try {
    const user = await getUserByUsername(username);
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable" });
 
    const result = await pool.query(
      "SELECT * FROM accounts WHERE user_id = $1 AND is_active = TRUE ORDER BY account_id",
      [user.user_id]
    );
    res.json({ accounts: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur", detail: err.message });
  }
});
 
// POST /accounts/detail
// Body: { "account_id": 1 }
app.post("/accounts/detail", async (req, res) => {
  const { account_id } = req.body;
  if (!account_id) return res.status(400).json({ message: "account_id requis" });
 
  try {
    const result = await pool.query(
      "SELECT * FROM accounts WHERE account_id = $1",
      [account_id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: "Compte introuvable" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur", detail: err.message });
  }
});
 
// POST /accounts/balance
// Body: { "account_id": 1 }
app.post("/accounts/balance", async (req, res) => {
  const { account_id } = req.body;
  if (!account_id) return res.status(400).json({ message: "account_id requis" });
 
  try {
    const result = await pool.query(
      "SELECT account_id, balance, currency FROM accounts WHERE account_id = $1",
      [account_id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: "Compte introuvable" });
 
    const acc = result.rows[0];
    res.json({
      accountId:        acc.account_id,
      availableBalance: acc.balance,
      ledgerBalance:    acc.balance,
      currency:         acc.currency,
      lastUpdate:       new Date().toISOString()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur", detail: err.message });
  }
});
 
// ─────────────────────────────────────────────
// TRANSACTIONS
// POST /transactions
// Body: { "account_id": 1 }
// ─────────────────────────────────────────────
app.post("/transactions", async (req, res) => {
  const { account_id } = req.body;
  if (!account_id) return res.status(400).json({ message: "account_id requis" });
 
  try {
    const result = await pool.query(
      "SELECT * FROM transactions WHERE account_id = $1 ORDER BY executed_at DESC",
      [account_id]
    );
    res.json({ transactions: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur", detail: err.message });
  }
});
 
// ─────────────────────────────────────────────
// CARDS
// POST /cards
// Body: { "username": "mohamedali.bensalah" }
// ─────────────────────────────────────────────
app.post("/cards", async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ message: "username requis" });
 
  try {
    const user = await getUserByUsername(username);
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable" });
 
    const result = await pool.query(
      `SELECT c.* FROM cards c
       INNER JOIN accounts a ON c.account_id = a.account_id
       WHERE a.user_id = $1
       ORDER BY c.card_id`,
      [user.user_id]
    );
    res.json({ cards: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur", detail: err.message });
  }
});
 
// ─────────────────────────────────────────────
// BILLS
// POST /bills
// Body: { "username": "mohamedali.bensalah" }
// ─────────────────────────────────────────────
app.post("/bills", async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ message: "username requis" });
 
  try {
    const user = await getUserByUsername(username);
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable" });
 
    const result = await pool.query(
      "SELECT * FROM bills WHERE user_id = $1 ORDER BY due_date ASC",
      [user.user_id]
    );
    res.json({ bills: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur", detail: err.message });
  }
});
 
// ─────────────────────────────────────────────
// LOANS
// POST /loans
// Body: { "username": "mohamedali.bensalah" }
// ─────────────────────────────────────────────
app.post("/loans", async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ message: "username requis" });
 
  try {
    const user = await getUserByUsername(username);
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable" });
 
    const result = await pool.query(
      "SELECT * FROM loans WHERE user_id = $1 ORDER BY loan_id",
      [user.user_id]
    );
    res.json({ loans: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur", detail: err.message });
  }
});
 
// ─────────────────────────────────────────────
// NOTIFICATIONS
// POST /notifications
// Body: { "username": "mohamedali.bensalah" }
//
// POST /notifications/read
// Body: { "notification_id": 1 }
// ─────────────────────────────────────────────
app.post("/notifications", async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ message: "username requis" });
 
  try {
    const user = await getUserByUsername(username);
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable" });
 
    const result = await pool.query(
      "SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC",
      [user.user_id]
    );
    res.json({ notifications: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur", detail: err.message });
  }
});
 
app.post("/notifications/read", async (req, res) => {
  const { notification_id } = req.body;
  if (!notification_id) return res.status(400).json({ message: "notification_id requis" });
 
  try {
    await pool.query(
      "UPDATE notifications SET is_read = TRUE WHERE notification_id = $1",
      [notification_id]
    );
    res.json({ message: "Notification marquée comme lue" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur", detail: err.message });
  }
});
 
// ─────────────────────────────────────────────
// BENEFICIARIES
// POST /beneficiaries
// Body: { "username": "mohamedali.bensalah" }
// ─────────────────────────────────────────────
app.post("/beneficiaries", async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ message: "username requis" });
 
  try {
    const user = await getUserByUsername(username);
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable" });
 
    const result = await pool.query(
      "SELECT * FROM beneficiaries WHERE user_id = $1 ORDER BY is_favorite DESC, full_name ASC",
      [user.user_id]
    );
    res.json({ beneficiaries: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur", detail: err.message });
  }
});
 
// ─────────────────────────────────────────────
// EXCHANGE RATES  (no body needed)
// POST /exchange-rates
// ─────────────────────────────────────────────
app.post("/exchange-rates", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM exchange_rates ORDER BY currency_code ASC"
    );
    res.json({ exchangeRates: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur", detail: err.message });
  }
});
 
// ─────────────────────────────────────────────
// BRANCHES  (no body needed)
// POST /branches
// ─────────────────────────────────────────────
app.post("/branches", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM branches ORDER BY city ASC, name ASC"
    );
    res.json({ branches: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur", detail: err.message });
  }
});
 
// ─────────────────────────────────────────────
// START
// ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Zitouna Bank API running on port ${PORT}`);
});
 
