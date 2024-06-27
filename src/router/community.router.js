import { Router } from "express";
import mongoose from "mongoose";
import bcrypt, { genSaltSync, hashSync } from "bcrypt";
import jwt from "jsonwebtoken";

import communityModel from "../model/community.model";
import communityMiddleware from "../middleware/community.middleware";
import multer from "../multer";

import { HASH_SALT_ROUND, SECRET_KEY } from "../config";
import vendorModel from "../model/vendor.model";

const router = Router();
const ObjectID = mongoose.Types.ObjectId;

router.get("/", async (req, res) => {
  try {
    const { code, slug } = req.query;
    if (code) {
      const community = await communityModel
        .findOne({ code })
        .select("name images organizer shortDesc categories slug");
      if (community) {
        return res.json({ status: 200, community });
      } else {
        return res.json({ status: 404 });
      }
    }

    if (slug) {
      const community = await communityModel.aggregate([
        { $match: { slug } },
        {
          $project: {
            name: 1,
            code: 1,
            shortDesc: 1,
            organizer: 1,
            announcement: 1,
            images: 1,
            events: 1,
            categories: 1,
          },
        },
        {
          $lookup: {
            from: "vendors",
            localField: "_id",
            foreignField: "community",
            as: "vendors",
          },
        },
      ]);
      if (community.length === 0) {
        return res.json({ status: 404 });
      } else {
        return res.json({ status: 200, community: community[0] });
      }
    }

    res.send(
      await communityModel.aggregate([
        {
          $match: (() => {
            let obj = {};
            if (req.query.name) obj.name = new RegExp(req.query.name, "i");
            if (req.query.category)
              obj.categories = {
                $eq: req.query.category,
              };
            if (req.query.status) obj.status = req.query.status;
            if (req.query.from) {
              if (!obj.signup_at) obj.signup_at = {};
              obj.signup_at.$gte = req.query.from;
            }
            if (req.query.to) {
              if (!obj.signup_at) obj.signup_at = {};
              obj.signup_at.$lte = req.query.to;
            }

            if (JSON.stringify(obj.signup_at) == "{}") delete obj.signup_at;

            return obj;
          })(),
        },
        {
          $project: {
            name: 1,
            slug: 1,
            organizer: 1,
            shortDesc: 1,
            images: 1,
            categories: 1,
            signup_at: 1,
            status: 1
          },
        },
        {
          $lookup: {
            from: "vendors",
            localField: "_id",
            foreignField: "community",
            as: "vendors",
          },
        },
        {
          $project: {
            name: 1,
            organizer: 1,
            slug: 1,
            shortDesc: 1,
            images: 1,
            "vendors._id": 1,
            categories: 1,
            signup_at: 1,
            status: 1
          },
        },
      ])
    );
  } catch (err) {
    console.log(err);
    return res.json({ status: 500 });
  }
});
router.get('/admin', async (req, res) => {
  const { name, sort, status, from, to } = req.query;
  const filterParams = {}, sortParams = {};
  if (name) {
    filterParams.$or = [
      {
        $expr: {
          $regexMatch: {
            input: { $concat: ["$organizer.firstName", " ", "$organizer.lastName"] },
            regex: name,
            options: "i"
          }
        }
      },
      { name: { $regex: name, $options: "i" } }
    ];
  }
  if (status) filterParams.status = status;
  if (from || to) {
    filterParams.signup_at = {};
    if (from) filterParams.signup_at.$gte = from;
    if (to) filterParams.signup_at.$lte = to;
  }

  if (sort) {
    if (sort === 'alphabeta') sortParams.name = 1;
    else if (sort === 'recent') sortParams.signup_at = -1;
    // else if (sort === 'highest')
    // else if (sort === 'lowest')
  }

  res.send(await communityModel.aggregate([
    { $match: filterParams },
    ...Object.keys(sortParams).length === 0 ? [] : [{ $sort: sortParams }],
    {
      $lookup: {
        from: 'vendors',
        localField: '_id',
        foreignField: 'community',
        as: 'vendors',
      }
    }
  ]));
})
router.get("/event", communityMiddleware, async (req, res) => {
  const community = req.community;
  const events = await communityModel.aggregate([
    { $match: { _id: community._id } },
    { $project: { events: 1 } },
    { $unwind: { path: "$events" } },
    {
      $lookup: {
        from: "customerevents",
        localField: "events._id",
        foreignField: "event",
        as: "customers",
      },
    },
    {
      $replaceRoot: {
        newRoot: {
          $mergeObjects: [
            "$events",
            {
              attendees: "$customers",
            },
          ],
        },
      },
    },
  ]);
  return res.send(events);
});
router.get("/event/:id", communityMiddleware, async (req, res) => {
  const { id } = req.params;
  const events = req.community.events ?? [];
  const currentEvent = events.find((item) => item._id.toString() === id);
  if (!currentEvent) {
    return res.json({ status: 404 });
  }
  return res.json({ status: 200, event: currentEvent });
});
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  const communities = await communityModel.aggregate([
    { $match: { _id: new ObjectID(id) } },
    {
      $lookup: {
        from: 'vendors',
        localField: '_id',
        foreignField: 'community',
        as: 'vendors'
      }
    },
    {
      $project: {
        name: 1,
        email: 1,
        password: 1,
        code: 1,
        organizer: 1,
        vendors: 1
      }
    }
  ]);
  if (communities.length > 0) {
    res.send({ status: 200, community: communities[0] });
  } else {
    res.send({ status: 400 });
  }
});

