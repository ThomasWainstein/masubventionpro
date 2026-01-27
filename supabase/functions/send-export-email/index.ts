import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

const RESEND_API_URL = 'https://api.resend.com/emails';

interface ExportEmailRequest {
  recipientEmail: string;
  recipientName?: string;
  ccEmails?: string[];
  subject: string;
  body: string;
  pdfBase64?: string;
  pdfFilename?: string;
  subsidyIds?: string[];
  source?: 'masubventionpro' | 'subvention360';
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

    const body: ExportEmailRequest = await req.json();
    const {
      recipientEmail,
      recipientName,
      ccEmails,
      subject,
      body: emailBody,
      pdfBase64,
      pdfFilename,
      source = 'masubventionpro'
    } = body;

    // Validate required fields
    if (!recipientEmail) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: recipientEmail' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!subject || !emailBody) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: subject and body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build sender based on source
    const fromAddress = source === 'subvention360'
      ? 'subvention360 <noreply@subvention360.com>'
      : 'MaSubventionPro <noreply@masubventionpro.com>';

    const replyTo = source === 'subvention360'
      ? 'contact@subvention360.com'
      : 'contact@masubventionpro.com';

    // Convert markdown-style body to HTML
    const htmlBody = convertToHtml(emailBody, source);

    // Build email payload
    const emailPayload: {
      from: string;
      to: string[];
      cc?: string[];
      subject: string;
      html: string;
      text: string;
      reply_to: string;
      attachments?: { filename: string; content: string }[];
    } = {
      from: fromAddress,
      to: [recipientEmail],
      subject: subject,
      html: htmlBody,
      text: emailBody,
      reply_to: replyTo,
    };

    // Add CC if provided
    if (ccEmails && ccEmails.length > 0) {
      emailPayload.cc = ccEmails;
    }

    // Add PDF attachment if provided
    if (pdfBase64 && pdfFilename) {
      emailPayload.attachments = [
        {
          filename: pdfFilename,
          content: pdfBase64,
        },
      ];
    }

    // Send via Resend API
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Resend API error:', result);
      return new Response(
        JSON.stringify({ error: result.message || 'Failed to send email' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Export email sent to ${recipientEmail} (id: ${result.id})`);

    return new Response(
      JSON.stringify({ success: true, id: result.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error sending export email:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Convert markdown-style text to HTML email
 */
function convertToHtml(text: string, source: string): string {
  // Convert markdown to basic HTML
  let html = text
    // Convert **bold** to <strong>
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // Convert *italic* to <em>
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    // Convert line breaks
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    // Convert bullet points
    .replace(/^- (.+)/gm, '<li>$1</li>');

  // Wrap list items in <ul>
  if (html.includes('<li>')) {
    html = html.replace(/(<li>.*?<\/li>)+/g, '<ul>$&</ul>');
  }

  // Wrap in paragraphs
  html = `<p>${html}</p>`;

  // Brand colors based on source
  const primaryColor = source === 'subvention360' ? '#10b981' : '#1e40af';
  const brandName = source === 'subvention360' ? 'subvention360' : 'MaSubventionPro';
  const websiteUrl = source === 'subvention360' ? 'https://subvention360.com' : 'https://masubventionpro.com';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .card {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      background: ${primaryColor};
      text-align: center;
      padding: 20px;
    }
    .logo {
      font-size: 22px;
      font-weight: bold;
      color: white;
    }
    .content {
      padding: 30px;
    }
    p {
      margin: 0 0 16px 0;
    }
    ul {
      margin: 16px 0;
      padding-left: 20px;
    }
    li {
      margin-bottom: 8px;
    }
    strong {
      color: ${primaryColor};
    }
    .attachment-notice {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 16px;
      margin-top: 20px;
      font-size: 14px;
      color: #64748b;
    }
    .attachment-notice strong {
      color: #334155;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #666;
      font-size: 12px;
      border-top: 1px solid #eee;
    }
    .footer a {
      color: ${primaryColor};
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <div class="logo">${brandName}</div>
      </div>
      <div class="content">
        ${html}
        <div class="attachment-notice">
          <strong>Piece jointe :</strong> Rapport PDF detaille en annexe de cet email.
        </div>
      </div>
      <div class="footer">
        <p>Cet email a ete envoye via <a href="${websiteUrl}">${brandName}</a></p>
        <p>&copy; ${new Date().getFullYear()} ${brandName}. Tous droits reserves.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}
