import { Router } from "express";
import metricModel from "../model/metric.model";
const router = Router();

router.get("/", async (req, res) => {
    const { name, status } = req.query;
    const filter = {};
    if (name) filter.name = new RegExp(name, "g");
    if (status) filter.status = status;
    res.send(await metricModel.find(filter));
});
router.get("/:id", async (req, res) => {
    res.send(await metricModel.findById(req.params.id));
});

router.post("/", async (req, res) => {
    res.send({ message: "created", data: await metricModel.create({ ...req.body, status: 'inactive' }) });
});

router.put("/:id", async (req, res) => {
    const { id } = req.params;
    const metric = req.body;
    await metricModel.findByIdAndUpdate(id, metric);
    res.send({ status: 200 });
});

router.delete("/:id", async (req, res) => {
    res.send({ message: "deleted", data: await metricModel.findByIdAndDelete(req.params.id) });
})

export default router;
