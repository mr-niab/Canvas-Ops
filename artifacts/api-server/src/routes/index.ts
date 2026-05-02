import { Router, type IRouter } from "express";
import healthRouter from "./health";
import storageRouter from "./storage";
import evidenceRouter from "./evidence";

const router: IRouter = Router();

router.use(healthRouter);
router.use(storageRouter);
router.use(evidenceRouter);

export default router;
