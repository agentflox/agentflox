export const baseEmailLayout = (content: string, actionButton?: { url: string; text: string }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f9fafb; }
    .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
    .header { padding: 32px 40px; text-align: center; background: #000000; }
    .logo { color: #ffffff; font-size: 24px; font-weight: bold; text-decoration: none; letter-spacing: -0.5px; }
    .content { padding: 40px; }
    .h1 { font-size: 24px; font-weight: 700; color: #111827; margin-bottom: 24px; letter-spacing: -0.5px; }
    .p { font-size: 16px; color: #4b5563; margin-bottom: 24px; line-height: 26px; }
    .btn-container { text-align: center; margin: 32px 0; }
    .btn { display: inline-block; background-color: #000000; color: #ffffff; font-weight: 600; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 16px; transition: background-color 0.2s; }
    .btn:hover { background-color: #1f2937; }
    .footer { padding: 32px 40px; background-color: #f3f4f6; text-align: center; border-top: 1px solid #e5e7eb; }
    .footer-text { font-size: 12px; color: #6b7280; line-height: 18px; }
    .link { color: #6b7280; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <a href="{{app_url}}" class="logo">Agentflox</a>
    </div>
    <div class="content">
      ${content}
      
      ${actionButton ? `
        <div class="btn-container">
          <a href="${actionButton.url}" class="btn">${actionButton.text}</a>
        </div>
      ` : ''}
      
      <p class="p" style="font-size: 14px; color: #9ca3af; margin-top: 32px;">
        Measurement ID: ${new Date().getTime()}
      </p>
    </div>
    <div class="footer">
      <p class="footer-text">
        &copy; ${new Date().getFullYear()} Agentflox Inc.<br>
        123 Innovation Dr, Tech City, CA 94103
      </p>
      <p class="footer-text" style="margin-top: 12px;">
        <a href="#" class="link">Privacy Policy</a> • <a href="#" class="link">Terms of Service</a>
      </p>
    </div>
  </div>
</body>
</html>
`;
