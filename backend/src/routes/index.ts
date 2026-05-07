import { Router } from 'express';
import { initiateLogin, handleCallback, logout, getMe } from '../controllers/authController';
import { getTransactions, createTransaction, updateTransaction, deleteTransaction, getSummary } from '../controllers/transactionsController';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../controllers/categoriesController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Auth routes (no authentication required)
router.get('/auth/login', initiateLogin);
router.get('/auth/callback', handleCallback);
router.post('/auth/logout', authenticate, logout);
router.get('/auth/me', authenticate, getMe);

// Transactions
router.get('/transactions', authenticate, getTransactions);
router.post('/transactions', authenticate, createTransaction);
router.put('/transactions/:id', authenticate, updateTransaction);
router.delete('/transactions/:id', authenticate, deleteTransaction);
router.get('/transactions/summary', authenticate, getSummary);

// Categories
router.get('/categories', authenticate, getCategories);
router.post('/categories', authenticate, createCategory);
router.put('/categories/:id', authenticate, updateCategory);
router.delete('/categories/:id', authenticate, deleteCategory);

export default router;
