import { spawn } from "child_process";
import mongoose from "mongoose";
import { GridFSBucket } from "mongodb";

const SSH_HOST = process.env.SQL_JUMP_HOST || "ATSMain";
const REMOTE_SQL_SSH =
  process.env.SQL_REMOTE_SSH ||
  "ssh -p 22222 -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null serverhts@127.0.0.1";
const SQLCMD_REMOTE =
  process.env.SQLCMD_REMOTE ||
  "/opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P service_only2012 -d dbPHOENIX -y 0 -Y 0 -w 65535 -i /dev/stdin";

const MONGO_URI =
  process.env.MIGRATE_MONGO_URI ||
  "mongodb://zZJjRqaMJUvG4TtqaH6m6P5fL9r:jqNk8Yd6XQ3Qu9DTcsuuyhrZT5K@127.0.0.1:30001/?authSource=admin&directConnection=true";
const TARGET_DB = process.env.TARGET_DB || "htsmed";

const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || "200", 10);
const MAX_DOC_BYTES = 15 * 1024 * 1024;
const SKIP_EXISTING = process.env.SKIP_EXISTING === "1";
const ONLY_TABLES = (process.env.ONLY_TABLES || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const runSshSql = (query) =>
  new Promise((resolve, reject) => {
    const remoteCommand = `${REMOTE_SQL_SSH} '${SQLCMD_REMOTE}'`;
    const child = spawn("ssh", [SSH_HOST, remoteCommand], { stdio: ["pipe", "pipe", "pipe"] });
    const stdoutChunks = [];
    const stderrChunks = [];

    child.stdout.on("data", (d) => {
      stdoutChunks.push(d);
    });
    child.stderr.on("data", (d) => {
      stderrChunks.push(d);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      const stdout = Buffer.concat(stdoutChunks).toString("utf8");
      const stderr = Buffer.concat(stderrChunks).toString("utf8");
      if (code !== 0) {
        return reject(
          new Error(
            `sqlcmd via ssh failed (code=${code})\nSTDERR:\n${stderr}\nSTDOUT:\n${stdout}`
          )
        );
      }
      // Remove known-host noise lines that may leak to output in some shells.
      const cleaned = stdout
        .split(/\r?\n/)
        .filter((line) => !line.startsWith("Warning: Permanently added"))
        .join("\n")
        .trim();
      resolve(cleaned);
    });

    child.stdin.write(query);
    child.stdin.end();
  });

const sqlJson = async (query) => {
  const out = await runSshSql(query);
  if (!out) return [];
  const normalized = out.replace(/[\r\n]+/g, "").trim();
  if (!normalized) return [];
  return JSON.parse(normalized);
};

const getTables = async () =>
  sqlJson(`
SET NOCOUNT ON;
SELECT t.table_schema, t.table_name
FROM information_schema.tables t
WHERE t.table_type = 'BASE TABLE'
ORDER BY t.table_schema, t.table_name
FOR JSON PATH;
`);

const getPrimaryKeys = async () => {
  const rows = await sqlJson(`
SET NOCOUNT ON;
SELECT tc.table_schema, tc.table_name, kcu.column_name, kcu.ordinal_position
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
  AND tc.table_name = kcu.table_name
WHERE tc.constraint_type = 'PRIMARY KEY'
ORDER BY tc.table_schema, tc.table_name, kcu.ordinal_position
FOR JSON PATH;
`);
  const map = new Map();
  for (const row of rows) {
    const key = `${row.table_schema}.${row.table_name}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row.column_name);
  }
  return map;
};

const getRowCount = async (schema, table) => {
  const rows = await sqlJson(`
SET NOCOUNT ON;
SELECT COUNT(1) AS cnt
FROM [${schema}].[${table}]
FOR JSON PATH;
`);
  return rows.length ? Number(rows[0].cnt) : 0;
};

const fetchBatch = async (schema, table, orderBy, offset, size) =>
  sqlJson(`
SET NOCOUNT ON;
SELECT *
FROM [${schema}].[${table}]
ORDER BY ${orderBy}
OFFSET ${offset} ROWS FETCH NEXT ${size} ROWS ONLY
FOR JSON PATH, INCLUDE_NULL_VALUES;
`);

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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const insertWithRetry = async (collection, docs, attempts = 3) => {
  let lastError;
  for (let i = 1; i <= attempts; i += 1) {
    try {
      await collection.insertMany(docs, { ordered: false });
      return;
    } catch (err) {
      lastError = err;
      if (i < attempts) {
        console.warn(`  insertMany failed (attempt ${i}/${attempts}), retrying...`);
        await sleep(1500 * i);
      }
    }
  }
  throw lastError;
};

const main = async () => {
  console.log(`Connecting to MongoDB: ${MONGO_URI}`);
  await mongoose.connect(MONGO_URI, { dbName: TARGET_DB });
  const db = mongoose.connection.db;
  const bucket = new GridFSBucket(db, { bucketName: "phoenix_fs" });

  const tables = await getTables();
  const pkMap = await getPrimaryKeys();

  for (const t of tables) {
    const schema = t.table_schema;
    const table = t.table_name;
    const fullName = `${schema}.${table}`;
    if (ONLY_TABLES.length > 0 && !ONLY_TABLES.includes(fullName)) continue;

    const pkCols = pkMap.get(fullName) || [];
    const orderBy =
      pkCols.length > 0 ? pkCols.map((c) => `[${c}]`).join(", ") : "(SELECT NULL)";

    const total = await getRowCount(schema, table);
    const collectionName = table;
    const collection = db.collection(collectionName);

    console.log(`Migrating ${fullName} -> ${TARGET_DB}.${collectionName} (${total} rows)`);
    if (SKIP_EXISTING) {
      const existing = await collection.countDocuments();
      if (existing === total) {
        console.log(`  Skipping ${fullName} (already ${existing} docs)`);
        continue;
      }
    }
    await collection.deleteMany({});
    if (total === 0) continue;

    let offset = 0;
    while (offset < total) {
      const batch = await fetchBatch(schema, table, orderBy, offset, BATCH_SIZE);
      if (batch.length === 0) break;
      const prepared = [];
      for (const doc of batch) {
        prepared.push(await transformDoc(bucket, collectionName, doc));
      }
      await insertWithRetry(collection, prepared, 3);
      offset += batch.length;
      console.log(`  ${fullName}: ${offset}/${total}`);
    }
  }

  await mongoose.disconnect();
  console.log("Migration completed.");
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
