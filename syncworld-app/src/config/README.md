# config/

Application configuration and feature flag management.

## Responsibility

Provides a typed, validated access layer for environment variables and feature flags. All external configuration flows through this module so that no feature or service reads raw `process.env` directly (DIP).

## Files

| File | Scope |
|------|-------|
| `env.ts` | Environment variable loading and validation |
| `feature-flags.ts` | Feature flag definitions and resolution |

## Integration Points

- **Firebase Remote Config** — future source for runtime feature flag overrides
- **Expo Constants** — source for build-time env vars in managed workflow
- **CI/CD** — `.env` files injected per environment (see `.env.example` at project root)

## Extension

To add a new config concern (e.g., analytics config, A/B test config):
1. Create a new file in this directory
2. Export a typed config object and a loader function
3. Wire the loader into the app bootstrap sequence
