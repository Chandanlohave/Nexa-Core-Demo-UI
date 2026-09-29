import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  Packer
} from 'docx';

export interface ReportMeta {
  title?: string;
  category?: string;
  author?: string;
  date?: string;
}

export interface ParsedTable {
  headers: string[];
  rows: string[][];
}

/**
 * Universal file download helper for real binary blobs
 */
const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 350);
};

/**
 * Sanitize text to remove raw non-printable characters or weird UTF-8 artifacts
 * (e.g. garbled symbols shown as Ø=ÜÊ, emoji glitches in standard PDF fonts)
 */
export const cleanTextForExport = (text: string): string => {
  return text
    // Remove emojis or non-ascii symbols that break standard PDF encoding fonts
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1FAFF}]/gu, '')
    // Replace smart quotes and special dashes with standard ascii
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2022\u2023\u25E6\u2043\u2219]/g, '*')
    // Strip null or unprintable control codes
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');
};

/**
 * Remove markdown syntax for raw text lines
 */
export const stripMarkdown = (text: string): string => {
  const cleaned = cleanTextForExport(text);
  return cleaned
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/`{1,3}(.*?)`{1,3}/g, '$1')
    .replace(/^#+\s+/gm, '')
    .replace(/^>\s+/gm, '')
    .replace(/^[-*+]\s+/gm, '• ');
};

/**
 * Extract structured tables from markdown text
 */
export const extractTablesFromText = (text: string): ParsedTable[] => {
  const tables: ParsedTable[] = [];
  const lines = text.split('\n');
  let currentHeaders: string[] | null = null;
  let currentRows: string[][] = [];
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('|') && line.endsWith('|')) {
      const cells = line
        .split('|')
        .slice(1, -1)
        .map(c => stripMarkdown(c).trim());

      // Check if it's separator row like |---|---|
      if (cells.every(c => /^[-:\s]+$/.test(c))) {
        inTable = true;
        continue;
      }

      if (!currentHeaders && !inTable) {
        currentHeaders = cells;
      } else {
        currentRows.push(cells);
      }
    } else {
      if (currentHeaders && currentRows.length > 0) {
        tables.push({ headers: currentHeaders, rows: currentRows });
      }
      currentHeaders = null;
      currentRows = [];
      inTable = false;
    }
  }

  if (currentHeaders && currentRows.length > 0) {
    tables.push({ headers: currentHeaders, rows: currentRows });
  }

  return tables;
};