router.post("/login", async (req, res) => {
  const authorization = req.headers.authorization;
  if (authorization) {
    const token = authorization.slice("Bearer ".length);

    try {
      const tokenUser = await jwt.verify(token, SECRET_KEY);
      if (!tokenUser.id || tokenUser.role !== "community-organizer") {
        return res.json({ status: 401 });
      }
      const currentUser = await communityModel
        .findById(tokenUser.id)
        .select(
          "password name code slug images shortDesc longDesc announcement"
        );
      if (!currentUser) {
        return res.json({ status: 401 });
      }
      return res.json({ status: 200, profile: currentUser });
    } catch (err) {
      return res.json({ status: 401 });
    }
  }

  const { email, password } = req.body;
  const currentUser = await communityModel
    .findOne({
      $or: [
        { phone: email },
        { email }
      ]
    })
    .select("password name code slug images shortDesc longDesc announcement");
  if (!currentUser) {
    return res.json({ status: 400 });
  }

  const result = bcrypt.compareSync(password, currentUser.password);
  console.log(result);
  if (result === false) {
    return res.json({ status: 404 });
  }

  const token = jwt.sign(
    { id: currentUser._id, role: "community-organizer" },
    SECRET_KEY,
    { expiresIn: "7d" }
  );
  delete currentUser.password;
  return res.json({
    status: 200,
    profile: currentUser,
    token,
  });
});
router.post("/register", async (req, res) => {
  const { name, email, phone, code, password } = req.body;
  const result = await communityModel.findOne({
    $or: [
      { email }, { phone }
    ]
  });
  if (result) {
    return res.send({ status: 400 });
  }
  await communityModel.create({
    name,
    email,
    phone,
    code,
    password: bcrypt.hashSync(password, HASH_SALT_ROUND),
    status: "inactive",
    signup_at: new Date(),
  });
  return res.json({ status: 200 });
});
router.post("/", async (req, res) => {
  res.send(await communityModel.create({ ...req.body, signup_at: new Date() }));
});

router.put(
  "/profile",
  communityMiddleware,
  multer.array("images", 2),
  async (req, res) => {
    const reqJson = { ...req.body, images: {} };
    if (req.files && req.files[0] && req.files[0].path)
      reqJson.images.logoUrl = req.files[0].path;
    if (req.files && req.files[1] && req.files[1].path)
      reqJson.images.backgroundUrl = req.files[1].path;

    return res.json({
      status: 200,
      community: await communityModel.findByIdAndUpdate(
        req.community._id,
        reqJson
      ),
    });
  }
);
router.put("/event", communityMiddleware, async (req, res) => {
  const community = req.community;
  community.events = community.events ?? [];
  community.events.push({ status: "Active", ...req.body });
  const resJson = await community.save();
  return res.json({ status: 200 });
});
router.put("/event/:id", communityMiddleware, async (req, res) => {
  const { id } = req.params;
  const community = req.community;
  community.events = community.events ?? [];
  const currentEvent = community.events.find(
    (item) => item._id.toString() === id
  );
  if (!currentEvent) {
    return res.json({ status: 404 });
  }

  community.events = community.events.map((item) =>
    item._id.toString() === id ? { ...item, ...req.body } : item
  );
  await community.save();
  return res.json({ status: 200 });
});
router.put("/announcement", communityMiddleware, async (req, res) => {
  const community = req.community;
  const { announcement } = req.body;
  return res.json({
    status: 200,
    community: await communityModel.findByIdAndUpdate(community._id, {
      announcement: {
        text: announcement,
        updated_at: new Date(),
      },
    }),
  });
});
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { password, leader: leaderID, ...community } = req.body;
  try {
    if (password) community.password = hashSync(password, HASH_SALT_ROUND);
    await communityModel.findByIdAndUpdate(id, community);
    const vendors = await vendorModel.find({ community: id });
    await Promise.all(vendors.map(async vendor => {
      vendor.isLeader = vendor._id.toString() === leaderID;
      return vendor.save();
    }))
    res.send({ status: 200 });
  } catch (err) {
    res.send({ status: 500 });
  }
});

router.delete("/:id", async (req, res) => {
  res.send(await communityModel.findByIdAndDelete(req.params.id));
});

export default router;
