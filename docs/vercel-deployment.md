# ElitePods on Vercel

The existing Cloudflare/Sites target remains available through `npm run build`. The separate Vercel target is `npm run build:vercel`, which writes Build Output API version 3 to `.vercel/output`: public assets on the CDN and a bundled Node.js 22 commerce function in Dublin. No database file, environment file or admin credential is included in the artifact.

## Required environment

Set these as Vercel server environment variables:

| Variable | Purpose |
| --- | --- |
| `TURSO_DATABASE_URL` | Remote database URL beginning with `libsql://` |
| `TURSO_AUTH_TOKEN` | Database access token |
| `ADMIN_PASSWORD` | Random admin password, at least 20 characters |
| `SESSION_SECRET` | Random signing secret, at least 32 characters |
| `RATE_LIMIT_SALT` | Independent random salt, at least 32 characters |

Apply values separately to the deployment environments that need database/admin access. Do not prefix these with `PUBLIC`, `NEXT_PUBLIC` or `VITE`. The build does not read or embed them. Keep `.env*`, `.dev.vars*`, `.vercel`, generated output and local database state out of Git.

## Persistence and admin

The first configured database request initializes the existing SQLite schema and records its migration. Initialization is idempotent and preserves existing rows. LibSQL write batches are transactions; failure rolls back the entire batch. A database migration does not import orders/settings from the previous Sites database. If that database has business data, export and import it deliberately before retiring the old deployment.

Visit `/admin` and use the configured password. Vercel has independent authentication; it never trusts Sites identity headers. Successful login creates an HttpOnly, Secure, SameSite=Strict cookie lasting eight hours. Rotating either the password or signing secret invalidates outstanding sessions. Login guessing and checkout submission limits use database counters keyed by a salted digest of the IP supplied by Vercel. Raw IPs are not stored.

The admin retains orders, filtering, CSV export, status changes, manual COD collection/AWB fields, prices, inventory and store settings. Test orders require an administrator, remain separate from real orders and do not reserve stock. The admin can sign out using its POST action.

## Store launch

Publishing the website does not enable real checkout. Defaults keep checkout closed. Complete contact details, company details and the actual commercial policies in admin before deliberately enabling real orders. No policy, review, warranty or stock claim is generated for the merchant.

When the database is unconfigured, the storefront can display the three default models and prices, with checkout closed. API order submission returns an error rather than a simulated receipt. Homepage server rendering falls back after 1.5 seconds if catalog storage is slow; actual order validation always uses authoritative database prices, settings and stock.

## Verification

Run `node --test tests/*.test.mjs`, `npx tsc --noEmit --incremental false` and `npm run build:vercel`. The Vercel tests cover migration idempotency and rollback, authentication forgery/expiry/rotation, same-origin validation, login limits, unavailable storage, real checkout closure, authenticated test order persistence/retry, management/export, optimistic versions and simultaneous identical retries. The last case synchronizes both initial order reads to reproduce the inventory race deterministically.

After deploying, verify `/api/catalog`, `/produse/pro`, `/admin`, an anonymous `/api/admin/orders` denial and an authenticated test order. Confirm the test receipt appears under “Doar teste”. Keep real checkout closed during this verification.

## Official references

- [Vercel Build Output primitives](https://vercel.com/docs/build-output-api/primitives): static directory, function directories and Node launcher configuration.
- [Vercel Build Output routing](https://vercel.com/docs/build-output-api/configuration): filesystem pass followed by the commerce function.
- [Vercel request headers](https://vercel.com/docs/headers/request-headers): trusted ingress IP headers.
- [Turso TypeScript reference](https://docs.turso.tech/sdk/ts/reference): remote libSQL client and atomic write batches.
