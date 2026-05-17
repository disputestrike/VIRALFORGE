# ViralForge Architecture

## Product Shape

ViralForge has three layers:

1. Website: explains the product and directs users to sign in.
2. App Console: lets an operator run the content engine.
3. Engine API: creates deterministic production plans until live providers are connected.

## Core Engine

The engine accepts:

- topic;
- objective;
- content length;
- selected platforms;
- risk tolerance;
- budget ceiling.

It returns:

- concept brief;
- channel packaging;
- module status;
- Six Sigma QA gates;
- policy events;
- documentary plan;
- SaaS and PayPal readiness;
- operating decision.

## Compliance Model

Live external actions remain gated:

- social posting;
- paid AI generation;
- PayPal subscription mutation;
- copyrighted media ingestion;
- documentary factual claims;
- regulated-topic publishing.

## Local Auth

The `/login` route is a local demo sign-in that stores a test session in the browser. Production auth will replace this with proper identity, roles, tenant isolation, and billing state.
