import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/htsmed";
const DB_NAME = process.env.WAREHOUSE_DB_NAME || "htsmed";
const TARGET = "warehouse_giacenze";

const buildWarehouseCacheRowsPipeline = (codes) => [
  { $addFields: { codiceTrim: { $trim: { input: "$Codice Articolo" } } } },
  ...(codes?.length ? [{ $match: { codiceTrim: { $in: codes } } }] : []),
  {
    $lookup: {
      from: "Movimenti di magazzino",
      let: { code: "$codiceTrim" },
      pipeline: [
        { $match: { $expr: { $eq: [{ $trim: { input: "$Cod_Articolo" } }, "$$code"] } } },
        {
          $lookup: {
            from: "Causali di magazzino",
            localField: "Cod_Causale",
            foreignField: "cod",
            as: "causale"
          }
        },
        { $unwind: { path: "$causale", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            qty: "$QT movimentata",
            azFisica: "$causale.Azione su Giacenza Fisica",
            azFiscale: "$causale.Azione su Giacenza Fiscale"
          }
        },
        {
          $group: {
            _id: null,
            giacenzaFisica: {
              $sum: { $multiply: ["$qty", { $ifNull: ["$azFisica", 0] }] }
            },
            giacenzaFiscale: {
              $sum: { $multiply: ["$qty", { $ifNull: ["$azFiscale", 0] }] }
            }
          }
        }
      ],
      as: "movimentiAgg"
    }
  },
  {
    $addFields: {
      giacenzaFisica: { $ifNull: [{ $arrayElemAt: ["$movimentiAgg.giacenzaFisica", 0] }, 0] },
      giacenzaFiscale: { $ifNull: [{ $arrayElemAt: ["$movimentiAgg.giacenzaFiscale", 0] }, 0] }
    }
  },
  {
    $project: {
      _id: 0,
      codiceArticolo: "$codiceTrim",
      descrizione: "$Descrizione",
      unitaMisura: "$UnitÃ  di Misura",
      giacenzaMinima: "$Giacenza Minina",
      alertGiacenza: "$Alert Giacenza",
      giacenzaFisica: 1,
      giacenzaFiscale: 1,
      obsoleto: "$Obsoleto"
    }
  }
];

const buildCache = async () => {
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.useDb(DB_NAME, { useCache: true });

  await db.collection(TARGET).deleteMany({});

  const rows = await db.collection("Codici_di_magazzino").aggregate(buildWarehouseCacheRowsPipeline(), { allowDiskUse: true }).toArray();

  if (rows.length > 0) {
    await db.collection(TARGET).insertMany(rows);
  }

  await db.collection(TARGET).createIndex({ codiceArticolo: 1 });
  await db.collection(TARGET).createIndex({ descrizione: 1 });
  await db.collection(TARGET).createIndex({ giacenzaFisica: 1 });
  await db.collection(TARGET).createIndex({ giacenzaMinima: 1 });
  await db.collection(TARGET).createIndex({ alertGiacenza: 1 });

  await mongoose.disconnect();
  console.log("Warehouse cache built.");
};

buildCache().catch((err) => {
  console.error(err);
  process.exit(1);
});


