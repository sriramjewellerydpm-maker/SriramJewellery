/**
 * Runs before every test file.
 *
 * 1. Pins the environment. Server modules call dotenv.config(), which reads
 *    ./.env — the developer's real file, with a live Atlas URI and secrets.
 *    dotenv never overrides a variable that is already set, so every variable
 *    that file defines is set here first, and the ones that must be absent are
 *    deleted.
 * 2. Mocks every outbound channel: Razorpay SDK, axios (MSG91), the email
 *    provider's HTTP API, the WhatsApp util, and global fetch. Nothing in the
 *    suite can leave the machine.
 */
import { vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => {
  // dotenv.config() reads `${cwd}/.env`, and it fills in any variable that is
  // not set — including ones a test deletes on purpose. Run each test process
  // from a directory with no .env so the developer's real file is never read.
  // decodeURIComponent, because a URL percent-encodes its path: a repo checked
  // out under a directory with a space ("BuildWithUs Project/") yields
  // ".../BuildWithUs%20Project/..." and chdir fails with ENOENT — taking every
  // test file in the suite down with it before a single test runs.
  // Decoded inline rather than with fileURLToPath: this block is vi.hoisted(),
  // so it executes before any ESM import of this file is initialised.
  process.chdir(decodeURIComponent(new URL("./no-dotenv/", import.meta.url).pathname));

  const TEST_ENV = {
    NODE_ENV: "test",
    VERCEL: "1", // server/index.js skips app.listen
    DOTENV_CONFIG_QUIET: "true",
    MONGODB_URI: "mongodb://127.0.0.1:1/never-used", // replaced per file in helpers/app.js
    JWT_SECRET: "test-jwt-secret-please-do-not-use-anywhere-else",
    ALLOW_TEST_OTP: "true",
    CRON_SECRET: "test-cron-secret",
    RAZORPAY_KEY_ID: "rzp_test_dummykey",
    RAZORPAY_KEY_SECRET: "test_razorpay_key_secret",
    RAZORPAY_WEBHOOK_SECRET: "test_razorpay_webhook_secret",
    ADMIN_PASSWORD: "AdminPass!2026",
    TEST_USER_PASSWORD: "UserPass!2026",
    BREVO_API_KEY: "xkeysib-test-not-a-real-key",
    EMAIL_FROM: "Test Shop <test@example.invalid>",
    CLOUDINARY_URL: "cloudinary://123456789012345:test_cloudinary_secret@testcloud",
    PUBLIC_SITE_URL: "http://localhost:5175",
    VITE_PUBLIC_SITE_URL: "http://localhost:5175",
    ALLOWED_ORIGINS: "http://localhost:5175",
    PORT: "0",
    VITE_API_PROXY_TARGET: "http://localhost:0",
  };
  const MUST_BE_UNSET = [
    "VERCEL_ENV",
    "TEST_OTP_EMAILS",
    "TEST_OTP_PHONES",
    "EMAIL_PROVIDER",
    "EMAIL_REPLY_TO",
    "MSG91_AUTH_KEY",
    "MSG91_TEMPLATE_ID",
    "WHATSAPP_TOKEN",
    "WHATSAPP_PHONE_NUMBER_ID",
    "ADMIN_WHATSAPP_NUMBER",
    "ALLOW_EMAIL_REGISTRATION",
    "STOCK_RELEASE_MINUTES",
    "RATE_STALE_AFTER_DAYS",
    "EMAIL_DRY_RUN",
    "ALLOW_WEBMAIL_SENDER",
    "ALLOW_INSECURE_DEV",
  ];
  Object.assign(process.env, TEST_ENV);
  for (const k of MUST_BE_UNSET) delete process.env[k];

  const m = {
    TEST_ENV,
    MUST_BE_UNSET,
    razorpayCreate: vi.fn(),
    msg91Post: vi.fn(),
    emailSend: vi.fn(),
    whatsapp: {
      sendWhatsAppAlert: vi.fn(),
      sendOrderAlert: vi.fn(),
      sendRefundRequiredAlert: vi.fn(),
      sendOrderApprovalAlert: vi.fn(),
    },
  };
  globalThis.__mocks = m;
  return m;
});

vi.mock("razorpay", () => ({
  default: class RazorpayMock {
    constructor(opts) {
      this.opts = opts;
      this.orders = { create: (...args) => mocks.razorpayCreate(...args) };
    }
  },
}));

