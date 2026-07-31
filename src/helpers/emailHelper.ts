import config from '../config';
import { errorLogger, logger } from '../shared/logger';
import { ISendEmail } from '../types/email';
import { BrevoClient } from '@getbrevo/brevo';

const brevo = new BrevoClient({
     apiKey: config.email.apiKey!,
});

const sendEmail = async (values: ISendEmail): Promise<void> => {
     try {
          const result = await brevo.transactionalEmails.sendTransacEmail({
               sender: {
                    name: config.email.emailHeader,
                    email: config.email.from,
               },
               to: [
                    {
                         email: values.to,
                    },
               ],
               subject: values.subject,
               htmlContent: values.html,
          });

          logger.info('Email sent successfully', result.messageId);
     } catch (error) {
          errorLogger.error('Brevo Email Error', error);
          throw error;
     }
};

export const emailHelper = {
    sendEmail
};