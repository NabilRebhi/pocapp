
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 4000;

const customers = [
  {
    customerId: "CUST001",
    username: "client1",
    password: "1234",
    fullName: "Client Zitouna"
  }
];

const accounts = [
  {
    accountId: "ACC001",
    customerId: "CUST001",
    accountNumber: "123456789",
    type: "Courant",
    currency: "TND",
    balance: 1500.250,
    status: "ACTIVE"
  },
  {
    accountId: "ACC002",
    customerId: "CUST001",
    accountNumber: "987654321",
    type: "Epargne",
    currency: "TND",
    balance: 8200.000,
    status: "ACTIVE"
  }
];

const transactions = {
  ACC001: [
    {
      id: "TR001",
      date: "2026-04-01",
      label: "Virement reçu",
      amount: 250.000,
      type: "CREDIT"
    },
    {
      id: "TR002",
      date: "2026-04-02",
      label: "Retrait GAB",
      amount: -100.000,
      type: "DEBIT"
    },
    {
      id: "TR003",
      date: "2026-04-03",
      label: "Paiement TPE",
      amount: -55.500,
      type: "DEBIT"
    }
  ],
  ACC002: [
    {
      id: "TR004",
      date: "2026-04-05",
      label: "Versement",
      amount: 1000.000,
      type: "CREDIT"
    }
  ]
};

app.get("/", (req, res) => {
  res.json({
    message: "Banking Mock API is running"
  });
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  const user = customers.find(
    c => c.username === username && c.password === password
  );

  if (!user) {
    return res.status(401).json({
      message: "Identifiants invalides"
    });
  }

  res.json({
    message: "Login réussi",
    token: "mock-token-123456",
    customerId: user.customerId,
    fullName: user.fullName
  });
});

app.get("/customers/:customerId/accounts", (req, res) => {
  const { customerId } = req.params;

  const customerAccounts = accounts.filter(
    acc => acc.customerId === customerId
  );

  res.json({
    accounts: customerAccounts
  });
});

app.get("/accounts/:accountId", (req, res) => {
  const { accountId } = req.params;

  const account = accounts.find(acc => acc.accountId === accountId);

  if (!account) {
    return res.status(404).json({
      message: "Compte introuvable"
    });
  }

  res.json(account);
});

app.get("/accounts/:accountId/balance", (req, res) => {
  const { accountId } = req.params;

  const account = accounts.find(acc => acc.accountId === accountId);

  if (!account) {
    return res.status(404).json({
      message: "Compte introuvable"
    });
  }

  res.json({
    accountId: account.accountId,
    availableBalance: account.balance,
    ledgerBalance: account.balance,
    currency: account.currency,
    lastUpdate: new Date().toISOString()
  });
});

app.get("/accounts/:accountId/transactions", (req, res) => {
  const { accountId } = req.params;

  res.json({
    transactions: transactions[accountId] || []
  });
});

app.listen(PORT, () => {
  console.log(`Mock API running on http://localhost:${PORT}`);
});