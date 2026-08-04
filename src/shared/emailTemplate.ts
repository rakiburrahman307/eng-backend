import { ICreateAccount, IResetPassword } from '../types/emailTemplate';

const createAccount = (values: ICreateAccount) => {
    const data = {
        to: values.email,
        subject: 'Verify your account',
        html: `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Verify your account</title>
            </head>
            <body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937; -webkit-font-smoothing: antialiased;">
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f9fafb; padding: 48px 16px;">
                    <tr>
                        <td align="center">
                            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 480px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 40px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);">
                                
                                <!-- Logo -->
                                <tr>
                                    <td align="center" style="padding-bottom: 32px;">
                                        <img src="https://res.cloudinary.com/dn83fu2pc/image/upload/v1785814172/image_35_mguqdb.png" alt="ENG Sports Logo" style="display: block; width: 110px; height: auto;" />
                                    </td>
                                </tr>
                                
                                <!-- Content -->
                                <tr>
                                    <td>
                                        <h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 600; color: #111827; text-align: center; letter-spacing: -0.025em;">
                                            Verify your email address
                                        </h1>
                                        <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.5; color: #4b5563; text-align: center;">
                                            Hello ${values.name},<br>
                                            Use the verification code below to complete your registration with ENG Sports.
                                        </p>
                                    </td>
                                </tr>
                                
                                <!-- OTP Code Display -->
                                <tr>
                                    <td align="center" style="padding: 12px 0 32px 0;">
                                        <div style="background-color: #f3f4f6; border-radius: 12px; padding: 16px 32px; display: inline-block;">
                                            <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #111827; display: block; margin-left: 6px;">${values.otp}</span>
                                        </div>
                                        <span style="display: block; font-size: 12px; color: #6b7280; margin-top: 12px;">
                                            This code is valid for 3 minutes.
                                        </span>
                                    </td>
                                </tr>
                                
                                <!-- Footer Divider -->
                                <tr>
                                    <td style="border-top: 1px solid #f3f4f6; padding-top: 24px;">
                                        <p style="margin: 0 0 8px 0; font-size: 13px; line-height: 1.4; color: #6b7280; text-align: center;">
                                            If you did not request this code, you can safely ignore this email.
                                        </p>
                                        <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">
                                            &copy; ${new Date().getFullYear()} ENG Sports. All rights reserved.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `
    }

    return data;
}


const resetPassword = (values: IResetPassword) => {
    const data = {
        to: values.email,
        subject: 'Reset your password',
        html: `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Reset your password</title>
            </head>
            <body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937; -webkit-font-smoothing: antialiased;">
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f9fafb; padding: 48px 16px;">
                    <tr>
                        <td align="center">
                            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 480px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 40px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);">
                                
                                <!-- Logo -->
                                <tr>
                                    <td align="center" style="padding-bottom: 32px;">
                                        <img src="https://res.cloudinary.com/dn83fu2pc/image/upload/v1785814172/image_35_mguqdb.png" alt="ENG Sports Logo" style="display: block; width: 110px; height: auto;" />
                                    </td>
                                </tr>
                                
                                <!-- Content -->
                                <tr>
                                    <td>
                                        <h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 600; color: #111827; text-align: center; letter-spacing: -0.025em;">
                                            Reset your password
                                        </h1>
                                        <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.5; color: #4b5563; text-align: center;">
                                            We received a request to reset your password. Use the code below to complete the reset process:
                                        </p>
                                    </td>
                                </tr>
                                
                                <!-- OTP Code Display -->
                                <tr>
                                    <td align="center" style="padding: 12px 0 32px 0;">
                                        <div style="background-color: #fef2f2; border-radius: 12px; padding: 16px 32px; display: inline-block; border: 1px solid #fee2e2;">
                                            <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #ef4444; display: block; margin-left: 8px;">${values.otp}</span>
                                        </div>
                                        <span style="display: block; font-size: 12px; color: #6b7280; margin-top: 12px;">
                                            This code is valid for 3 minutes.
                                        </span>
                                    </td>
                                </tr>
                                
                                <!-- Footer Divider -->
                                <tr>
                                    <td style="border-top: 1px solid #f3f4f6; padding-top: 24px;">
                                        <p style="margin: 0 0 8px 0; font-size: 13px; line-height: 1.4; color: #6b7280; text-align: center;">
                                            If you did not request this password reset, please ignore this email.
                                        </p>
                                        <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">
                                            &copy; ${new Date().getFullYear()} ENG Sports. All rights reserved.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `
    };
    return data;
};

export const emailTemplate = {
    createAccount,
    resetPassword
};