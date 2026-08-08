import { Router } from "express";
import {healthcheck} from "../controllers/healthcheck.controllers.js";

const router=Router();

router.route("/").get(healthcheck);

export default router;

/* You are exporting router as the DEFAULT export

The name router is local to this file only */