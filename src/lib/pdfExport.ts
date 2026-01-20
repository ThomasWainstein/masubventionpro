import { jsPDF } from 'jspdf';
import { Subsidy, getSubsidyTitle, getSubsidyDescription } from '@/types';

// Format amount for PDF
function formatAmount(amount: number | null): string {
  if (amount === null) return '';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format date for PDF
function formatDate(date: string | null): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// Clean text for PDF (remove special characters that cause issues)
function cleanText(text: string): string {
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2026/g, '...')
    .replace(/\u2013/g, '-')
    .replace(/\u2014/g, '--')
    .replace(/\u00A0/g, ' ');
}

// Split long text into lines
function splitTextToLines(doc: jsPDF, text: string, maxWidth: number): string[] {
  const cleanedText = cleanText(text);
  return doc.splitTextToSize(cleanedText, maxWidth);
}

export function exportSubsidyToPDF(subsidy: Subsidy): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let yPosition = margin;

  // Title
  const title = cleanText(getSubsidyTitle(subsidy));
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  const titleLines = splitTextToLines(doc, title, contentWidth);
  doc.text(titleLines, margin, yPosition);
  yPosition += titleLines.length * 7 + 5;

  // Agency
  if (subsidy.agency) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(cleanText(subsidy.agency), margin, yPosition);
    yPosition += 8;
  }

  // Separator line
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  // Key info section
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);

  // Amount
  if (subsidy.amount_min || subsidy.amount_max) {
    doc.setFont('helvetica', 'bold');
    doc.text('Montant: ', margin, yPosition);
    doc.setFont('helvetica', 'normal');
    const amountText = subsidy.amount_min && subsidy.amount_max
      ? `${formatAmount(subsidy.amount_min)} - ${formatAmount(subsidy.amount_max)}`
      : subsidy.amount_max
      ? `Jusqu'a ${formatAmount(subsidy.amount_max)}`
      : `A partir de ${formatAmount(subsidy.amount_min)}`;
    doc.text(amountText, margin + 25, yPosition);
    yPosition += 7;
  }

  // Deadline
  if (subsidy.deadline) {
    doc.setFont('helvetica', 'bold');
    doc.text('Date limite: ', margin, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(formatDate(subsidy.deadline), margin + 30, yPosition);
    yPosition += 7;
  }

  // Region
  if (subsidy.region && subsidy.region.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('Region: ', margin, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(subsidy.region.join(', '), margin + 20, yPosition);
    yPosition += 7;
  }

  // Funding type
  if (subsidy.funding_type) {
    doc.setFont('helvetica', 'bold');
    doc.text('Type: ', margin, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(cleanText(subsidy.funding_type), margin + 15, yPosition);
    yPosition += 7;
  }

  // Sector
  if (subsidy.primary_sector) {
    doc.setFont('helvetica', 'bold');
    doc.text('Secteur: ', margin, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(cleanText(subsidy.primary_sector), margin + 22, yPosition);
    yPosition += 7;
  }

  yPosition += 5;

  // Description section
  const description = getSubsidyDescription(subsidy);
  if (description) {
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 8;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Description', margin, yPosition);
    yPosition += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const descLines = splitTextToLines(doc, description, contentWidth);

    // Check if we need a new page
    const lineHeight = 5;
    descLines.forEach((line) => {
      if (yPosition > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        yPosition = margin;
      }
      doc.text(line, margin, yPosition);
      yPosition += lineHeight;
    });
  }

  // Categories
  if (subsidy.categories && subsidy.categories.length > 0) {
    yPosition += 5;
    if (yPosition > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      yPosition = margin;
    }

    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 8;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Categories', margin, yPosition);
    yPosition += 7;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(subsidy.categories.map(cleanText).join(', '), margin, yPosition);
    yPosition += 7;
  }

  // Links section
  yPosition += 5;
  if (yPosition > doc.internal.pageSize.getHeight() - 40) {
    doc.addPage();
    yPosition = margin;
  }

  if (subsidy.application_url || subsidy.source_url) {
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 8;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Liens utiles', margin, yPosition);
    yPosition += 7;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 200);

    if (subsidy.application_url) {
      doc.textWithLink('Postuler en ligne', margin, yPosition, { url: subsidy.application_url });
      yPosition += 6;
    }
    if (subsidy.source_url) {
      doc.textWithLink('Source officielle', margin, yPosition, { url: subsidy.source_url });
      yPosition += 6;
    }
  }

  // Footer
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(8);
  const footerY = doc.internal.pageSize.getHeight() - 10;
  doc.text(
    `Genere le ${new Date().toLocaleDateString('fr-FR')} via MaSubventionPro`,
    margin,
    footerY
  );

  // Generate filename
  const safeTitle = title
    .substring(0, 50)
    .replace(/[^a-zA-Z0-9\u00C0-\u024F]/g, '_')
    .replace(/_+/g, '_');
  const filename = `aide_${safeTitle}.pdf`;

  // Download
  doc.save(filename);
}
