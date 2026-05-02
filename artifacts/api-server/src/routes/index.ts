import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import organisationRouter from "./organisation";
import teamsRouter from "./teams";
import teammatesRouter from "./teammates";
import projectsRouter from "./projects";
import tasksRouter from "./tasks";
import stakeholdersRouter from "./stakeholders";
import logEntriesRouter from "./logEntries";
import storageRouter from "./storage";
import evidenceRouter from "./evidence";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(organisationRouter);
router.use(teamsRouter);
router.use(teammatesRouter);
router.use(projectsRouter);
router.use(tasksRouter);
router.use(stakeholdersRouter);
router.use(logEntriesRouter);
router.use(storageRouter);
router.use(evidenceRouter);

export default router;
