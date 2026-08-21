import { Router } from 'express';
import { initiateLogin, handleCallback, logout, getMe } from '../controllers/authController';
import { getTransactions, createTransaction, updateTransaction, deleteTransaction, getSummary, markAsPaid, getSparkline } from '../controllers/transactionsController';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../controllers/categoriesController';
import { getBudgets, upsertBudget, deleteBudget, getBudgetOverview } from '../controllers/budgetController';
import { getRecurring, createRecurring, updateRecurring, deleteRecurring, toggleRecurring, triggerMaterialize, getUpcomingPreview } from '../controllers/recurringController';
import { authenticate } from '../middleware/auth';
import { swaggerSpec } from '../config/swagger';
import { getGoals, createGoal, updateGoal, deleteGoal, depositToGoal } from '../controllers/goalsController';
import { exportCsv, exportPdf } from '../controllers/exportController';

const router = Router();
router.get('/auth/login',    initiateLogin);
router.get('/auth/callback', handleCallback);
router.post('/auth/logout',  authenticate, logout);
router.get('/auth/me',       authenticate, getMe);

router.get('/transactions/sparkline',  authenticate, getSparkline);
router.get('/transactions/summary',    authenticate, getSummary);
router.get('/transactions',            authenticate, getTransactions);
router.post('/transactions',           authenticate, createTransaction);
router.patch('/transactions/:id/pay',  authenticate, markAsPaid);
router.put('/transactions/:id',        authenticate, updateTransaction);
router.delete('/transactions/:id',     authenticate, deleteTransaction);

router.get('/categories',        authenticate, getCategories);
router.post('/categories',       authenticate, createCategory);
router.put('/categories/:id',    authenticate, updateCategory);
router.delete('/categories/:id', authenticate, deleteCategory);

router.get('/budgets/overview',  authenticate, getBudgetOverview);
router.get('/budgets',           authenticate, getBudgets);
router.post('/budgets',          authenticate, upsertBudget);
router.delete('/budgets/:id',    authenticate, deleteBudget);

router.get('/recurring/preview',          authenticate, getUpcomingPreview);
router.get('/recurring/materialize',      authenticate, triggerMaterialize);
router.get('/recurring',                  authenticate, getRecurring);
router.post('/recurring',                 authenticate, createRecurring);
router.patch('/recurring/:id/toggle',     authenticate, toggleRecurring);
router.put('/recurring/:id',              authenticate, updateRecurring);
router.delete('/recurring/:id',           authenticate, deleteRecurring);

router.get('/goals',                authenticate, getGoals);
router.post('/goals',               authenticate, createGoal);
router.put('/goals/:id',            authenticate, updateGoal);
router.delete('/goals/:id',         authenticate, deleteGoal);
router.post('/goals/:id/deposit',   authenticate, depositToGoal);

router.get('/export/csv', authenticate, exportCsv);
router.get('/export/pdf', authenticate, exportPdf);

router.get('/docs/openapi.json', (_req, res) => res.json(swaggerSpec));
router.get('/docs', (_req, res) => {
  res.send(`<!DOCTYPE html><html><head><title>API Docs</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css"/></head>
<body><div id="swagger-ui"></div>
<script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script>SwaggerUIBundle({url:'/api/docs/openapi.json',dom_id:'#swagger-ui',deepLinking:true});</script>
</body></html>`);
});
export default router;
