declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    ADMIN_EMAILS?: string;
    RATE_LIMIT_SALT?: string;
    RESEND_API_KEY?: string;
    EMAIL_FROM?: string;
  }
}
