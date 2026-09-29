import {
  ICreateAccount,
  IResetPassword,
  IAdminCredentials,
} from "../types/emailTemplate";

const createAccount = (values: ICreateAccount) => {
  const data = {
    to: values.email,
    subject: "Verify your account",
    html: `
           <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify your account</title>
</head>

<body style="margin:0; padding:0; background-color:#f3f4f6; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#1f2937; -webkit-font-smoothing:antialiased;">

    <table
        role="presentation"
        width="100%"
        cellpadding="0"
        cellspacing="0"
        border="0"
        style="width:100%; margin:0; padding:0; background-color:#f3f4f6;"
    >
        <tr>
            <td
                align="center"
                valign="middle"
                style="padding:48px 16px;"
            >

                <table
                    role="presentation"
                    width="100%"
                    cellpadding="0"
                    cellspacing="0"
                    border="0"
                    style="width:100%; max-width:480px; margin:0 auto; background-color:#ffffff; border:1px solid #e5e7eb; border-radius:16px;"
                >

                    <!-- Card Inner Padding -->
                    <tr>
                        <td style="padding:40px 32px;">

                            <!-- Logo -->
                            <table
                                role="presentation"
                                width="100%"
                                cellpadding="0"
                                cellspacing="0"
                                border="0"
                            >
                                <tr>
                                    <td
                                        align="center"
                                        style="padding:0 0 32px 0;"
                                    >
                                        <img
                                            src="https://res.cloudinary.com/dn83fu2pc/image/upload/v1785814172/image_35_mguqdb.png"
                                            alt="ENG Sports Logo"
                                            width="110"
                                            style="display:block; width:110px; max-width:110px; height:auto; margin:0 auto; border:0;"
                                        >
                                    </td>
                                </tr>
                            </table>


                            <!-- Heading -->
                            <table
                                role="presentation"
                                width="100%"
                                cellpadding="0"
                                cellspacing="0"
                                border="0"
                            >
                                <tr>
                                    <td
                                        align="center"
                                        style="padding:0 0 16px 0;"
                                    >
                                        <h1
                                            style="margin:0; padding:0; font-size:22px; line-height:30px; font-weight:600; color:#111827; text-align:center;"
                                        >
                                            Verify your email address
                                        </h1>
                                    </td>
                                </tr>

                                <tr>
                                    <td
                                        align="center"
                                        style="padding:0 0 28px 0;"
                                    >
                                        <p
                                            style="margin:0; padding:0; font-size:15px; line-height:24px; color:#4b5563; text-align:center;"
                                        >
                                            Hello ${values.name},<br>
                                            Use the verification code below to complete your registration with ENG Sports.
                                        </p>
                                    </td>
                                </tr>
                            </table>


                            <!-- OTP -->
                            <table
                                role="presentation"
                                width="100%"
                                cellpadding="0"
                                cellspacing="0"
                                border="0"
                            >
                                <tr>
                                    <td
                                        align="center"
                                        style="padding:0 0 32px 0;"
                                    >

                                        <table
                                            role="presentation"
                                            cellpadding="0"
                                            cellspacing="0"
                                            border="0"
                                            style="margin:0 auto;"
                                        >
                                            <tr>
                                                <td
                                                    align="center"
                                                    style="background-color:#f3f4f6; border-radius:12px; padding:16px 28px;"
                                                >
                                                    <span
                                                        style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace; font-size:32px; line-height:40px; font-weight:700; letter-spacing:6px; color:#111827; white-space:nowrap;"
                                                    >
                                                        ${values.otp}
                                                    </span>
                                                </td>
                                            </tr>
                                        </table>

                                        <p
                                            style="margin:12px 0 0 0; padding:0; font-size:12px; line-height:18px; color:#6b7280; text-align:center;"
                                        >
                                            This code is valid for 3 minutes.
                                        </p>

                                    </td>
                                </tr>
                            </table>


                            <!-- Divider -->
                            <table
                                role="presentation"
                                width="100%"
                                cellpadding="0"
                                cellspacing="0"
                                border="0"
                            >
                                <tr>
                                    <td
                                        style="border-top:1px solid #f3f4f6; padding-top:24px;"
                                    >

                                        <p
                                            style="margin:0 0 8px 0; padding:0; font-size:13px; line-height:20px; color:#6b7280; text-align:center;"
                                        >
                                            If you did not request this code, you can safely ignore this email.
                                        </p>

                                        <p
                                            style="margin:0; padding:0; font-size:12px; line-height:18px; color:#9ca3af; text-align:center;"
                                        >
                                            &copy; ${new Date().getFullYear()} ENG Sports. All rights reserved.
                                        </p>

                                    </td>
                                </tr>
                            </table>

                        </td>
                    </tr>

                </table>

            </td>
        </tr>
    </table>

</body>
</html>
        `,
  };

  return data;
};