vi.mock("axios", async (importOriginal) => {
  const actual = await importOriginal();
  const post = (...args) => mocks.msg91Post(...args);
  const refuse = () => Promise.reject(new Error("axios is disabled in tests"));
  const stub = { ...actual.default, post, get: refuse, put: refuse, patch: refuse, delete: refuse, request: refuse };
  return { ...actual, default: stub, post };
});

vi.mock("../../server/utils/whatsapp.js", () => ({
  sendWhatsAppAlert: (...a) => mocks.whatsapp.sendWhatsAppAlert(...a),
  sendOrderAlert: (...a) => mocks.whatsapp.sendOrderAlert(...a),
  sendRefundRequiredAlert: (...a) => mocks.whatsapp.sendRefundRequiredAlert(...a),
  sendOrderApprovalAlert: (...a) => mocks.whatsapp.sendOrderApprovalAlert(...a),
}));

// Anything that reaches for the network directly (the real whatsapp.js uses
// fetch) fails loudly instead of sending.
//
// The email provider is the one exception: it is a plain HTTPS call, so it is
// intercepted here rather than by mocking an SDK. `emailSend` receives a
// PROVIDER-NEUTRAL view of the message — to/subject/text/html as the app thinks
// of them — so assertions do not have to know Brevo's wire format, and the next
// provider swap is a change in this file alone. The untranslated body is on
// `.raw` for the few tests that check the wire format itself.
const EMAIL_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

const networkFetch = vi.fn(async (url, init = {}) => {
  const target = String(url);
  if (!target.startsWith(EMAIL_ENDPOINT)) {
    throw new Error(`fetch is disabled in tests (attempted ${target})`);
  }

  const raw = JSON.parse(init.body);
  const address = (a) => (a?.name ? `${a.name} <${a.email}>` : a?.email);

  return mocks.emailSend(
    {
      from: address(raw.sender),
      to: (raw.to || []).map((t) => t.email),
      subject: raw.subject,
      text: raw.textContent,
      html: raw.htmlContent,
      replyTo: raw.replyTo ? address(raw.replyTo) : undefined,
      raw,
      headers: init.headers || {},
    },
    init
  );
});

vi.stubGlobal("fetch", networkFetch);

/**
 * Re-apply the stub above. A suite that installs its own fetch (the WhatsApp
 * tests do) must call this when it is done: vi.stubGlobal persists past the
 * describe that set it, and the next suite to send an email would otherwise
 * get that stub's response shape instead of the provider's.
 */
export const restoreFetch = () => vi.stubGlobal("fetch", networkFetch);

/** A 2xx from the provider, shaped as Brevo shapes it. */
export const emailAccepted = (messageId = "email_test") =>
  new Response(JSON.stringify({ messageId }), {
    status: 201,
    headers: { "content-type": "application/json" },
  });

/** A non-2xx from the provider, e.g. emailRejected(402, "not_enough_credits"). */
export const emailRejected = (status, code, message = "") =>
  new Response(JSON.stringify({ code, message }), {
    status,
    headers: { "content-type": "application/json" },
  });

let rzpCounter = 0;
export const resetMocks = () => {
  mocks.razorpayCreate.mockReset().mockImplementation(async (opts) => ({
    id: `order_TEST${++rzpCounter}${Math.random().toString(36).slice(2, 8)}`,
    entity: "order",
    amount: opts.amount,
    currency: opts.currency,
    receipt: opts.receipt,
    status: "created",
  }));
  mocks.msg91Post.mockReset().mockResolvedValue({ data: { type: "success" } });
  mocks.emailSend.mockReset().mockResolvedValue(emailAccepted());
  for (const fn of Object.values(mocks.whatsapp)) fn.mockReset().mockResolvedValue(false);
};

beforeEach(() => {
  resetMocks();
});

// Keep the server's intentional console noise out of the report. Set
// TEST_VERBOSE=1 to see it.
if (!process.env.TEST_VERBOSE) {
  // Mongoose 9 warns on every `{ new: true }` (reported separately).
  const emitWarning = process.emitWarning.bind(process);
  process.emitWarning = (warning, ...rest) => {
    if (String(warning?.message ?? warning).includes("mongoose:")) return;
    return emitWarning(warning, ...rest);
  };
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
}
