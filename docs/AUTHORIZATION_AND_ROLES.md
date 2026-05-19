# Authorization and Roles

## Current roles

- Anonymous visitor: public marketing pages, public demo/config routes, login.
- Authenticated user: protected tRPC procedures and dashboard/app routes.
- Admin/owner: admin procedure and administrative routes.
- Webhook caller: limited unauthenticated endpoints with signature/secret validation where implemented.

## Auth flow

- Google OAuth routes are registered from `server/_core/oauth.ts`.
- Session context is created in `server/_core/context.ts`.
- Protected tRPC procedures are enforced in `server/_core/trpc.ts`.
- Admin controls are scoped through an admin procedure in `server/routers.ts`.

## Security guidance

- Keep owner/admin checks server-side.
- Do not expose provider secrets or Railway variables to the frontend.
- Maintain webhook validation for telephony and external event routes.
- Treat any direct admin force-migration endpoint as high risk and require a strong secret in production.
