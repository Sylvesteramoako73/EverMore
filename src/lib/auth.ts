import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db, schema } from "@/db";
import { sendEmail } from "@/lib/email/send";
import { emails } from "@/lib/email/templates";
import { env, isProduction } from "@/lib/env";

const google =
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
    ? { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET } }
    : undefined;

export const isGoogleEnabled = Boolean(google);

const devSlack = isProduction ? 1 : 10;

export const auth = betterAuth({
  appName: "EverMore",
  baseURL: env.APP_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user: schema.user, session: schema.session, account: schema.account, verification: schema.verification },
  }),
  user: {
    additionalFields: {
      // `input: false` means sign-up and profile updates can never set these.
      role: { type: "string", defaultValue: "user", input: false },
      suspendedAt: { type: "date", required: false, input: false },
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 10,
    maxPasswordLength: 128,
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail(emails.resetPassword(user.email, user.name, url));
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60 * 24,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail(emails.verifyEmail(user.email, user.name, url));
    },
  },
  socialProviders: google,
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    // Strict in production; ten times looser locally so testing sign-ups doesn't lock you out.
    customRules: {
      "/sign-in/email": { window: 60, max: 5 * devSlack },
      "/sign-up/email": { window: 60 * 10, max: 5 * devSlack },
      "/request-password-reset": { window: 60 * 10, max: 3 * devSlack },
      "/send-verification-email": { window: 60 * 10, max: 3 * devSlack },
    },
  },
  advanced: {
    useSecureCookies: isProduction,
    ipAddress: env.TRUSTED_IP_HEADER ? { ipAddressHeaders: [env.TRUSTED_IP_HEADER] } : undefined,
  },
  // Must be last: lets server actions set auth cookies.
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
