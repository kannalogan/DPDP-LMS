# SYRA Learning Platform

Enterprise-grade AI-first learning management platform for compliance, privacy, security, and custom enterprise training.

The initial product track is DPDP compliance, but the platform architecture is domain-neutral. DPDP is modeled as one learning track, not as the application boundary.

## Product Direction

- Multi-tenant SaaS for organizations, mentors, instructors, admins, and students.
- Reusable learning tracks for DPDP, GDPR, HIPAA, SOC 2, ISO 27001, cybersecurity, cloud, AI, DevOps, and custom enterprise courses.
- AI-assisted learning, assessment generation, remediation, and mentor workflows.
- Scale target: 100+ countries, 1000+ organizations, 100,000+ learners, 10,000+ courses, and millions of assessments.

## Stack

- Next.js 15, React 19, TypeScript
- Tailwind CSS, shadcn/ui, Framer Motion
- React Hook Form, TanStack Query, Zod
- Supabase Auth, PostgreSQL, Storage, Realtime
- Resend, MSG91
- Razorpay, Stripe
- OpenAI, Claude, Gemini
- Vercel

## Architecture

The application uses feature-first boundaries:

```txt
app/
  (auth)/
  (student)/
  (mentor)/
  (admin)/
components/
features/
  ai/
  assessments/
  auth/
  billing/
  courses/
  learning-tracks/
  organizations/
  users/
services/
hooks/
lib/
types/
database/
```

See `docs/architecture.md` and `database/migrations/0001_core_learning_platform.sql` for the first architecture slice.

## Getting Started

```bash
npm install
npm run dev
```

Create `.env.local` from `.env.example` before connecting Supabase and provider services.

