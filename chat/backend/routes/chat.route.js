import express from 'express';
const router = express.Router();

import { chat } from '../controllers/chat.controller.js';
import authenticateToken from '../middlewares/authenticateToken.middleware.js';

router.post('/send', authenticateToken, chat);

export default router;
