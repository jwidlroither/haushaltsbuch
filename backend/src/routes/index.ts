import { Router } from 'express';
import { initiateLogin, handleCallback, logout, getMe } from '../controllers/authController';
import {
  getTransactions, createTransaction, updateTransaction,
  deleteTransaction, getSummary, markAsPaid
} from '../controllers/transactionsController';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../controllers/categoriesController';
import { getBudgets, upsertBudget, deleteBudget, getBudgetOverview } from '../controllers/budgetController';
import { authenticate } from '../middleware/auth';

const router = Router();

// ── Auth (public) ────────────────────────────────────────────
router.get('/auth/login',    initiateLogin);
router.get('/auth/callback', handleCallback);
router.post('/auth/logout',  authenticate, logout);
router.get('/auth/me',       authenticate, getMe);

// ── Transactions ─────────────────────────────────────────────
// IMPORTANT: static sub-routes MUST come before /:id param routes
router.get('/transactions/summary',   authenticate, getSummary);       // ← static first
router.get('/transactions',           authenticate, getTransactions);
router.post('/transactions',          authenticate, createTransaction);
router.patch('/transactions/:id/pay', authenticate, markAsPaid);       // ← specific action before generic /:id
router.put('/transactions/:id',       authenticate, updateTransaction);
router.delete('/transactions/:id',    authenticate, deleteTransaction);

// ── Categories ───────────────────────────────────────────────
router.get('/categories',        authenticate, getCategories);
router.post('/categories',       authenticate, createCategory);
router.put('/categories/:id',    authenticate, updateCategory);
router.delete('/categories/:id', authenticate, deleteCategory);

// ── Budgets ──────────────────────────────────────────────────
// static sub-routes before /:id
router.get('/budgets/overview',  authenticate, getBudgetOverview);     // ← static first
router.get('/budgets',           authenticate, getBudgets);
router.post('/budgets',          authenticate, upsertBudget);
router.delete('/budgets/:id',    authenticate, deleteBudget);

export default router;

// ── API Docs (Swagger UI) ─────────────────────────────────────
import { swaggerSpec } from '../config/swagger';

// Serve raw OpenAPI JSON
router.get('/docs/openapi.json', (_req, _res, next) => {
  try {
    _res.json(swaggerSpec);
  } catch (e) { next(e); }
});

// Serve Swagger UI (CDN, no extra npm package needed)
router.get('/docs', (_req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8"/>
  <title>Haushaltsbuch API Docs</title>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css"/>
</head>
<body>
<div id="swagger-ui"></div>
<script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script>
  SwaggerUIBundle({
    url: '/api/docs/openapi.json',
    dom_id: '#swagger-ui',
    deepLinking: true,
    presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
    layout: 'BaseLayout',
  });
</script>
</body>
</html>`);
});
