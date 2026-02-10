import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import User from "../models/User.js";
import { encryptString, hashString } from "../utils/encryption.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/htsmedcms";
const SALT_ROUNDS = Number(process.env.PASSWORD_SALT_ROUNDS || 12);

const users = [
  {
    name: "Marco",
    surname: "Rossi",
    phone: "+39 333 111 2233",
    email: "marco.rossi@htsmed.com",
    password: "Password!2026",
    authorizations: ["admin", "users:write", "users:read"],
    division: "Direzione"
  },
  {
    name: "Giulia",
    surname: "Bianchi",
    phone: "+39 333 222 3344",
    email: "giulia.bianchi@htsmed.com",
    password: "Password!2026",
    authorizations: ["repairs:read", "repairs:write"],
    division: "Riparazioni"
  },
  {
    name: "Luca",
    surname: "Verdi",
    phone: "+39 333 555 6677",
    email: "luca.verdi@htsmed.com",
    password: "Password!2026",
    authorizations: ["logistics:read"],
    division: "Logistica"
  }
];

async function run() {
  await mongoose.connect(MONGO_URI);

  await User.deleteMany({});

  const payload = await Promise.all(
    users.map(async (user) => ({
      nameEnc: encryptString(user.name),
      surnameEnc: encryptString(user.surname),
      phoneEnc: encryptString(user.phone),
      emailEnc: encryptString(user.email),
      passwordHash: await bcrypt.hash(user.password, SALT_ROUNDS),
      emailHash: hashString(user.email.toLowerCase()),
      authorizations: user.authorizations,
      division: user.division
    }))
  );

  await User.insertMany(payload);
  await mongoose.disconnect();
  console.log("Utenti di base creati.");
}

run().catch((error) => {
  console.error("Errore seed utenti:", error);
  process.exit(1);
});
