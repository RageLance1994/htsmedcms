import fs from "fs";
import path from "path";

const rootDir = path.resolve(process.cwd(), "backend");
const tmpDir = path.join(rootDir, ".tmp");
const schemaFile = path.join(tmpDir, "phoenix-schema.json");
const pkFile = path.join(tmpDir, "phoenix-pk.json");
const outputDir = path.join(rootDir, "src", "models", "phoenix");

const rawSchema = fs
  .readFileSync(schemaFile, "utf8")
  .replace(/[\r\n]+/g, "")
  .trim();
const rawPk = fs.readFileSync(pkFile, "utf8").replace(/[\r\n]+/g, "").trim();

const columns = rawSchema ? JSON.parse(rawSchema) : [];
const pkRows = rawPk ? JSON.parse(rawPk) : [];

const pkMap = new Map();
for (const row of pkRows) {
  const key = `${row.table_schema}.${row.table_name}`;
  if (!pkMap.has(key)) pkMap.set(key, []);
  pkMap.get(key).push(row.column_name);
}

const tableMap = new Map();
for (const col of columns) {
  const key = `${col.table_schema}.${col.table_name}`;
  if (!tableMap.has(key)) tableMap.set(key, []);
  tableMap.get(key).push(col);
}

const isValidIdentifier = (name) => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name);

const toPascalCase = (name) => {
  const tokens = name
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const base = tokens.map((t) => t[0].toUpperCase() + t.slice(1).toLowerCase()).join("");
  if (!base) return "Model";
  return /^\d/.test(base) ? `T${base}` : base;
};

const mapType = (type) => {
  const t = type.toLowerCase();
  if (["int", "smallint", "tinyint", "bigint"].includes(t)) return "Number";
  if (["decimal", "numeric"].includes(t)) return "mongoose.Schema.Types.Decimal128";
  if (["money", "smallmoney", "float", "real"].includes(t)) return "Number";
  if (["bit"].includes(t)) return "Boolean";
  if (["date", "datetime", "datetime2", "smalldatetime", "time", "datetimeoffset"].includes(t))
    return "Date";
  if (
    [
      "char",
      "nchar",
      "varchar",
      "nvarchar",
      "text",
      "ntext",
      "xml",
      "uniqueidentifier"
    ].includes(t)
  )
    return "String";
  if (["binary", "varbinary", "image", "timestamp", "rowversion"].includes(t)) return "Buffer";
  return "mongoose.Schema.Types.Mixed";
};

const ensureDir = (dir) => fs.mkdirSync(dir, { recursive: true });

ensureDir(outputDir);
for (const entry of fs.readdirSync(outputDir)) {
  if (entry.endsWith(".js")) {
    fs.unlinkSync(path.join(outputDir, entry));
  }
}

const exports = [];

for (const [key, cols] of tableMap.entries()) {
  const [schemaName, tableName] = key.split(".");
  const modelName = toPascalCase(tableName);
  const fileName = path.join(outputDir, `${modelName}.js`);
  const pkCols = pkMap.get(key) || [];

  const fieldLines = cols.map((col) => {
    const fieldName = col.column_name;
    const keyText = isValidIdentifier(fieldName) ? fieldName : JSON.stringify(fieldName);
    const typeText = mapType(col.data_type);
    const requiredText = col.is_nullable === "NO" ? "true" : "false";
    const extras = [];
    if (typeText === "String" && col.character_maximum_length && col.character_maximum_length > 0) {
      extras.push(`maxlength: ${col.character_maximum_length}`);
    }
    return `  ${keyText}: { type: ${typeText}, required: ${requiredText}${
      extras.length ? `, ${extras.join(", ")}` : ""
    } }`;
  });

  const indexLines = [];
  if (pkCols.length > 0) {
    const indexFields = pkCols
      .map((col) => {
        const keyText = isValidIdentifier(col) ? col : JSON.stringify(col);
        return `${keyText}: 1`;
      })
      .join(", ");
    indexLines.push(`schema.index({ ${indexFields} }, { unique: true });`);
  }

  const content = `import mongoose from \"mongoose\";\n\nconst schema = new mongoose.Schema(\n{\n${fieldLines.join(
    ",\n"
  )}\n},\n{ collection: ${JSON.stringify(tableName)}, timestamps: false }\n);\n\n${
    indexLines.length ? `${indexLines.join("\n")}\n\n` : ""
  }export default mongoose.model(${JSON.stringify(modelName)}, schema);\n`;

  fs.writeFileSync(fileName, content, "utf8");
  exports.push({ modelName, fileName: path.relative(rootDir, fileName).replace(/\\/g, "/") });
}

const indexFile = path.join(outputDir, "index.js");
const indexLines = exports
  .sort((a, b) => a.modelName.localeCompare(b.modelName))
  .map(
    (entry) =>
      `export { default as ${entry.modelName} } from \"./${path.basename(entry.fileName)}\";`
  );
fs.writeFileSync(indexFile, `${indexLines.join("\n")}\n`, "utf8");

console.log(`Generated ${exports.length} models in ${outputDir}`);
