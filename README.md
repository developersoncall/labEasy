# Medis — Trusted Healthcare, Simplified

Medis is a full-featured healthcare web app where patients can **find doctors, book clinic or video consultations, order diagnostic tests and health packages with home sample collection, read health articles, and manage their entire medical life** (appointments, lab bookings, reports, prescriptions, favourites and notifications) from a personal dashboard.

The app is a Vite + React 18 single-page application backed entirely by **Supabase** (Postgres + Auth + Storage). Every catalog item and every user action reads from and writes to Supabase — there is no bundled data. Until you connect a project (see [Supabase Setup](#-supabase-setup)), the app shows a friendly setup screen instead of the site.

> The same Supabase database also powers the separate **Medis Diagnostics admin panel** (`labadmin-b1090.web.app`). See [Admin panel compatibility](#admin-panel-compatibility).

---

## ✨ Features

- **Doctor discovery** — browse 15 specialties and 20+ verified doctors with search and filters (specialty, city, language, gender, fee, availability)
- **Appointment booking** — in-clinic or video consultations with date/time-slot picker, patient details and instant confirmation
- **Diagnostic tests & health packages** — 50 lab tests and 10 curated packages with MRP discounts, cart, and a booking flow for **home sample collection** or lab visits
- **Patient dashboard** — appointments (cancel/reschedule), lab bookings, medical reports, prescriptions, favourite doctors, notifications, profile with medical info and avatar upload
- **Reviews & ratings** — star ratings with automatic recalculation of doctor scores
- **Health blog** — 20 original articles across 8 categories with related-post suggestions
- **Auth** — register, login, forgot/reset password, email verification (Supabase Auth)
- **Contact & FAQ** — contact form (feeds the admin panel's Support Tickets) and searchable FAQs
- **Polished UX** — responsive mobile-first design, framer-motion transitions, skeleton loaders, empty states, accessible forms with inline validation

## 🧰 Tech Stack

| Layer            | Technology                                        |
| ---------------- | ------------------------------------------------- |
| Build tool       | Vite 5                                            |
| UI library       | React 18 (plain JavaScript, `.jsx`)               |
| Styling          | Tailwind CSS 3 (custom utility classes)           |
| Routing          | react-router-dom 6 (lazy-loaded routes)           |
| Animations       | framer-motion 11                                  |
| Forms            | react-hook-form 7                                 |
| Icons            | react-icons 5                                     |
| Backend (BaaS)   | Supabase (`@supabase/supabase-js` 2) — Postgres, Auth, Storage, RLS |

## 📁 Folder Structure

```
MedisWebsite/
├── database.html            # Full Supabase schema + seed docs (open in a browser)
├── index.html
├── .env.example             # Copy to .env and fill in Supabase credentials
├── tailwind.config.js
├── vite.config.js
├── public/
│   └── favicon.svg
└── src/
    ├── main.jsx / App.jsx   # App entry
    ├── index.css            # Tailwind + custom classes (btn-primary, card, …)
    ├── components/
    │   ├── common/          # Navbar, Footer, Modal, Spinner, Skeleton, StarRating, …
    │   ├── home/            # Home page sections
    │   ├── doctors/         # DoctorCard
    │   ├── diagnostics/     # TestCard, PackageCard, CartBar
    │   ├── booking/         # DatePicker, TimeSlotPicker
    │   ├── payment/         # PaymentMethods, PaymentSummary
    │   └── blog/            # BlogCard
    ├── constants/           # App config + enums (nav, cities, languages, statuses)
    ├── context/             # AuthContext, CartContext
    ├── hooks/               # useAuth, useFetch, useDebounce, useDocumentTitle
    ├── layouts/             # MainLayout, AuthLayout, DashboardLayout
    ├── pages/
    │   ├── public/          # Home, Doctors, Tests, Packages, Blogs, Contact, …
    │   ├── auth/            # Login, Register, Forgot/Reset password, Verify email
    │   ├── booking/         # BookAppointment, BookTests, BookingSuccess
    │   └── dashboard/       # Dashboard, Appointments, Reports, Profile, …
    ├── routes/              # AppRoutes, ProtectedRoute
    ├── services/            # doctorService, diagnosticService, … (all Supabase)
    ├── supabase/            # Supabase client + isSupabaseConfigured flag
    └── utils/               # helpers (formatCurrency, formatDate, …)
```

## 🚀 Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:3000. Until you add Supabase credentials the app shows a **setup screen** with these instructions — follow [Supabase Setup](#-supabase-setup-going-live) below to bring it online.

## 🗄️ Supabase Setup (going live)

1. **Create a project** at [supabase.com/dashboard](https://supabase.com/dashboard) (pick a region close to your users).
2. **Run the database script**: open [`database.html`](./database.html) in your browser — it is a complete, styled documentation page. Copy the single **Complete SQL Script** block, paste it into the Supabase **SQL Editor**, and hit **Run** once. This one script is everything — tables, enums, triggers, RLS policies, storage buckets, seed data, the admin panel setup (`is_admin()` role security), cash-collection flags, report/prescription upload policies, human-friendly IDs and Bangladesh site settings (idempotent — safe to re-run). To make yourself an admin, edit the email in **section 9.14** at the bottom of the script (see step 6).
3. **Configure credentials**:

   ```bash
   cp .env.example .env
   ```

   Fill in the two values from **Project Settings → API**:

   ```
   VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...   # the "anon public" key
   ```

4. **Restart** `npm run dev` (Vite reads `.env` only at startup). The setup screen disappears and the live site loads, reading and writing entirely through Supabase.
5. In the dashboard, enable the **Email** auth provider and add `http://localhost:3000/reset-password` (plus your production URL) to **Authentication → URL Configuration → Redirect URLs**. Full instructions, verification queries and troubleshooting live inside `database.html`.
6. **Become an admin**: register a normal account on the running site, then in the SQL Editor edit the email in **section 9.14** of the script to your account's email and run that `update … set role = 'admin'` line. Log in with that account and you land on `/admin` (login is shared — a patient account lands on the dashboard instead).

## 🔌 How data flows

There is **no offline or demo data** — the app is Supabase-only:

- `src/supabase/supabase.js` exports `isSupabaseConfigured`, which is `true` only when real credentials exist in `.env`. When it is `false`, `App.jsx` renders `SupabaseSetupNotice` (the setup screen) instead of the routes.
- Every catalog read (doctors, specialties, tests, packages, blogs, FAQs, testimonials) and every user write (appointments, lab bookings, reviews, favourites, profiles, notifications, contact messages) goes through a service in `src/services/*`, which calls the Supabase client directly.
- The only browser-local state is the pre-checkout lab-test **cart** (`CartContext`) and the notification-preference toggles in **Settings** — neither is application data.

## 🗺️ Pages & Routes

| Route | Page | Access |
| --- | --- | --- |
| `/` | Home | Public |
| `/about`, `/services`, `/contact`, `/faq` | About, Services, Contact, FAQ | Public |
| `/doctors`, `/doctors/:slug` | Doctor listing / profile | Public |
| `/specialties` | Specialties directory | Public |
| `/diagnostic-tests` | Lab tests catalog + cart | Public |
| `/health-packages`, `/health-packages/:slug` | Packages / package details | Public |
| `/home-collection`, `/video-consultation` | Service landing pages | Public |
| `/blogs`, `/blogs/:slug` | Blog listing / article | Public |
| `/privacy-policy`, `/terms` | Legal | Public |
| `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email` | Auth flows | Public |
| `/book-appointment/:slug` | Appointment booking flow | 🔒 Login required |
| `/book-tests`, `/booking-success` | Lab test checkout / confirmation | 🔒 Login required |
| `/dashboard` | Dashboard overview | 🔒 Login required |
| `/dashboard/appointments`, `/dashboard/appointments/:id` | My appointments / details | 🔒 |
| `/dashboard/diagnostic-bookings` | My lab bookings | 🔒 |
| `/dashboard/reports`, `/dashboard/prescriptions` | Reports / prescriptions | 🔒 |
| `/dashboard/favorites`, `/dashboard/notifications` | Favourites / notifications | 🔒 |
| `/dashboard/profile`, `/dashboard/edit-profile`, `/dashboard/settings` | Profile & settings | 🔒 |

## 🧑‍💼 Admin Panel Compatibility

This database is shared with the **Medis Diagnostics** admin panel (`labadmin-b1090.web.app`):

- The admin connects with the **service-role key**, which bypasses Row Level Security — RLS protects patient data from other patients, while the back office sees everything.
- Admin modules map directly onto this schema: Bookings & Orders / Home Collections / Lab Visits → `booked_tests`; Reports (Pending → Verified → Signed) → `medical_reports`; Doctors → `doctors`; Users → `user_profiles`; Payments & Billing → `payments`; Categories → `test_categories`; Support Tickets → `contact_messages`; Banners/CMS & Settings → `settings`.
- Status pipelines are shared enums, so both apps always agree: booking statuses (`pending → confirmed → sample_collected → processing → report_ready → completed / cancelled`) render on the patient side via `StatusBadge`.
- ⚠️ The service-role key must **never** appear in this repository or any browser bundle — this site only ever uses the anon key.

## 📜 Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the Vite dev server (http://localhost:3000) |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |

## ☁️ Deployment

The build output is a static SPA — deploy `dist/` anywhere. Because routing is client-side, **all paths must rewrite to `index.html`**:

**Vercel** — add `vercel.json`:

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

**Netlify** — add `public/_redirects`:

```
/*  /index.html  200
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables in your hosting dashboard (they are baked in at build time), and remember to add your production domain to Supabase's Auth redirect URLs.

## 📄 License

MIT — free to use, modify and distribute.
