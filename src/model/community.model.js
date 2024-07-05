import { Schema, model, default as mongoose } from "mongoose";

const schema = new Schema({
  name: {
    type: String,
  },
  organizer: {
    firstName: String,
    lastName: String,
  },
  status: {
    type: String,
  },
  email: {
    type: String,
  },
  password: {
    type: String,
  },
  code: {
    type: String,
  },
  phone: {
    type: String,
  },
  announcement: {
    text: String,
    updated_at: Date,
  },
  shortDesc: {
    type: String,
  },
  longDesc: {
    type: String,
  },
  slug: {
    type: String,
  },
  categories: [String],
  events: [
    {
      name: String,
      address: String,
      fulfillment: {
        date: Date,
        startTime: String,
        endTime: String,
      },
      detail: String,
      status: String,
      link: String,
      questions: [String],
    },
  ],
  images: {
    logoUrl: String,
    backgroundUrl: String,
  },
  signup_at: {
    type: Date,
  },
});

export default model("community", schema);
