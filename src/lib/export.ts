import ExcelJS from "exceljs";

/**
 * Neutralizes spreadsheet formula injection (=, +, -, @, tab, CR) on string cells.
 */
export function sanitizeSpreadsheetCell(value: unknown): string | number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  const str = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

export function buildCsvBuffer(
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>
): Buffer {
  const escapeCell = (val: unknown): string => {
    const safe = sanitizeSpreadsheetCell(val);
    const s = String(safe);
    if (/[",\n\r]/.test(s)) {
      return `"${s.replaceAll('"', '""')}"`;
    }
    return s;
  };

  const lines = [
    headers.map(escapeCell).join(","),
    ...rows.map((row) => row.map(escapeCell).join(",")),
  ];
  // UTF-8 BOM for clean Excel CSV opening
  return Buffer.from("\uFEFF" + lines.join("\r\n"), "utf8");
}

export async function buildExcelBuffer(
  sheetName: string,
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();
  const safeSheetName = sheetName.replace(/[\\/?*[\]:]/g, "").slice(0, 31) || "Report";
  const sheet = workbook.addWorksheet(safeSheetName);

  const headerRow = sheet.addRow(headers.map((h) => sanitizeSpreadsheetCell(h)));
  headerRow.font = { bold: true };

  for (const row of rows) {
    sheet.addRow(row.map((cell) => sanitizeSpreadsheetCell(cell)));
  }

  sheet.columns.forEach((col) => {
    let maxLen = 12;
    col.eachCell?.({ includeEmpty: true }, (cell) => {
      const len = String(cell.value ?? "").length;
      if (len > maxLen) maxLen = len;
    });
    col.width = Math.min(48, maxLen + 4);
  });

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
