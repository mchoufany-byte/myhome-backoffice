import { signIn } from "./actions";

const ERROR_MESSAGES: Record<string, string> = {
  not_staff: "That account isn't set up as staff. Ask the owner to add you in Supabase first.",
  deactivated: "This account's backoffice access has been deactivated. Contact the owner if this is unexpected.",
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const rawError = searchParams.error;
  const errorMessage = rawError ? ERROR_MESSAGES[rawError] ?? rawError : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-[11px] font-semibold tracking-widest uppercase text-gold">Gardien du Levant</p>
          <h1 className="text-2xl font-serif text-green mt-1">My Home Backoffice</h1>
        </div>

        <form action={signIn} className="bg-surface border border-line p-6 space-y-4">
          {errorMessage && (
            <div className="text-sm text-red bg-red/5 border border-red/20 px-3 py-2">
              {errorMessage}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-ink/70 mb-1.5">
              Email
            </label>
            <input
              type="email"
              name="email"
              required
              className="w-full border border-line bg-parchment px-3 py-2 text-sm focus:outline-none focus:border-green"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-ink/70 mb-1.5">
              Password
            </label>
            <input
              type="password"
              name="password"
              required
              className="w-full border border-line bg-parchment px-3 py-2 text-sm focus:outline-none focus:border-green"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-green text-parchment font-medium py-2.5 text-sm hover:bg-greenDark transition-colors"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
