import { Link } from 'react-router-dom';
import {
  FaFlask, FaArrowRight, FaCheck, FaLock, FaUsers, FaFilePdf,
  FaClipboardCheck, FaClock, FaChartLine, FaQuoteLeft,
} from 'react-icons/fa';
import { useSettings } from '../../context/SettingsContext.jsx';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';

/**
 * The public face of the platform while the patient portal is switched off.
 *
 * Editorial rather than brochure-like: a serif headline, hairline rules and a
 * lot of air, so a laboratory owner reads it as a considered instrument rather
 * than a landing page. One informational page, two doors — Sign In and
 * Register With Us.
 *
 * Deliberately standalone (no MainLayout): the marketing navbar links to
 * doctor/test/package pages that belong to the patient portal, and those are
 * disabled. Flip `public_portal_enabled` and the old site returns untouched.
 */

/* -- small shared pieces, so the rhythm is identical down the page -------- */

function Eyebrow({ children, light = false }) {
  return (
    <span
      className={`inline-flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.22em] ${
        light ? 'text-primary-200' : 'text-primary-600'
      }`}
    >
      <span className={`h-px w-6 ${light ? 'bg-primary-300/60' : 'bg-primary-300'}`} />
      {children}
    </span>
  );
}

function SectionHead({ eyebrow, title, lead, center = false }) {
  return (
    <div className={center ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 className="mt-4 font-display text-[32px] font-medium leading-[1.15] tracking-[-0.01em] text-slate-900 sm:text-[40px]">
        {title}
      </h2>
      {lead && <p className="mt-4 text-[15px] leading-relaxed text-slate-500">{lead}</p>}
    </div>
  );
}

const STEPS = [
  ['01', 'Register your laboratory', 'Licence, address and the person we should talk to. Two minutes, one form.'],
  ['02', 'We verify and approve', 'Our team reads your documents. The decision is waiting the next time you sign in.'],
  ['03', 'Add your team', 'A login each for reception, the bench and the report desk — with real permissions.'],
  ['04', 'Run your day', 'Booking to payment to testing to report, in one place everyone can see.'],
];

const BENEFITS = [
  [<FaClipboardCheck key="i" />, 'One pipeline, no paper',
    'Every booking moves through the same stages, so nothing is lost between the counter and the report desk.'],
  [<FaUsers key="i" />, 'Role-based staff logins',
    'Receptionist, tester, reportist. Each login opens on the work waiting for that person, and nothing else.'],
  [<FaClock key="i" />, 'Know where every sample is',
    'Booked, in testing, report pending, completed — the live stage of every booking, without asking anyone.'],
  [<FaFilePdf key="i" />, 'Reports delivered digitally',
    'Upload the PDF once. It is stored privately against the right booking and reachable only by the right people.'],
  [<FaLock key="i" />, 'Your data stays yours',
    'Isolation is enforced in the database itself, not just the interface. No other laboratory can read your records.'],
  [<FaChartLine key="i" />, 'The day at a glance',
    'Volumes, unpaid bookings, testing backlog and reports due — without maintaining a single spreadsheet.'],
];

const PIPELINE = [
  ['Reception', 'Booking created'],
  ['Reception', 'Payment recorded'],
  ['Reception', 'Sent for testing'],
  ['Tester', 'Testing in progress'],
  ['Tester', 'Testing completed'],
  ['Reportist', 'Report uploaded'],
  ['Reportist', 'Completed'],
];

const INCLUDED = [
  'Unlimited bookings and patients',
  'Staff accounts with real permissions',
  'Digital report delivery',
  'Payment and collection tracking',
  'Your own test catalogue',
  'Daily operations dashboard',
];

const BOARD = [
  ['BK41', 'Complete Blood Count', 'Testing', 'bg-indigo-50 text-indigo-700 ring-indigo-100'],
  ['BK42', 'Lipid Profile', 'Report up', 'bg-sky-50 text-sky-700 ring-sky-100'],
  ['BK43', 'Thyroid Panel', 'Unpaid', 'bg-amber-50 text-amber-700 ring-amber-100'],
  ['BK44', 'Vitamin D', 'Completed', 'bg-emerald-50 text-emerald-700 ring-emerald-100'],
];

export default function PlatformHome() {
  const { brandName, contactEmail, contactPhone, labRegistrationOpen } = useSettings();
  useDocumentTitle('Diagnostics, organised');

  return (
    <div className="min-h-screen bg-[#fcfcfa] text-slate-900">
      {/* ================= header ================= */}
      <header className="sticky top-0 z-40 border-b border-slate-900/[0.07] bg-[#fcfcfa]/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link to="/" className="flex shrink-0 items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-white shadow-sm">
              <FaFlask aria-hidden="true" />
            </span>
            <span className="whitespace-nowrap font-display text-[19px] font-semibold tracking-tight sm:text-[21px]">
              {brandName}
            </span>
          </Link>

          <nav className="flex items-center gap-1 sm:gap-2">
            <Link
              to="/support"
              className="hidden rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-900/[0.04] hover:text-slate-900 sm:block"
            >
              Contact
            </Link>
            <Link
              to="/login"
              className="whitespace-nowrap rounded-lg px-3 py-2 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-900/[0.04] hover:text-slate-900 sm:px-4 sm:text-sm"
            >
              Sign In
            </Link>
            {labRegistrationOpen && (
              <Link
                to="/register"
                className="whitespace-nowrap rounded-lg bg-slate-900 px-3.5 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-slate-800 sm:px-4 sm:text-sm"
              >
                Register<span className="hidden sm:inline"> With Us</span>
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* ================= hero ================= */}
      <section className="relative overflow-hidden">
        {/* faint grid, the way ruled paper reads */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.55]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(15,23,42,.045) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,.045) 1px, transparent 1px)',
            backgroundSize: '72px 72px',
            maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, #000 40%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, #000 40%, transparent 100%)',
          }}
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-16 sm:px-8 sm:pb-28 sm:pt-24">
          <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <Eyebrow>For diagnostic laboratories</Eyebrow>

              <h1 className="mt-6 font-display text-[44px] font-normal leading-[1.05] tracking-[-0.02em] text-slate-900 sm:text-[52px]">
                Run your laboratory
                <br className="hidden sm:block" />{' '}
                <em className="not-italic text-primary-700">without the paperwork.</em>
              </h1>

              <p className="mt-7 max-w-xl text-[17px] leading-[1.7] text-slate-600">
                {brandName} gives your laboratory a single shared workflow — from the booking at the
                counter to the report in the patient&apos;s hands — with a separate login for every
                member of your team and permissions that actually hold.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-3">
                {labRegistrationOpen && (
                  <Link
                    to="/register"
                    className="group inline-flex items-center gap-2.5 rounded-xl bg-primary-600 px-7 py-3.5 text-[15px] font-semibold text-white shadow-[0_1px_2px_rgba(2,132,199,.4),0_8px_24px_-8px_rgba(2,132,199,.5)] transition hover:bg-primary-700"
                  >
                    Register With Us
                    <FaArrowRight className="transition group-hover:translate-x-0.5" aria-hidden="true" />
                  </Link>
                )}
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-7 py-3.5 text-[15px] font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
                >
                  Sign In
                </Link>
              </div>

              <p className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <FaCheck className="text-primary-600" aria-hidden="true" /> Approval within a working day
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <FaCheck className="text-primary-600" aria-hidden="true" /> No card required
                </span>
              </p>
            </div>

            {/* the product, understated */}
            <div className="relative">
              <div className="absolute -inset-3 -z-10 rounded-[26px] bg-gradient-to-br from-primary-100/70 to-transparent" aria-hidden="true" />
              <div className="overflow-hidden rounded-2xl border border-slate-900/[0.08] bg-white shadow-[0_1px_2px_rgba(15,23,42,.04),0_24px_48px_-24px_rgba(15,23,42,.25)]">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
                  <div>
                    <p className="font-display text-[15px] font-semibold">Today at your lab</p>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Live board</p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live
                  </span>
                </div>

                <ul className="divide-y divide-slate-100">
                  {BOARD.map(([ref, name, stage, tone]) => (
                    <li key={ref} className="flex items-center justify-between gap-3 px-5 py-3.5">
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-medium text-slate-800">{name}</p>
                        <p className="font-mono text-[11px] text-slate-400">#{ref}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${tone}`}>
                        {stage}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100 bg-slate-50/60">
                  {[['12', 'Booked'], ['4', 'In testing'], ['7', 'Delivered']].map(([n, l]) => (
                    <div key={l} className="px-4 py-3.5 text-center">
                      <p className="font-display text-[22px] font-semibold leading-none text-slate-900">{n}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.1em] text-slate-400">{l}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= the sentence that sums it up ================= */}
      <section className="border-y border-slate-900/[0.07] bg-white">
        <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <p className="font-display text-[26px] font-normal italic leading-snug text-slate-900 sm:text-[30px]">
              A register, a WhatsApp group and someone&apos;s memory.
            </p>
            <p className="text-[16px] leading-[1.75] text-slate-600">
              That is how most laboratories run — and it works, until the day it doesn&apos;t. {brandName}{' '}
              replaces it with one place where a booking is created, paid for, tested, reported and
              closed; where every step is recorded, and every person sees precisely their part of it.
            </p>
          </div>
        </div>
      </section>

      {/* ================= benefits ================= */}
      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <SectionHead
          eyebrow={`Why ${brandName}`}
          title="Built around how a laboratory actually works"
          lead="Not a generic CRM bent into shape. Every screen exists because someone in a lab needs it at that moment in the day."
        />

        <div className="mt-14 grid gap-px overflow-hidden rounded-2xl bg-slate-900/[0.07] sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map(([icon, title, body]) => (
            <div key={title} className="group bg-[#fcfcfa] p-7 transition hover:bg-white">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-600 ring-1 ring-primary-100 transition group-hover:bg-primary-600 group-hover:text-white">
                {icon}
              </span>
              <h3 className="mt-5 font-display text-[19px] font-semibold text-slate-900">{title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-slate-500">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ================= how it works ================= */}
      <section className="border-y border-slate-900/[0.07] bg-white">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
          <SectionHead
            eyebrow="How it works"
            title="From registration to your first report"
            center
          />

          <ol className="mt-14 grid gap-px overflow-hidden rounded-2xl bg-slate-900/[0.07] md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(([n, title, body]) => (
              <li key={n} className="bg-white p-7">
                <span className="font-display text-[38px] font-normal leading-none text-primary-200">{n}</span>
                <h3 className="mt-4 font-display text-[19px] font-semibold text-slate-900">{title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-slate-500">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ================= the pipeline, on dark ================= */}
      <section className="bg-slate-900 text-white">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
          <div className="max-w-2xl">
            <Eyebrow light>The workflow</Eyebrow>
            <h2 className="mt-4 font-display text-[32px] font-medium leading-tight tracking-[-0.01em] text-white sm:text-[40px]">
              Everyone sees their step. <span className="text-primary-300">Only theirs.</span>
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-slate-400">
              A booking moves along one track. The person whose turn it is gets the button; nobody
              else does — and the database enforces it, not just the screen.
            </p>
          </div>

          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {PIPELINE.map(([who, what], i) => (
              <div
                key={what}
                className="relative rounded-xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-primary-400/40 hover:bg-white/[0.07]"
              >
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary-300">{who}</span>
                <p className="mt-1.5 text-[15px] font-medium text-white">{what}</p>
                <span className="absolute right-3 top-3 font-mono text-[11px] text-white/25">
                  {String(i + 1).padStart(2, '0')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= registration ================= */}
      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="grid gap-14 lg:grid-cols-2 lg:items-start">
          <div>
            <SectionHead
              eyebrow="Registration"
              title="Laboratories only, for now"
              lead={`Currently ${brandName} accepts registrations from diagnostic laboratories only. Hospitals, individual doctors and patients cannot register yet — we are onboarding labs first, so the testing workflow is right before anything is built on top of it.`}
            />

            <ul className="mt-9 grid gap-y-3 sm:grid-cols-2">
              {INCLUDED.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[14px] text-slate-700">
                  <span className="mt-[3px] flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary-600 text-[8px] text-white">
                    <FaCheck aria-hidden="true" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-10 flex flex-wrap gap-3">
              {labRegistrationOpen ? (
                <Link
                  to="/register"
                  className="group inline-flex items-center gap-2.5 rounded-xl bg-primary-600 px-7 py-3.5 text-[15px] font-semibold text-white transition hover:bg-primary-700"
                >
                  Register your laboratory
                  <FaArrowRight className="transition group-hover:translate-x-0.5" aria-hidden="true" />
                </Link>
              ) : (
                <span className="rounded-xl bg-amber-50 px-5 py-3 text-sm font-medium text-amber-800 ring-1 ring-amber-100">
                  Registrations are paused right now
                </span>
              )}
              <Link
                to="/support"
                className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-7 py-3.5 text-[15px] font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
              >
                Questions first? Ask us
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-900/[0.08] bg-white p-8 shadow-[0_1px_2px_rgba(15,23,42,.04)]">
            <h3 className="font-display text-[22px] font-semibold text-slate-900">What you will need</h3>
            <p className="mt-1.5 text-[14px] text-slate-500">Have these to hand and it takes two minutes.</p>

            <ol className="mt-7 space-y-6">
              {[
                ['Laboratory name and address', 'Exactly as printed on your licence.'],
                ['Licence or registration number', 'We check this against the documents you upload.'],
                ['Licence PDF', 'Attach it during registration — it is what we verify you against.'],
                ['A working email', 'This becomes your Lab Admin login.'],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-4">
                  <span className="font-display text-[15px] font-semibold text-primary-300">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="border-l border-slate-100 pl-4">
                    <p className="text-[15px] font-semibold text-slate-900">{t}</p>
                    <p className="mt-0.5 text-[13.5px] leading-relaxed text-slate-500">{d}</p>
                  </div>
                </li>
              ))}
            </ol>

            <p className="mt-8 rounded-xl bg-primary-50 p-4 text-[13.5px] leading-relaxed text-primary-900 ring-1 ring-primary-100">
              After you submit, your registration sits at <strong>Pending</strong> until an
              administrator approves it. Sign in any time to check the status.
            </p>
          </div>
        </div>
      </section>

      {/* ================= assurance ================= */}
      <section className="border-y border-slate-900/[0.07] bg-white">
        <div className="mx-auto max-w-4xl px-5 py-20 text-center sm:px-8">
          <FaQuoteLeft className="mx-auto text-2xl text-primary-200" aria-hidden="true" />
          <p className="mt-6 font-display text-[26px] font-normal leading-[1.45] text-slate-900 sm:text-[32px]">
            Every laboratory&apos;s data is fenced off in the database itself — not hidden by a screen,
            not filtered by a query someone might forget to write.
          </p>
          <p className="mt-6 text-[13px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Row-level isolation, enforced per lab
          </p>
        </div>
      </section>

      {/* ================= closing ================= */}
      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 px-8 py-14 text-center text-white sm:px-16">
          <div
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(255,255,255,.35) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.35) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
              maskImage: 'radial-gradient(ellipse 70% 80% at 50% 0%, #000, transparent)',
              WebkitMaskImage: 'radial-gradient(ellipse 70% 80% at 50% 0%, #000, transparent)',
            }}
            aria-hidden="true"
          />
          <div className="relative">
            <h2 className="font-display text-[32px] font-medium leading-tight text-white sm:text-[42px]">
              Put your lab&apos;s day in one place.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[15.5px] leading-relaxed text-white/80">
              Register today and start booking through {brandName} as soon as you are approved.
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              {labRegistrationOpen && (
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2.5 rounded-xl bg-white px-7 py-3.5 text-[15px] font-semibold text-primary-700 shadow-sm transition hover:bg-primary-50"
                >
                  Register With Us <FaArrowRight aria-hidden="true" />
                </Link>
              )}
              <Link
                to="/login"
                className="inline-flex items-center rounded-xl border border-white/35 px-7 py-3.5 text-[15px] font-semibold text-white transition hover:bg-white/10"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ================= footer ================= */}
      <footer className="border-t border-slate-900/[0.07] bg-white">
        <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
          <div className="flex flex-col items-start justify-between gap-8 sm:flex-row">
            <div>
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-white">
                  <FaFlask aria-hidden="true" />
                </span>
                <span className="font-display text-[19px] font-semibold">{brandName}</span>
              </div>
              <p className="mt-3 max-w-xs text-[13.5px] leading-relaxed text-slate-500">
                One shared workflow for diagnostic laboratories — booking, testing and digital reports.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-x-14 gap-y-2 text-[13.5px]">
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Platform</p>
                <Link className="block text-slate-600 hover:text-primary-700" to="/login">Sign in</Link>
                {labRegistrationOpen && (
                  <Link className="block text-slate-600 hover:text-primary-700" to="/register">Register</Link>
                )}
                <Link className="block text-slate-600 hover:text-primary-700" to="/support">Contact support</Link>
              </div>
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Reach us</p>
                {contactEmail && (
                  <a className="block text-slate-600 hover:text-primary-700" href={`mailto:${contactEmail}`}>
                    {contactEmail}
                  </a>
                )}
                {contactPhone && <p className="text-slate-600">{contactPhone}</p>}
              </div>
            </div>
          </div>

          <p className="mt-12 border-t border-slate-100 pt-6 text-[12.5px] text-slate-400">
            © {new Date().getFullYear()} {brandName}. Patient accounts are not open yet — the platform is
            currently onboarding diagnostic laboratories.
          </p>
        </div>
      </footer>
    </div>
  );
}