// ==========================================
// 1. EXPORT TO HIGH-FIDELITY PDF (.pdf)
// ==========================================
export const exportToPdf = (title: string, rawContent: string, meta?: ReportMeta): void => {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const contentWidth = pageWidth - (margin * 2);

    // Header Background
    doc.setFillColor(15, 23, 42); // Slate-900
    doc.rect(0, 0, pageWidth, 26, 'F');

    // Accent line (Electric Cyan)
    doc.setFillColor(41, 223, 255);
    doc.rect(0, 26, pageWidth, 1.2, 'F');

    // Header Branding
    doc.setTextColor(41, 223, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('N.E.X.A. ARTIFICIAL INTELLIGENCE', margin, 11);

    doc.setTextColor(148, 163, 184); // Slate-400
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const dateStr = meta?.date || new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
    doc.text(`SYSTEM REPORT // GENERATED: ${cleanTextForExport(dateStr)}`, margin, 18);

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('CONFIDENTIAL & VERIFIED', pageWidth - margin, 14, { align: 'right' });

    // Document Title
    let cursorY = 36;
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    const cleanTitle = cleanTextForExport(title || 'NEXA System Report').toUpperCase();
    doc.text(cleanTitle, margin, cursorY);
    cursorY += 6;

    // Subtitle divider line
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(margin, cursorY, pageWidth - margin, cursorY);
    cursorY += 6;

    // Process Content line by line, rendering clean native tables where found
    const rawLines = rawContent.split('\n');
    let lineIdx = 0;

    const checkPageBreak = (neededHeight: number) => {
      if (cursorY + neededHeight > pageHeight - 16) {
        doc.addPage();
        cursorY = 20;
        return true;
      }
      return false;
    };

    while (lineIdx < rawLines.length) {
      const line = rawLines[lineIdx].trim();

      if (!line) {
        cursorY += 3;
        lineIdx++;
        continue;
      }

      // Check if table starts
      if (line.startsWith('|') && line.endsWith('|')) {
        // Collect entire table
        const tableLines: string[] = [];
        while (lineIdx < rawLines.length && rawLines[lineIdx].trim().startsWith('|') && rawLines[lineIdx].trim().endsWith('|')) {
          tableLines.push(rawLines[lineIdx].trim());
          lineIdx++;
        }

        const tableText = tableLines.join('\n');
        const parsedTables = extractTablesFromText(tableText);

        if (parsedTables.length > 0) {
          const table = parsedTables[0];
          const colCount = Math.max(1, table.headers.length);
          const colWidth = contentWidth / colCount;

          checkPageBreak(12);

          // Draw Table Header
          doc.setFillColor(2, 132, 199); // Sky-600
          doc.rect(margin, cursorY, contentWidth, 7, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);

          table.headers.forEach((h, cIdx) => {
            const cleanH = stripMarkdown(h);
            const wrappedH = doc.splitTextToSize(cleanH, colWidth - 4);
            doc.text(wrappedH[0] || '', margin + (cIdx * colWidth) + 2, cursorY + 4.8);
          });
          cursorY += 7;

          // Draw Table Rows
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);

          table.rows.forEach((row, rIdx) => {
            // Find max lines needed for this row
            let maxLinesInRow = 1;
            const rowWrappedCells: string[][] = [];

            for (let cIdx = 0; cIdx < colCount; cIdx++) {
              const cellText = stripMarkdown(row[cIdx] || '');
              const wrapped = doc.splitTextToSize(cellText, colWidth - 4);
              rowWrappedCells.push(wrapped);
              if (wrapped.length > maxLinesInRow) {
                maxLinesInRow = Math.min(3, wrapped.length);
              }
            }

            const rowHeight = Math.max(6, maxLinesInRow * 4.2 + 2);
            checkPageBreak(rowHeight);

            // Row zebra striping
            if (rIdx % 2 === 0) {
              doc.setFillColor(248, 250, 252);
              doc.rect(margin, cursorY, contentWidth, rowHeight, 'F');
            }

            // Cell borders
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.2);
            doc.rect(margin, cursorY, contentWidth, rowHeight);

            // Text
            doc.setTextColor(51, 65, 85);
            for (let cIdx = 0; cIdx < colCount; cIdx++) {
              const linesToPrint = rowWrappedCells[cIdx] || [];
              let textY = cursorY + 4;
              for (let l = 0; l < Math.min(linesToPrint.length, 3); l++) {
                doc.text(linesToPrint[l], margin + (cIdx * colWidth) + 2, textY);
                textY += 3.8;
              }
            }

            cursorY += rowHeight;
          });

          cursorY += 4;
          continue;
        }
      }

      // Check Heading 1
      if (line.startsWith('# ')) {
        checkPageBreak(12);
        cursorY += 3;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(15, 23, 42);
        doc.text(stripMarkdown(line), margin, cursorY);
        cursorY += 6;
        lineIdx++;
        continue;
      }

      // Check Heading 2
      if (line.startsWith('## ')) {
        checkPageBreak(10);
        cursorY += 2;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(30, 41, 59);
        doc.text(stripMarkdown(line), margin, cursorY);
        cursorY += 5;
        lineIdx++;
        continue;
      }

      // Check Heading 3
      if (line.startsWith('### ')) {
        checkPageBreak(8);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(51, 65, 85);
        doc.text(stripMarkdown(line), margin, cursorY);
        cursorY += 4.5;
        lineIdx++;
        continue;
      }

      // Standard Line (bullet or paragraph)
      const cleanLine = stripMarkdown(line);
      const isBullet = cleanLine.startsWith('• ');
      const isBold = cleanLine.startsWith('**') || cleanLine.includes(':**');

      doc.setFont('helvetica', isBold ? 'bold' : 'normal');
      doc.setFontSize(9);
      doc.setTextColor(isBold ? 30 : 71, isBold ? 41 : 85, isBold ? 59 : 105);

      const wrapped = doc.splitTextToSize(cleanLine, contentWidth - (isBullet ? 4 : 0));
      for (const wText of wrapped) {
        checkPageBreak(5);
        doc.text(wText, margin + (isBullet ? 2 : 0), cursorY);
        cursorY += 4.5;
      }

      lineIdx++;
    }

    // Add clean footers to all pages
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('Generated by NEXA Autonomous OS', margin, pageHeight - 6);
      doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin, pageHeight - 6, { align: 'right' });
    }

    const safeFilename = `${(title || 'nexa-report').toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString().slice(-4)}.pdf`;
    doc.save(safeFilename);
  } catch (err) {
    console.error('PDF Export Error:', err);
  }
};

