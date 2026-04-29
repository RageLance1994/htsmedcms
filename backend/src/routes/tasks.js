import { Router } from "express";
import mongoose from "mongoose";

const router = Router();
const TASKS_DB_NAME =
  String(process.env.TASKS_DB_NAME || "").trim() ||
  mongoose.connection?.db?.databaseName ||
  "htsmed";
const TASKS_COLLECTION = String(process.env.TASKS_COLLECTION_NAME || "tasks").trim() || "tasks";
const getDb = () => mongoose.connection.useDb(TASKS_DB_NAME, { useCache: true });

const STATUS_VALUES = new Set(["todo", "in_progress", "done"]);
const PRIORITY_VALUES = new Set(["low", "medium", "high"]);

const asText = (value, fallback = "") => {
  if (value === null || value === undefined) return fallback;
  return String(value).trim();
};

const asStatus = (value) => {
  const normalized = asText(value || "todo").toLowerCase();
  return STATUS_VALUES.has(normalized) ? normalized : "todo";
};

const asPriority = (value) => {
  const normalized = asText(value || "medium").toLowerCase();
  return PRIORITY_VALUES.has(normalized) ? normalized : "medium";
};

const asInteger = (value, fallback = 0) => {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toPublicTask = (doc = {}) => ({
  id: String(doc._id),
  title: asText(doc.title),
  description: asText(doc.description),
  status: asStatus(doc.status),
  assignee: asText(doc.assignee),
  priority: asPriority(doc.priority),
  dueDate: asText(doc.dueDate),
  order: asInteger(doc.order, 0),
  createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : null,
  updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : null
});

const parseTaskInput = (body = {}, { partial = false } = {}) => {
  const payload = {};

  if (!partial || Object.hasOwn(body, "title")) {
    const title = asText(body.title);
    if (!partial && !title) return { error: "Titolo obbligatorio." };
    if (title) payload.title = title;
  }
  if (!partial || Object.hasOwn(body, "description")) payload.description = asText(body.description);
  if (!partial || Object.hasOwn(body, "status")) payload.status = asStatus(body.status);
  if (!partial || Object.hasOwn(body, "assignee")) payload.assignee = asText(body.assignee);
  if (!partial || Object.hasOwn(body, "priority")) payload.priority = asPriority(body.priority);
  if (!partial || Object.hasOwn(body, "dueDate")) payload.dueDate = asText(body.dueDate);
  if (!partial || Object.hasOwn(body, "order")) payload.order = asInteger(body.order, 0);

  return { payload };
};

router.get("/", async (req, res, next) => {
  try {
    const db = getDb();
    const rows = await db
      .collection(TASKS_COLLECTION)
      .find({})
      .sort({ order: 1, createdAt: 1 })
      .toArray();
    return res.json({ tasks: rows.map(toPublicTask) });
  } catch (error) {
    return next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(404).json({ message: "Task not found" });
    const db = getDb();
    const row = await db.collection(TASKS_COLLECTION).findOne({ _id: new mongoose.Types.ObjectId(id) });
    if (!row) return res.status(404).json({ message: "Task not found" });
    return res.json({ task: toPublicTask(row) });
  } catch (error) {
    return next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { error, payload } = parseTaskInput(req.body, { partial: false });
    if (error) return res.status(400).json({ message: error });
    const db = getDb();
    const now = new Date();
    const doc = {
      title: payload.title,
      description: payload.description || "",
      status: payload.status || "todo",
      assignee: payload.assignee || "",
      priority: payload.priority || "medium",
      dueDate: payload.dueDate || "",
      order: payload.order || 0,
      createdAt: now,
      updatedAt: now
    };
    const result = await db.collection(TASKS_COLLECTION).insertOne(doc);
    return res.status(201).json({ task: toPublicTask({ ...doc, _id: result.insertedId }) });
  } catch (err) {
    return next(err);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(404).json({ message: "Task not found" });
    const { payload } = parseTaskInput(req.body, { partial: true });
    if (!Object.keys(payload).length) return res.status(400).json({ message: "Nessun campo da aggiornare." });
    payload.updatedAt = new Date();
    const db = getDb();
    const objectId = new mongoose.Types.ObjectId(id);
    const updateResult = await db.collection(TASKS_COLLECTION).updateOne({ _id: objectId }, { $set: payload });
    if (!updateResult.matchedCount) return res.status(404).json({ message: "Task not found" });
    const updated = await db.collection(TASKS_COLLECTION).findOne({ _id: objectId });
    if (!updated) return res.status(404).json({ message: "Task not found" });
    return res.json({ task: toPublicTask(updated) });
  } catch (err) {
    return next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(404).json({ message: "Task not found" });
    const db = getDb();
    const objectId = new mongoose.Types.ObjectId(id);
    const removed = await db.collection(TASKS_COLLECTION).findOne({ _id: objectId });
    if (!removed) return res.status(404).json({ message: "Task not found" });
    await db.collection(TASKS_COLLECTION).deleteOne({ _id: objectId });
    return res.json({ success: true, task: toPublicTask(removed) });
  } catch (error) {
    return next(error);
  }
});

export default router;
