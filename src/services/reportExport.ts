import * as XLSX from 'xlsx';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, HeadingLevel, AlignmentType, BorderStyle, ImageRun,
} from 'docx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveAs } from 'file-saver';
import { TLM_PRIMARY, TLM_PRIMARY_DARK, TLM_SECONDARY } from '@/config/theme';
import type { FieldDef } from '@/types/database';

export interface ReportData {
  headers: string[];
  rows: (string | number | null)[][];
  fields: FieldDef[];
  tableName: string;
  narrative: string;
  chartImages: string[];
  preparedBy: string;
  language: 'pt' | 'en';
}

function fieldLabel(field: FieldDef): string {
  if (field.title) {
    return field.title.replace(/\{\{t\(["'](.+?)["']\)\}\}/g, (_, s) => s);
  }
  return field.name;
}

function formatCellValue(value: unknown, field: FieldDef): string | number | null {
  if (value == null) return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (Array.isArray(value)) {
    if (value.length > 0 && typeof value[0] === 'object') {
      const labels = value.map((v) =>
        (v as Record<string, unknown>).title ??
        (v as Record<string, unknown>).name ??
        (v as Record<string, unknown>).filename ??
        JSON.stringify(v)
      );
      return labels.join(', ');
    }
    return value.join(', ');
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return String(obj.title ?? obj.name ?? obj.label ?? JSON.stringify(value));
  }
  if (field.interface === 'date' || field.interface === 'dateOnly') {
    try {
      const d = new Date(String(value));
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    } catch { /* ignore */ }
  }
  return String(value);
}

function buildHeaders(fields: FieldDef[]): string[] {
  return fields.map(fieldLabel);
}

function buildRows(
  records: Record<string, unknown>[],
  fields: FieldDef[],
): (string | number | null)[][] {
  return records.map((rec) =>
    fields.map((f) => formatCellValue(rec[f.name], f)),
  );
}

export function prepareReportData(
  records: Record<string, unknown>[],
  fields: FieldDef[],
  tableName: string,
  narrative: string,
  chartImages: string[],
  preparedBy: string,
  language: 'pt' | 'en',
): ReportData {
  return {
    headers: buildHeaders(fields),
    rows: buildRows(records, fields),
    fields,
    tableName,
    narrative,
    chartImages,
    preparedBy,
    language,
  };
}

const MAX_ROWS = 5000;

export async function exportExcel(data: ReportData, fileName: string): Promise<void> {
  if (data.rows.length > MAX_ROWS) {
    throw new Error(`Too many records (${data.rows.length}). Maximum is ${MAX_ROWS}.`);
  }

  const wsData = [data.headers, ...data.rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  const colWidths = data.headers.map((_, colIdx) => {
    let maxLen = data.headers[colIdx].length;
    for (const row of data.rows.slice(0, 200)) {
      const cellVal = row[colIdx];
      const len = cellVal != null ? String(cellVal).length : 0;
      if (len > maxLen) maxLen = len;
    }
    return { wch: Math.min(Math.max(maxLen + 2, 10), 50) };
  });
  ws['!cols'] = colWidths;

  ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: data.headers.length - 1 } }) };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Relatório');

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(new Blob([wbout], { type: 'application/octet-stream' }), fileName);
}

export async function exportWord(data: ReportData, fileName: string): Promise<void> {
  if (data.rows.length > MAX_ROWS) {
    throw new Error(`Too many records (${data.rows.length}). Maximum is ${MAX_ROWS}.`);
  }

  const isPt = data.language === 'pt';
  const children: (Paragraph | Table)[] = [];

  children.push(new Paragraph({
    heading: HeadingLevel.TITLE,
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'Missão Contra a Lepra', bold: true, size: 36, color: TLM_PRIMARY_DARK.replace('#', '') })],
  }));
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: isPt ? 'Sistema de MERL · Moçambique' : 'M&E System · Mozambique', size: 22, color: '666666' })],
    spacing: { after: 200 },
  }));
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: data.tableName, bold: true, size: 28 })],
    spacing: { after: 100 },
  }));
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({
      text: `${isPt ? 'Data de Geração' : 'Generation Date'}: ${new Date().toLocaleDateString(data.language === 'pt' ? 'pt-PT' : 'en-US')}`,
      size: 18, color: '888888',
    })],
    spacing: { after: 100 },
  }));
  if (data.preparedBy) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: `${isPt ? 'Preparado por' : 'Prepared by'}: ${data.preparedBy}`, size: 18, color: '888888' })],
      spacing: { after: 300 },
    }));
  }

  children.push(new Paragraph({ children: [], spacing: { after: 200 } }));

  if (data.narrative.trim()) {
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun({ text: isPt ? 'Análise Executiva' : 'Executive Analysis', bold: true, size: 24, color: TLM_PRIMARY.replace('#', '') })],
      spacing: { after: 150 },
    }));
    const narrativeParas = data.narrative.split('\n').filter((line) => line.trim());
    for (const para of narrativeParas) {
      children.push(new Paragraph({
        children: [new TextRun({ text: para, size: 22 })],
        spacing: { after: 120 },
      }));
    }
    children.push(new Paragraph({ children: [], spacing: { after: 200 } }));
  }

  if (data.chartImages.length > 0) {
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun({ text: isPt ? 'Gráficos' : 'Charts', bold: true, size: 24, color: TLM_PRIMARY.replace('#', '') })],
      spacing: { after: 150 },
    }));
    for (const imgData of data.chartImages) {
      try {
        const imgBlob = await (await fetch(imgData)).blob();
        const arrayBuf = await imgBlob.arrayBuffer();
        const u8 = new Uint8Array(arrayBuf);
        let w = 600;
        let h = 350;
        try {
          const view = new DataView(arrayBuf);
          if (view.getUint32(0) === 0x89504e47) {
            w = view.getUint32(16);
            h = view.getUint32(20);
          }
        } catch { /* ignore parse errors */ }
        const maxW = 600;
        if (w > maxW) { h = Math.round(h * (maxW / w)); w = maxW; }
        children.push(new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new ImageRun({ data: u8, transformation: { width: w, height: h }, type: 'png' })],
          spacing: { after: 200 },
        }));
      } catch {
        children.push(new Paragraph({ children: [new TextRun({ text: '[Chart image]', italics: true, color: '999999' })] }));
      }
    }
    children.push(new Paragraph({ children: [], spacing: { after: 200 } }));
  }

  children.push(new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text: isPt ? 'Tabela de Dados' : 'Data Table', bold: true, size: 24, color: TLM_PRIMARY.replace('#', '') })],
    spacing: { after: 150 },
  }));

  const headerRow = new TableRow({
    tableHeader: true,
    children: data.headers.map((h) => new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 20, color: 'FFFFFF' })] })],
      shading: { fill: TLM_PRIMARY.replace('#', '') },
      width: { size: Math.floor(9000 / data.headers.length), type: WidthType.DXA },
    })),
  });

  const dataRows = data.rows.slice(0, MAX_ROWS).map((row, rowIdx) =>
    new TableRow({
      children: row.map((cell) => new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: cell == null ? '' : String(cell), size: 18 })] })],
        shading: rowIdx % 2 === 0 ? { fill: 'F3F4F6' } : undefined,
      })),
    }),
  );

  const table = new Table({
    rows: [headerRow, ...dataRows],
    width: { size: 9000, type: WidthType.DXA },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'EEEEEE' },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'EEEEEE' },
    },
  });
  children.push(table);

  const doc = new Document({
    sections: [{ children }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, fileName);
}

export async function exportPdf(data: ReportData, fileName: string): Promise<void> {
  if (data.rows.length > MAX_ROWS) {
    throw new Error(`Too many records (${data.rows.length}). Maximum is ${MAX_ROWS}.`);
  }

  const isPt = data.language === 'pt';
  const doc = new jsPDF({ orientation: data.headers.length > 6 ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  let y = margin;

  doc.setFillColor(TLM_PRIMARY_DARK);
  doc.rect(0, 0, pageW, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Missão Contra a Lepra', margin, 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(isPt ? 'Sistema de MERL · Moçambique' : 'M&E System · Mozambique', margin, 22);
  doc.setFontSize(9);
  doc.text(new Date().toLocaleDateString(data.language === 'pt' ? 'pt-PT' : 'en-US'), pageW - margin, 14, { align: 'right' });
  if (data.preparedBy) {
    doc.text(`${isPt ? 'Preparado por' : 'Prepared by'}: ${data.preparedBy}`, pageW - margin, 22, { align: 'right' });
  }

  y = 38;
  doc.setTextColor(TLM_PRIMARY_DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(data.tableName, margin, y);
  y += 8;

  doc.setDrawColor(TLM_SECONDARY);
  doc.setLineWidth(0.8);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  if (data.narrative.trim()) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(TLM_PRIMARY_DARK);
    doc.text(isPt ? 'Análise Executiva' : 'Executive Analysis', margin, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    const narrativeLines = doc.splitTextToSize(data.narrative, pageW - 2 * margin);
    for (const line of narrativeLines) {
      if (y > pageH - 30) {
        addFooter(doc, pageW, pageH, isPt);
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += 5;
    }
    y += 6;
  }

  if (data.chartImages.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(TLM_PRIMARY_DARK);
    doc.text(isPt ? 'Gráficos' : 'Charts', margin, y);
    y += 6;

    for (const imgData of data.chartImages) {
      try {
        const imgProps = doc.getImageProperties(imgData);
        const maxW = pageW - 2 * margin;
        const maxH = 80;
        let w = imgProps.width;
        let h = imgProps.height;
      if (w > maxW) { h = h * (maxW / w); w = maxW; }
      if (h > maxH) { w = w * (maxH / h); h = maxH; }
        if (y + h > pageH - 25) {
          addFooter(doc, pageW, pageH, isPt);
          doc.addPage();
          y = margin;
        }
        doc.addImage(imgData, 'PNG', margin, y, w, h);
        y += h + 6;
      } catch {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        doc.text('[Chart image unavailable]', margin, y);
        y += 6;
      }
    }
    y += 4;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(TLM_PRIMARY_DARK);
  doc.text(isPt ? 'Tabela de Dados' : 'Data Table', margin, y);
  y += 4;

  const tableRows = data.rows.slice(0, MAX_ROWS).map((row) =>
    row.map((cell) => cell == null ? '' : String(cell)),
  );

  autoTable(doc, {
    head: [data.headers],
    body: tableRows,
    startY: y,
    margin: { left: margin, right: margin },
    styles: { fontSize: 7, cellPadding: 1.5, overflow: 'linebreak' },
    headStyles: { fillColor: [129, 21, 79], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
    alternateRowStyles: { fillColor: [243, 244, 246] },
    didDrawPage: () => {
      addFooter(doc, pageW, pageH, isPt);
    },
  });

  saveAs(doc.output('blob'), fileName);
}

function addFooter(doc: jsPDF, pageW: number, pageH: number, isPt: boolean): void {
  const pageCount = doc.getNumberOfPages();
  const currentPage = doc.getCurrentPageInfo().pageNumber;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(14, pageH - 10, pageW - 14, pageH - 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(120, 120, 120);
  doc.text('Missão Contra a Lepra · MERL', 14, pageH - 5);
  doc.text(
    `${isPt ? 'Página' : 'Page'} ${currentPage} / ${pageCount}`,
    pageW - 14, pageH - 5,
    { align: 'right' },
  );
}
