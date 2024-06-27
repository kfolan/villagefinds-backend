import { Schema, model } from "mongoose";

const schema = new Schema({
  title: {
    type: String,
  },
  topic: {
    type: String,
  },
  thumbnail_image: {
    type: String,
  },
  large_image: {
    type: String,
  },
  body: {
    type: String,
  },
  status: {
    type: String,
  },
  createdAt: {
    type: Date,
  },
});

export default model("support", schema);
