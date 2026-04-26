import { Link } from "wouter";
import { Loader2, Coins, Clock, CheckCircle2, Percent } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useMe, useMyEarnings, useMyEarningsSummary } from "@/lib/api";

export default function Earnings() {
  const { data: me } = useMe();
  const { data: summary, isLoading: summaryLoading } = useMyEarningsSummary();
  const { data: earnings = [], isLoading: earningsLoading } = useMyEarnings();

  const username = me?.username;

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 max-w-5xl">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl font-bold tracking-tight mb-2">Earnings</h1>
          <p className="text-sm text-secondary">
            Earn a commission whenever someone signs up via your public
            profile or one of your templates and starts paying for DeployBro.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
          <SummaryCard
            label="Total earned"
            value={summary ? formatGbp(summary.totalEarned) : "—"}
            loading={summaryLoading}
            icon={Coins}
          />
          <SummaryCard
            label="Pending"
            value={summary ? formatGbp(summary.pending) : "—"}
            loading={summaryLoading}
            icon={Clock}
          />
          <SummaryCard
            label="Paid out"
            value={summary ? formatGbp(summary.paid) : "—"}
            loading={summaryLoading}
            icon={CheckCircle2}
          />
          <SummaryCard
            label="Your commission"
            value={summary ? `${summary.commissionPct}%` : "—"}
            loading={summaryLoading}
            icon={Percent}
          />
        </div>

        <div className="border border-border bg-surface rounded-xl p-5 md:p-6 mb-8">
          <h2 className="text-sm font-medium mb-2">Your referral link</h2>
          <p className="text-xs text-secondary mb-3">
            Anyone who lands on your profile or any of your templates and
            signs up within 30 days is credited as your referral.
          </p>
          <ReferralLink username={username} />
        </div>

        <h2 className="text-lg font-bold mb-4">Earnings history</h2>
        <div className="border border-border rounded-xl bg-surface overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-border bg-surface-raised/50">
                <th className="text-left font-medium p-3 md:p-4 text-secondary">
                  Date
                </th>
                <th className="text-left font-medium p-3 md:p-4 text-secondary">
                  Referred user
                </th>
                <th className="text-left font-medium p-3 md:p-4 text-secondary">
                  Source
                </th>
                <th className="text-right font-medium p-3 md:p-4 text-secondary">
                  Rate
                </th>
                <th className="text-right font-medium p-3 md:p-4 text-secondary">
                  Amount
                </th>
                <th className="text-right font-medium p-3 md:p-4 text-secondary">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {earningsLoading ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-secondary">
                    <Loader2 className="w-4 h-4 animate-spin inline" />
                  </td>
                </tr>
              ) : earnings.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="p-6 text-center text-secondary text-sm"
                  >
                    No earnings yet. Share your profile or templates to start
                    earning commission on every paying signup.
                  </td>
                </tr>
              ) : (
                earnings.map((e) => (
                  <tr
                    key={e.id}
                    className="border-b border-border last:border-0 hover:bg-surface-raised/50 transition-colors"
                  >
                    <td className="p-3 md:p-4">
                      {new Date(e.createdAt).toISOString().slice(0, 10)}
                    </td>
                    <td className="p-3 md:p-4">
                      {e.referredUsername ? (
                        <Link
                          href={`/${e.referredUsername}`}
                          className="text-foreground hover:text-primary"
                        >
                          @{e.referredUsername}
                        </Link>
                      ) : (
                        <span className="text-secondary">—</span>
                      )}
                    </td>
                    <td className="p-3 md:p-4 text-secondary">
                      {e.sourceProjectSlug && username ? (
                        // The source project belongs to the *referrer*
                        // (the currently-signed-in creator), not the
                        // referred buyer — public template URLs are
                        // /<owner-username>/<slug>.
                        <Link
                          href={`/${username}/${e.sourceProjectSlug}`}
                          className="hover:text-foreground"
                        >
                          {e.sourceProjectName ?? e.sourceProjectSlug}
                        </Link>
                      ) : (
                        "Public profile"
                      )}
                    </td>
                    <td className="p-3 md:p-4 font-mono text-right text-secondary">
                      {e.commissionPct}%
                    </td>
                    <td className="p-3 md:p-4 font-mono text-right">
                      +{formatGbp(e.amount)}
                    </td>
                    <td className="p-3 md:p-4 text-right">
                      <StatusBadge status={e.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}

function formatGbp(n: number): string {
  return `£${n.toFixed(2)}`;
}

function SummaryCard({
  label,
  value,
  loading,
  icon: Icon,
}: {
  label: string;
  value: string;
  loading: boolean;
  icon: typeof Coins;
}) {
  return (
    <div className="border border-border bg-surface rounded-xl p-4 md:p-5">
      <div className="flex items-center gap-2 text-xs text-secondary mb-2">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <div className="text-xl md:text-2xl font-mono font-bold min-h-[1.75rem] flex items-center">
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-secondary" />
        ) : (
          value
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const palette: Record<string, string> = {
    pending: "text-secondary bg-surface-raised",
    paid: "text-success bg-success/10",
    reversed: "text-error bg-error/10",
  };
  const dotPalette: Record<string, string> = {
    pending: "bg-secondary",
    paid: "bg-success",
    reversed: "bg-error",
  };
  const className = palette[status] ?? "text-secondary bg-surface-raised";
  const dotClassName = dotPalette[status] ?? "bg-secondary";
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${className}`}
    >
      <div className={`w-1.5 h-1.5 rounded-full ${dotClassName}`} />
      {status}
    </span>
  );
}

function ReferralLink({ username }: { username: string | undefined }) {
  if (!username) {
    return <Loader2 className="w-4 h-4 animate-spin text-secondary" />;
  }
  const url = `${window.location.origin}/${username}`;
  return (
    <div className="flex items-center gap-2">
      <code className="flex-1 text-xs md:text-sm font-mono bg-background border border-border rounded px-3 py-2 truncate">
        {url}
      </code>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard.writeText(url);
        }}
        className="text-xs px-3 py-2 rounded bg-surface-raised hover:bg-border border border-border"
      >
        Copy
      </button>
    </div>
  );
}
