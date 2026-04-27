import { useEffect, useState } from "react";
import {
  Banknote,
  Loader2,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  Play,
  Settings,
  Save,
} from "lucide-react";
import { AdminLayout } from "@/components/admin-layout";
import {
  useAdminPayouts,
  useAdminPayoutSettings,
  useRetryAdminPayout,
  useRunAdminPayouts,
  useUpdateAdminPayoutSettings,
  type ApiAdminPayout,
} from "@/lib/api";

export default function AdminPayouts() {
  const { data: payouts = [], isLoading } = useAdminPayouts();
  const runCycle = useRunAdminPayouts();
  const [lastResult, setLastResult] = useState<{
    considered: number;
    paidOut: number;
    failed: number;
    skipped: number;
  } | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  // Sort: failed first (admins want to triage these), then queued, then
  // paid by recency. Server already orders by createdAt desc, but we
  // promote failed rows so they don't get buried.
  const sorted = [...payouts].sort((a, b) => {
    const order = { failed: 0, queued: 1, paid: 2 } as const;
    const diff = order[a.status] - order[b.status];
    if (diff !== 0) return diff;
    return b.createdAt.localeCompare(a.createdAt);
  });

  const totals = sorted.reduce(
    (acc, p) => {
      acc[p.status] += p.amount;
      acc[`${p.status}Count` as const] += 1;
      return acc;
    },
    {
      paid: 0,
      paidCount: 0,
      queued: 0,
      queuedCount: 0,
      failed: 0,
      failedCount: 0,
    },
  );

  const handleRun = async () => {
    setRunError(null);
    try {
      const r = await runCycle.mutateAsync();
      setLastResult({
        considered: r.considered,
        paidOut: r.paidOut,
        failed: r.failed,
        skipped: r.skipped,
      });
    } catch (err) {
      setRunError(err instanceof Error ? err.message : "Failed");
    }
  };

  return (
    <AdminLayout active="payouts">
      <main className="p-8 max-w-6xl mx-auto w-full">
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight mb-2">
              Creator Payouts
            </h1>
            <p className="text-sm text-secondary">
              Stripe Connect transfers to creators. The cron picks these
              up hourly; use "Run now" to force a cycle.
            </p>
          </div>
          <button
            onClick={handleRun}
            disabled={runCycle.isPending}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition shrink-0"
          >
            {runCycle.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Run payouts now
          </button>
        </div>

        {lastResult && !runError && (
          <div className="mb-6 p-3 border border-border bg-surface-raised/40 rounded-lg text-sm">
            Cycle done: <strong>{lastResult.paidOut}</strong> paid,{" "}
            <strong>{lastResult.failed}</strong> failed,{" "}
            <strong>{lastResult.skipped}</strong> below threshold (
            {lastResult.considered} creators considered).
          </div>
        )}
        {runError && (
          <div className="mb-6 p-3 border border-error/30 bg-error/10 rounded-lg text-sm text-error flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{runError}</span>
          </div>
        )}

        <PayoutSettingsCard />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <TotalCard
            label="Paid"
            amount={totals.paid}
            count={totals.paidCount}
            icon={CheckCircle2}
            tone="success"
          />
          <TotalCard
            label="In flight"
            amount={totals.queued}
            count={totals.queuedCount}
            icon={Clock}
            tone="muted"
          />
          <TotalCard
            label="Failed"
            amount={totals.failed}
            count={totals.failedCount}
            icon={AlertCircle}
            tone="error"
          />
        </div>

        <div className="border border-border bg-surface rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border font-bold flex items-center gap-2">
            <Banknote className="w-4 h-4" />
            All payouts
          </div>
          {isLoading ? (
            <div className="p-8 text-center text-secondary">
              <Loader2 className="w-4 h-4 animate-spin inline" />
            </div>
          ) : sorted.length === 0 ? (
            <div className="p-8 text-center text-secondary text-sm">
              No payouts yet. They'll appear here once creators reach the
              threshold and the cycle runs.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[760px]">
                <thead>
                  <tr className="border-b border-border bg-surface-raised/40">
                    <th className="text-left font-medium p-3 text-secondary">
                      Creator
                    </th>
                    <th className="text-right font-medium p-3 text-secondary">
                      Amount
                    </th>
                    <th className="text-left font-medium p-3 text-secondary">
                      Status
                    </th>
                    <th className="text-left font-medium p-3 text-secondary">
                      Created
                    </th>
                    <th className="text-left font-medium p-3 text-secondary">
                      Reason / transfer
                    </th>
                    <th className="text-right font-medium p-3 text-secondary">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((p) => (
                    <PayoutRow key={p.id} payout={p} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </AdminLayout>
  );
}

// Inline settings card. Lives on the payouts page so admins can tune
// the threshold/cycle in the same workflow they triage failures.
// Both fields are required and clamped client-side to the same bounds
// the API validates against; the backend re-validates so a malformed
// request can't stick.
const MIN_GBP_FLOOR = 0.01;
const MIN_GBP_CEILING = 10_000;
const INTERVAL_MIN_FLOOR = 1;
const INTERVAL_MIN_CEILING = 7 * 24 * 60;

function PayoutSettingsCard() {
  const { data, isLoading } = useAdminPayoutSettings();
  const update = useUpdateAdminPayoutSettings();
  // Local form state mirrors the loaded values; we hydrate it via
  // effect so admins can edit freely without each keystroke being
  // overwritten by a refetch.
  const [minGbp, setMinGbp] = useState<string>("");
  const [intervalMin, setIntervalMin] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!data) return;
    setMinGbp(String(data.minPayoutGbp));
    setIntervalMin(String(data.cycleIntervalMinutes));
  }, [data]);

  const handleSave = async () => {
    setError(null);
    const minPayoutGbp = Number(minGbp);
    const cycleIntervalMinutes = Number(intervalMin);
    if (
      !Number.isFinite(minPayoutGbp) ||
      minPayoutGbp < MIN_GBP_FLOOR ||
      minPayoutGbp > MIN_GBP_CEILING
    ) {
      setError(
        `Minimum payout must be between $${MIN_GBP_FLOOR} and $${MIN_GBP_CEILING.toLocaleString()}.`,
      );
      return;
    }
    if (
      !Number.isInteger(cycleIntervalMinutes) ||
      cycleIntervalMinutes < INTERVAL_MIN_FLOOR ||
      cycleIntervalMinutes > INTERVAL_MIN_CEILING
    ) {
      setError(
        `Cycle interval must be a whole number of minutes between ${INTERVAL_MIN_FLOOR} and ${INTERVAL_MIN_CEILING}.`,
      );
      return;
    }
    try {
      await update.mutateAsync({ minPayoutGbp, cycleIntervalMinutes });
      setSavedAt(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  };

  const dirty =
    !!data &&
    (Number(minGbp) !== data.minPayoutGbp ||
      Number(intervalMin) !== data.cycleIntervalMinutes);

  return (
    <div className="mb-8 border border-border bg-surface rounded-xl">
      <div className="p-4 border-b border-border font-bold flex items-center gap-2">
        <Settings className="w-4 h-4" />
        Payout settings
      </div>
      <div className="p-4">
        {isLoading ? (
          <div className="text-secondary text-sm">
            <Loader2 className="w-4 h-4 animate-spin inline" /> Loading…
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <label className="block">
              <span className="text-xs uppercase tracking-wide text-secondary">
                Minimum payout (USD)
              </span>
              <input
                type="number"
                step="0.01"
                min={MIN_GBP_FLOOR}
                max={MIN_GBP_CEILING}
                value={minGbp}
                onChange={(e) => setMinGbp(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-surface-raised/40 text-sm font-mono"
              />
              <span className="text-xs text-secondary mt-1 block">
                Creators below this stay queued.
              </span>
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-wide text-secondary">
                Cycle interval (minutes)
              </span>
              <input
                type="number"
                step="1"
                min={INTERVAL_MIN_FLOOR}
                max={INTERVAL_MIN_CEILING}
                value={intervalMin}
                onChange={(e) => setIntervalMin(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-surface-raised/40 text-sm font-mono"
              />
              <span className="text-xs text-secondary mt-1 block">
                {humanizeMinutes(Number(intervalMin) || 0)}. Picks up on
                next tick.
              </span>
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={update.isPending || !dirty}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition"
              >
                {update.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save settings
              </button>
              {savedAt && !dirty && !update.isPending && (
                <span className="text-xs text-secondary inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                  Saved
                </span>
              )}
            </div>
            {error && (
              <div className="md:col-span-3 text-sm text-error flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function humanizeMinutes(min: number): string {
  if (!Number.isFinite(min) || min <= 0) return "—";
  if (min < 60) return `Every ${min} minute${min === 1 ? "" : "s"}`;
  if (min % (24 * 60) === 0) {
    const days = min / (24 * 60);
    return `Every ${days} day${days === 1 ? "" : "s"}`;
  }
  if (min % 60 === 0) {
    const hours = min / 60;
    return `Every ${hours} hour${hours === 1 ? "" : "s"}`;
  }
  const hours = Math.floor(min / 60);
  const rest = min % 60;
  return `Every ${hours}h ${rest}m`;
}

function PayoutRow({ payout }: { payout: ApiAdminPayout }) {
  const retry = useRetryAdminPayout();
  const [retryError, setRetryError] = useState<string | null>(null);

  const handleRetry = async () => {
    setRetryError(null);
    try {
      await retry.mutateAsync(payout.id);
    } catch (err) {
      setRetryError(err instanceof Error ? err.message : "Retry failed");
    }
  };

  return (
    <tr className="border-b border-border last:border-0 hover:bg-surface-raised/30">
      <td className="p-3">
        {payout.referrerUsername ? (
          <span className="text-foreground">@{payout.referrerUsername}</span>
        ) : (
          <span className="text-secondary text-xs">
            {payout.referrerUserId}
          </span>
        )}
      </td>
      <td className="p-3 font-mono text-right">
        ${payout.amount.toFixed(2)}
      </td>
      <td className="p-3">
        <PayoutStatusPill status={payout.status} />
      </td>
      <td className="p-3 text-secondary whitespace-nowrap">
        {new Date(payout.createdAt).toLocaleString()}
      </td>
      <td className="p-3 text-secondary text-xs">
        {payout.status === "failed" ? (
          <span className="text-error">
            {payout.failureReason ?? "Unknown error"}
          </span>
        ) : payout.stripeTransferId ? (
          <span className="font-mono">{payout.stripeTransferId}</span>
        ) : (
          <span className="text-secondary">—</span>
        )}
        {retryError && (
          <div className="text-error mt-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {retryError}
          </div>
        )}
      </td>
      <td className="p-3 text-right">
        {payout.status === "failed" && (
          <button
            onClick={handleRetry}
            disabled={retry.isPending}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border border-border hover:bg-surface-raised disabled:opacity-50 transition"
          >
            {retry.isPending ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3" />
            )}
            Retry
          </button>
        )}
      </td>
    </tr>
  );
}

function PayoutStatusPill({
  status,
}: {
  status: ApiAdminPayout["status"];
}) {
  const styles: Record<ApiAdminPayout["status"], string> = {
    paid: "bg-green-500/10 text-green-500",
    queued: "bg-amber-500/10 text-amber-500",
    failed: "bg-red-500/10 text-red-500",
  };
  return (
    <span
      className={`text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full ${styles[status]}`}
    >
      {status}
    </span>
  );
}

function TotalCard({
  label,
  amount,
  count,
  icon: Icon,
  tone,
}: {
  label: string;
  amount: number;
  count: number;
  icon: typeof CheckCircle2;
  tone: "success" | "muted" | "error";
}) {
  const tint =
    tone === "success"
      ? "text-green-500"
      : tone === "error"
        ? "text-red-500"
        : "text-secondary";
  return (
    <div className="p-5 border border-border bg-surface rounded-xl">
      <div className="flex items-center justify-between mb-2">
        <div className="text-secondary text-xs uppercase tracking-wide">
          {label}
        </div>
        <Icon className={`w-4 h-4 ${tint}`} />
      </div>
      <div className="text-2xl font-bold font-mono">${amount.toFixed(2)}</div>
      <div className="text-xs text-secondary mt-1">
        {count} payout{count === 1 ? "" : "s"}
      </div>
    </div>
  );
}
