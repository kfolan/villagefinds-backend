import { Router } from "express";
import { hashSync, compareSync } from "bcrypt";
import jwt from "jsonwebtoken";

import vendorModel from "../model/vendor.model";
import vendorMiddleware from "../middleware/vendor.middleware";
import uploadMiddleware from "../multer";
import { createAccount, createAccountLink, retrieveAccount } from "../utils/stripe";
import { createCarrierAccount, createShippoAccount, retrieveShippoAccount } from "../utils/shippo";

import {
  SECRET_KEY,
  HASH_SALT_ROUND,
} from "../config";

const router = Router();

router.get("/", async (req, res) => {
  try {
    res.send(
      await vendorModel
        .find(
          (() => {
            let obj = {};
            if (req.query.communityId) obj.community = req.query.communityId;
            if (req.query.vendorId) obj._id = req.query.vendorId;
            if (req.query.name) obj.name = new RegExp(req.query.name, "g");
            if (req.query.status) obj.status = req.query.status;
            obj.signup_at = {};
            if (req.query.from) obj.signup_at.$gte = req.query.from;
            if (req.query.to) obj.signup_at.$lte = req.query.to;

            if (JSON.stringify(obj.signup_at) == "{}") delete obj.signup_at;

            return obj;
          })()
        )
        .populate([{ path: "community" }])
    );
  } catch (err) {
    res.send(err);
  }
});

router.get('/admin', async (req, res) => {
  const { name, sort, status, from, to } = req.query;
  const filterParams = {}, sortParams = {};
  if (name) {
    filterParams.$or = [
      { 'business.name': new RegExp(name, 'i') },
      { 'business.owner': new RegExp(name, 'i') }
    ]
  }
  if (status) filterParams.status = status;
  if (from || to) {
    filterParams.signupAt = {};
    if (from) filterParams.signupAt.$gte = from;
    if (to) filterParams.signupAt.$lte = to;
  }

  if (sort) {
    if (sort === 'alphabeta') {
      sortParams['business.name'] = 1;
      sortParams['business.owner'] = 1;
    }
    else if (sort === 'recent') sortParams.signupAt = -1;
    // else if (sort === 'highest')
    // else if (sort === 'lowest')
  }

  res.send(await vendorModel.aggregate([
    { $match: filterParams },
    ...Object.keys(sortParams).length === 0 ? [] : [{ $sort: sortParams }]
  ]));
})

router.get('/admin/:id', async (req, res) => {
  const { id } = req.params;
  const vendor = await vendorModel.findById(id).populate(['community', 'subscription']);
  res.send({ status: 200, vendor });
})

router.get("/auth", vendorMiddleware, async (req, res) => {
  try {
    const vendor = req.vendor;
    return res.send(vendor);
  } catch (err) {
    console.log(err);
    return res.json({ status: 500 });
  }
});

router.get("/community", vendorMiddleware, async (req, res) => {
  try {
    const vendor = req.vendor;
    const community = await vendorModel
      .findOne({ _id: vendor._id })
      .select("community communityStatus")
      .populate("community", "name images");
    return res.json({ status: 200, community });
  } catch (err) {
    console.log(err);
    return res.json({ status: 500 });
  }
});

router.get("/goals", vendorMiddleware, async (req, res) => {
  try {
    const vendor = req.vendor;
    return res.json({ status: 200, goals: vendor.goals });
  } catch (err) {
    console.log(err);
    return res.json({ status: 500 });
  }
});

router.get("/rewards", vendorMiddleware, async (req, res) => {
  try {
    const vendor = req.vendor;
    return res.json({ status: 200, rewards: vendor.rewards });
  } catch (err) {
    console.log(err);
    return res.json({ status: 500 });
  }
});

router.get('/global', async (req, res) => {
  const { vendor } = req.query;
  try {
    const vendors = await vendorModel.aggregate([
      {
        $match: {
          $or: [
            { 'business.name': new RegExp(vendor, 'i') },
            { 'business.email': new RegExp(vendor, 'i') },
            { 'business.phone': new RegExp(vendor, 'i') }
          ]
        }
      },
      {
        $project: {
          name: '$business.name',
          owner: '$business.owner',
          email: '$business.email',
          phone: '$business.phone'
        }
      }
    ]);
    res.send(vendors);
  } catch (err) {
    console.log(err);
    res.send({ status: 500 });
  }
})

