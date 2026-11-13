const MAX_FILE_ROWS = 4096;
const MAX_EXPERIMENTS = 64;
const MAX_POINTS_PER_EXPERIMENT = 64;
const MIN_POINTS_PER_EXPERIMENT = 3;

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
  time_s: ["time_s", "time_seconds", "time"],
  temperature_c: ["temperature_c", "temp_c", "temperature", "temp"],
  concentration_a_mol_l: ["concentration_a_mol_l", "a_m", "a_mol_l", "concentration_a", "a"],
  concentration_b_mol_l: ["concentration_b_mol_l", "b_m", "b_mol_l", "concentration_b", "b"]
};

function parseFiniteNumber(value, label, rowNumber, options = {}) {
  if (value === "") throw new Error(`القيمة ${label} مفقودة في الصف ${rowNumber}.`);
  const parsed = Number(value);
  if (!Number.isFinite(parsed) ||
      (options.minimum !== undefined && parsed < options.minimum) ||
      (options.strictlyPositive && parsed <= 0)) {
    throw new Error(`القيمة ${label} غير صالحة في الصف ${rowNumber}.`);
  }
  return parsed;
}

export function parseConcentrationTimeCsv(source) {
  if (typeof source !== "string" || source.trim() === "") {
    throw new Error("ملف التركيز مقابل الزمن فارغ.");
  }

  const rows = parseCsvRows(source.replace(/^\uFEFF/, ""));
  if (rows.length < 2) throw new Error("يجب أن يحتوي الملف على عناوين وبيانات تجريبية.");
  if (rows.length - 1 > MAX_FILE_ROWS) {
    throw new Error(`الحد الأقصى هو ${MAX_FILE_ROWS} قراءة زمنية في الملف الواحد.`);
  }

  const headers = rows[0].map(normalizeHeader);
  if (new Set(headers).size !== headers.length) {
    throw new Error("توجد عناوين أعمدة مكررة في ملف CSV.");
  }

  const columns = {};
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    const index = headers.findIndex((header) => aliases.includes(header));
    if (index === -1) throw new Error(`العمود المطلوب غير موجود: ${field}`);
    columns[field] = index;
  }

  const groups = new Map();
  let commonTemperature = null;

  rows.slice(1).forEach((values, index) => {
    const rowNumber = index + 2;
    if (values.length !== headers.length) {
      throw new Error(`عدد الأعمدة غير متطابق في الصف ${rowNumber}.`);
    }

    const id = values[columns.experiment_id];
    if (!id) throw new Error(`معرّف التجربة مفقود في الصف ${rowNumber}.`);

    const temperatureC = parseFiniteNumber(
      values[columns.temperature_c], "temperature_c", rowNumber, { minimum: -273.15 }
    );
    if (temperatureC <= -273.15) {
      throw new Error(`درجة الحرارة يجب أن تكون أعلى من الصفر المطلق في الصف ${rowNumber}.`);
    }
    if (commonTemperature === null) commonTemperature = temperatureC;
    else if (Math.abs(temperatureC - commonTemperature) > 1.0e-6) {
      throw new Error("يجب أن تكون جميع التجارب في ملف واحد عند درجة حرارة واحدة؛ حلّل درجات الحرارة كلّاً على حدة.");
    }

    const sample = {
      timeS: parseFiniteNumber(values[columns.time_s], "time_s", rowNumber, { minimum: 0 }),
      concentrationA: parseFiniteNumber(
        values[columns.concentration_a_mol_l], "concentration_a_mol_l", rowNumber, { strictlyPositive: true }
      ),
      concentrationB: parseFiniteNumber(
        values[columns.concentration_b_mol_l], "concentration_b_mol_l", rowNumber, { strictlyPositive: true }
      )
    };

    if (!groups.has(id)) {
      if (groups.size >= MAX_EXPERIMENTS) {
        throw new Error(`الحد الأقصى هو ${MAX_EXPERIMENTS} تجربة في الملف الواحد.`);
      }
      groups.set(id, { id, temperatureC, samples: [] });
    }
    const group = groups.get(id);
    if (group.samples.length >= MAX_POINTS_PER_EXPERIMENT) {
      throw new Error(`التجربة ${id} تتجاوز ${MAX_POINTS_PER_EXPERIMENT} قراءة زمنية.`);
    }
    group.samples.push(sample);
  });

  const experiments = Array.from(groups.values());
  if (experiments.length < 4) {
    throw new Error("يلزم أربع تجارب مستقلة على الأقل لاستخراج رتبتي التفاعل.");
  }

  let totalSamples = 0;
  experiments.forEach((experiment) => {
    experiment.samples.sort((left, right) => left.timeS - right.timeS);
    if (experiment.samples.length < MIN_POINTS_PER_EXPERIMENT) {
      throw new Error(`التجربة ${experiment.id} تحتاج ثلاث قراءات زمنية على الأقل.`);
    }
    for (let index = 1; index < experiment.samples.length; index += 1) {
      if (!(experiment.samples[index].timeS > experiment.samples[index - 1].timeS)) {
        throw new Error(`أزمنة التجربة ${experiment.id} تحتوي على قراءة مكررة.`);
      }
    }
    totalSamples += experiment.samples.length;
  });

  return {
    experiments,
    temperatureC: commonTemperature,
    count: experiments.length,
    totalSamples,
    minimumPoints: Math.min(...experiments.map((experiment) => experiment.samples.length)),
    maximumPoints: Math.max(...experiments.map((experiment) => experiment.samples.length)),
    method: "concentration-time-initial-slopes"
  };
}

export const CONCENTRATION_TIME_CSV_TEMPLATE =
  "experiment_id,time_s,temperature_c,concentration_a_mol_l,concentration_b_mol_l\n";
