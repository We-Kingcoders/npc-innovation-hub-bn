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