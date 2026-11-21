import { Router } from "express";
import { googleAuth, googleCallback } from "./googleCalendar.services";

const router = Router();
router.get("/google", googleAuth);
router.get("/api/google/callback", googleCallback);

export const googleRouter = router;
