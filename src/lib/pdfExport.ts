import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Subsidy, getSubsidyTitle, getSubsidyDescription, MaSubventionProProfile } from '@/types';

// Extend jsPDF type for autoTable
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: {
      finalY: number;
    };
  }
}

// Color palette
const COLORS = {
  primary: [30, 64, 175] as [number, number, number],        // Blue
  primaryLight: [239, 246, 255] as [number, number, number], // Light blue
  success: [5, 150, 105] as [number, number, number],        // Emerald
  successLight: [236, 253, 245] as [number, number, number], // Light emerald
  warning: [180, 83, 9] as [number, number, number],         // Amber
  warningLight: [255, 251, 235] as [number, number, number], // Light amber
  gray: [100, 116, 139] as [number, number, number],         // Slate
  grayLight: [248, 250, 252] as [number, number, number],    // Light slate
  border: [226, 232, 240] as [number, number, number],       // Border color
  text: [15, 23, 42] as [number, number, number],            // Dark text
  textMuted: [100, 116, 139] as [number, number, number],    // Muted text
};

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

// Format short date
function formatShortDate(date: string | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  });
}

// Clean text for PDF (remove special characters and markdown formatting)
function cleanText(text: string): string {
  return text
    // Remove special unicode characters
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2026/g, '...')
    .replace(/\u2013/g, '-')
    .replace(/\u2014/g, '--')
    .replace(/\u00A0/g, ' ')
    // Convert markdown bold **text** to plain text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    // Convert markdown italic *text* to plain text
    .replace(/\*([^*]+)\*/g, '$1')
    // Remove markdown links [text](url) - keep text only
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove standalone URLs (https://...)
    .replace(/https?:\/\/[^\s]+/g, '')
    // Clean up messy formatting with pipes
    .replace(/\|\s*\|/g, '')
    .replace(/\|\s*/g, ' ')
    // Remove "Liens liés à l'étape :" type patterns
    .replace(/Liens li[ée]s [àa] l['']?[ée]tape\s*:\s*/gi, '')
    // Clean up multiple spaces
    .replace(/\s{2,}/g, ' ')
    // Clean up multiple dashes
    .replace(/--+/g, '-')
    // Trim
    .trim();
}

