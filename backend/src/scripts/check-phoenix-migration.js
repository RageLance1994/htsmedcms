import { execFile } from "child_process";
import mongoose from "mongoose";
import util from "util";
import fs from "fs";
import os from "os";
import path from "path";

const execFileAsync = util.promisify(execFile);

const SQLCMD = "C:\\Program Files\\SqlCmd\\sqlcmd.exe";
const SQL_SERVER = ".";
const SQL_DB = "PHOENIX";
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/htstest";

const sqlcmd = async (query) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "phoenix-sqlcmd-"));
  const outFile = path.join(tmpDir, "out.txt");
  try {
    await execFileAsync(
      SQLCMD,
      [
        "-S",
        SQL_SERVER,
        "-E",
        "-d",
        SQL_DB,
        "-h",
        "-1",
        "-W",
        "-y",
        "0",
        "-Y",
        "0",
        "-w",
        "65535",
        "-Q",
        query,
        "-o",
        outFile
      ],
      { maxBuffer: 10 * 1024 * 1024 }
    );
    const stdout = fs.readFileSync(outFile, "utf8");
    return stdout.replace(/[\r\n]+/g, "").trim();
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
};

const getTables = async () => {
  const q = `
SET NOCOUNT ON;
SELECT t.table_schema, t.table_name
FROM information_schema.tables t
WHERE t.table_type = 'BASE TABLE'
ORDER BY t.table_schema, t.table_name
FOR JSON PATH;`;
  const json = await sqlcmd(q);
  return json ? JSON.parse(json) : [];
};

const getRowCount = async (schema, table) => {
  const q = `
SET NOCOUNT ON;
SELECT COUNT(1) AS cnt
FROM [${schema}].[${table}]
FOR JSON PATH;`;
  const json = await sqlcmd(q);
  const rows = json ? JSON.parse(json) : [];
  return rows.length ? Number(rows[0].cnt) : 0;
};

const main = async () => {
  await mongoose.connect(MONGO_URI, { dbName: "htstest" });
  const db = mongoose.connection.db;
  const tables = await getTables();

  const mismatches = [];
  for (const t of tables) {
    const schema = t.table_schema;
    const table = t.table_name;
    const sqlCount = await getRowCount(schema, table);
    const mongoCount = await db.collection(table).countDocuments();
    if (sqlCount !== mongoCount) {
      mismatches.push({ table: `${schema}.${table}`, sqlCount, mongoCount });
    }
  }

  if (mismatches.length === 0) {
    console.log("All tables match.");
  } else {
    for (const row of mismatches) {
      console.log(`${row.table}: SQL=${row.sqlCount} Mongo=${row.mongoCount}`);
    }
  }

  await mongoose.disconnect();
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
