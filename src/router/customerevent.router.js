import { Router } from "express";

import customerEventModel from "../model/customerevent.model";
import customerMiddleware from "../middleware/customer.middleware";
import communityMiddleware from "../middleware/community.middleware";

const router = Router();

router.get("/", customerMiddleware, async (req, res) => {
  const customer = req.customer;
  const attendees = await customerEventModel.find({
    customer: customer._id,
  });
  return res.json({ status: 200, attendees });
});

router.get("/attendee/:id", communityMiddleware, async (req, res) => {
  const { id } = req.params;
  const community = req.community;
  const events = community.events ?? [];
  if (!events.find((item) => item._id.toString() === id)) {
    return res.json({ status: 404 });
  }
  const attendees = await customerEventModel
    .find({ event: id })
    .populate("customer", "firstName lastName");
  return res.json({ status: 200, attendees });
});

router.post("/", customerMiddleware, async (req, res) => {
  const { eventId } = req.query;
  const customer = req.customer;

  const exist = await customerEventModel.findOne({
    customer: customer._id,
    event: eventId,
  });
  if (exist) {
    return res.json({ status: 400 });
  }
  const attendee = await customerEventModel.create({
    customer: customer._id,
    event: eventId,
    ...req.body,
    submited_at: new Date(),
  });
  return res.json({ status: 200, attendee });
});

export default router;
