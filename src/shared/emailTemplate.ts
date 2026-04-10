import { ICreateAccount, IResetPassword } from '../types/emailTemplate';

const createAccount = (values: ICreateAccount) => {
    const data = {
        to: values.email,
        subject: 'Verify your account',
        html: `
            <body style="font-family: Arial, sans-serif; background-color: #f9f9f9; margin: 50px; padding: 20px; color: #555;">
                <div style="width: 100%; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #fff; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
    
                    <!-- Logo -->
                    <img src="https://i.postimg.cc/6pgNvKhD/logo.png" alt="Servi Logo" style="display: block; margin: 0 auto 20px; width:150px" />

                    <!-- Greeting -->
                    <h2 style="color: #D0A933; font-size: 24px; margin-bottom: 20px;">Hey, ${values.name}!</h2>

                    <!-- Verification Instructions -->
                    <p style="color: #555; font-size: 16px; line-height: 1.5; margin-bottom: 20px;">Thank you for signing up for Servi. Please verify your email address to activate your account.</p>

                    <!-- OTP Section -->
                    <div style="text-align: center;">
                        <p style="color: #555; font-size: 16px; line-height: 1.5; margin-bottom: 20px;">Your single use code is:</p>
                        <div style="background-color: #D0A933; width: 120px; padding: 10px; text-align: center; border-radius: 8px; color: #fff; font-size: 25px; letter-spacing: 2px; margin: 20px auto;">${values.otp}</div>
                        <p style="color: #555; font-size: 16px; line-height: 1.5; margin-bottom: 20px;">This code is valid for 3 minutes.</p>
                    </div>

                    <!-- Footer -->
                    <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">If you did not sign up for Servi, please ignore this email.</p>
                    <p style="color: #999; font-size: 12px; text-align: center;">&copy; 2024 Servi. All rights reserved.</p>

                </div>
            </body>
        `
    }

    return data;
}


const resetPassword = (values: IResetPassword) => {
    const data = {
        to: values.email,
        subject: 'Reset your password',
        html: `
            <body style="font-family: Arial, sans-serif; background-color: #f9f9f9; margin: 50px; padding: 20px; color: #555;">
                <div style="width: 100%; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #fff; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
                    <img src="https://i.postimg.cc/6pgNvKhD/logo.png" alt="Logo" style="display: block; margin: 0 auto 20px; width:150px" />
                    <div style="text-align: center;">
                        <p style="color: #555; font-size: 16px; line-height: 1.5; margin-bottom: 20px;">Your single use code is:</p>
                        <div style="background-color: #277E16; width: 120px; padding: 10px; text-align: center; border-radius: 8px; color: #fff; font-size: 25px; letter-spacing: 2px; margin: 20px auto;">${values.otp}</div>
                        <p style="color: #555; font-size: 16px; line-height: 1.5; margin-bottom: 20px;">This code is valid for 3 minutes.</p>
                    </div>
                </div>
            </body>
        `,
    };
    return data;
};

export const emailTemplate = {
    createAccount,
    resetPassword
};