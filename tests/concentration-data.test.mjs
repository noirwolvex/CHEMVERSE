import test from "node:test";
import assert from "node:assert/strict";
import {
  parseConcentrationTimeCsv,
  CONCENTRATION_TIME_CSV_TEMPLATE
} from "../src/concentration-data.mjs";

const validCsv = [
  "experiment_id,time_s,temperature_c,concentration_a_mol_l,concentration_b_mol_l",
  "R1,0,25,0.40,0.30",
  "R1,1,25,0.39,0.29",
  "R1,2,25,0.38,0.28",
  "R2,0,25,0.30,0.20",
  "R2,1,25,0.29,0.19",
  "R2,2,25,0.28,0.18",
  "R3,0,25,0.20,0.40",
  "R3,1,25,0.19,0.39",
  "R3,2,25,0.18,0.38",
  "R4,0,25,0.15,0.25",
  "R4,1,25,0.14,0.24",
  "R4,2,25,0.13,0.23"
].join("\n");

test("groups concentration-time samples into independent experiments", () => {
  const parsed = parseConcentrationTimeCsv(validCsv);
  assert.equal(parsed.count, 4);
  assert.equal(parsed.totalSamples, 12);
  assert.equal(parsed.temperatureC, 25);
  assert.equal(parsed.minimumPoints, 3);
  assert.equal(parsed.maximumPoints, 3);
  assert.equal(parsed.experiments[0].id, "R1");
  assert.equal(parsed.experiments[0].samples[0].timeS, 0);
  assert.equal(parsed.experiments[0].samples[0].concentrationA, 0.4);
  assert.equal(parsed.method, "concentration-time-initial-slopes");
});

test("sorts interleaved time-series samples by time", () => {
  const rows = validCsv.split("\n");
  const header = rows[0];
  const data = rows.slice(1).reverse();
  const parsed = parseConcentrationTimeCsv([header, ...data].join("\n"));
  const run = parsed.experiments.find((item) => item.id === "R1");
  assert.deepEqual(run.samples.map((sample) => sample.timeS), [0, 1, 2]);
});

test("accepts BOM and alternate measurement headers", () => {
  const alternate = validCsv
    .replace("experiment_id,time_s,temperature_c,concentration_a_mol_l,concentration_b_mol_l",
      "trial,time,temperature,a_m,b_m");
  const parsed = parseConcentrationTimeCsv("\uFEFF" + alternate);
  assert.equal(parsed.count, 4);
});

test("rejects fewer than four independent experiments", () => {
  const rows = validCsv.split("\n").filter((row) => !row.startsWith("R4,"));
  assert.throws(() => parseConcentrationTimeCsv(rows.join("\n")), /أربع تجارب/);
});

test("rejects missing columns and malformed CSV quotes", () => {
  assert.throws(
    () => parseConcentrationTimeCsv("id,time,temp,a_m,b_m\nR1,0,25,0.1,0.2"),
    /أربع تجارب|أربع تجارب/
  );
  assert.throws(
    () => parseConcentrationTimeCsv(validCsv + '\n"R5,3,25,0.1,0.1'),
    /اقتباس غير مغلقة/
  );
});

test("rejects mixed temperatures, non-positive concentrations, and negative time", () => {
  assert.throws(
    () => parseConcentrationTimeCsv(validCsv.replace("R4,0,25", "R4,0,30")),
    /درجة حرارة واحدة/
  );
  assert.throws(
    () => parseConcentrationTimeCsv(validCsv.replace("R1,1,25,0.39", "R1,1,25,0")),
    /غير صالحة/
  );
  assert.throws(
    () => parseConcentrationTimeCsv(validCsv.replace("R1,0,25", "R1,-1,25")),
    /غير صالحة/
  );
});

test("rejects duplicate sample times and too few samples per experiment", () => {
  assert.throws(
    () => parseConcentrationTimeCsv(validCsv.replace("R1,2,25", "R1,1,25")),
    /قراءة مكررة/
  );
  const tooFew = validCsv.split("\n").filter((row) => row !== "R1,2,25,0.38,0.28");
  assert.throws(() => parseConcentrationTimeCsv(tooFew.join("\n")), /ثلاث قراءات/);
});

test("exports a concentration-time CSV template", () => {
  assert.ok(CONCENTRATION_TIME_CSV_TEMPLATE.startsWith("experiment_id,time_s,temperature_c,"));
});
