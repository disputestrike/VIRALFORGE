# Frontend Route Map

Source: `client/src/App.tsx`.

## Routes

- `/`
- `/404`
- `/about`
- `/admin`
- `/agency`
- `/analytics`
- `/app`
- `/appointments`
- `/campaigns`
- `/campaigns/:id`
- `/dashboard`
- `/integrations`
- `/knowledge-base`
- `/leads`
- `/login`
- `/messages`
- `/omnipulse`
- `/omnipulse-console`
- `/omnipulse-preview`
- `/onboarding`
- `/platform`
- `/pricing`
- `/privacy`
- `/resources`
- `/security`
- `/settings`
- `/solutions`
- `/templates`
- `/terms`
- `/testimonials`
- `/viralforge`
- `/voice-ai`
- `/workflows`

## Frontend runtime

- React root: `client/src/main.tsx`
- Router: `wouter`
- API client: `@trpc/client` with `/api/trpc`
- Query/cache: `@tanstack/react-query`
- Theme/context: `ThemeProvider`
- Error containment: `ErrorBoundary`

## Build notes

The production frontend is built by Vite into `dist/public`, then served by `server/_core/vite-prod.ts`. SPA fallback intentionally excludes `/api/` and `/webhooks/`.
