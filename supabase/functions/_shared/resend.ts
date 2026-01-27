/**
 * Resend email utility for MaSubventionPro Edge Functions
 * Uses Resend API to send transactional emails
 */

const RESEND_API_URL = 'https://api.resend.com/emails';

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  from?: string;
}

interface ResendResponse {
  id?: string;
  error?: {
    message: string;
    name: string;
  };
}

/**
 * Send an email using Resend API
 * @param options Email options (to, subject, html, etc.)
 * @returns The Resend API response
 */
export async function sendEmail(options: EmailOptions): Promise<ResendResponse> {
  const apiKey = Deno.env.get('RESEND_API_KEY');

  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: options.from || 'MaSubventionPro <noreply@masubventionpro.com>',
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text,
      reply_to: options.replyTo || 'contact@masubventionpro.com',
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('Resend API error:', data);
    throw new Error(data.error?.message || 'Failed to send email');
  }

  return data;
}

/**
 * Send a welcome email to new users
 */
export async function sendWelcomeEmail(to: string, userName?: string): Promise<ResendResponse> {
  const name = userName || 'utilisateur';

  return sendEmail({
    to,
    subject: 'Bienvenue sur MaSubventionPro !',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; padding: 20px 0; }
          .logo { font-size: 24px; font-weight: bold; color: #10b981; }
          .content { padding: 20px 0; }
          .button { display: inline-block; padding: 12px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px 0; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">MaSubventionPro</div>
          </div>
          <div class="content">
            <h2>Bienvenue ${name} !</h2>
            <p>Nous sommes ravis de vous compter parmi nos utilisateurs.</p>
            <p>MaSubventionPro vous aide à identifier et obtenir les aides publiques auxquelles votre entreprise ou association est éligible.</p>
            <p>Pour commencer, complétez votre profil pour recevoir des recommandations personnalisées :</p>
            <a href="https://masubventionpro.com/app/profile" class="button">Compléter mon profil</a>
            <p>Si vous avez des questions, n'hésitez pas à nous contacter à <a href="mailto:support@masubventionpro.com">support@masubventionpro.com</a>.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} MaSubventionPro. Tous droits réservés.</p>
            <p><a href="https://masubventionpro.com/privacy">Politique de confidentialité</a> | <a href="https://masubventionpro.com/cgu">CGU</a></p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Bienvenue ${name} sur MaSubventionPro !\n\nNous sommes ravis de vous compter parmi nos utilisateurs.\n\nMaSubventionPro vous aide à identifier et obtenir les aides publiques auxquelles votre entreprise ou association est éligible.\n\nPour commencer, complétez votre profil sur https://masubventionpro.com/app/profile\n\nSi vous avez des questions, contactez-nous à support@masubventionpro.com`,
  });
}

/**
 * Send a notification email for new subsidy matches
 */
export async function sendSubsidyMatchEmail(
  to: string,
  userName: string,
  subsidyCount: number
): Promise<ResendResponse> {
  return sendEmail({
    to,
    subject: `${subsidyCount} nouvelle${subsidyCount > 1 ? 's' : ''} aide${subsidyCount > 1 ? 's' : ''} identifiée${subsidyCount > 1 ? 's' : ''} pour vous`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; padding: 20px 0; }
          .logo { font-size: 24px; font-weight: bold; color: #10b981; }
          .content { padding: 20px 0; }
          .highlight { background: #ecfdf5; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; }
          .count { font-size: 36px; font-weight: bold; color: #10b981; }
          .button { display: inline-block; padding: 12px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px 0; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">MaSubventionPro</div>
          </div>
          <div class="content">
            <h2>Bonjour ${userName},</h2>
            <p>Nous avons identifié de nouvelles aides correspondant à votre profil !</p>
            <div class="highlight">
              <div class="count">${subsidyCount}</div>
              <div>nouvelle${subsidyCount > 1 ? 's' : ''} aide${subsidyCount > 1 ? 's' : ''}</div>
            </div>
            <p>Connectez-vous pour découvrir ces opportunités :</p>
            <a href="https://masubventionpro.com/app" class="button">Voir mes aides</a>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} MaSubventionPro. Tous droits réservés.</p>
            <p><a href="https://masubventionpro.com/app/settings">Gérer mes préférences de notification</a></p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Bonjour ${userName},\n\nNous avons identifié ${subsidyCount} nouvelle${subsidyCount > 1 ? 's' : ''} aide${subsidyCount > 1 ? 's' : ''} correspondant à votre profil !\n\nConnectez-vous sur https://masubventionpro.com/app pour les découvrir.`,
  });
}
