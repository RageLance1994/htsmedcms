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
  password: "SuperAdmin!2026#1",
  authorizations: ["*"],
  division: "Direzione"
};

async function run() {
  await mongoose.connect(MONGO_URI);

  const emailHash = hashString(admin.email.toLowerCase());
  const passwordHash = await bcrypt.hash(admin.password, SALT_ROUNDS);

  const update = {
    nameEnc: encryptString(admin.name),
    surnameEnc: encryptString(admin.surname),
    phoneEnc: encryptString(admin.phone),
    emailEnc: encryptString(admin.email),
    emailHash,
    passwordHash,
    authorizations: admin.authorizations,
    division: admin.division
  };

  await User.updateOne({ emailHash }, { $set: update }, { upsert: true });

  await mongoose.disconnect();
  console.log("Super admin resettato.");
}

run().catch((error) => {
  console.error("Errore reset super admin:", error);
  process.exit(1);
});
