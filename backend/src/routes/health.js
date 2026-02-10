import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
  res.json({
    stato: "ok",
    servizio: "HTS Med CMS",
    timestamp: new Date().toISOString()
  });
});

export default router;
