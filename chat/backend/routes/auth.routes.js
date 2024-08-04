import express from "express";

const router = express.Router();

import { login } from "../controllers/auth.controller.js";

router.get("/login", login);

export default router;