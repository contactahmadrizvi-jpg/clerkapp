import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-white via-brand-50 to-indigo-50 flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center shadow-sm">
          <span className="text-white font-bold">M</span>
        </div>
        <span className="font-semibold text-gray-900 text-xl">MyApp</span>
      </div>

      <SignUp
        appearance={{
          layout: {
            socialButtonsPlacement: "top",
            socialButtonsVariant: "blockButton",
          },
        }}
        redirectUrl="/dashboard"
        signInUrl="/sign-in"
      />

      <p className="mt-6 text-xs text-gray-400 text-center">
        By creating an account you agree to our{" "}
        <a href="#" className="text-brand-600 hover:underline">Terms</a> and{" "}
        <a href="#" className="text-brand-600 hover:underline">Privacy Policy</a>.
      </p>
    </main>
  );
}
