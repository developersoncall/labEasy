import { Link } from 'react-router-dom';
import { FaExclamationTriangle } from 'react-icons/fa';
import useAuth from '../../hooks/useAuth.js';

/**
 * Shown when we know who is signed in but cannot work out what they are
 * allowed to do — the profile row is missing, or reading it failed.
 *
 * Without this the guards just redirect to the public page, which looks
 * exactly like "your password was wrong" and hides the real cause.
 */
export default function AccessProblem({ detail }) {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="card max-w-lg p-8">
        <FaExclamationTriangle className="text-2xl text-amber-500" aria-hidden="true" />
        <h1 className="mt-3 text-lg font-bold text-gray-900">We can&apos;t tell what your account can do</h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          You are signed in as <strong>{user?.email}</strong>, but reading your role from the database
          failed, so we can&apos;t open the right dashboard for you.
        </p>
        {detail && (
          <p className="mt-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 font-mono text-xs text-amber-900">
            {detail}
          </p>
        )}
        <p className="mt-4 text-sm text-gray-600">
          If this mentions a missing table or column, the migration in{' '}
          <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs">newSQL.html</code> has not
          been run in the Supabase SQL Editor yet.
        </p>
        <div className="mt-6 flex gap-2">
          <Link to="/" className="btn-outline flex-1">Back to home</Link>
          <button type="button" className="btn-primary flex-1" onClick={logout}>Sign out</button>
        </div>
      </div>
    </div>
  );
}
