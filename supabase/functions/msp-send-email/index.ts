import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

const RESEND_API_URL = 'https://api.resend.com/emails';

interface EmailRequest {
  type: 'welcome' | 'notification' | 'subsidy_match' | 'custom';
  to: string;
  userName?: string;
  // For custom emails
  subject?: string;
  html?: string;
  text?: string;
  // For subsidy match notifications
  subsidyCount?: number;
}

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const apiKey = Deno.env.get('RESEND_API_KEY');
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    const body: EmailRequest = await req.json();
    const { type, to, userName } = body;

    if (!to) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: to' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let emailData: {
      from: string;
      to: string[];
      subject: string;
      html: string;
      text?: string;
      reply_to: string;
    };

    const fromAddress = 'MaSubventionPro <noreply@masubventionpro.com>';
    const replyTo = 'contact@masubventionpro.com';

    switch (type) {
      case 'welcome':
        emailData = {
          from: fromAddress,
          to: [to],
          subject: 'Bienvenue sur MaSubventionPro !',
          html: generateWelcomeEmail(userName || 'utilisateur'),
          text: `Bienvenue ${userName || 'utilisateur'} sur MaSubventionPro !\n\nNous sommes ravis de vous compter parmi nos utilisateurs.\n\nMaSubventionPro vous aide à identifier et obtenir les aides publiques auxquelles votre entreprise ou association est éligible.\n\nPour commencer, complétez votre profil sur https://masubventionpro.com/app/profile\n\nSi vous avez des questions, contactez-nous à support@masubventionpro.com`,
          reply_to: replyTo,
        };
        break;

      case 'subsidy_match':
        const count = body.subsidyCount || 1;
        emailData = {
          from: fromAddress,
          to: [to],
          subject: `${count} nouvelle${count > 1 ? 's' : ''} aide${count > 1 ? 's' : ''} identifiée${count > 1 ? 's' : ''} pour vous`,
          html: generateSubsidyMatchEmail(userName || 'utilisateur', count),
          text: `Bonjour ${userName || 'utilisateur'},\n\nNous avons identifié ${count} nouvelle${count > 1 ? 's' : ''} aide${count > 1 ? 's' : ''} correspondant à votre profil !\n\nConnectez-vous sur https://masubventionpro.com/app pour les découvrir.`,
          reply_to: replyTo,
        };
        break;

      case 'notification':
        if (!body.subject || !body.html) {
          return new Response(
            JSON.stringify({ error: 'Missing subject or html for notification' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        emailData = {
          from: fromAddress,
          to: [to],
          subject: body.subject,
          html: wrapInTemplate(body.html),
          text: body.text,
          reply_to: replyTo,
        };
        break;

      case 'custom':
        if (!body.subject || !body.html) {
          return new Response(
            JSON.stringify({ error: 'Missing subject or html for custom email' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        emailData = {
          from: fromAddress,
          to: [to],
          subject: body.subject,
          html: body.html,
          text: body.text,
          reply_to: replyTo,
        };
        break;

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid email type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // Send via Resend API
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Resend API error:', result);
      return new Response(
        JSON.stringify({ error: result.message || 'Failed to send email' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, id: result.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error sending email:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Email template helpers
function wrapInTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; padding: 20px 0; border-bottom: 1px solid #eee; }
    .logo { font-size: 24px; font-weight: bold; color: #1e40af; }
    .content { padding: 30px 0; }
    .footer { text-align: center; padding: 20px 0; color: #666; font-size: 12px; border-top: 1px solid #eee; }
    a { color: #1e40af; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">MaSubventionPro</div>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} MaSubventionPro. Tous droits réservés.</p>
      <p>
        <a href="https://masubventionpro.com/privacy">Politique de confidentialité</a> |
        <a href="https://masubventionpro.com/cgu">CGU</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

function generateWelcomeEmail(userName: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .card { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); text-align: center; padding: 30px 20px; }
    .logo { font-size: 28px; font-weight: bold; color: white; }
    .content { padding: 30px; }
    h2 { color: #1e3a5f; margin-top: 0; }
    .button { display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white !important; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    a { color: #1e40af; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <div class="logo">MaSubventionPro</div>
      </div>
      <div class="content">
        <h2>Bienvenue ${userName} !</h2>
        <p>Nous sommes ravis de vous compter parmi nos utilisateurs.</p>
        <p>MaSubventionPro vous aide à <strong>identifier</strong> et <strong>obtenir</strong> les aides publiques auxquelles votre entreprise ou association est éligible.</p>
        <p>Pour commencer, complétez votre profil pour recevoir des recommandations personnalisées :</p>
        <div style="text-align: center;">
          <a href="https://masubventionpro.com/app/profile" class="button">Compléter mon profil</a>
        </div>
        <p>Si vous avez des questions, n'hésitez pas à nous contacter à <a href="mailto:support@masubventionpro.com">support@masubventionpro.com</a>.</p>
      </div>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} MaSubventionPro. Tous droits réservés.</p>
      <p>
        <a href="https://masubventionpro.com/privacy">Politique de confidentialité</a> |
        <a href="https://masubventionpro.com/cgu">CGU</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

function generateSubsidyMatchEmail(userName: string, count: number): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .card { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); text-align: center; padding: 30px 20px; }
    .logo { font-size: 28px; font-weight: bold; color: white; }
    .content { padding: 30px; }
    h2 { color: #1e3a5f; margin-top: 0; }
    .highlight { background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0; }
    .count { font-size: 48px; font-weight: bold; color: #059669; }
    .button { display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white !important; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    a { color: #1e40af; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <div class="logo">MaSubventionPro</div>
      </div>
      <div class="content">
        <h2>Bonjour ${userName},</h2>
        <p>Nous avons identifié de nouvelles aides correspondant à votre profil !</p>
        <div class="highlight">
          <div class="count">${count}</div>
          <div style="color: #065f46; font-weight: 600;">nouvelle${count > 1 ? 's' : ''} aide${count > 1 ? 's' : ''}</div>
        </div>
        <p>Connectez-vous pour découvrir ces opportunités de financement :</p>
        <div style="text-align: center;">
          <a href="https://masubventionpro.com/app" class="button">Voir mes aides</a>
        </div>
      </div>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} MaSubventionPro. Tous droits réservés.</p>
      <p><a href="https://masubventionpro.com/app/settings">Gérer mes préférences de notification</a></p>
    </div>
  </div>
</body>
</html>`;
}
