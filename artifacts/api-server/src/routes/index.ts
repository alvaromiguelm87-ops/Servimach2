import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import professionalsRouter from "./professionals";
import ordersRouter from "./orders";
import reviewsRouter from "./reviews";
import notificationsRouter from "./notifications";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(professionalsRouter);
router.use(ordersRouter);
router.use(reviewsRouter);
router.use(notificationsRouter);
router.use(adminRouter);

export default router;
