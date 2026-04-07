import type { ImportStatus, Prisma } from "@prisma/client";
import { parse as parseDate, set, startOfDay } from "date-fns";
import Papa from "papaparse";
import { EXPECTED_IMPORT_HEADERS, REQUIRED_IMPORT_HEADERS } from "@/lib/constants";
import { parseOptionalInt } from "@/lib/utils";

export type RawImportRow = Record<(typeof EXPECTED_IMPORT_HEADERS)[number], string>;

export type ParsedImportRow = {
  rowNumber: number;
  roNumber: number;
  tag: string | null;
  model: string;
  year: number;
  customerName: string;
  email: string | null;
  phone: string | null;
  asmNumber: number;
  techNumber: number | null;
  mode: string;
  mtRaw: string | null;
  ttRaw: string | null;
  promisedRaw: string;
  promisedAtNormalized: Date | null;
  rawSourceData: Prisma.InputJsonValue;
};

export type ParsedImportFailure = {
  rowNumber: number;
  roNumber: number | null;
  reason: string;
  rawRowJson: Prisma.InputJsonValue;
};

export type ParsedCsvFile = {
  rows: ParsedImportRow[];
  errors: ParsedImportFailure[];
  sourceRowCount: number;
};

const datePattern = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
const weekdayDatePattern = /^W\s+(\d{2})-(\d{2})-(\d{2})$/i;
const timePattern = /^(\d{1,2}):(\d{2})\s*([AP]M)$/i;
const weekdayTimePattern = /^W\s+(\d{1,2}:\d{2}\s*[AP]M)$/i;

function trimRow(
  row: Record<string, string | undefined>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, value?.trim() ?? ""]),
  );
}

export function isBlankImportRow(row: Record<string, string>) {
  return Object.values(row).every((value) => !value.trim());
}

export function validateImportHeader(fields: string[] | undefined) {
  if (!fields) {
    return "CSV header row is missing.";
  }

  if (fields.length !== EXPECTED_IMPORT_HEADERS.length) {
    return `Expected ${EXPECTED_IMPORT_HEADERS.length} headers, received ${fields.length}.`;
  }

  const mismatched = EXPECTED_IMPORT_HEADERS.find(
    (header, index) => fields[index] !== header,
  );

  if (mismatched) {
    return `CSV headers must match the Xtime export exactly. Expected '${EXPECTED_IMPORT_HEADERS.join(", ")}'.`;
  }

  return null;
}

export function normalizePromisedValue(value: string, importDate: Date) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (datePattern.test(trimmed)) {
    return startOfDay(parseDate(trimmed, "M/d/yyyy", importDate));
  }

  const weekdayDateMatch = trimmed.match(weekdayDatePattern);
  if (weekdayDateMatch) {
    const [, month, day, year] = weekdayDateMatch;
    return startOfDay(parseDate(`${month}/${day}/20${year}`, "M/d/yyyy", importDate));
  }

  const normalizedTime =
    trimmed.match(weekdayTimePattern)?.[1] ?? trimmed;
  const timeMatch = normalizedTime.match(timePattern);

  if (timeMatch) {
    const [, hourValue, minuteValue, meridiem] = timeMatch;
    let hours = Number.parseInt(hourValue, 10);
    const minutes = Number.parseInt(minuteValue, 10);

    if (meridiem.toUpperCase() === "PM" && hours !== 12) {
      hours += 12;
    }

    if (meridiem.toUpperCase() === "AM" && hours === 12) {
      hours = 0;
    }

    return set(startOfDay(importDate), {
      hours,
      milliseconds: 0,
      minutes,
      seconds: 0,
    });
  }

  throw new Error(`Unsupported Promised value '${trimmed}'.`);
}

export function parseXtimeCsv(
  csvText: string,
  importDate = new Date(),
): ParsedCsvFile {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: false,
  });

  const headerError = validateImportHeader(parsed.meta.fields);
  if (headerError) {
    throw new Error(headerError);
  }

  const rows: ParsedImportRow[] = [];
  const errors: ParsedImportFailure[] = [];

  parsed.data.forEach((row, index) => {
    const rowNumber = index + 2;
    const trimmed = trimRow(row) as RawImportRow;

    if (isBlankImportRow(trimmed)) {
      return;
    }

    const missingField = REQUIRED_IMPORT_HEADERS.find((header) => !trimmed[header]);
    const roNumber = parseOptionalInt(trimmed.RO);

    if (missingField) {
      errors.push({
        rawRowJson: trimmed,
        reason: `Missing required field '${missingField}'.`,
        roNumber,
        rowNumber,
      });
      return;
    }

    const asmNumber = parseOptionalInt(trimmed.ASM);
    const year = parseOptionalInt(trimmed.Year);

    if (!roNumber || !asmNumber || !year) {
      errors.push({
        rawRowJson: trimmed,
        reason: "RO, ASM, and Year must be valid integers.",
        roNumber,
        rowNumber,
      });
      return;
    }

    try {
      rows.push({
        asmNumber,
        customerName: trimmed.Customer,
        email: trimmed.Email || null,
        model: trimmed.Model,
        mode: trimmed.Mode,
        mtRaw: trimmed.MT || null,
        phone: trimmed.Phone || null,
        promisedAtNormalized: normalizePromisedValue(trimmed.Promised, importDate),
        promisedRaw: trimmed.Promised,
        rawSourceData: trimmed,
        roNumber,
        rowNumber,
        tag: trimmed.Tag || null,
        techNumber: parseOptionalInt(trimmed.Tech),
        ttRaw: trimmed.TT || null,
        year,
      });
    } catch (error) {
      errors.push({
        rawRowJson: trimmed,
        reason:
          error instanceof Error ? error.message : "Unable to normalize Promised value.",
        roNumber,
        rowNumber,
      });
    }
  });

  return {
    errors,
    rows,
    sourceRowCount: parsed.data.length,
  };
}

export function buildImportSummary(status: ImportStatus, imported: number, skipped: number) {
  return {
    imported,
    skipped,
    status,
  };
}
