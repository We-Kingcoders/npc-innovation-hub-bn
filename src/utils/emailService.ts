import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

/**
 * Send email using nodemailer
 */
export const sendEmail = async (options: EmailOptions): Promise<void> => {
  // Use your existing EMAIL_USER and EMAIL_PASS from environment variables
 const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // use STARTTLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // should be an App Password
  },
  tls: {
    rejectUnauthorized: true, // safer than false
  },
  connectionTimeout: 10000, // 10s, to avoid ETIMEDOUT on Render
});  


  const mailOptions = {
    from: options.from || `NPC Innovation Hub <${process.env.EMAIL_USER}>`,
    to: options.to,
    subject: options.subject,
    html: options.html
  };

  await transporter.sendMail(mailOptions);
};   