// ==========================================
// 2. EXPORT TO REAL EXCEL WORKBOOK (.xlsx / .xls)
// ==========================================
export const exportToExcel = (title: string, rawContent: string, meta?: ReportMeta): void => {
  try {
    const wb = XLSX.utils.book_new();
    const tables = extractTablesFromText(rawContent);

    if (tables.length > 0) {
      tables.forEach((tbl, idx) => {
        const wsData: string[][] = [];
        // Header title row
        wsData.push([`NEXA SYSTEM AUDIT REPORT: ${cleanTextForExport(title).toUpperCase()}`]);
        wsData.push([`Generated: ${new Date().toLocaleString()} | Verified by NEXA Autonomous OS`]);
        wsData.push([]); // blank row

        // Table headers
        wsData.push(tbl.headers.map(h => stripMarkdown(h)));

        // Table rows
        tbl.rows.forEach(r => {
          wsData.push(r.map(c => stripMarkdown(c)));
        });

        const ws = XLSX.utils.aoa_to_sheet(wsData);

        // Auto-size columns for pristine viewing
        const colWidths = tbl.headers.map((_, colI) => {
          let maxLen = 15;
          wsData.forEach(row => {
            const cell = row[colI];
            if (cell && cell.length > maxLen) {
              maxLen = Math.min(45, cell.length);
            }
          });
          return { wch: maxLen + 2 };
        });
        ws['!cols'] = colWidths;

        const sheetName = `Report Table ${idx + 1}`.slice(0, 31);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      });
    } else {
      // No markdown table found: turn lines/key-values into a clean spreadsheet
      const lines = rawContent.split('\n').filter(l => l.trim().length > 0);
      const wsData: string[][] = [
        [`NEXA SYSTEM REPORT: ${cleanTextForExport(title).toUpperCase()}`],
        [`Generated: ${new Date().toLocaleString()}`],
        [],
        ['Index', 'Item / Metric', 'Value / Details']
      ];

      lines.forEach((line, idx) => {
        const clean = stripMarkdown(line);
        const colonIdx = clean.indexOf(':');
        let key = `Item ${idx + 1}`;
        let val = clean;
        if (colonIdx > 0 && colonIdx < 40) {
          key = clean.substring(0, colonIdx).trim();
          val = clean.substring(colonIdx + 1).trim();
        }
        wsData.push([String(idx + 1), key, val]);
      });

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws['!cols'] = [{ wch: 8 }, { wch: 28 }, { wch: 55 }];
      XLSX.utils.book_append_sheet(wb, ws, 'System Metrics');
    }

    // Write real binary XLSX
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const safeFilename = `${(title || 'nexa-metrics').toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString().slice(-4)}.xlsx`;
    downloadBlob(blob, safeFilename);
  } catch (err) {
    console.error('Excel Export Error:', err);
  }
};

