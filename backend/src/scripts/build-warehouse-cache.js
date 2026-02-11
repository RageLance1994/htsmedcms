import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/htsmedcms";
const DB_NAME = "htstest";
const TARGET = "warehouse_giacenze";

const buildCache = async () => {
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.useDb(DB_NAME, { useCache: true });

  await db.collection(TARGET).deleteMany({});

  const pipeline = [
    { $addFields: { codiceTrim: { $trim: { input: "$Codice Articolo" } } } },
    {
      $lookup: {
        from: "Movimenti di magazzino",
        let: { code: "$codiceTrim" },
        pipeline: [
          { $match: { $expr: { $eq: ["$Cod_Articolo", "$$code"] } } },
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
        unitaMisura: "$Unità di Misura",
        giacenzaMinima: "$Giacenza Minina",
        alertGiacenza: "$Alert Giacenza",
        giacenzaFisica: 1,
        giacenzaFiscale: 1,
        obsoleto: "$Obsoleto"
      }
    },
    { $merge: { into: TARGET, whenMatched: "replace", whenNotMatched: "insert" } }
  ];

  await db.collection("Codici_di_magazzino").aggregate(pipeline, { allowDiskUse: true }).toArray();

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
