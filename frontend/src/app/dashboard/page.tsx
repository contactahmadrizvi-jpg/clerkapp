import { currentUser, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  ChartBarIcon,
  UsersIcon,
  CreditCardIcon,
  ArrowTrendingUpIcon,
} from "@heroicons/react/24/outline";
import SyncUser from "./SyncUser";
import ProfileForm from "./ProfileForm";
import ShopifySection from "./ShopifySection";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function memberSinceDays(createdAt: number): string {
  const days = Math.floor((Date.now() - createdAt) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const client = await clerkClient();

  // ── Total users ─────────────────────────────────────────────────────────────
  // In Clerk v5 getCount() returns a plain number, not { totalCount }
  let totalUsers = 0;
  try {
    const countResult = await client.users.getCount();
    totalUsers =
      typeof countResult === "number"
        ? countResult
        : typeof (countResult as { totalCount?: number })?.totalCount === "number"
        ? (countResult as { totalCount: number }).totalCount
        : 0;
  } catch { /* default 0 */ }

  // ── Active sessions for this user ───────────────────────────────────────────
  let activeSessions = 0;
  try {
    const sessionsResp = await client.sessions.getSessionList({ userId: user.id });
    activeSessions = (sessionsResp?.data ?? []).filter(
      (s) => s.status === "active"
    ).length;
  } catch { /* default 0 */ }

  // ── New users this month ────────────────────────────────────────────────────
  let newUsersThisMonth = 0;
  try {
    const thirtyDaysAgo = Date.now() - 30 * 86_400_000;
    const usersResp = await client.users.getUserList({
      limit: 500,
      orderBy: "-created_at",
    });
    newUsersThisMonth = (usersResp?.data ?? []).filter(
      (u) => (u.createdAt ?? 0) > thirtyDaysAgo
    ).length;
  } catch { /* default 0 */ }

  // ── Growth % ────────────────────────────────────────────────────────────────
  const prevTotal = Math.max(totalUsers - newUsersThisMonth, 0);
  const growthPct =
    prevTotal > 0 ? Math.round((newUsersThisMonth / prevTotal) * 100) : 100;

  // ── Stats cards ─────────────────────────────────────────────────────────────
  const stats = [
    {
      label: "Total users",
      value: formatNumber(totalUsers),
      sub: `${newUsersThisMonth} new this month`,
      icon: UsersIcon,
      color: "text-violet-600",
      bg: "bg-violet-50",
    },
    {
      label: "Member since",
      value: memberSinceDays(user.createdAt),
      sub: new Date(user.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      icon: CreditCardIcon,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Active sessions",
      value: String(activeSessions),
      sub: activeSessions === 1 ? "1 device signed in" : `${activeSessions} devices signed in`,
      icon: ChartBarIcon,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Growth",
      value: `+${growthPct}%`,
      sub: "vs. previous month",
      icon: ArrowTrendingUpIcon,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
  ];

  const displayName = user.firstName
    ? `${user.firstName}${user.lastName ? " " + user.lastName : ""}`
    : user.emailAddresses[0]?.emailAddress ?? "there";

  const joinedDate = new Date(user.createdAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <SyncUser />

      {/* ── Top nav ── */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">M</span>
            </div>
            <span className="font-semibold text-gray-900">MyApp</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 hidden sm:block">
              {user.emailAddresses[0]?.emailAddress}
            </span>
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "w-9 h-9 rounded-xl ring-2 ring-brand-100",
                },
              }}
            />
          </div>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="max-w-6xl mx-auto px-6 py-10 animate-slide-up">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {displayName} 👋
          </h1>
          <p className="text-gray-500 mt-1">Member since {joinedDate}</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          {stats.map(({ label, value, sub, icon: Icon, color, bg }) => (
            <div
              key={label}
              className="bg-white rounded-2xl border border-gray-100 shadow-card p-5
                         hover:shadow-card-hover transition-shadow duration-300"
            >
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-sm text-gray-500 mt-0.5">{label}</p>
              {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
            </div>
          ))}
        </div>

        {/* Profile card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your profile</h2>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-400 to-indigo-500
                            flex items-center justify-center text-white text-2xl font-bold shadow-sm shrink-0">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ProfileRow label="Email"   value={user.emailAddresses[0]?.emailAddress ?? "—"} />
              <ProfileRow label="User ID" value={user.id.slice(0, 20) + "…"} mono />
              <ProfileRow
                label="Auth provider"
                value={
                  user.externalAccounts.length > 0
                    ? user.externalAccounts[0].provider.replace("oauth_", "").toUpperCase()
                    : "Email"
                }
              />
              <ProfileRow label="Joined" value={joinedDate} />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Edit profile</h3>
            <ProfileForm
              initialFirstName={user.firstName ?? ""}
              initialLastName={user.lastName ?? ""}
            />
          </div>
        </div>

        {/* Shopify — one-click connect + products */}
        <ShopifySection />

      </main>
    </div>
  );
}

function ProfileRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="bg-gray-50 rounded-xl px-4 py-3">
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className={`text-sm text-gray-800 font-medium truncate ${mono ? "font-mono" : ""}`}>
        {value}
      </p>
    </div>
  );
}
