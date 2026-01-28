import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

const RESEND_API_URL = 'https://api.resend.com/emails';

interface AuthEmailPayload {
  email_action_type: 'magic_link' | 'signup' | 'recovery' | 'invite';
  user: {
    id: string;
    email: string;
    email_verified: boolean;
    user_metadata?: {
      name?: string;
    };
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to?: string;
    email_action_type: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const apiKey = Deno.env.get('RESEND_API_KEY');
    if (!apiKey) {
      console.error('RESEND_API_KEY is not configured');
      // Return 200 to Supabase Auth to not block auth flow
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload: AuthEmailPayload = await req.json();
    console.log('📧 Processing auth hook:', payload.email_action_type);

    const hookUser = payload.user;
    const emailData = payload.email_data || {};
    const emailActionType = payload.email_action_type || emailData.email_action_type || 'signup';

    if (!hookUser || !hookUser.email) {
      console.error('Hook payload missing user email');
      return new Response(
        JSON.stringify({ error: 'Missing user email' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userName = hookUser.user_metadata?.name || hookUser.email.split('@')[0];

    // Mask email in logs (GDPR compliance)
    const maskedEmail = hookUser.email.replace(/(.{2}).*(@.*)/, '$1***$2');
    console.log(`📧 Sending ${emailActionType} email to ${maskedEmail}`);

    let subject = '';
    let html = '';

    // Extract 6-digit OTP from token for verification emails
    const otp = emailData.token?.substring(0, 6)?.toUpperCase() || '';

    switch (emailActionType) {
      case 'magic_link':
        subject = '🔐 Votre lien de connexion - MaSubventionPro';
        html = generateVerificationEmail(userName, otp);
        break;

      case 'signup':
        subject = '✉️ Confirmez votre email - MaSubventionPro';
        html = generateVerificationEmail(userName, otp);
        break;

      case 'recovery':
        subject = '🔑 Reinitialisation de votre mot de passe - MaSubventionPro';
        const resetUrl = emailData.redirect_to
          ? `https://masubventionpro.com/reset-password?token=${emailData.token_hash}&redirect_to=${encodeURIComponent(emailData.redirect_to)}`
          : `https://masubventionpro.com/reset-password?token=${emailData.token_hash}`;
        html = generatePasswordResetEmail(userName, resetUrl);
        break;

      case 'invite':
        subject = '📨 Vous etes invite(e) a rejoindre MaSubventionPro';
        const inviteUrl = emailData.redirect_to
          ? `https://masubventionpro.com/confirm?token=${emailData.token_hash}&type=invite&redirect_to=${encodeURIComponent(emailData.redirect_to)}`
          : `https://masubventionpro.com/confirm?token=${emailData.token_hash}&type=invite`;
        html = generateInviteEmail(userName, inviteUrl);
        break;

      default:
        console.error(`Unknown email action type: ${emailActionType}`);
        return new Response(
          JSON.stringify({ error: `Unknown email action type: ${emailActionType}` }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // Send email via Resend
    let emailResponse;
    try {
      const response = await fetch(RESEND_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'MaSubventionPro <noreply@masubventionpro.com>',
          to: [hookUser.email],
          subject,
          html,
          reply_to: 'contact@masubventionpro.com',
        }),
      });

      emailResponse = await response.json();

      if (!response.ok) {
        console.error('Resend API error:', emailResponse);
        // Don't fail - return success to Supabase Auth
      } else {
        console.log('✅ Auth email sent successfully:', emailResponse.id);
      }
    } catch (emailError: any) {
      console.error('⚠️ Email provider error (non-fatal):', emailError);
      emailResponse = { error: emailError.message, provider: 'resend' };
    }

    // Always return 200 to Supabase Auth even if email fails
    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-auth-email:', error);
    // Return 200 to not block Supabase Auth
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Email template generators
function generateVerificationEmail(userName: string, otp: string): string {
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
    .content { padding: 30px; text-align: center; }
    h2 { color: #1e3a5f; margin-top: 0; }
    .otp-box { background: #f1f5f9; border: 2px dashed #3b82f6; border-radius: 12px; padding: 20px; margin: 25px 0; }
    .otp-code { font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1e40af; font-family: monospace; }
    .warning { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 12px; margin: 20px 0; font-size: 14px; color: #92400e; }
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
        <p>Voici votre code de verification :</p>
        <div class="otp-box">
          <div class="otp-code">${otp}</div>
        </div>
        <p>Entrez ce code dans l'application pour confirmer votre email.</p>
        <div class="warning">
          ⏱️ Ce code expire dans <strong>1 heure</strong>.<br>
          Si vous n'avez pas demande ce code, ignorez cet email.
        </div>
      </div>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} MaSubventionPro. Tous droits reserves.</p>
      <p>
        <a href="https://masubventionpro.com/privacy">Politique de confidentialite</a> |
        <a href="https://masubventionpro.com/cgu">CGU</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

function generatePasswordResetEmail(userName: string, resetUrl: string): string {
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
    .button { display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white !important; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
    .warning { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 12px; margin: 20px 0; font-size: 14px; color: #92400e; }
    .security { background: #fef2f2; border: 1px solid #ef4444; border-radius: 8px; padding: 12px; margin: 20px 0; font-size: 14px; color: #991b1b; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    a { color: #1e40af; }
    .link-text { word-break: break-all; font-size: 12px; color: #64748b; background: #f1f5f9; padding: 10px; border-radius: 6px; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <div class="logo">MaSubventionPro</div>
      </div>
      <div class="content">
        <h2>Reinitialisation de votre mot de passe</h2>
        <p>Bonjour ${userName},</p>
        <p>Vous avez demande a reinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe :</p>
        <div style="text-align: center;">
          <a href="${resetUrl}" class="button">Reinitialiser mon mot de passe</a>
        </div>
        <div class="warning">
          ⏱️ Ce lien expire dans <strong>1 heure</strong> et ne peut etre utilise qu'une seule fois.
        </div>
        <div class="security">
          🔒 <strong>Vous n'avez pas fait cette demande ?</strong><br>
          Si vous n'avez pas demande a reinitialiser votre mot de passe, ignorez simplement cet email. Votre compte reste securise.
        </div>
        <div class="link-text">
          <strong>Le bouton ne fonctionne pas ?</strong> Copiez ce lien dans votre navigateur :<br>
          ${resetUrl}
        </div>
      </div>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} MaSubventionPro. Tous droits reserves.</p>
      <p>
        <a href="https://masubventionpro.com/privacy">Politique de confidentialite</a> |
        <a href="https://masubventionpro.com/cgu">CGU</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

function generateInviteEmail(userName: string, inviteUrl: string): string {
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
        <h2>Vous etes invite(e) !</h2>
        <p>Bonjour ${userName},</p>
        <p>Vous avez ete invite(e) a rejoindre MaSubventionPro, la plateforme qui vous aide a identifier et obtenir les aides publiques pour votre entreprise.</p>
        <div style="text-align: center;">
          <a href="${inviteUrl}" class="button">Accepter l'invitation</a>
        </div>
        <p>Cette invitation expire dans 7 jours.</p>
      </div>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} MaSubventionPro. Tous droits reserves.</p>
      <p>
        <a href="https://masubventionpro.com/privacy">Politique de confidentialite</a> |
        <a href="https://masubventionpro.com/cgu">CGU</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}
