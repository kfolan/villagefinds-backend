import express from 'express';
import mongoose from 'mongoose';

import commissionModel from '../model/commission.model';

const router = express.Router();
const ObjectID = mongoose.Types.ObjectId;

router.get('/', async (req, res) => {
    const { community } = req.query;
    const commissions = await commissionModel.find({ community });
    const total = await commissionModel.aggregate([
        { $match: { community: new ObjectID(community) } },
        {
            $group: {
                _id: null,
                total: {
                    $sum: 1
                }
            }
        }
    ]);
    res.send({
        commissions,
        total: total.length > 0 ? total[0].total : 0
    });
})

export default router;