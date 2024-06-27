import express from 'express';
import jwt from 'jsonwebtoken';
import { compare } from 'bcrypt';

import adminModel from '../model/admin.model';
import { SECRET_KEY } from '../config';

const router = express.Router();

router.post('/login', async (req, res) => {
    const authorization = req.headers.authorization;
    if (authorization) {
        const token = authorization.slice("Bearer ".length);
        try {
            const tokenUser = await jwt.verify(token, SECRET_KEY);
            if (!tokenUser.id || tokenUser.role !== "admin") {
                return res.send({ status: 401 });
            }
            const adminUser = await adminModel
                .findById(tokenUser.id);
            if (!adminUser) {
                return res.send({ status: 401 });
            }
            return res.send({ status: 200 });
        } catch (err) {
            return res.send({ status: 401 });
        }
    }

    try {
        const { email, password } = req.body;
        const adminUser = await adminModel.findOne({
            $or: [
                { email },
                { phone: email }
            ]
        });
        if (!adminUser) return res.send({ status: 400 });
        const isEqual = await compare(password, adminUser.password);
        if (!isEqual) return res.send({ status: 400 });

        const token = await jwt.sign(
            { id: adminUser._id, role: "admin" },
            SECRET_KEY,
            { expiresIn: "7d" }
        );
        res.send({ status: 200, token });
    } catch (err) {
        console.log(err);
    }
});

export default router;