const resetPassword = (values: IResetPassword) => {
  const data = {
    to: values.email,
    subject: "Reset your password",
    html: `
            <!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset your password</title>
</head>

<body style="margin:0; padding:0; background-color:#f3f4f6; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#1f2937; -webkit-font-smoothing:antialiased;">

    <table
        role="presentation"
        width="100%"
        cellpadding="0"
        cellspacing="0"
        border="0"
        style="width:100%; margin:0; padding:0; background-color:#f3f4f6;"
    >
        <tr>
            <td
                align="center"
                valign="middle"
                style="padding:48px 16px;"
            >

                <table
                    role="presentation"
                    width="100%"
                    cellpadding="0"
                    cellspacing="0"
                    border="0"
                    style="width:100%; max-width:480px; margin:0 auto; background-color:#ffffff; border:1px solid #e5e7eb; border-radius:16px;"
                >

                    <!-- Card Content -->
                    <tr>
                        <td style="padding:40px 32px;">

                            <!-- Logo -->
                            <table
                                role="presentation"
                                width="100%"
                                cellpadding="0"
                                cellspacing="0"
                                border="0"
                            >
                                <tr>
                                    <td
                                        align="center"
                                        style="padding:0 0 32px 0;"
                                    >
                                        <img
                                            src="https://res.cloudinary.com/dn83fu2pc/image/upload/v1785814172/image_35_mguqdb.png"
                                            alt="ENG Sports Logo"
                                            width="110"
                                            style="display:block; width:110px; max-width:110px; height:auto; margin:0 auto; border:0;"
                                        >
                                    </td>
                                </tr>
                            </table>


                            <!-- Content -->
                            <table
                                role="presentation"
                                width="100%"
                                cellpadding="0"
                                cellspacing="0"
                                border="0"
                            >
                                <tr>
                                    <td
                                        align="center"
                                        style="padding:0 0 16px 0;"
                                    >
                                        <h1
                                            style="margin:0; padding:0; font-size:22px; line-height:30px; font-weight:600; color:#111827; text-align:center;"
                                        >
                                            Reset your password
                                        </h1>
                                    </td>
                                </tr>

                                <tr>
                                    <td
                                        align="center"
                                        style="padding:0 0 28px 0;"
                                    >
                                        <p
                                            style="margin:0; padding:0; font-size:15px; line-height:24px; color:#4b5563; text-align:center;"
                                        >
                                            We received a request to reset your password.
                                            Use the code below to complete the reset process.
                                        </p>
                                    </td>
                                </tr>
                            </table>


                            <!-- OTP -->
                            <table
                                role="presentation"
                                width="100%"
                                cellpadding="0"
                                cellspacing="0"
                                border="0"
                            >
                                <tr>
                                    <td
                                        align="center"
                                        style="padding:0 0 32px 0;"
                                    >

                                        <table
                                            role="presentation"
                                            cellpadding="0"
                                            cellspacing="0"
                                            border="0"
                                            style="margin:0 auto;"
                                        >
                                            <tr>
                                                <td
                                                    align="center"
                                                    style="background-color:#fef2f2; border:1px solid #fee2e2; border-radius:12px; padding:16px 28px;"
                                                >
                                                    <span
                                                        style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace; font-size:32px; line-height:40px; font-weight:700; letter-spacing:6px; color:#ef4444; white-space:nowrap;"
                                                    >
                                                        ${values.otp}
                                                    </span>
                                                </td>
                                            </tr>
                                        </table>

                                        <p
                                            style="margin:12px 0 0 0; padding:0; font-size:12px; line-height:18px; color:#6b7280; text-align:center;"
                                        >
                                            This code is valid for 3 minutes.
                                        </p>

                                    </td>
                                </tr>
                            </table>


                            <!-- Footer -->
                            <table
                                role="presentation"
                                width="100%"
                                cellpadding="0"
                                cellspacing="0"
                                border="0"
                            >
                                <tr>
                                    <td
                                        style="border-top:1px solid #f3f4f6; padding-top:24px;"
                                    >

                                        <p
                                            style="margin:0 0 8px 0; padding:0; font-size:13px; line-height:20px; color:#6b7280; text-align:center;"
                                        >
                                            If you did not request this password reset,
                                            please ignore this email.
                                        </p>

                                        <p
                                            style="margin:0; padding:0; font-size:12px; line-height:18px; color:#9ca3af; text-align:center;"
                                        >
                                            &copy; ${new Date().getFullYear()} ENG Sports.
                                            All rights reserved.
                                        </p>

                                    </td>
                                </tr>
                            </table>

                        </td>
                    </tr>

                </table>

            </td>
        </tr>
    </table>

</body>

</html>
        `,
  };
  return data;
};

