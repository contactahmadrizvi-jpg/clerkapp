import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ShieldCheckIcon, BoltIcon, CubeTransparentIcon } from "@heroicons/react/24/outline";

const features = [
  {
    icon: ShieldCheckIcon,
    title: "Bank-grade security",
    description: "Every session is protected with Clerk's multi-layer auth, MFA, and anomaly detection.",
  },
  {
    icon: BoltIcon,
    title: "Instant sign-in",
    description: "One-click Google OAuth or passwordless email links — no friction, just flow.",
  },
  {
    icon: CubeTransparentIcon,
    title: "Scales automatically",
    description: "Deployed on AWS Lambda + DynamoDB. Handles millions of users with zero cold-start pain.",
  },
];

export default async function Home() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <main className="min-h-screen bg-gradient-to-br from-white via-brand-50 to-indigo-50 flex flex-col">
      {/* ── Navbar ── */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">M</span>
          </div>
          <span className="font-semibold text-gray-900 text-lg">MyApp</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/sign-in"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-4 py-2"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="text-sm font-medium bg-brand-600 text-white px-5 py-2.5 rounded-xl
                       hover:bg-brand-700 transition-colors shadow-sm"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 animate-fade-in">
        <span className="badge bg-brand-50 text-brand-600 border border-brand-100 mb-6 text-xs px-3 py-1">
          Powered by Clerk + AWS
        </span>
        <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 leading-tight max-w-2xl">
          Auth that just{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-indigo-500">
            works
          </span>
        </h1>
        <p className="mt-6 text-lg text-gray-500 max-w-xl leading-relaxed">
          Beautiful, secure authentication with Google and email — deployed globally on AWS Amplify and Lambda.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center gap-3">
          <Link
            href="/sign-up"
            className="btn-primary !w-auto px-8 py-3.5 text-base shadow-sm hover:shadow-md"
          >
            Create free account
          </Link>
          <Link
            href="/sign-in"
            className="btn-ghost !w-auto px-8 py-3.5 text-base"
          >
            Sign in
          </Link>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="max-w-5xl mx-auto w-full px-6 pb-24 grid grid-cols-1 sm:grid-cols-3 gap-6 animate-slide-up">
        {features.map(({ icon: Icon, title, description }) => (
          <div
            key={title}
            className="bg-white rounded-2xl border border-gray-100 shadow-card p-6
                       hover:shadow-card-hover transition-shadow duration-300"
          >
            <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center mb-4">
              <Icon className="w-5 h-5 text-brand-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
            <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
