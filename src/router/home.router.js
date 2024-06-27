import { Router } from "express"
import homeModel from "../model/home.model"
import upload from "../multer"
const router = Router();

router.post("/", upload.array("images"), async (req, res) => {
    if (!(await homeModel.findOne({})))
        await homeModel.create({})
    let data = {};
    data[req.query.section] = {
        ...req.body,
        bodyText: (() => { try { return JSON.parse(req.body.bodyText) } catch (err) { return req.body.bodyText } })(),
        images: (() => { return req.files ? req.files.map(file => file.path) : [] })()
    }

    res.send(await homeModel.findOneAndUpdate({}, data));
})
router.get("/", async (req, res) => {
    if (await homeModel.findOne({}))
        if (req.query.section)
            res.send((await homeModel.findOne({}))[req.query.section]);
        else
            res.send(await homeModel.findOne({}));
    else
        res.send("Empty");
})
export default router;