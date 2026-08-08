import { Router } from "express";
import {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
} from "../controllers/subscription.controllers.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router();

// All subscription routes require authentication
router.use(verifyJWT);

// ─────────────────────────────────────────────
// /api/v1/subscriptions
// ─────────────────────────────────────────────

router.route("/c/:channelId")
    .post(toggleSubscription)           // POST   /subscriptions/c/:channelId — subscribe or unsubscribe
    .get(getUserChannelSubscribers);    // GET    /subscriptions/c/:channelId — get all subscribers of a channel

router.route("/u/:subscriberId")
    .get(getSubscribedChannels);        // GET    /subscriptions/u/:subscriberId — get all channels a user subscribed to

export default router;