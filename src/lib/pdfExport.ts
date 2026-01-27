import { jsPDF } from 'jspdf';
import { Subsidy, getSubsidyTitle, getSubsidyDescription, MaSubventionProProfile } from '@/types';

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

// Calculate total funding potential from subsidies
function calculateTotalFunding(subsidies: Subsidy[]): { min: number; max: number } {
  let min = 0;
  let max = 0;
  for (const s of subsidies) {
    if (s.amount_min) min += s.amount_min;
    if (s.amount_max) max += s.amount_max;
  }
  return { min, max };
}

// Count subsidies with urgent deadlines
function countUrgentDeadlines(subsidies: Subsidy[]): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return subsidies.filter((s) => {
    if (!s.deadline) return false;
    const deadline = new Date(s.deadline);
    const diffDays = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30;
  }).length;
}

export interface ExportSubsidiesOptions {
  download?: boolean; // If true, auto-downloads the PDF
  profile?: MaSubventionProProfile | null;
}

export interface ExportSubsidiesResult {
  blob: Blob;
  filename: string;
}

/**
 * Export multiple subsidies to a single PDF document
 * Returns the PDF as a Blob for email attachment or downloads directly
 */
export function exportSubsidiesToPDF(
  subsidies: Subsidy[],
  options: ExportSubsidiesOptions = {}
): ExportSubsidiesResult {
  const { download = true, profile } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let yPosition = margin;

  // Helper to check if we need a new page
  const checkPageBreak = (neededHeight: number) => {
    if (yPosition + neededHeight > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  // ===================
  // COVER PAGE
  // ===================

  // Title
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175); // Blue color
  const mainTitle = profile?.company_name
    ? `Aides Identifiees pour ${cleanText(profile.company_name)}`
    : 'Aides Identifiees';
  const titleLines = splitTextToLines(doc, mainTitle, contentWidth);
  doc.text(titleLines, margin, yPosition + 20);
  yPosition += titleLines.length * 10 + 30;

  // Generation date
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Genere le ${new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })}`, margin, yPosition);
  yPosition += 15;

  // Key stats box
  const totalFunding = calculateTotalFunding(subsidies);
  const urgentCount = countUrgentDeadlines(subsidies);

  doc.setFillColor(248, 250, 252); // Light gray background
  doc.roundedRect(margin, yPosition, contentWidth, 50, 3, 3, 'F');

  yPosition += 12;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Resume', margin + 10, yPosition);

  yPosition += 10;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nombre d'aides: ${subsidies.length}`, margin + 10, yPosition);

  yPosition += 7;
  if (totalFunding.max > 0) {
    const fundingText = totalFunding.min > 0 && totalFunding.min !== totalFunding.max
      ? `Potentiel total: ${formatAmount(totalFunding.min)} - ${formatAmount(totalFunding.max)}`
      : `Potentiel total: jusqu'a ${formatAmount(totalFunding.max)}`;
    doc.text(fundingText, margin + 10, yPosition);
    yPosition += 7;
  }

  if (urgentCount > 0) {
    doc.setTextColor(180, 83, 9); // Amber color for urgent
    doc.text(`${urgentCount} aide${urgentCount > 1 ? 's' : ''} avec deadline < 30 jours`, margin + 10, yPosition);
    doc.setTextColor(0, 0, 0);
  }

  yPosition += 20;

  // Company info (if profile provided)
  if (profile) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Entreprise', margin, yPosition);
    yPosition += 7;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    if (profile.sector) {
      doc.text(`Secteur: ${cleanText(profile.sector)}`, margin, yPosition);
      yPosition += 5;
    }
    if (profile.region) {
      doc.text(`Region: ${cleanText(profile.region)}`, margin, yPosition);
      yPosition += 5;
    }
    if (profile.employees) {
      doc.text(`Effectif: ${cleanText(profile.employees)}`, margin, yPosition);
      yPosition += 5;
    }
    yPosition += 10;
  }

  // ===================
  // SUMMARY TABLE
  // ===================
  doc.addPage();
  yPosition = margin;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Liste des aides', margin, yPosition);
  yPosition += 10;

  // Table header
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, yPosition, contentWidth, 8, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Aide', margin + 2, yPosition + 5.5);
  doc.text('Montant', margin + 100, yPosition + 5.5);
  doc.text('Deadline', margin + 140, yPosition + 5.5);
  yPosition += 10;

  // Table rows
  doc.setFont('helvetica', 'normal');
  subsidies.forEach((subsidy, index) => {
    checkPageBreak(12);

    // Alternate row colors
    if (index % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, yPosition - 2, contentWidth, 10, 'F');
    }

    const title = cleanText(getSubsidyTitle(subsidy)).substring(0, 55);
    const displayTitle = title.length >= 55 ? title + '...' : title;
    doc.text(displayTitle, margin + 2, yPosition + 4);

    const amount = subsidy.amount_max
      ? `Jusqu'a ${formatAmount(subsidy.amount_max)}`
      : '-';
    doc.text(amount, margin + 100, yPosition + 4);

    const deadline = subsidy.deadline
      ? new Date(subsidy.deadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
      : '-';
    doc.text(deadline, margin + 140, yPosition + 4);

    yPosition += 10;
  });

  // ===================
  // DETAILED SECTIONS
  // ===================
  subsidies.forEach((subsidy, index) => {
    doc.addPage();
    yPosition = margin;

    // Subsidy number badge
    doc.setFillColor(30, 64, 175);
    doc.circle(margin + 5, yPosition + 3, 5, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(`${index + 1}`, margin + 3.5, yPosition + 5);

    // Title
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    const title = cleanText(getSubsidyTitle(subsidy));
    const titleLines = splitTextToLines(doc, title, contentWidth - 15);
    doc.text(titleLines, margin + 15, yPosition + 5);
    yPosition += titleLines.length * 6 + 10;

    // Agency
    if (subsidy.agency) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(cleanText(subsidy.agency), margin, yPosition);
      yPosition += 8;
    }

    // Separator
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 8;

    // Key info grid
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);

    // Amount
    if (subsidy.amount_min || subsidy.amount_max) {
      doc.setFont('helvetica', 'bold');
      doc.text('Montant:', margin, yPosition);
      doc.setFont('helvetica', 'normal');
      const amountText = subsidy.amount_min && subsidy.amount_max
        ? `${formatAmount(subsidy.amount_min)} - ${formatAmount(subsidy.amount_max)}`
        : subsidy.amount_max
        ? `Jusqu'a ${formatAmount(subsidy.amount_max)}`
        : `A partir de ${formatAmount(subsidy.amount_min)}`;
      doc.text(amountText, margin + 25, yPosition);
      yPosition += 6;
    }

    // Deadline
    if (subsidy.deadline) {
      doc.setFont('helvetica', 'bold');
      doc.text('Date limite:', margin, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.text(formatDate(subsidy.deadline), margin + 28, yPosition);

      // Urgency indicator
      const now = new Date();
      const deadline = new Date(subsidy.deadline);
      const diffDays = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays <= 30) {
        doc.setTextColor(180, 83, 9);
        doc.text(`(${diffDays}j restants)`, margin + 70, yPosition);
        doc.setTextColor(0, 0, 0);
      }
      yPosition += 6;
    }

    // Region
    if (subsidy.region && subsidy.region.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('Region:', margin, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.text(subsidy.region.join(', '), margin + 20, yPosition);
      yPosition += 6;
    }

    // Funding type
    if (subsidy.funding_type) {
      doc.setFont('helvetica', 'bold');
      doc.text('Type:', margin, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.text(cleanText(subsidy.funding_type), margin + 15, yPosition);
      yPosition += 6;
    }

    yPosition += 5;

    // Description
    const description = getSubsidyDescription(subsidy);
    if (description) {
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 8;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Description', margin, yPosition);
      yPosition += 7;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const descLines = splitTextToLines(doc, description, contentWidth);

      const lineHeight = 4.5;
      for (const line of descLines) {
        if (checkPageBreak(lineHeight + 2)) {
          // Continue description on new page
        }
        doc.text(line, margin, yPosition);
        yPosition += lineHeight;
      }
    }

    // Application link
    if (subsidy.application_url) {
      yPosition += 5;
      checkPageBreak(15);
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 8;

      doc.setFontSize(10);
      doc.setTextColor(30, 64, 175);
      doc.textWithLink('Postuler en ligne', margin, yPosition, { url: subsidy.application_url });
      doc.setTextColor(0, 0, 0);
    }
  });

  // Footer on each page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} sur ${pageCount} - Genere via MaSubventionPro`,
      margin,
      pageHeight - 10
    );
  }

  // Generate filename
  const companySlug = profile?.company_name
    ? cleanText(profile.company_name).substring(0, 30).replace(/[^a-zA-Z0-9\u00C0-\u024F]/g, '_').replace(/_+/g, '_')
    : 'aides';
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `aides_${companySlug}_${dateStr}.pdf`;

  // Get blob
  const blob = doc.output('blob');

  // Download if requested
  if (download) {
    doc.save(filename);
  }

  return { blob, filename };
}
