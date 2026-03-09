import { toast } from "sonner";

export type ExportFormat = "markdown" | "html" | "text" | "json";

export async function exportDocument(
  title: string,
  content: string,
  format: ExportFormat
) {
  try {
    let exportContent: string;
    let mimeType: string;
    let fileExtension: string;

    switch (format) {
      case "markdown":
        exportContent = convertHtmlToMarkdown(content);
        mimeType = "text/markdown";
        fileExtension = "md";
        break;

      case "html":
        exportContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: system-ui, -apple-system, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            line-height: 1.6;
        }
        h1, h2, h3 { margin-top: 2rem; }
        code { 
            background: #f4f4f4; 
            padding: 0.2rem 0.4rem; 
            border-radius: 3px; 
        }
        pre { 
            background: #f4f4f4; 
            padding: 1rem; 
            border-radius: 5px; 
            overflow-x: auto; 
        }
        blockquote {
            border-left: 4px solid #ddd;
            padding-left: 1rem;
            margin-left: 0;
            color: #666;
        }
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 1rem 0;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 0.5rem;
            text-align: left;
        }
        th {
            background: #f4f4f4;
        }
    </style>
</head>
<body>
    <h1>${title}</h1>
    ${content}
</body>
</html>`;
        mimeType = "text/html";
        fileExtension = "html";
        break;

      case "text":
        exportContent = stripHtml(content);
        mimeType = "text/plain";
        fileExtension = "txt";
        break;

      case "json":
        exportContent = JSON.stringify(
          {
            title,
            content,
            exportedAt: new Date().toISOString(),
          },
          null,
          2
        );
        mimeType = "application/json";
        fileExtension = "json";
        break;

      default:
        throw new Error("Unsupported format");
    }

    // Create blob and download
    const blob = new Blob([exportContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${sanitizeFilename(title)}.${fileExtension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Document exported as ${format.toUpperCase()}`);
  } catch (error) {
    console.error("Export error:", error);
    toast.error("Failed to export document");
  }
}

function convertHtmlToMarkdown(html: string): string {
  let markdown = html;

  // Headers
  markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n\n");
  markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n\n");
  markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n\n");

  // Bold
  markdown = markdown.replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**");
  markdown = markdown.replace(/<b[^>]*>(.*?)<\/b>/gi, "**$1**");

  // Italic
  markdown = markdown.replace(/<em[^>]*>(.*?)<\/em>/gi, "*$1*");
  markdown = markdown.replace(/<i[^>]*>(.*?)<\/i>/gi, "*$1*");

  // Links
  markdown = markdown.replace(
    /<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi,
    "[$2]($1)"
  );

  // Images
  markdown = markdown.replace(
    /<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi,
    "![$2]($1)"
  );
  markdown = markdown.replace(
    /<img[^>]*src="([^"]*)"[^>]*>/gi,
    "![]($1)"
  );

  // Lists
  markdown = markdown.replace(/<ul[^>]*>/gi, "\n");
  markdown = markdown.replace(/<\/ul>/gi, "\n");
  markdown = markdown.replace(/<ol[^>]*>/gi, "\n");
  markdown = markdown.replace(/<\/ol>/gi, "\n");
  markdown = markdown.replace(/<li[^>]*>/gi, "- ");
  markdown = markdown.replace(/<\/li>/gi, "\n");

  // Blockquotes
  markdown = markdown.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, "> $1\n\n");

  // Code
  markdown = markdown.replace(/<code[^>]*>(.*?)<\/code>/gi, "`$1`");
  markdown = markdown.replace(/<pre[^>]*>(.*?)<\/pre>/gis, "```\n$1\n```\n");

  // Paragraphs
  markdown = markdown.replace(/<p[^>]*>/gi, "");
  markdown = markdown.replace(/<\/p>/gi, "\n\n");

  // Line breaks
  markdown = markdown.replace(/<br[^>]*>/gi, "\n");

  // Remove remaining HTML tags
  markdown = markdown.replace(/<[^>]+>/g, "");

  // Decode HTML entities
  markdown = decodeHtmlEntities(markdown);

  // Clean up extra whitespace
  markdown = markdown.replace(/\n{3,}/g, "\n\n");

  return markdown.trim();
}

function stripHtml(html: string): string {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-z0-9]/gi, "_")
    .replace(/_+/g, "_")
    .substring(0, 100);
}

function decodeHtmlEntities(text: string): string {
  const textArea = document.createElement("textarea");
  textArea.innerHTML = text;
  return textArea.value;
}

// PDF Export (requires external library like jsPDF)
export async function exportToPDF(title: string, content: string) {
  toast.info("PDF export requires additional setup. Opening print dialog...");
  
  // Create a temporary window with the document content
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    toast.error("Please allow popups to export as PDF");
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body {
          font-family: system-ui, -apple-system, sans-serif;
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem;
          line-height: 1.6;
        }
        @media print {
          body { margin: 0; padding: 1cm; }
        }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      ${content}
    </body>
    </html>
  `);
  
  printWindow.document.close();
  printWindow.focus();
  
  setTimeout(() => {
    printWindow.print();
  }, 250);
}
