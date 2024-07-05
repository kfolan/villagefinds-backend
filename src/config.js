export const MONGODB_URI = process.env.MONGODB_URI;
export const HASH_SALT_ROUND = Number(process.env.HASH_SALT_ROUND) || 10;
export const SECRET_KEY = process.env.SECRET_KEY || "abc123";
export const OPENAI_KEY = process.env.OPENAI_KEY || "";
export const ORGANIZATION_ID = process.env.ORGANIZATION_ID || "";
export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
export const STRIPE_CLIENT_ID = process.env.STRIPE_CLIENT_ID || "";
export const STRIPE_REFRESH_URI =
  process.env.STRIPE_REFRESH_URI || "";
export const STRIPE_SUCCESS_FRONTEND_URI =
  process.env.STRIPE_SUCCESS_FRONTEND_URI || "";
export const STRIPE_CONNECT_WEBHOOK_SIGN =
  process.env.STRIPE_CONNECT_WEBHOOK_SIGN || "";
export const SHIPPO_SECRET_KEY = process.env.SHIPPO_SECRET_KEY || '';
export const SHIPPO_API_VERSION = process.env.SHIPPO_API_VERSION || '';
export const FRONTEND_URL = process.env.FRONTEND_URL || "";
export const DEFAULT_CARRIER_ACCOUNT = process.env.DEFAULT_CARRIER_ACCOUNT || '';
export const DEFAULT_SERVICE_LEVEL_TOKEN = process.env.DEFAULT_SERVICE_LEVEL_TOKEN || '';
export const TEST_MODE = process.env.TEST_MODE || false;