import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import User from "../models/User.js";
import { encryptString, hashString } from "../utils/encryption.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/htsmedcms";
const SALT_ROUNDS = Number(process.env.PASSWORD_SALT_ROUNDS || 12);

const admin = {
  name: "Super",
  surname: "Admin",
  phone: "+39 333 999 0000",
  email: "super.admin@htsmed.com",
  password: "SuperAdmin!2026",
  authorizations: ["*"],
  division: "Direzione"
};

async function run() {
  await mongoose.connect(MONGO_URI);

  const existing = await User.findOne({
    emailEnc: encryptString(admin.email)
  });

  if (existing) {
    console.log("Super admin gia presente.");
    await mongoose.disconnect();
    return;
  }

  const passwordHash = await bcrypt.hash(admin.password, SALT_ROUNDS);

  await User.create({
    nameEnc: encryptString(admin.name),
    surnameEnc: encryptString(admin.surname),
    phoneEnc: encryptString(admin.phone),
    emailEnc: encryptString(admin.email),
    emailHash: hashString(admin.email.toLowerCase()),
    passwordHash,
    authorizations: admin.authorizations,
    division: admin.division
  });

  await mongoose.disconnect();
  console.log("Super admin creato.");
}

run().catch((error) => {
  console.error("Errore creazione super admin:", error);
  process.exit(1);
});