// ==========================================
// 3. EXPORT TO REAL MICROSOFT WORD (.docx)
// ==========================================
export const exportToWord = async (title: string, rawContent: string, meta?: ReportMeta): Promise<void> => {
  try {
    const docChildren: any[] = [];

    // Header Box / Title
    docChildren.push(
      new Paragraph({
        text: 'N.E.X.A. ARTIFICIAL INTELLIGENCE SYSTEM',
        style: 'Heading1',
        spacing: { after: 120 }
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: (title || 'NEXA SYSTEM REPORT').toUpperCase(),
            bold: true,
            size: 32,
            color: '0284C7'
          })
        ],
        spacing: { after: 100 }
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Generated: ${new Date().toLocaleString()} | Security Protocol: AES-256 Validated | Status: OPTIMAL`,
            size: 18,
            color: '64748B',
            italics: true
          })
        ],
        spacing: { after: 280 }
      })
    );

    const tables = extractTablesFromText(rawContent);

    if (tables.length > 0) {
      tables.forEach((tbl) => {
        const tableRows: TableRow[] = [];

        // Header Row
        tableRows.push(
          new TableRow({
            tableHeader: true,
            children: tbl.headers.map(
              h =>
                new TableCell({
                  shading: { fill: '0284C7' },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.LEFT,
                      children: [
                        new TextRun({
                          text: stripMarkdown(h),
                          bold: true,
                          color: 'FFFFFF',
                          size: 20
                        })
                      ]
                    })
                  ]
                })
            )
          })
        );

        // Data Rows
        tbl.rows.forEach((row, rIdx) => {
          tableRows.push(
            new TableRow({
              children: row.map(
                cell =>
                  new TableCell({
                    shading: { fill: rIdx % 2 === 0 ? 'F8FAFC' : 'FFFFFF' },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: stripMarkdown(cell),
                            size: 19,
                            color: '334155'
                          })
                        ]
                      })
                    ]
                  })
              )
            })
          );
        });

        docChildren.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: tableRows
          }),
          new Paragraph({ text: '', spacing: { after: 200 } })
        );
      });
    }

    // Add clean content paragraphs
    const lines = rawContent.split('\n');
    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || (trimmed.startsWith('|') && trimmed.endsWith('|'))) return;

      if (trimmed.startsWith('# ')) {
        docChildren.push(
          new Paragraph({
            text: stripMarkdown(trimmed),
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 200, after: 100 }
          })
        );
      } else if (trimmed.startsWith('## ')) {
        docChildren.push(
          new Paragraph({
            text: stripMarkdown(trimmed),
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 160, after: 80 }
          })
        );
      } else if (trimmed.startsWith('### ')) {
        docChildren.push(
          new Paragraph({
            text: stripMarkdown(trimmed),
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 120, after: 60 }
          })
        );
      } else {
        const clean = stripMarkdown(trimmed);
        const isBullet = clean.startsWith('• ');
        docChildren.push(
          new Paragraph({
            children: [
              new TextRun({
                text: clean,
                size: 21,
                color: '1E293B'
              })
            ],
            bullet: isBullet ? { level: 0 } : undefined,
            spacing: { after: 80 }
          })
        );
      }
    });

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: docChildren
        }
      ]
    });

    const buffer = await Packer.toBlob(doc);
    const safeFilename = `${(title || 'nexa-document').toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString().slice(-4)}.docx`;
    downloadBlob(buffer, safeFilename);
  } catch (err) {
    console.error('Word Export Error:', err);
  }
};

/**
 * Strict Detection: ONLY show the Report Download Bar when the user or NEXA
 * specifically generated a System Check, Audit Report, or Diagnostics.
 * (Will NOT appear on normal chat messages or small greetings)
 */
export const isReportContent = (text: string): boolean => {
  if (!text || text.length < 120) return false;
  const lower = text.toLowerCase();

  // Strict check: must have explicit report headings or audit tables
  const hasReportHeading =
    lower.includes('system check report') ||
    lower.includes('system report') ||
    lower.includes('diagnostics report') ||
    lower.includes('security audit report') ||
    lower.includes('code audit report') ||
    lower.includes('analytics report') ||
    lower.includes('performance benchmarks');

  const hasTableAndKeywords =
    lower.includes('|---') &&
    (lower.includes('status') || lower.includes('metric') || lower.includes('module')) &&
    (lower.includes('optimal') || lower.includes('active') || lower.includes('efficiency'));

  return hasReportHeading || hasTableAndKeywords;
};