router.get("/profile/:category?", vendorMiddleware, async (req, res) => {
  const vendor = req.vendor;
  const { category } = req.params;
  if (!category) {
    return res.send(vendor);
  }
  if (category === "business") {
    return res.send(vendor.business);
  } else if (category === "social-urls") {
    return res.send(vendor.socialUrls);
  } else if (category === "store") {
    return res.send(vendor.store);
  } else if (category === "images") {
    return res.send(vendor.images || []);
  } else if (category === "open") {
    return res.send(vendor.isOpen);
  }
});

router.get(
  "/profile/bank-detail/verified",
  vendorMiddleware,
  async (req, res) => {
    const vendor = req.vendor;
    if (vendor.stripeAccountID) return res.send(true);
    return res.send(false);
  }
);

router.get(
  "/profile/fulfillment/:method",
  vendorMiddleware,
  async (req, res) => {
    const fulfillment = req.vendor.fulfillment;
    const { method } = req.params;
    if (method === "pickup") {
      return res.send(fulfillment.pickup);
    } else if (method === "delivery") {
      return res.send(fulfillment.delivery);
    } else if (method === "location") {
      const { id } = req.query;
      if (id) {
        return res.send(
          fulfillment.locations.find((item) => item._id.toString() === id)
        );
      }
      return res.send(fulfillment.locations);
    }
  }
);

router.get("/profile/shipping/:method", vendorMiddleware, async (req, res) => {
  try {
    const { method } = req.params;
    const vendor = req.vendor;
    if (method === "service") {
      return res.send((vendor.shipping && vendor.shipping.services) || []);
    } else if (method === 'address') {
      const { shipping } = vendor;
      const { address } = shipping;
      res.send({ address });
    }
  } catch (err) {
    throw err;
  }
});

router.get("/stripe/on-board", vendorMiddleware, async (req, res) => {
  const vendor = req.vendor;
  try {
    if (vendor.stripeAccountID) {
      const checkAccount = await retrieveAccount(vendor.stripeAccountID);
      if (checkAccount) {
        const accountLink = await createAccountLink(checkAccount);
        return res.json({ status: 200, url: accountLink.url });
      }
    }
    const account = await createAccount(vendor);
    const accountLink = await createAccountLink(account);
    vendor.stripeAccountID = account.id;
    await vendor.save();
    return res.json({ status: 200, url: accountLink.url });
  } catch (err) {
    console.log(err);
    return res.json({ status: 500, message: err });
  }
});

router.get('/shippo/check', vendorMiddleware, async (req, res) => {
  const vendor = req.vendor;
  const vendorShippoID = vendor.shippoAccountID;
  if (!vendorShippoID) return res.send({ status: 400 });

  const account = await retrieveShippoAccount(vendorShippoID);
  return res.send({ status: 200, shippo: account });
});

router.get("/shippo/on-board", vendorMiddleware, async (req, res) => {
  const vendor = req.vendor;
  const vendorShippoID = vendor.shippoAccountID;
  if (!vendorShippoID) {
    const shippoAccount =
      await createShippoAccount({
        name: vendor.business.owner,
        email: vendor.business.email,
        address: vendor.business.address,
        companyName: vendor.business.name
      });
    const shippoAccountID = shippoAccount.object_id;
    // const upsAccount = await createCarrierAccount({ accountID: shippoAccountID, carrier: 'ups', parameters: {} });
    // console.log(upsAccount);
    const uspsAccount = await createCarrierAccount({ accountID: shippoAccountID, carrier: 'usps', parameters: {} });
    const fedexAccount = await createCarrierAccount({ accountID: shippoAccountID, carrier: 'fedex', parameters: {} });
    // console.log(fedexAccount);

    vendor.shippoAccountID = shippoAccountID;
    vendor.shippoCarriers = {
      // ups: upsAccount.objectId,
      usps: uspsAccount.object_id,
      fedex: fedexAccount.object_id
    };
    await vendor.save();
    return res.json({ status: 200 });
  } else {
    const account = await retrieveShippoAccount(vendorShippoID);

    if (account) {
      return res.json({ status: 200 });
    } else {
      return res.json({ status: 404 });
    }
  }
});

