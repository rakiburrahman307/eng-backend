import nodemailer from 'nodemailer';
import config from '../config';
import { errorLogger, logger } from '../shared/logger';
import { ISendEmail } from '../types/email';
import ApiError from '../errors/ApiErrors';
import { StatusCodes } from 'http-status-codes';

const transporter = nodemailer.createTransport({
    host: config.email.host,
    port: Number(config.email.port),
    secure: false,
    auth: {
        user: config.email.user,
        pass: config.email.pass
    },
    tls: {
    rejectUnauthorized: false, // <-- ignore SSL mismatch
  },
});

const sendEmail = async (values: ISendEmail) => {
  try {
    logger.info("📧 Attempting to send email", {
      to: values.to,
      subject: values.subject,
    });

    const info = await transporter.sendMail({
      from: `"Mlitech" <${config.email.from}>`,
      to: values.to,
      subject: values.subject,
      html: values.html,
    });

    logger.info("✅ Mail sent successfully", {
      accepted: info.accepted,
      messageId: info.messageId,
    });

    return { success: true, info };

  } catch (error) {
    errorLogger.error("❌ Email send failed", error);

    // ❌ DON'T throw error (prevents server crash)
    return {
      success: false,
      error: "Email sending failed"
    };
  }
};


export const emailHelper = {
    sendEmail
};