const adminCredentials = (values: IAdminCredentials) => {
  const loginLink =
    values.loginUrl || "https://dashboard.engsportsuk.com/auth/login";
  const permissionsSummary =
    !values.permissions ||
    values.permissions.length === 0 ||
    values.permissions.length >= 24
      ? "Full Access (All Dashboard Pages)"
      : `${values.permissions.length} Pages Permitted (${values.permissions.slice(0, 4).join(", ")}${values.permissions.length > 4 ? "..." : ""})`;

  const data = {
    to: values.email,
    subject: "Your ENG Dashboard Admin Account Credentials",
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Admin Credentials</title>
</head>
<body style="margin:0; padding:0; background-color:#f3f4f6; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#1f2937; -webkit-font-smoothing:antialiased;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%; margin:0; padding:0; background-color:#f3f4f6;">
        <tr>
            <td align="center" valign="middle" style="padding:48px 16px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%; max-width:520px; margin:0 auto; background-color:#ffffff; border:1px solid #e5e7eb; border-radius:16px;">
                    <tr>
                        <td style="padding:40px 32px;">
                            <!-- Logo -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td align="center" style="padding:0 0 28px 0;">
                                        <img src="https://res.cloudinary.com/dn83fu2pc/image/upload/v1785814172/image_35_mguqdb.png" alt="ENG Sports" width="110" style="display:block; width:110px; max-width:110px; height:auto; margin:0 auto; border:0;">
                                    </td>
                                </tr>
                            </table>

                            <!-- Heading -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td align="center" style="padding:0 0 12px 0;">
                                        <h1 style="margin:0; padding:0; font-size:22px; line-height:30px; font-weight:700; color:#111827; text-align:center;">
                                            Administrator Account Created
                                        </h1>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="padding:0 0 24px 0;">
                                        <p style="margin:0; padding:0; font-size:14px; line-height:22px; color:#4b5563; text-align:center;">
                                            Hello <strong>${values.name}</strong>,<br>
                                            Your administrator account has been set up on the ENG Sports UK Dashboard. Below are your login credentials:
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <!-- Credentials Box -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; margin-bottom:28px;">
                                <tr>
                                    <td style="padding:20px;">
                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                            <tr>
                                                <td style="padding:6px 0; font-size:13px; color:#64748b; font-weight:600; width:120px;">Login Email:</td>
                                                <td style="padding:6px 0; font-size:13px; color:#0f172a; font-weight:700;">${values.email}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding:6px 0; font-size:13px; color:#64748b; font-weight:600;">Password:</td>
                                                <td style="padding:6px 0; font-size:14px; color:#0f172a; font-family:Courier, monospace; font-weight:700; letter-spacing:0.5px;">${values.password}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding:6px 0; font-size:13px; color:#64748b; font-weight:600;">Role:</td>
                                                <td style="padding:6px 0; font-size:13px; color:#0f172a; font-weight:600;">${values.role || "ADMIN"}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding:6px 0; font-size:13px; color:#64748b; font-weight:600;">Page Access:</td>
                                                <td style="padding:6px 0; font-size:13px; color:#059669; font-weight:600;">${permissionsSummary}</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- Button -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td align="center" style="padding:0 0 28px 0;">
                                        <a href="${loginLink}" target="_blank" style="display:inline-block; padding:12px 32px; background-color:#0f172a; color:#ffffff; font-size:14px; font-weight:600; text-decoration:none; border-radius:8px; box-shadow:0 1px 2px rgba(0,0,0,0.05);">
                                            Login to Dashboard &rarr;
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <!-- Footer note -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td align="center" style="border-top:1px solid #f1f5f9; padding-top:20px;">
                                        <p style="margin:0; font-size:12px; line-height:18px; color:#94a3b8; text-align:center;">
                                            Please keep these credentials safe and change your password after logging in for security.<br>
                                            If you did not expect this email, please contact the system administrator.
                                        </p>
                                        <br/>
                                        <p
                                            style="margin:0; padding:0; font-size:12px; line-height:18px; color:#94a3b8; text-align:center;"
                                        >
                                            &copy; ${new Date().getFullYear()} ENG Sports. All rights reserved.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        `,
  };
  return data;
};

export const emailTemplate = {
  createAccount,
  resetPassword,
  adminCredentials,
};
