import express from "express";
import mongoose from "mongoose";

const router = express.Router();

const getWarehouseDb = () => mongoose.connection.useDb("htstest", { useCache: true });

const ensureIndexes = async () => {
  const db = getWarehouseDb();
  await Promise.all([
    db.collection("warehouse_giacenze").createIndex({ codiceArticolo: 1 }),
    db.collection("warehouse_giacenze").createIndex({ descrizione: 1 }),
    db.collection("warehouse_giacenze").createIndex({ giacenzaFisica: 1 }),
    db.collection("warehouse_giacenze").createIndex({ giacenzaMinima: 1 }),
    db.collection("warehouse_giacenze").createIndex({ alertGiacenza: 1 })
  ]);
};

router.get("/giacenze", async (req, res) => {
  try {
    await ensureIndexes();

    const db = getWarehouseDb();
    const search = String(req.query.search || "").trim();
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "50", 10), 10), 5000);
    const onlyAlerts = String(req.query.alerts || "0") === "1";
    const skip = (page - 1) * limit;

    const match = {};
    if (search) {
      const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      match.$or = [
        { descrizione: re },
        { codiceArticolo: re },
        { Descrizione: re },
        { "Codice Articolo": re }
      ];
    }

    const query = { ...match };
    if (onlyAlerts) {
      query.$expr = { $lt: ["$giacenzaFisica", { $ifNull: ["$giacenzaMinima", 0] }] };
    }

    const [data, total] = await Promise.all([
      db
        .collection("warehouse_giacenze")
        .find(query, { projection: { _id: 0 } })
        .sort({ codiceArticolo: 1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection("warehouse_giacenze").countDocuments(query)
    ]);

    res.json({ page, limit, total, data });
  } catch (error) {
    res.status(500).json({ errore: "Errore caricamento giacenze", dettaglio: error.message });
  }
});

router.get("/giacenze/seriali", async (req, res) => {
  try {
    const db = getWarehouseDb();
    const codice = String(req.query.codice || "").trim();
    if (!codice) {
      return res.status(400).json({ errore: "Codice articolo mancante" });
    }

    const pipeline = [
      { $match: { cod_articolo: codice } },
      {
        $lookup: {
          from: "Movimenti di magazzino",
          localField: "cod_movimento",
          foreignField: "cod",
          as: "mov"
        }
      },
      { $unwind: { path: "$mov", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "Causali di magazzino",
          localField: "mov.Cod_Causale",
          foreignField: "cod",
          as: "causale"
        }
      },
      { $unwind: { path: "$causale", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          codiceArticolo: "$cod_articolo",
          seriale: { $trim: { input: { $ifNull: ["$Seriale", ""] } } },
          dataMovimento: "$mov.Data",
          azioneFisica: { $ifNull: ["$causale.Azione su Giacenza Fisica", 0] }
        }
      },
      { $match: { seriale: { $ne: "" } } },
      { $sort: { seriale: 1, dataMovimento: -1 } },
      {
        $group: {
          _id: "$seriale",
          codiceArticolo: { $first: "$codiceArticolo" },
          dataMovimento: { $first: "$dataMovimento" },
          azioneFisica: { $first: "$azioneFisica" }
        }
      },
      { $match: { azioneFisica: { $gt: 0 } } },
      {
        $project: {
          _id: 0,
          codiceArticolo: 1,
          seriale: "$_id",
          dataMovimento: 1
        }
      },
      { $sort: { dataMovimento: -1, seriale: 1 } }
    ];

    const rows = await db.collection("Allocazione Magazzino").aggregate(pipeline).toArray();
    const expected = await db.collection("warehouse_giacenze").findOne(
      { codiceArticolo: codice },
      { projection: { _id: 0, giacenzaFisica: 1 } }
    );
    const expectedQty = Math.max(Number(expected?.giacenzaFisica || 0), 0);
    const missing = Math.max(expectedQty - rows.length, 0);
    if (missing > 0) {
      for (let i = 0; i < missing; i += 1) {
        rows.push({
          codiceArticolo: codice,
          seriale: `NON ASSEGNATO ${i + 1}`,
          dataMovimento: null,
          placeholder: true
        });
      }
    }
    res.json({ codice, rows, expectedQty });
  } catch (error) {
    res.status(500).json({ errore: "Errore caricamento seriali", dettaglio: error.message });
  }
});

export default router;
