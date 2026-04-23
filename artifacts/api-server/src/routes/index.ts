import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dbRouter from "./db";
import usersRouter from "./users";
import projectsRouter from "./projects";
import exploreRouter from "./explore";
import meRouter from "./me";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dbRouter);
router.use(usersRouter);
router.use(projectsRouter);
router.use(exploreRouter);
router.use(meRouter);

export default router;
