import { Router } from "express"
import footerModel from "../model/footer.model"

const router = Router();

router.post("/", async (req, res) => {
    if (await footerModel.findOne({})) {
        res.send({ messsage: "updated", data: await footerModel.findOneAndUpdate({}, req.body) });
    }
    else res.send({ message: "created", data: await footerModel.create(req.body) });
})

router.get("/", async (req, res) => {
    res.send(await footerModel.findOne({}));
})

export default router;