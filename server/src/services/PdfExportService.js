import puppeteer from 'puppeteer';

/**
 * Service for exporting sessions to PDF
 */
export class PdfExportService {
  /**
   * Generate PDF from session data
   * @param {object} session - Session with metadata
   * @param {array} messages - Array of messages
   * @returns {Buffer} PDF buffer
   */
  static async generatePdf(session, messages) {
    const html = this.generateHtml(session, messages);

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdf = await page.pdf({
        format: 'A4',
        margin: {
          top: '60px',
          right: '50px',
          bottom: '60px',
          left: '50px',
        },
        printBackground: true,
      });

      return pdf;
    } finally {
      await browser.close();
    }
  }

  /**
   * Generate HTML representation of the session
   */
  static generateHtml(session, messages) {
    const title = session.title || 'Untitled Inquiry';
    const createdAt = session.created_at
      ? new Date(session.created_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : '';

    const hasMetadata = session.orientation_blurb || session.unresolved_edge || session.last_pivot;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(title)}</title>
  <style>
    * {
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #1a1a1a;
      background: #ffffff;
      margin: 0;
      padding: 0;
    }

    .header {
      border-bottom: 2px solid #e5e5e5;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }

    .header h1 {
      font-size: 20pt;
      font-weight: 600;
      margin: 0 0 8px 0;
      color: #111;
    }

    .header .date {
      font-size: 10pt;
      color: #666;
    }

    .metadata {
      background: #f8f9fa;
      border: 1px solid #e5e5e5;
      border-radius: 6px;
      padding: 16px 20px;
      margin-bottom: 30px;
    }

    .metadata h2 {
      font-size: 10pt;
      font-weight: 600;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0 0 12px 0;
    }

    .metadata-item {
      margin-bottom: 12px;
    }

    .metadata-item:last-child {
      margin-bottom: 0;
    }

    .metadata-label {
      font-size: 9pt;
      font-weight: 600;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      margin-bottom: 4px;
    }

    .metadata-value {
      font-size: 10pt;
      color: #333;
    }

    .conversation {
      /* Container for messages */
    }

    .message {
      margin-bottom: 24px;
      page-break-inside: avoid;
    }

    .message-header {
      font-size: 9pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
      padding-bottom: 4px;
      border-bottom: 1px solid #e5e5e5;
    }

    .message.user .message-header {
      color: #0066cc;
    }

    .message.assistant .message-header {
      color: #059669;
    }

    .message-content {
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    .message-content p {
      margin: 0 0 12px 0;
    }

    .message-content p:last-child {
      margin-bottom: 0;
    }

    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e5e5;
      font-size: 9pt;
      color: #888;
      text-align: center;
    }

    @media print {
      body {
        font-size: 11pt;
      }

      .message {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${this.escapeHtml(title)}</h1>
    ${createdAt ? `<div class="date">${createdAt}</div>` : ''}
  </div>

  ${hasMetadata ? `
  <div class="metadata">
    <h2>Session Context</h2>
    ${session.orientation_blurb ? `
    <div class="metadata-item">
      <div class="metadata-label">Orientation</div>
      <div class="metadata-value">${this.escapeHtml(session.orientation_blurb)}</div>
    </div>
    ` : ''}
    ${session.unresolved_edge ? `
    <div class="metadata-item">
      <div class="metadata-label">Unresolved Edge</div>
      <div class="metadata-value">${this.escapeHtml(session.unresolved_edge)}</div>
    </div>
    ` : ''}
    ${session.last_pivot ? `
    <div class="metadata-item">
      <div class="metadata-label">Last Pivot</div>
      <div class="metadata-value">${this.escapeHtml(session.last_pivot)}</div>
    </div>
    ` : ''}
  </div>
  ` : ''}

  <div class="conversation">
    ${messages.map(msg => `
    <div class="message ${msg.role}">
      <div class="message-header">${msg.role === 'user' ? 'You' : 'Assistant'}</div>
      <div class="message-content">${this.formatContent(msg.content)}</div>
    </div>
    `).join('')}
  </div>

  <div class="footer">
    Exported from EDOS
  </div>
</body>
</html>`;
  }

  /**
   * Format message content - convert newlines to paragraphs, escape HTML
   */
  static formatContent(content) {
    if (!content) return '';

    // Escape HTML first
    const escaped = this.escapeHtml(content);

    // Split into paragraphs on double newlines
    const paragraphs = escaped.split(/\n\n+/);

    // Wrap each paragraph, preserving single newlines within
    return paragraphs
      .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
      .join('');
  }

  /**
   * Escape HTML special characters
   */
  static escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Generate filename for the PDF
   */
  static generateFilename(session) {
    const title = session.title || 'Untitled';
    // Sanitize title for filename
    const sanitized = title
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);

    const date = new Date().toISOString().split('T')[0];
    return `EDOS_${sanitized}_${date}.pdf`;
  }
}
