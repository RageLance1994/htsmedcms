import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    nameEnc: { type: String, required: true },
    surnameEnc: { type: String, required: true },
    phoneEnc: { type: String, required: true },
    emailEnc: { type: String, required: true },
    emailHash: { type: String, index: true },
    passwordHash: { type: String, required: true },
    authorizations: { type: [String], default: [] },
    division: { type: String, default: "" }
  },
  { timestamps: true }
);

export default mongoose.model("User", UserSchema);
