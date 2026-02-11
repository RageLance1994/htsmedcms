import { execFile } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import mongoose from "mongoose";
import { GridFSBucket } from "mongodb";
import util from "util";

const execFileAsync = util.promisify(execFile);

const SQLCMD = "C:\\Program Files\\SqlCmd\\sqlcmd.exe";
const SQL_SERVER = ".";
const SQL_DB = "PHOENIX";

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/htstest";

const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || "200", 10);
const MAX_DOC_BYTES = 15 * 1024 * 1024;
const SKIP_EXISTING = process.env.SKIP_EXISTING === "1";
const ONLY_TABLES = (process.env.ONLY_TABLES || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

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

const getPrimaryKeys = async () => {
  const q = `
SET NOCOUNT ON;
SELECT tc.table_schema, tc.table_name, kcu.column_name, kcu.ordinal_position
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
  AND tc.table_name = kcu.table_name
WHERE tc.constraint_type = 'PRIMARY KEY'
ORDER BY tc.table_schema, tc.table_name, kcu.ordinal_position
FOR JSON PATH;`;
  const json = await sqlcmd(q);
  const rows = json ? JSON.parse(json) : [];
  const map = new Map();
  for (const row of rows) {
    const key = `${row.table_schema}.${row.table_name}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row.column_name);
  }
  return map;
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

const fetchBatch = async (schema, table, orderBy, offset, size) => {
  const q = `
SET NOCOUNT ON;
SELECT *
FROM [${schema}].[${table}]
ORDER BY ${orderBy}
OFFSET ${offset} ROWS FETCH NEXT ${size} ROWS ONLY
FOR JSON PATH, INCLUDE_NULL_VALUES;`;
  const json = await sqlcmd(q);
  return json ? JSON.parse(json) : [];
};

const uploadToGridFS = (bucket, buffer, filename, metadata) =>
  new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(filename, { metadata });
    uploadStream.on("error", reject);
    uploadStream.on("finish", () => resolve(uploadStream.id));
    uploadStream.end(buffer);
  });

const transformDoc = async (bucket, collectionName, doc) => {
  let mutated = false;
  const out = { ...doc };
  for (const [key, value] of Object.entries(out)) {
    if (typeof value === "string") {
      const byteLen = Buffer.byteLength(value, "utf8");
      if (byteLen > MAX_DOC_BYTES) {
        const filename = `${collectionName}.${key}.${Date.now()}`;
        const id = await uploadToGridFS(bucket, Buffer.from(value, "utf8"), filename, {
          collection: collectionName,
          field: key,
          byteLength: byteLen
        });
        out[key] = { _gridfs: id, byteLength: byteLen, filename };
        mutated = true;
      }
    }
  }
  return mutated ? out : doc;
};

const main = async () => {
  console.log(`Connecting to MongoDB: ${MONGO_URI}`);
  await mongoose.connect(MONGO_URI, { dbName: "htstest" });
  const db = mongoose.connection.db;
  const bucket = new GridFSBucket(db, { bucketName: "phoenix_fs" });

  const tables = await getTables();
  const pkMap = await getPrimaryKeys();

  for (const t of tables) {
    const schema = t.table_schema;
    const table = t.table_name;
    const fullName = `${schema}.${table}`;
    if (ONLY_TABLES.length > 0 && !ONLY_TABLES.includes(fullName)) {
      continue;
    }
    const key = `${schema}.${table}`;
    const pkCols = pkMap.get(key) || [];
    const orderBy =
      pkCols.length > 0 ? pkCols.map((c) => `[${c}]`).join(", ") : "(SELECT NULL)";

    const total = await getRowCount(schema, table);
    const collectionName = table; // keep exact table name
    const collection = db.collection(collectionName);

    console.log(`Migrating ${schema}.${table} -> ${collectionName} (${total} rows)`);
    if (total === 0) {
      if (!SKIP_EXISTING) {
        await collection.deleteMany({});
      }
      continue;
    }

    if (SKIP_EXISTING) {
      const existing = await collection.countDocuments();
      if (existing === total) {
        console.log(`  Skipping ${schema}.${table} (already ${existing} docs)`);
        continue;
      }
      await collection.deleteMany({});
    } else {
      await collection.deleteMany({});
    }

    let offset = 0;
    while (offset < total) {
      const batch = await fetchBatch(schema, table, orderBy, offset, BATCH_SIZE);
      if (batch.length === 0) break;
      const prepared = [];
      for (const doc of batch) {
        prepared.push(await transformDoc(bucket, collectionName, doc));
      }
      await collection.insertMany(prepared, { ordered: false });
      offset += batch.length;
      console.log(`  ${schema}.${table}: ${offset}/${total}`);
    }
  }

  await mongoose.disconnect();
  console.log("Migration completed.");
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
