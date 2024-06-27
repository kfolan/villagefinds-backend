import { Schema, model } from "mongoose";
const imagrySchema = new Schema({
  image: {
    type: String,
  },
});

export default model("imagry", imagrySchema);
