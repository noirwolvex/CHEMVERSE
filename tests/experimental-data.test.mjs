import test from "node:test";
import assert from "node:assert/strict";
import {
  parseInitialRatesCsv,
  INITIAL_RATES_CSV_TEMPLATE
} from "../src/experimental-data.mjs";

const validCsv = [
  "experiment_id,temperature_c,concentration_a_mol_l,concentration_b_mol_l,initial_rate_mol_l_s",
  "R1,25,0.1,0.1,0.002",
  "R2,25,0.2,0.1,0.005",
  "R3,25,0.1,0.2,0.003",
  "R4,25,0.3,0.2,0.012"
].join("\r\n");

test("parses a valid initial-rate CSV and preserves experimental metadata", () => {
  const parsed = parseInitialRatesCsv(validCsv);
  assert.equal(parsed.count, 4);
  assert.equal(parsed.temperatureC, 25);
  assert.equal(parsed.experiments[0].id, "R1");
  assert.equal(parsed.experiments[0].concentrationA, 0.1);
  assert.equal(parsed.experiments[0].initialRate, 0.002);
  assert.equal(parsed.method, "initial-rates-log-linear");
});

test("accepts UTF-8 BOM, alternate headers, quoted identifiers, and generated IDs", () => {
  const csv = "\uFEFFtrial,temp,A0_M,B0_M,rate_M_s\n\"Run, 1\",20,0.1,0.2,0.01\nR2,20,0.2,0.2,0.02\nR3,20,0.1,0.4,0.01\nR4,20,0.3,0.5,0.04";
  const parsed = parseInitialRatesCsv(csv);
  assert.equal(parsed.experiments[0].id, "Run, 1");
  assert.equal(parsed.experiments[3].id, "R4");
});

test("rejects fewer than four experiments", () => {
  assert.throws(
    () => parseInitialRatesCsv(validCsv.split("\r\n").slice(0, 4).join("\n")),
    /أربع تجارب/
  );
});

test("rejects missing required columns", () => {
  assert.throws(
    () => parseInitialRatesCsv("id,temp_c,a0_m,b0_m\n1,25,0.1,0.1"),
    /initial_rate_mol_l_s/
  );
});

test("rejects mixed temperatures in a single initial-rate fit", () => {
  assert.throws(
    () => parseInitialRatesCsv(validCsv.replace("R4,25,", "R4,30,")),
    /درجة حرارة واحدة/
  );
});

test("rejects non-positive concentrations and rates", () => {
  assert.throws(
    () => parseInitialRatesCsv(validCsv.replace("R2,25,0.2", "R2,25,0")),
    /موجب/
  );
  assert.throws(
    () => parseInitialRatesCsv(validCsv.replace("R2,25,0.2,0.1,0.005", "R2,25,0.2,0.1,0")),
    /موجب/
  );
});

test("rejects duplicate experiment identifiers and malformed CSV quotes", () => {
  assert.throws(
    () => parseInitialRatesCsv(validCsv.replace("R4,25", "R1,25")),
    /مكرر/
  );
  assert.throws(
    () => parseInitialRatesCsv(validCsv + '\nR5,25,"0.1,0.2,0.01'),
    /اقتباس غير مغلقة/
  );
});

test("exports a header-only CSV template", () => {
  assert.ok(INITIAL_RATES_CSV_TEMPLATE.startsWith("experiment_id,temperature_c,"));
  assert.equal(INITIAL_RATES_CSV_TEMPLATE.trim().split(",").length, 5);
});
