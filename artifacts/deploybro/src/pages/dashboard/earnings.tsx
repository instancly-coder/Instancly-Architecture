import { Link } from "wouter";
import {
  Loader2,
  Coins,
  Clock,
  CheckCircle2,
  Percent,
  Users,
  TrendingUp,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import {
  useMe,
  useMyEarnings,
  useMyEarningsSummary,
  useMyReferrals,
} from "@/lib/api";

export default function Earnings() {
  const { data: me } = useMe();
  const { data: summary, isLoading: summaryLoading } = useMyEarningsSummary();
  const { data: earnings = [], isLoading: earningsLoading } = useMyEarnings();
  const { data: referrals, isLoading: referralsLoading } = useMyReferrals();

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

        <div className="mb-8">
          <h2 className="text-lg font-bold mb-1">Referrals</h2>
          <p className="text-xs text-secondary mb-4">
            Everyone who signed up under you, and which template (or your
            profile) sent them. Use this to spot which template attracts
            paying users.
          </p>

          <div className="grid grid-cols-3 gap-3 md:gap-4 mb-6">
            <SummaryCard
              label="Referred users"
              value={referrals ? String(referrals.total) : "—"}
              loading={referralsLoading}
              icon={Users}
            />
            <SummaryCard
              label="Now paying"
              value={referrals ? String(referrals.paying) : "—"}
              loading={referralsLoading}
              icon={CheckCircle2}
            />
            <SummaryCard
              label="Conversion rate"
              value={
                referrals
                  ? `${referrals.conversionPct.toFixed(1)}%`
                  : "—"
              }
              loading={referralsLoading}
              icon={TrendingUp}
            />
          </div>

          <h3 className="text-sm font-medium mb-3">By source</h3>
          <div className="border border-border rounded-xl bg-surface overflow-x-auto mb-6">
            <table className="w-full text-sm min-w-[480px]">
              <thead>
                <tr className="border-b border-border bg-surface-raised/50">
                  <th className="text-left font-medium p-3 md:p-4 text-secondary">
                    Source
                  </th>
                  <th className="text-right font-medium p-3 md:p-4 text-secondary">
                    Signups
                  </th>
                  <th className="text-right font-medium p-3 md:p-4 text-secondary">
                    Paying
                  </th>
                  <th className="text-right font-medium p-3 md:p-4 text-secondary">
                    Conversion
                  </th>
                </tr>
              </thead>
              <tbody>
                {referralsLoading ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-secondary">
                      <Loader2 className="w-4 h-4 animate-spin inline" />
                    </td>
                  </tr>
                ) : !referrals || referrals.bySource.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="p-6 text-center text-secondary text-sm"
                    >
                      No signups yet.
                    </td>
                  </tr>
                ) : (
                  referrals.bySource.map((s) => (
                    <tr
                      key={`${s.kind}:${s.sourceProjectSlug ?? ""}`}
                      className="border-b border-border last:border-0 hover:bg-surface-raised/50 transition-colors"
                    >
                      <td className="p-3 md:p-4">
                        <SourceLabel
                          kind={s.kind}
                          slug={s.sourceProjectSlug}
                          name={s.sourceProjectName}
                          ownerUsername={username}
                        />
                      </td>
                      <td className="p-3 md:p-4 font-mono text-right">
                        {s.total}
                      </td>
                      <td className="p-3 md:p-4 font-mono text-right">
                        {s.paying}
                      </td>
                      <td className="p-3 md:p-4 font-mono text-right text-secondary">
                        {/* Per-source conversion. Computed client-side so
                            the API stays a single source of truth (raw
                            counts) and the same numbers reconcile with the
                            top-level cards. */}
                        {s.total === 0
                          ? "0%"
                          : `${((s.paying / s.total) * 100).toFixed(1)}%`}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <h3 className="text-sm font-medium mb-3">Referred users</h3>
          <div className="border border-border rounded-xl bg-surface overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-border bg-surface-raised/50">
                  <th className="text-left font-medium p-3 md:p-4 text-secondary">
                    User
                  </th>
                  <th className="text-left font-medium p-3 md:p-4 text-secondary">
                    Source
                  </th>
                  <th className="text-left font-medium p-3 md:p-4 text-secondary">
                    Signed up
                  </th>
                  <th className="text-right font-medium p-3 md:p-4 text-secondary">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {referralsLoading ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-secondary">
                      <Loader2 className="w-4 h-4 animate-spin inline" />
                    </td>
                  </tr>
                ) : !referrals || referrals.users.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="p-6 text-center text-secondary text-sm"
                    >
                      Nobody has signed up via your link yet. Share your
                      profile or a template to get started.
                    </td>
                  </tr>
                ) : (
                  referrals.users.map((u) => (
                    <tr
                      key={u.username}
                      className="border-b border-border last:border-0 hover:bg-surface-raised/50 transition-colors"
                    >
                      <td className="p-3 md:p-4">
                        <Link
                          href={`/${u.username}`}
                          className="text-foreground hover:text-primary"
                        >
                          @{u.username}
                        </Link>
                        {u.displayName && u.displayName !== u.username && (
                          <span className="text-secondary ml-2">
                            {u.displayName}
                          </span>
                        )}
                      </td>
                      <td className="p-3 md:p-4 text-secondary">
                        <SourceLabel
                          kind={u.kind}
                          slug={u.sourceProjectSlug}
                          name={u.sourceProjectName}
                          ownerUsername={username}
                        />
                      </td>
                      <td className="p-3 md:p-4 text-secondary">
                        {u.signupDate}
                      </td>
                      <td className="p-3 md:p-4 text-right">
                        <PayingBadge hasPaid={u.hasPaid} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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

// Renders a referral source as either a link (live template), plain
// "Public profile" text (no template attribution), or a muted
// "Deleted template" tag (template ID was set at signup but the row is
// now gone). Centralised so both the by-source and per-user tables
// label things identically.
function SourceLabel({
  kind,
  slug,
  name,
  ownerUsername,
}: {
  kind: "profile" | "template" | "deleted_template";
  slug: string | null;
  name: string | null;
  ownerUsername: string | undefined;
}) {
  if (kind === "template" && slug && ownerUsername) {
    return (
      <Link
        href={`/${ownerUsername}/${slug}`}
        className="text-foreground hover:text-primary"
      >
        {name ?? slug}
      </Link>
    );
  }
  if (kind === "deleted_template") {
    return <span className="text-secondary italic">Deleted template</span>;
  }
  return <span className="text-secondary">Public profile</span>;
}

function PayingBadge({ hasPaid }: { hasPaid: boolean }) {
  const className = hasPaid
    ? "text-success bg-success/10"
    : "text-secondary bg-surface-raised";
  const dotClassName = hasPaid ? "bg-success" : "bg-secondary";
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${className}`}
    >
      <div className={`w-1.5 h-1.5 rounded-full ${dotClassName}`} />
      {hasPaid ? "paying" : "signed up"}
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
