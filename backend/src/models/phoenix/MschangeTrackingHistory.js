import mongoose from "mongoose";

const schema = new mongoose.Schema(
{
  internal_table_name: { type: String, required: true, maxlength: 128 },
  table_name: { type: String, required: true, maxlength: 128 },
  start_time: { type: Date, required: true },
  end_time: { type: Date, required: true },
  rows_cleaned_up: { type: Number, required: true },
  cleanup_version: { type: Number, required: true },
  comments: { type: String, required: true }
},
{ collection: "MSchange_tracking_history", timestamps: false }
);

export default mongoose.model("MschangeTrackingHistory", schema);
