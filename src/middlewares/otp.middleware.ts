import crypto from "crypto";
import { sendEmail } from "../utils/email.utils";
import { Request, Response, NextFunction } from "express";
import User from "../models/user.model";

interface OTPStore {
  [key: string]: {
    otp: string;
    expiry: number;
  };
}

const otpStore: OTPStore = {}; // Store OTPs with expiry times

function generateOTP(): string {
  return crypto.randomInt(100000, 999999).toString().padStart(6, "0");
}

// Entries are only ever removed on a successful verifyOTP - anyone who
// requests an OTP and never completes verification (closes the tab, typos
// the wrong email, etc.) left their entry in memory for the lifetime of the
// process. Sweeps out anything past its expiry every 5 minutes instead.
const OTP_CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const email of Object.keys(otpStore)) {
    if (otpStore[email].expiry < now) {
      delete otpStore[email];
    }
  }
}, OTP_CLEANUP_INTERVAL_MS);

export const sendOTP = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json("Email is required");
    return;
  }

  const user = await User.findOne({ where: { email } });
  if (!user) {
    res.status(404).json("User not found");
    return;
  }

  const otp = generateOTP();
  const expiry = Date.now() + 300000; // OTP valid for 5 minutes

  otpStore[email] = { otp, expiry };

  const subject = "Verification Code";
  // Neutral for all roles
  const text = `
Dear ${user.firstName || "User"},

We have received a request to access your account. Please use the code provided below to complete your verification.

Your OTP is: ${otp}

Note: This OTP is valid for the next 5 minutes. If you did not request this verification, please ignore this email or contact our support team immediately.

Thank you for choosing our services.

Best regards,
  `;

  const html = `
<div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
  <h2 style="color: #2c3e50;">Verification Code</h2>
  <p>Dear ${user.firstName || "User"},</p>
  <p>We have received a request to access your account. Please use the code provided below to complete your verification:</p>
  <p style="font-size: 24px; font-weight: bold; margin: 20px 0;">${otp}</p>
  <p><em>Note: This code is valid for the next 5 minutes.</em></p>
  <p>If you did not request this verification, please ignore this email or contact our support team immediately.</p>
  <p>Thank you for choosing our services.</p>
  <p>Best regards,<br/></p>
</div>
  `;

  try {
    await sendEmail(email, subject, text, html);
    // Optionally log role
    console.log(`OTP sent to: ${email} (role: ${user.role})`);
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json("Error sending OTP email");
    return;
  }

  next();
};

// sendOTP calls next() on success rather than sending a response itself,
// expecting whatever comes after it to do that - user.controller.ts's login
// flow already relies on this, calling sendOTP directly with its own inline
// callback as `next`. The standalone POST /api/users/send-otp route (used
// to resend an OTP without a full login, e.g. the "Resend OTP" button on
// the verification page) had no such callback: it registered sendOTP as
// its last piece of middleware, so on the success path next() ran with
// nothing left in the chain and the request just hung until the client's
// own timeout - it never actually sent a response. This wraps sendOTP with
// the same "respond after next()" callback login already uses, so the
// route behaves the same way.
export const resendOTP = async (
  req: Request,
  res: Response,
): Promise<void> => {
  await sendOTP(req, res, () => {
    res.status(200).json({
      status: "success",
      message: "OTP sent to your email.",
    });
  });
};

export const verifyOTP = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    res.status(400).json("Email and OTP are required");
    return;
  }

  const otpData = otpStore[email];

  if (!otpData) {
    res.status(400).json({ message: "OTP not found or expired" });
    return;
  }

  if (Date.now() > otpData.expiry) {
    res.status(400).json({ message: "OTP expired" });
    return;
  }

  if (otpData.otp !== otp) {
    res.status(400).json({ message: "Invalid OTP" });
    return;
  }

  delete otpStore[email]; // OTP verified, remove from store
  res.status(200).json({ message: "OTP verified successfully" });
  next();
};