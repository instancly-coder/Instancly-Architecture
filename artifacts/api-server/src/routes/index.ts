import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dbRouter from "./db";
import usersRouter from "./users";
import projectsRouter from "./projects";
import exploreRouter from "./explore";
import meRouter from "./me";
import authRouter from "./auth";
import adminRouter from "./admin";
import aiRouter from "./ai";
import filesRouter from "./files";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(dbRouter);
router.use(usersRouter);
router.use(projectsRouter);
router.use(exploreRouter);
router.use(meRouter);
router.use(adminRouter);
router.use(aiRouter);
router.use(filesRouter);

export default router;
