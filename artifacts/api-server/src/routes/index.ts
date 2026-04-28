import { Router, type IRouter } from "express";
import healthRouter from "./health";
import configRouter from "./config";
import dbRouter from "./db";
import usersRouter from "./users";
import projectsRouter from "./projects";
import exploreRouter from "./explore";
import meRouter from "./me";
import authRouter from "./auth";
import adminRouter from "./admin";
import aiRouter from "./ai";
import filesRouter from "./files";
import deploymentsRouter from "./deployments";
import domainsRouter from "./domains";
import envVarsRouter from "./env-vars";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(configRouter);
router.use(authRouter);
// /api/db/* exposes connection-string host, Postgres version, and
// per-table row counts / sizes. Useful for an internal "DB inspector"
// admin panel, lethal if scraped from the open internet (it tells an
// attacker exactly what they're up against and which tables to target).
// Gate behind the admin allow-list — same as /api/admin/*.
//
// dbRouter declares its routes with relative paths ("/ping", "/info"),
// so mounting it under the "/db" prefix gives us /api/db/ping etc.
// dbRouter ALSO has its own router-level `requireAdmin` for
// belt-and-braces — see comment in routes/db.ts.
router.use("/db", dbRouter);
router.use(usersRouter);
router.use(projectsRouter);
router.use(exploreRouter);
router.use(meRouter);
router.use(adminRouter);
router.use(aiRouter);
router.use(filesRouter);
router.use(deploymentsRouter);
router.use(domainsRouter);
router.use(envVarsRouter);
router.use(storageRouter);

export default router;