router.get(
  "/profile/bank-detail/verify",
  vendorMiddleware,
  async (req, res) => {
    const vendor = req.vendor;
    const { accountID } = req.query;

    if (vendor.stripeAccountID === accountID) return res.json({ status: 200 });
    return res.json({ status: 400 });
  }
);

router.get('/shipping/address', vendorMiddleware, async (req, res) => {
  try {
  } catch (err) {
    throw err;
  }
});

//signup
router.post("/register", async (req, res) => {
  try {
    const count = await vendorModel.countDocuments({});
    const {
      shopName,
      firstName,
      lastName,
      email,
      phone,
      password,
      subscription,
      community,
    } = req.body;
    const vendorJson = {
      vendorId: count + 1,
      business: {
        name: shopName,
        owner: `${firstName} ${lastName}`,
        email,
        phone,
        password: hashSync(password, HASH_SALT_ROUND)
      },
      subscription,
      community,
      status: "inactive",
      signupAt: new Date(),
    };

    const vendor = await vendorModel.create(vendorJson);
    const token = jwt.sign({ id: vendor._id, role: "vendor" }, SECRET_KEY, {
      expiresIn: "7d",
    });

    res.json({
      status: 200,
      token,
      vendor
    });
  } catch (error) {
    console.log(error);
    res.json({ status: 500 });
  }
});

router.post("/login", async (req, res) => {
  const authorization = req.headers.authorization;
  if (authorization) {
    const token = authorization.slice("Bearer ".length);

    try {
      const tokenUser = await jwt.verify(token, SECRET_KEY);
      if (!tokenUser.id || tokenUser.role !== "vendor") {
        return res.json({ status: 401 });
      }
      const currentUser = await vendorModel.findById(tokenUser.id);
      if (!currentUser) {
        return res.json({ status: 401 });
      }
      return res.json({
        status: 200,
        profile: { owner: currentUser.business.owner },
      });
    } catch (err) {
      return res.json({ status: 401 });
    }
  }

  const { email, password } = req.body;
  try {
    const vendor = await vendorModel.findOne({
      $or: [
        {
          "business.email": email
        },
        {
          "business.phone": email
        }
      ]
    });
    if (!vendor) {
      return res.json({ status: 404 });
    }
    if (!compareSync(password, vendor.business?.password || '')) {
      return res.json({ status: 400 });
    }

    const token = jwt.sign({ id: vendor._id, role: "vendor" }, SECRET_KEY, {
      expiresIn: "7d",
    });
    return res.json({
      status: 200,
      token,
      profile: { owner: vendor.business.name },
    });
  } catch (error) {
    console.log(error);
    return res.json({ status: 500 });
  }
});

router.put(
  "/profile/:id",
  vendorMiddleware,
  uploadMiddleware.array("images"),
  async (req, res) => {
    const id = req.params.id;
    const vendor = req.vendor;
    if (id === "business") {
      vendor.business = req.body;
      vendor
        .save()
        .then((response) => {
          return res.json({ status: 200, business: response.business });
        })
        .catch((err) => {
          return res.json({ status: 500 });
        });
    } else if (id === "social-urls") {
      vendor.socialUrls = req.body;
      vendor
        .save()
        .then((response) => {
          return res.json({ status: 200, socialUrls: response.socialUrls });
        })
        .catch((err) => {
          return res.json({ status: 500 });
        });
    } else if (id === "update-password") {
      if (!vendor.business) vendor.business = {};
      vendor.business.password = hashSync(req.body.password, HASH_SALT_ROUND);
      vendor
        .save()
        .then(() => {
          return res.json({ status: 200 });
        })
        .catch((err) => {
          return res.json({ status: 500 });
        });
    } else if (id === "store") {
      const store = req.body;
      vendor.store = store;
      await vendor.save();
      return res.json({ status: 200 });
    } else if (id === "images") {
      const files = req.files;
      const labels = JSON.parse(req.body.labels || "");
      const images = vendor.images;
      files.forEach((file, index) => {
        if (labels[index] === "logo") {
          images.logoUrl = file.path;
        } else if (labels[index] === "finder") {
          images.finderUrl = file.path;
        } else if (labels[index] === "hero") {
          images.slideUrls.push(file.path);
        }
      });
      vendor.images = images;
      await vendor.save();
      return res.json({ status: 200 });
    } else if (id === "open") {
      const { open } = req.body;
      vendor.isOpen = open;
      await vendor.save();
      return res.json({ status: 200 });
    }
  }
);

