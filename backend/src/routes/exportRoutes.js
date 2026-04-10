import { Router } from "express";
import { exportCSV, exportPDF } from "../controllers/exportController.js";

const router = Router();

router.get("/csv", exportCSV);
router.get("/pdf", exportPDF);

export default router;