// Clean description text more aggressively for PDF display
function cleanDescription(text: string): string {
  let cleaned = cleanText(text);

  // Remove common noise patterns from subsidy descriptions
  cleaned = cleaned
    // Remove "Contact public pour les questions..." patterns
    .replace(/Contact public pour les questions[^.]*\./gi, '')
    // Remove "Etapes pour activer le dispositif" and following content until next section
    .replace(/[EÉ]tapes pour activer le dispositif\s*:?[^.]*\./gi, '')
    // Remove "Lien externe de présentation" patterns
    .replace(/Lien externe de pr[ée]sentation[^.]*\.?/gi, '')
    // Clean up leftover artifacts
    .replace(/\s*:\s*$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return cleaned;
}

// Split long text into lines
function splitTextToLines(doc: jsPDF, text: string, maxWidth: number): string[] {
  const cleanedText = cleanText(text);
  return doc.splitTextToSize(cleanedText, maxWidth);
}

// Split description text into lines (with extra cleaning)
function splitDescriptionToLines(doc: jsPDF, text: string, maxWidth: number): string[] {
  const cleanedText = cleanDescription(text);
  return doc.splitTextToSize(cleanedText, maxWidth);
}

// Calculate days until deadline
function getDaysUntilDeadline(deadline: string | null): number | null {
  if (!deadline) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const deadlineDate = new Date(deadline);
  return Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// Load image from URL and convert to base64 for PDF embedding
async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// Get image format from base64 data URL
function getImageFormat(dataUrl: string): 'PNG' | 'JPEG' | 'WEBP' {
  if (dataUrl.includes('image/png')) return 'PNG';
  if (dataUrl.includes('image/webp')) return 'WEBP';
  return 'JPEG';
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
    const descLines = splitDescriptionToLines(doc, description, contentWidth);

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
export async function exportSubsidiesToPDF(
  subsidies: Subsidy[],
  options: ExportSubsidiesOptions = {}
): Promise<ExportSubsidiesResult> {
  const { download = true, profile } = options;

  // Pre-load all images in parallel
  const [companyLogo, ...subsidyLogos] = await Promise.all([
    profile?.logo_url ? loadImageAsBase64(profile.logo_url) : Promise.resolve(null),
    ...subsidies.map((s) => s.logo_url ? loadImageAsBase64(s.logo_url) : Promise.resolve(null)),
  ]);

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

  // Helper to add page footer
  const addFooter = (pageNum: number, totalPages: number) => {
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.textMuted);
    doc.text(
      `Page ${pageNum} sur ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
    doc.text(
      'MaSubventionPro',
      pageWidth - margin,
      pageHeight - 10,
      { align: 'right' }
    );
  };

  // ===================
  // COVER PAGE
  // ===================

  // Header bar
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 8, 'F');

  yPosition = 25;

  // Company logo (if available)
  if (companyLogo) {
    try {
      const logoSize = 25;
      doc.addImage(companyLogo, getImageFormat(companyLogo), margin, yPosition, logoSize, logoSize);
      yPosition += logoSize + 10;
    } catch {
      // Silently fail if image can't be added
      yPosition = 40;
    }
  } else {
    yPosition = 40;
  }

  // Main title
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.text);
  doc.text('Rapport des Aides', margin, yPosition);
  yPosition += 10;

  // Subtitle with company name
  doc.setFontSize(16);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.gray);
  const subtitle = profile?.company_name
    ? `Identifiees pour ${cleanText(profile.company_name)}`
    : 'Identifiees pour votre entreprise';
  doc.text(subtitle, margin, yPosition);
  yPosition += 20;

  // Generation date
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.textMuted);
  doc.text(`Genere le ${new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })}`, margin, yPosition);
  yPosition += 25;

  // ===== SUMMARY BOX =====
  const totalFunding = calculateTotalFunding(subsidies);
  const urgentCount = countUrgentDeadlines(subsidies);

  // Main stats box with border
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(1);
  doc.setFillColor(...COLORS.primaryLight);
  doc.roundedRect(margin, yPosition, contentWidth, 45, 4, 4, 'FD');

  // "POTENTIEL IDENTIFIE" header inside box
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text('POTENTIEL IDENTIFIE', margin + 10, yPosition + 12);

  // Large funding amount
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.text);
  const fundingDisplay = totalFunding.max > 0
    ? `Jusqu'a ${formatAmount(totalFunding.max)}`
    : 'Non chiffre';
  doc.text(fundingDisplay, margin + 10, yPosition + 28);

  // Subsidy count
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.gray);
  doc.text(`${subsidies.length} aide${subsidies.length > 1 ? 's' : ''} identifiee${subsidies.length > 1 ? 's' : ''}`, margin + 10, yPosition + 38);

  yPosition += 55;

  // Urgent deadlines warning (if any)
  if (urgentCount > 0) {
    doc.setFillColor(...COLORS.warningLight);
    doc.setDrawColor(...COLORS.warning);
    doc.roundedRect(margin, yPosition, contentWidth, 18, 3, 3, 'FD');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.warning);
    doc.text(
      `${urgentCount} aide${urgentCount > 1 ? 's ont' : ' a'} une date limite proche (< 30 jours)`,
      margin + 10,
      yPosition + 11
    );
    yPosition += 25;
  }

  // Company info section (if profile provided)
  if (profile) {
    yPosition += 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.text);
    doc.text('Votre entreprise', margin, yPosition);
    yPosition += 8;

    // Company details table
    const companyData: (string | number)[][] = [];
    if (profile.company_name) {
      companyData.push(['Raison sociale', cleanText(profile.company_name)]);
    }
    if (profile.sector) {
      companyData.push(['Secteur', cleanText(profile.sector)]);
    }
    if (profile.region) {
      companyData.push(['Region', cleanText(profile.region)]);
    }
    if (profile.employees) {
      companyData.push(['Effectif', cleanText(profile.employees)]);
    }

    if (companyData.length > 0) {
      autoTable(doc, {
        startY: yPosition,
        head: [],
        body: companyData,
        theme: 'plain',
        styles: {
          fontSize: 10,
          cellPadding: 3,
        },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 40, textColor: COLORS.gray },
          1: { textColor: COLORS.text },
        },
        margin: { left: margin, right: margin },
      });
      yPosition = doc.lastAutoTable.finalY + 10;
    }
  }

  // ===================
  // SUMMARY TABLE PAGE
  // ===================
  doc.addPage();
  yPosition = margin;

  // Section title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.text);
  doc.text('Liste des aides identifiees', margin, yPosition);
  yPosition += 12;

  // Prepare table data
  const tableData = subsidies.map((subsidy, index) => {
    const title = cleanText(getSubsidyTitle(subsidy));
    const displayTitle = title.length > 50 ? title.substring(0, 47) + '...' : title;
    const amount = subsidy.amount_max ? formatAmount(subsidy.amount_max) : '-';
    const deadline = formatShortDate(subsidy.deadline);
    const daysLeft = getDaysUntilDeadline(subsidy.deadline);

    return [
      (index + 1).toString(),
      displayTitle,
      amount,
      daysLeft !== null && daysLeft >= 0 && daysLeft <= 30
        ? `${deadline} (${daysLeft}j)`
        : deadline,
    ];
  });

  // Summary table with autoTable
  autoTable(doc, {
    startY: yPosition,
    head: [['#', 'Aide', 'Montant max', 'Date limite']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: COLORS.primary,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    styles: {
      fontSize: 9,
      cellPadding: 4,
      overflow: 'linebreak',
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 90 },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 35, halign: 'center' },
    },
    alternateRowStyles: {
      fillColor: COLORS.grayLight,
    },
    margin: { left: margin, right: margin },
    didParseCell: function(data) {
      // Highlight urgent deadlines in amber
      if (data.section === 'body' && data.column.index === 3) {
        const cellText = data.cell.raw as string;
        if (cellText && cellText.includes('j)')) {
          data.cell.styles.textColor = COLORS.warning;
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
  });

  // ===================
  // DETAILED SECTIONS
  // ===================
  subsidies.forEach((subsidy, index) => {
    doc.addPage();
    yPosition = margin;

    const subsidyLogo = subsidyLogos[index];
    let titleStartX = margin;

    // Subsidy logo (if available)
    if (subsidyLogo) {
      try {
        const logoSize = 18;
        doc.addImage(subsidyLogo, getImageFormat(subsidyLogo), margin, yPosition, logoSize, logoSize);
        titleStartX = margin + logoSize + 5;
      } catch {
        // Silently fail if image can't be added
      }
    }

    // Header with number badge (position adjusted if logo present)
    const badgeX = subsidyLogo ? titleStartX : margin + 6;
    doc.setFillColor(...COLORS.primary);
    doc.circle(badgeX, yPosition + 6, 6, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    const numText = (index + 1).toString();
    doc.text(numText, badgeX - (numText.length * 1.5), yPosition + 8.5);

    // Title (position adjusted based on logo and badge)
    const titleX = subsidyLogo ? badgeX + 12 : margin + 18;
    const titleMaxWidth = contentWidth - (titleX - margin);
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    const title = cleanText(getSubsidyTitle(subsidy));
    const titleLines = splitTextToLines(doc, title, titleMaxWidth);
    doc.text(titleLines, titleX, yPosition + 5);
    const titleHeight = Math.max(titleLines.length * 6, 12);
    yPosition += Math.max(titleHeight, subsidyLogo ? 20 : 12) + 8;

    // Agency
    if (subsidy.agency) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.textMuted);
      doc.text(cleanText(subsidy.agency), margin, yPosition);
      yPosition += 10;
    }

    // Key info table
    const infoData: (string | number)[][] = [];

    if (subsidy.amount_min || subsidy.amount_max) {
      const amountText = subsidy.amount_min && subsidy.amount_max
        ? `${formatAmount(subsidy.amount_min)} - ${formatAmount(subsidy.amount_max)}`
        : subsidy.amount_max
        ? `Jusqu'a ${formatAmount(subsidy.amount_max)}`
        : `A partir de ${formatAmount(subsidy.amount_min)}`;
      infoData.push(['Montant', amountText]);
    }

    if (subsidy.deadline) {
      const daysLeft = getDaysUntilDeadline(subsidy.deadline);
      let deadlineText = formatDate(subsidy.deadline);
      if (daysLeft !== null && daysLeft >= 0 && daysLeft <= 30) {
        deadlineText += ` (${daysLeft} jours restants)`;
      }
      infoData.push(['Date limite', deadlineText]);
    }

    if (subsidy.region && subsidy.region.length > 0) {
      infoData.push(['Region', subsidy.region.join(', ')]);
    }

    if (subsidy.funding_type) {
      infoData.push(['Type', cleanText(subsidy.funding_type)]);
    }

    if (subsidy.primary_sector) {
      infoData.push(['Secteur', cleanText(subsidy.primary_sector)]);
    }

    if (infoData.length > 0) {
      autoTable(doc, {
        startY: yPosition,
        head: [],
        body: infoData,
        theme: 'plain',
        styles: {
          fontSize: 10,
          cellPadding: 3,
        },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 35, textColor: COLORS.gray },
          1: { textColor: COLORS.text },
        },
        margin: { left: margin, right: margin },
        didParseCell: function(data) {
          // Highlight urgent deadlines
          if (data.section === 'body' && data.column.index === 1) {
            const firstCol = data.row.cells[0]?.raw;
            const cellText = data.cell.raw as string;
            if (firstCol === 'Date limite' && cellText.includes('jours restants')) {
              data.cell.styles.textColor = COLORS.warning;
              data.cell.styles.fontStyle = 'bold';
            }
          }
        },
      });
      yPosition = doc.lastAutoTable.finalY + 10;
    }

    // Description section
    const description = getSubsidyDescription(subsidy);
    if (description) {
      // Section header
      doc.setDrawColor(...COLORS.border);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 8;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.text);
      doc.text('Description', margin, yPosition);
      yPosition += 8;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.gray);
      const descLines = splitDescriptionToLines(doc, description, contentWidth);

      const lineHeight = 4.5;
      for (const line of descLines) {
        if (yPosition > pageHeight - margin - 20) {
          doc.addPage();
          yPosition = margin;
        }
        doc.text(line, margin, yPosition);
        yPosition += lineHeight;
      }
    }

    // Links section
    if (subsidy.application_url || subsidy.source_url) {
      yPosition += 8;
      if (yPosition > pageHeight - 40) {
        doc.addPage();
        yPosition = margin;
      }

      // Section header
      doc.setDrawColor(...COLORS.border);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 8;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.text);
      doc.text('Liens utiles', margin, yPosition);
      yPosition += 10;

      // Application link
      if (subsidy.application_url) {
        doc.setFillColor(...COLORS.successLight);
        doc.roundedRect(margin, yPosition, contentWidth, 14, 3, 3, 'F');

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.success);
        doc.textWithLink('Postuler en ligne', margin + 10, yPosition + 9, {
          url: subsidy.application_url,
        });

        // Show URL as clickable link too
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.success);
        const displayUrl = subsidy.application_url.length > 50
          ? subsidy.application_url.substring(0, 47) + '...'
          : subsidy.application_url;
        doc.textWithLink(displayUrl, margin + 55, yPosition + 9, {
          url: subsidy.application_url,
        });

        yPosition += 18;
      }

      // Source link
      if (subsidy.source_url) {
        doc.setFillColor(...COLORS.primaryLight);
        doc.roundedRect(margin, yPosition, contentWidth, 14, 3, 3, 'F');

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.primary);
        doc.textWithLink('Source officielle', margin + 10, yPosition + 9, {
          url: subsidy.source_url,
        });

        // Show URL as clickable link too
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.primary);
        const displayUrl = subsidy.source_url.length > 50
          ? subsidy.source_url.substring(0, 47) + '...'
          : subsidy.source_url;
        doc.textWithLink(displayUrl, margin + 55, yPosition + 9, {
          url: subsidy.source_url,
        });

        yPosition += 18;
      }
    }
  });

  // Add footers to all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    addFooter(i, pageCount);
  }

  // Generate filename
  const companySlug = profile?.company_name
    ? cleanText(profile.company_name).substring(0, 30).replace(/[^a-zA-Z0-9\u00C0-\u024F]/g, '_').replace(/_+/g, '_')
    : 'aides';
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `rapport_${companySlug}_${dateStr}.pdf`;

  // Get blob
  const blob = doc.output('blob');

  // Download if requested
  if (download) {
    doc.save(filename);
  }

  return { blob, filename };
}