router.put("/profile/shipping/:method", vendorMiddleware, async (req, res) => {
  const { method } = req.params;
  const vendor = req.vendor;
  if (method === "service") {
    const { services } = req.body;
    vendor.shipping.services = services;
    await vendor.save();
    return res.json({ status: 200 });
  } else if (method === 'address') {
    const address = req.body;
    vendor.shipping = {
      ...(vendor.shipping || {}),
      address
    };
    await vendor.save();
    res.send({ status: 200 });
  }
});

router.put(
  "/profile/fulfillment/:method",
  vendorMiddleware,
  async (req, res) => {
    const { method } = req.params;
    const vendor = req.vendor;
    const fulfillment = vendor.fulfillment;
    if (method === "pickup") {
      const { leadTime, pickupFee, pickupDays } = req.body;
      fulfillment.pickup = {
        leadTime,
        pickupFee,
        days: pickupDays,
      };
      await vendor.save();
      return res.json({ status: 200 });
    } else if (method === "delivery") {
      const { leadTime, deliveryFee, deliveryDays } = req.body;
      fulfillment.delivery = {
        leadTime,
        deliveryFee,
        days: deliveryDays,
      };
      await vendor.save();
      return res.json({ status: 200 });
    } else if (method === "location") {
      const location = req.body;
      const { id } = req.query;
      if (id) {
        fulfillment.locations = (fulfillment.locations || []).map((item) =>
          item._id.toString() === id ? { ...item, ...location } : item
        );
      } else {
        fulfillment.locations = [...(fulfillment.locations || []), location];
      }
      await vendor.save();
      return res.json({ status: 200 });
    }
  }
);

router.put("/community", vendorMiddleware, async (req, res) => {
  try {
    const vendor = req.vendor;
    const { status } = req.body;
    vendor.communityStatus = status;
    await vendor.save();
    return res.json({ status: 200 });
  } catch (err) {
    console.log(err);
    return res.json({ status: 500 });
  }
});

router.put("/goals", vendorMiddleware, async (req, res) => {
  try {
    const vendor = req.vendor;
    const goals = req.body;
    vendor.goals = goals;
    await vendor.save();
    return res.json({ status: 200 });
  } catch (err) {
    console.log(err);
    return res.json({ status: 500 });
  }
});

router.put("/rewards", vendorMiddleware, async (req, res) => {
  try {
    const vendor = req.vendor;
    const rewards = req.body;
    vendor.rewards = rewards;
    await vendor.save();
    return res.json({ status: 200 });
  } catch (err) {
    console.log(err);
    return res.json({ status: 500 });
  }
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const vendor = req.body;
  try {
    await vendorModel.findByIdAndUpdate(id, vendor);
    res.send({ status: 200 });
  } catch (err) {
    console.log(err);
    res.send({ status: 500 });
  }
});

router.delete(
  "/profile/shipping/parcel/:id",
  vendorMiddleware,
  async (req, res) => {
    const { id } = req.params;
    const vendor = req.vendor;
    vendor.shipping.parcels = (vendor.shipping.parcels || []).filter(
      (item) => item._id.toString() !== id
    );
    await vendor.save();
    return res.json({ status: 200 });
  }
);

export default router;
