import { Hono } from "hono";
import { ImportController } from "../controllers/import.controller.js";

const router = new Hono();
const importController = new ImportController();

router.post("/", (c) => importController.handleImport(c));

export default router;
