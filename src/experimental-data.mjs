const MAX_ROWS = 256;

function parseCsvRows(source) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"') {
        if (source[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"' && field.trim() === "") {
      field = "";
      quoted = true;
    } else if (character === ",") {
      row.push(field.trim());
      field = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && source[index + 1] === "\n") index += 1;
      row.push(field.trim());
      field = "";
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
    } else {
      field += character;
    }
  }

  if (quoted) throw new Error("CSV يحتوي على علامة اقتباس غير مغلقة.");
  row.push(field.trim());
  if (row.some((value) => value !== "")) rows.push(row);
  return rows;
}

function normalizeHeader(value) {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

const HEADER_ALIASES = {
  experiment_id: ["experiment_id", "experiment", "trial", "run", "id"],
  temperature_c: ["temperature_c", "temp_c", "temperature", "temp"],
  concentration_a_mol_l: ["concentration_a_mol_l", "a0_m", "initial_a_m", "a_initial_m"],
  concentration_b_mol_l: ["concentration_b_mol_l", "b0_m", "initial_b_m", "b_initial_m"],
  initial_rate_mol_l_s: ["initial_rate_mol_l_s", "initial_rate_m_s", "rate_mol_l_s", "rate_m_s"]
};

function parseFinitePositive(value, label, rowNumber) {
  if (value === "") throw new Error(`القيمة ${label} مفقودة في الصف ${rowNumber}.`);
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`القيمة ${label} يجب أن تكون رقماً موجباً في الصف ${rowNumber}.`);
  }
  return parsed;
}

export function parseInitialRatesCsv(source) {
  if (typeof source !== "string" || source.trim() === "") {
    throw new Error("ملف CSV فارغ.");
  }

  const rows = parseCsvRows(source.replace(/^\uFEFF/, ""));
  if (rows.length < 2) throw new Error("يجب أن يحتوي الملف على عناوين وأربع تجارب على الأقل.");

  const headers = rows[0].map(normalizeHeader);
  const columnIndexes = {};
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    const index = headers.findIndex((header) => aliases.includes(header));
    if (field !== "experiment_id" && index === -1) {
      throw new Error(`العمود المطلوب غير موجود: ${field}`);
    }
    columnIndexes[field] = index;
  }

  if (new Set(headers).size !== headers.length) {
    throw new Error("توجد عناوين أعمدة مكررة في ملف CSV.");
  }

  const dataRows = rows.slice(1);
  if (dataRows.length < 4) throw new Error("يلزم إدخال أربع تجارب مستقلة على الأقل.");
  if (dataRows.length > MAX_ROWS) throw new Error(`الحد الأقصى هو ${MAX_ROWS} تجربة في الملف الواحد.`);

  const experiments = [];
  const ids = new Set();
  let commonTemperature = null;

  dataRows.forEach((values, index) => {
    const rowNumber = index + 2;
    if (values.length !== headers.length) {
      throw new Error(`عدد الأعمدة غير متطابق في الصف ${rowNumber}.`);
    }
    const rawId = columnIndexes.experiment_id === -1
      ? ""
      : values[columnIndexes.experiment_id];
    const id = rawId || `EXP-${String(index + 1).padStart(3, "0")}`;
    if (ids.has(id)) throw new Error(`معرّف التجربة مكرر: ${id}`);
    ids.add(id);

    const temperatureText = values[columnIndexes.temperature_c];
    if (temperatureText === "") throw new Error(`درجة الحرارة مفقودة في الصف ${rowNumber}.`);
    const temperatureC = Number(temperatureText);
    if (!Number.isFinite(temperatureC) || temperatureC <= -273.15) {
      throw new Error(`درجة الحرارة غير صالحة في الصف ${rowNumber}.`);
    }
    if (commonTemperature === null) commonTemperature = temperatureC;
    else if (Math.abs(temperatureC - commonTemperature) > 1.0e-6) {
      throw new Error("يجب أن تكون جميع التجارب في ملف الملاءمة عند درجة حرارة واحدة. حلّل كل درجة حرارة على حدة.");
    }

    experiments.push({
      id,
      temperatureC,
      concentrationA: parseFinitePositive(
        values[columnIndexes.concentration_a_mol_l], "concentration_a_mol_l", rowNumber
      ),
      concentrationB: parseFinitePositive(
        values[columnIndexes.concentration_b_mol_l], "concentration_b_mol_l", rowNumber
      ),
      initialRate: parseFinitePositive(
        values[columnIndexes.initial_rate_mol_l_s], "initial_rate_mol_l_s", rowNumber
      )
    });
  });

  return {
    experiments,
    temperatureC: commonTemperature,
    count: experiments.length,
    method: "initial-rates-log-linear"
  };
}

export const INITIAL_RATES_CSV_TEMPLATE =
  "experiment_id,temperature_c,concentration_a_mol_l,concentration_b_mol_l,initial_rate_mol_l_s\n";
