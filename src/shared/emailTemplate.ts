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
        `
    };
    return data;
};

export const emailTemplate = {
    createAccount,
    resetPassword
};