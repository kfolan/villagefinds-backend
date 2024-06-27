import express from 'express'

import subscModel from '../model/subscription.model'

const router = express.Router();

router.get('/', async (req, res) => {
    return res.send(await subscModel.find());
})

router.get('/:id', async (req, res) => {
    const { id } = req.params;
    return res.send(await subscModel.findById(id));
})

router.post('/', async (req, res) => {
    const subscription = req.body;
    await subscModel.create(subscription);
    return res.send({ status: 200 });
})

router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const subscription = req.body;
    const result = await subscModel.findByIdAndUpdate(id, subscription);
    return res.send({ status: 200, data: result });
})

router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    await subscModel.findByIdAndDelete(id);
    return res.send({ status: 200 });
})

export default router;