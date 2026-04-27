import app from "./app";
import { logger } from "./lib/logger";
import { startDomainPoller } from "./jobs/poll-domains";
import { startPayoutScheduler } from "./jobs/run-payouts";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  // Kick off the domain verification poller. It self-skips when
  // VERCEL_API_TOKEN isn't configured, so this is safe to always call.
  startDomainPoller();
  // Kick off the referral-earnings payout scheduler. Self-skips when
  // STRIPE_SECRET_KEY isn't set, so safe to always call.
  startPayoutScheduler();
});
