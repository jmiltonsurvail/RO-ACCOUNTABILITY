import { describe, expect, it } from "vitest";
import {
  buildImportSummary,
  isBlankImportRow,
  normalizePromisedValue,
  parseXtimeCsv,
  validateImportHeader,
} from "./import";

const validCsv = `RO,Tag,Promised,Model,Year,Customer,Flags,Phone,ASM,Tech,Mode,MT,TT,MT Display,TT Display
6155318,5085,12/20/2025,SIERRA 3500 HD,2025,Carr,,321-698-0921,785,374,Approval,14d,23d,,23d
6157699,5210,W 6:00 pm,SILVERADO 1500,2022,Swindell,,321-458-8308,785,,Approval,4:43,7:16,,7:16
6157111,4961,W 01-02-26,TRAVERSE,2025,Healey,OH,603-320-2742,642,435,Repair,6d,10d,,10d
6157666,5204,6:00 PM,CITY EXPRESS,2015,Clement,,321-225-2309,785,435,Approval,5:18,10:50,,10:50
    ,,,,,,,,,,,,,,
`;

describe("validateImportHeader", () => {
  it("requires the exact Xtime header", () => {
    expect(
      validateImportHeader([
        "RO",
        "Tag",
        "Promised",
        "Model",
        "Year",
        "Customer",
        "Flags",
        "Phone",
        "ASM",
        "Tech",
        "Mode",
        "MT",
        "TT",
        "MT Display",
        "TT Display",
      ]),
    ).toBeNull();

    expect(validateImportHeader(["RO"])).toContain("Expected");
  });
});

describe("normalizePromisedValue", () => {
  const importDate = new Date("2026-03-12T09:00:00.000Z");

  it("parses m/d/yyyy values", () => {
    const result = normalizePromisedValue("12/20/2025", importDate);
    expect(result?.toISOString()).toContain("2025-12-20");
  });

  it("parses W mm-dd-yy values", () => {
    const result = normalizePromisedValue("W 12-24-25", importDate);
    expect(result?.toISOString()).toContain("2025-12-24");
  });

  it("anchors time-only values to the import date", () => {
    const result = normalizePromisedValue("6:00 PM", importDate);
    expect(result?.getHours()).toBe(18);
    expect(result?.getDate()).toBe(12);
  });

  it("anchors W time values to the import date", () => {
    const result = normalizePromisedValue("W 6:00 pm", importDate);
    expect(result?.getHours()).toBe(18);
    expect(result?.getDate()).toBe(12);
  });
});

describe("parseXtimeCsv", () => {
  it("skips blank trailer rows and parses valid data rows", () => {
    const result = parseXtimeCsv(validCsv, new Date("2026-03-12T09:00:00.000Z"));

    expect(result.rows).toHaveLength(4);
    expect(result.errors).toHaveLength(0);
    expect(result.sourceRowCount).toBe(6);
  });

  it("flags rows missing required fields", () => {
    const csv = `RO,Tag,Promised,Model,Year,Customer,Flags,Phone,ASM,Tech,Mode,MT,TT,MT Display,TT Display
6155318,5085,12/20/2025,SIERRA 3500 HD,2025,Carr,,321-698-0921,,374,Approval,14d,23d,,23d
`;

    const result = parseXtimeCsv(csv, new Date("2026-03-12T09:00:00.000Z"));

    expect(result.rows).toHaveLength(0);
    expect(result.errors[0]?.reason).toContain("Missing required field");
  });
});

describe("isBlankImportRow", () => {
  it("detects fully blank rows", () => {
    expect(isBlankImportRow({ RO: " ", ASM: "", Customer: "" })).toBe(true);
    expect(isBlankImportRow({ RO: "6155318", ASM: "", Customer: "" })).toBe(false);
  });
});

describe("buildImportSummary", () => {
  it("returns a compact summary object", () => {
    expect(buildImportSummary("SUCCESS", 10, 2)).toEqual({
      imported: 10,
      skipped: 2,
      status: "SUCCESS",
    });
  });
});
