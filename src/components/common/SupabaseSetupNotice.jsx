/**
 * Full-screen notice shown when Supabase credentials are missing.
 *
 * The app is Supabase-only — nothing works without a project URL and anon
 * key — so App.jsx renders this instead of the routes until `.env` is set.
 * Deliberately router-free: it renders outside every layout.
 */

const STEPS = [
  {
    title: 'Create a Supabase project',
    body: (
      <>
        Sign in at{' '}
        <a
          href="https://supabase.com"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-primary-600 hover:text-primary-700 hover:underline"
        >
          supabase.com
        </a>{' '}
        and create a new project (the free tier works fine).
      </>
    ),
  },
  {
    title: 'Set up the database schema',
    body: (
      <>
        Open <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-800">database.html</code>{' '}
        in this repo, copy the SQL and run it in the Supabase{' '}
        <span className="font-semibold text-gray-800">SQL Editor</span>.
      </>
    ),
  },
  {
    title: 'Add your credentials',
    body: (
      <>
        Copy{' '}
        <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-800">.env.example</code>{' '}
        to <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-800">.env</code> and set
        both values from Supabase Dashboard &rarr; Project Settings &rarr; API:
      </>
    ),
    code: ['VITE_SUPABASE_URL=https://your-project.supabase.co', 'VITE_SUPABASE_ANON_KEY=your-anon-public-key'],
  },
  {
    title: 'Restart the dev server',
    body: <>Stop the running server and start it again so Vite picks up the new environment variables.</>,
    code: ['npm run dev'],
  },
];

/** Setup checklist rendered when VITE_SUPABASE_* credentials are absent. */
export default function SupabaseSetupNotice() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
      <div className="card w-full max-w-xl p-8 sm:p-10">
        {/* Brand mark (same as Navbar) */}
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 text-lg font-extrabold text-white">
            +
          </span>
          <span className="text-xl font-extrabold tracking-tight text-gray-900">
            Lab<span className="text-primary-600">Easy</span>
          </span>
        </div>

        <h1 className="mt-6 text-2xl font-bold text-gray-900">Connect your Supabase project</h1>
        <p className="mt-2 text-sm text-gray-500">
          This app runs entirely on Supabase — doctors, lab tests, bookings and accounts all live
          there. Add your project credentials to get started.
        </p>

        <ol className="mt-8 space-y-6">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-4">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-50 text-sm font-bold text-primary-600"
                aria-hidden="true"
              >
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold text-gray-900">{step.title}</h2>
                <p className="mt-1 text-sm leading-relaxed text-gray-600">{step.body}</p>
                {step.code && (
                  <pre className="mt-3 overflow-x-auto rounded-xl bg-gray-900 px-4 py-3 text-xs leading-relaxed text-gray-100">
                    {step.code.join('\n')}
                  </pre>
                )}
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-8 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-xs text-gray-500">
          Once the credentials are in place, this page is replaced by the full app
          automatically — no code changes needed.
        </div>
      </div>
    </div>
  );
}
