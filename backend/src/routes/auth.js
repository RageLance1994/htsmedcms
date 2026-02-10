import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import User from "../models/User.js";
import { decryptString, hashString } from "../utils/encryption.js";

const router = Router();

function formatUser(user) {
  return {
    id: user._id,
    name: decryptString(user.nameEnc),
    surname: decryptString(user.surnameEnc),
    phone: decryptString(user.phoneEnc),
    email: decryptString(user.emailEnc),
    authorizations: user.authorizations,
    division: user.division
  };
}

async function findUserByEmail(email) {
  const emailNormalized = String(email).toLowerCase().trim();
  const emailHash = hashString(emailNormalized);

  let user = await User.findOne({ emailHash });
  if (user) return user;

  const allUsers = await User.find({});
  return allUsers.find((candidate) => {
    try {
      return decryptString(candidate.emailEnc).toLowerCase() === emailNormalized;
    } catch {
      return false;
    }
  });
}

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  const emailNormalized = String(email || "").toLowerCase().trim();

  if (!emailNormalized || !password) {
    console.warn("[auth/login] missing credentials", req.body);
    return res.status(400).json({ errore: "Email e password richieste." });
  }

  try {
    const user = await findUserByEmail(emailNormalized);
    if (!user) {
      console.warn("[auth/login] user not found", emailNormalized);
      return res.status(401).json({
        errore: "Credenziali non valide.",
        ...(process.env.NODE_ENV !== "production" ? { reason: "USER_NOT_FOUND" } : {})
      });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      console.warn("[auth/login] password mismatch", user._id.toString());
      return res.status(401).json({
        errore: "Credenziali non valide.",
        ...(process.env.NODE_ENV !== "production" ? { reason: "PASSWORD_MISMATCH" } : {})
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ errore: "JWT_SECRET mancante." });
    }

    const token = jwt.sign(
      { sub: user._id, scopes: user.authorizations, division: user.division },
      process.env.JWT_SECRET,
      { expiresIn: "12h" }
    );

    let safeUser;
    try {
      safeUser = formatUser(user);
    } catch (error) {
      console.error("[auth/login] decrypt failed, check USER_SECRET", error);
      return res.status(500).json({ errore: "Errore cifratura dati utente." });
    }

    return res.json({ token, user: safeUser });
  } catch (error) {
    console.error("Errore login:", error);
    return res.status(500).json({ errore: "Errore interno." });
  }
});

export default router;
