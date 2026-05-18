import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

function normalizeHeader(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function parseDelimitedLine(line: string, delimiter = ";") {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i++;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current.trim());
  return result;
}

function parseCsvText(text: string) {
  const cleanText = text.replace(/^\uFEFF/, "");
  const lines = cleanText
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);

  if (lines.length <= 1) return [];

  const delimiter = lines[0].includes(";") ? ";" : ",";
  const headers = parseDelimitedLine(lines[0], delimiter);

  return lines.slice(1).map((line) => {
    let fields = parseDelimitedLine(line, delimiter);

    while (fields.length > headers.length && fields[fields.length - 1] === "") {
      fields.pop();
    }

    if (fields.length > headers.length) {
      fields = fields.slice(0, headers.length);
    }

    while (fields.length < headers.length) {
      fields.push("");
    }

    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header] = fields[index] || "";
    });

    return row;
  });
}

function getValue(row: Record<string, any>, aliases: string[]) {
  const normalizedAliases = aliases.map(normalizeHeader);

  for (const [key, value] of Object.entries(row)) {
    if (normalizedAliases.includes(normalizeHeader(key))) {
      return value;
    }
  }

  return "";
}

function parseAmount(value: any) {
  if (typeof value === "number") return Math.round(value);

  const clean = String(value || "")
    .replace(/\$/g, "")
    .replace(/\./g, "")
    .replace(/,/g, ".")
    .replace(/[^\d.-]/g, "");

  const parsed = Number(clean);

  return Number.isFinite(parsed) ? Math.round(parsed) : 0;
}

function parseDate(value: any) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      return new Date(parsed.y, parsed.m - 1, parsed.d);
    }
  }

  const text = String(value || "").trim();

  const matchDMY = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (matchDMY) {
    const [, d, m, y] = matchDMY;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }

  const matchYMD = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (matchYMD) {
    const [, y, m, d] = matchYMD;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }

  const fallback = new Date(text);
  if (!Number.isNaN(fallback.getTime())) {
    return new Date(
      fallback.getFullYear(),
      fallback.getMonth(),
      fallback.getDate()
    );
  }

  return null;
}

function cleanText(value: any) {
  return String(value || "").trim();
}

async function invoiceExists(input: {
  supplierRut: string;
  documentType: string;
  folio: string;
  totalAmount: number;
}) {
  if (!input.supplierRut || !input.folio) return false;

  const existing = await prisma.purchaseInvoice.findFirst({
    where: {
      supplierRut: input.supplierRut,
      documentType: input.documentType,
      folio: input.folio,
      totalAmount: input.totalAmount,
    },
  });

  return Boolean(existing);
}

async function getRowsFromFile(file: File, buffer: Buffer) {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith(".csv")) {
    const text = buffer.toString("utf8");
    return parseCsvText(text);
  }

  const workbook = XLSX.read(buffer, {
    type: "buffer",
    cellDates: true,
  });

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  return XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
    defval: "",
    raw: false,
  });
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Sube un archivo Excel o CSV." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const rows = await getRowsFromFile(file, buffer);

    const purchaseImport = await prisma.purchaseImport.create({
      data: {
        fileName: file.name,
        totalRows: rows.length,
        importedRows: 0,
        skippedRows: 0,
      },
    });

    let importedRows = 0;
    let skippedRows = 0;
    let detectedTotal = 0;

    for (const row of rows) {
      const issueDate = parseDate(
        getValue(row, [
          "Fecha Docto",
          "Fecha Documento",
          "Fecha Emision",
          "Fecha Recepcion",
          "Fecha",
        ])
      );

      const supplierRut = cleanText(
        getValue(row, [
          "RUT Proveedor",
          "Rut Proveedor",
          "RUT Emisor",
          "RUT",
        ])
      );

      const supplierName = cleanText(
        getValue(row, [
          "Razon Social",
          "Razon Social Proveedor",
          "Proveedor",
          "Nombre Proveedor",
          "Nombre",
        ])
      );

      const documentType = cleanText(
        getValue(row, ["Tipo Doc", "Tipo Documento", "Documento", "Tipo"])
      );

      const folio = cleanText(
        getValue(row, ["Folio", "Nro Documento", "Numero", "Número"])
      );

      const netAmount = parseAmount(getValue(row, ["Monto Neto", "Neto"]));
      const exemptAmount = parseAmount(getValue(row, ["Monto Exento", "Exento"]));
      const ivaAmount = parseAmount(
        getValue(row, ["Monto IVA Recuperable", "IVA", "Monto IVA"])
      );
      const totalAmount = parseAmount(
        getValue(row, ["Monto Total", "Total", "Total Documento"])
      );

      detectedTotal += totalAmount;

      if (!issueDate || (!supplierRut && !supplierName) || totalAmount <= 0) {
        skippedRows++;
        continue;
      }

      const alreadyExists = await invoiceExists({
        supplierRut,
        documentType,
        folio,
        totalAmount,
      });

      if (alreadyExists) {
        skippedRows++;
        continue;
      }

      await prisma.purchaseInvoice.create({
        data: {
          importId: purchaseImport.id,
          issueDate,
          supplierRut,
          supplierName,
          documentType,
          folio,
          netAmount,
          exemptAmount,
          ivaAmount,
          totalAmount,
          category: "unclassified",
        },
      });

      importedRows++;
    }

    await prisma.purchaseImport.update({
      where: { id: purchaseImport.id },
      data: {
        importedRows,
        skippedRows,
      },
    });

    return NextResponse.json({
      ok: true,
      fileName: file.name,
      totalRows: rows.length,
      importedRows,
      skippedRows,
      detectedTotal,
    });
  } catch (error) {
    console.error("IMPORT_PURCHASES_ERROR", error);

    return NextResponse.json(
      { error: "No se pudo importar el archivo de compras." },
      { status: 500 }
    );
  }
}
