const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;

// ─────────────────────────────────────────────
// PostgreSQL connection
// In Railway: add a Postgres service and it will
// auto-inject DATABASE_URL into your Node service.
// ─────────────────────────────────────────────
const pool = new Pool({
  host: "postgres.railway.internal",
  port: 5432,
  database: "railway",
  user: "postgres",
  password: "BGEdRpVVkkHAKbFQJXRfuuhFAKZSwbMp",
  ssl: { rejectUnauthorized: false }
});

// ─────────────────────────────────────────────
// HELPER: get user row by Keycloak preferred_username
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
// GET /users/profile?username=mohamedali.bensalah
// ─────────────────────────────────────────────
app.get("/users/profile", async (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ message: "username requis" });

  try {
    const user = await getUserByUsername(username);
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable" });

    const { keycloak_id, ...safeUser } = user;
    res.json(safeUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// ─────────────────────────────────────────────
// ACCOUNTS
// GET /accounts?username=mohamedali.bensalah
// GET /accounts/:accountId
// GET /accounts/:accountId/balance
// ─────────────────────────────────────────────
app.get("/accounts", async (req, res) => {
  const { username } = req.query;
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
    res.status(500).json({ message: "Erreur serveur" });
  }
});

app.get("/accounts/:accountId", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM accounts WHERE account_id = $1",
      [req.params.accountId]
    );
    if (!result.rows[0]) return res.status(404).json({ message: "Compte introuvable" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

app.get("/accounts/:accountId/balance", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT account_id, balance, currency FROM accounts WHERE account_id = $1",
      [req.params.accountId]
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
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// ─────────────────────────────────────────────
// TRANSACTIONS
// GET /accounts/:accountId/transactions
// ─────────────────────────────────────────────
app.get("/accounts/:accountId/transactions", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM transactions WHERE account_id = $1 ORDER BY executed_at DESC",
      [req.params.accountId]
    );
    res.json({ transactions: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// ─────────────────────────────────────────────
// CARDS
// GET /cards?username=mohamedali.bensalah
// ─────────────────────────────────────────────
app.get("/cards", async (req, res) => {
  const { username } = req.query;
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
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// ─────────────────────────────────────────────
// BILLS
// GET /bills?username=mohamedali.bensalah
// ─────────────────────────────────────────────
app.get("/bills", async (req, res) => {
  const { username } = req.query;
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
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// ─────────────────────────────────────────────
// LOANS
// GET /loans?username=mohamedali.bensalah
// ─────────────────────────────────────────────
app.get("/loans", async (req, res) => {
  const { username } = req.query;
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
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// ─────────────────────────────────────────────
// NOTIFICATIONS
// GET  /notifications?username=mohamedali.bensalah
// PATCH /notifications/:notificationId/read
// ─────────────────────────────────────────────
app.get("/notifications", async (req, res) => {
  const { username } = req.query;
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
    res.status(500).json({ message: "Erreur serveur" });
  }
});

app.patch("/notifications/:notificationId/read", async (req, res) => {
  try {
    await pool.query(
      "UPDATE notifications SET is_read = TRUE WHERE notification_id = $1",
      [req.params.notificationId]
    );
    res.json({ message: "Notification marquée comme lue" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// ─────────────────────────────────────────────
// BENEFICIARIES
// GET /beneficiaries?username=mohamedali.bensalah
// ─────────────────────────────────────────────
app.get("/beneficiaries", async (req, res) => {
  const { username } = req.query;
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
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// ─────────────────────────────────────────────
// EXCHANGE RATES  (public)
// GET /exchange-rates
// ─────────────────────────────────────────────
app.get("/exchange-rates", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM exchange_rates ORDER BY currency_code ASC"
    );
    res.json({ exchangeRates: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// ─────────────────────────────────────────────
// BRANCHES  (public)
// GET /branches
// ─────────────────────────────────────────────
app.get("/branches", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM branches ORDER BY city ASC, name ASC"
    );
    res.json({ branches: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// ─────────────────────────────────────────────
// START
// ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Zitouna Bank API running on port ${PORT}`);
});
