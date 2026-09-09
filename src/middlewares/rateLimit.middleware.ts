import rateLimit from 'express-rate-limit';

// Nothing in this app throttled requests at all before this - login,
// signup, and especially the 6-digit OTP (900,000 possible values, valid
// for 5 minutes - see otp.middleware.ts) had no rate limiting or lockout of
// any kind, so any of them could be brute-forced or spammed with unlimited
// automated requests. These are deliberately strict: every one of these
// endpoints is either a credential check or triggers an outbound email, so
// a legitimate user retrying a genuine typo a handful of times is expected
// and fine - the limits only need to stop automated abuse, not ordinary
// mistakes.
//
// Skipped entirely under test: the store is in-memory and shared process-
// wide, so unrelated tests hitting the same endpoint (now or in the
// future) would otherwise start seeing real 429s instead of the responses
// they're actually testing for. That's a test-isolation concern, not a
// reason to weaken the real limiter - production and dev both get it.
// Read fresh on every request (not cached) so the limiter's own test can
// flip NODE_ENV to actually exercise it.
const isTestEnv = () => process.env.NODE_ENV === 'test';

// Password/credential guessing: login, OTP verification.
export const authGuessLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnv(),
  message: { status: 'fail', message: 'Too many attempts. Please try again later.' },
});

// Sends an email (OTP send, password reset request) - lower limit, since
// abuse here means spamming a real inbox / burning email-provider quota,
// not just wasted CPU.
export const emailSendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnv(),
  message: { status: 'fail', message: 'Too many requests. Please try again later.' },
});

// Account creation - generous enough for real signups (including retrying
// a validation error) while still bounding automated mass account creation.
export const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnv(),
  message: { status: 'fail', message: 'Too many signup attempts. Please try again later.' },
});
