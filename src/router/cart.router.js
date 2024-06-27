import express from "express";
import { pick } from 'lodash';

import cartModel from "../model/cart.model";
import orderModel from "../model/order.model";
import shipmentModel from '../model/shipment.model';
import customerMiddleware from "../middleware/customer.middleware";
import { createShipment, createTransaction, createWebhook } from "../utils/shippo";

const router = express.Router();

// const stripeCheckout = async (cartItems) => {
//   const count = await cartModel.countDocuments();
//   await Promise.all(cartItems.map(async (item, index) => {
//     const { deliveryType, delivery } = item;
//     let targetAddress = '', instruction = '';
//     if (deliveryType === 'Shipping' || deliveryType === 'Home Delivery') {
//       const { street, city, state, zipcode } = item.delivery || {};
//       instruction = delivery.instruction;
//       targetAddress = `${street} ${city}, ${state} ${zipcode}`;
//     } else if (deliveryType === 'Pickup Location') {
//       instruction = item.pickuplocation.instruction;
//       targetAddress = item.pickuplocation.address;
//     }
//     const order = {
//       orderID: count + index,
//       vendorID: item.vendorId,
//       customerID: customer._id,
//       deliveryType: item.deliveryType,
//       deliveryInfo: {
//         classification: item.buymode === 'recurring' ? `Subscription, ${item.deliveryType}` : item.deliveryType,
//         address: targetAddress,
//         instruction: instruction,
//         isSubstitute: false
//       },
//       product: {
//         name: item.productId.name,
//         image: item.image,
//         price: item.price,
//         quantity: item.quantity,
//         discount: item.discount,
//         soldByUnit: item.productId.soldByUnit,
//         subtotal: Math.floor((item.price * item.quantity) * (100 - item.discount) / 100)
//       },
//       orderDate: new Date(),
//     };
//     if (item.gift) order.gift = item.gift.receiver;
//     if (item.personalization) order.personalization = item.personalization.message;
//     if (item.deliveryType === 'Pickup Location') {
//       const { pickupDate, pickupTime } = item.pickuplocation;
//       order.locationInfo = {
//         ...item.pickuplocation, pickDate: pickupDate, pickTime: `${pickupTime.from} ${pickupTime.to}`
//       }
//     };
//     return orderModel.create(order);
//   }));

//   await Promise.all((await cartModel.find({ customerId: customer._id, status: 'active' })).map(item => {
//     item.status = 'ordered';
//     return item.save();
//   }));
// }

// const shippoCheckout = async (cartItems) => {
//   const batchShipments = await Promise.all(cartItems.map(async item => {
//     const shipment = await shipmentModel.findOne({ cartID: item._id });
//     return Promise.resolve({
//       shipment: {
//         addressFrom: shipment.addressFrom,
//         addressTo: shipment.addressTo,
//         parcels: shipment.parcels,
//       },
//       carrierAccount: shipment.carrierAccount,
//       serviceLevelToken: shipment.serviceLevelToken
//     });
//   }));
//   const batch = await createBatches({ batchShipments });
//   const purchase = await purchaseBatches(batch.objectId);
//   console.log(purchase);
// }

router.get("/", /*customerMiddleware,*/ async (req, res) => {
  const { mode, buyerID } = req.query;

  try {
    const params = { status: 'active' };
    if (mode === 'customer') params.customerId = buyerID;
    else params.guestId = buyerID;
    const cartItems = await cartModel.find(params)
      .populate([
        { path: 'vendorId' },
        { path: 'productId' }
      ]);
    return res.send(cartItems);
  } catch (err) {
    console.log(err);
    return res.json({ status: 500 });
  }
});

router.get("/count", customerMiddleware, async (req, res) => {
  const customer = req.customer;
  try {
    const count = await cartModel.countDocuments({
      customerId: customer._id,
      status: "active",
    });
    return res.json({ status: 200, count });
  } catch (err) {
    console.log(err);
    return res.json({ status: 500 });
  }
});

router.post(
  "/",
  // customerMiddleware,
  // uploadMiddleware.single("image"),
  async (req, res) => {
    const { vendorId, productId, parcel, price, quantity, discount, image, subscription } = req.body;
    const { mode, buyerID } = req.query;
    try {
      const maxOrderID = await cartModel.findOne().sort({ orderId: -1 });
      const saveJson = {
        orderId: maxOrderID ? maxOrderID.orderId + 1 : 1,
        vendorId,
        productId,
        price,
        quantity,
        image,
        discount,
        subscription,
        parcel,
        status: 'active',
        buymode: 'one-time',
      };
      if (mode === 'customer') {
        saveJson.customerId = buyerID;
      } else {
        saveJson.guestId = buyerID;
      }
      const result = await cartModel.create(saveJson);
      const cartItem = await cartModel.findById(result._id).populate([
        { path: 'productId' },
        { path: 'vendorId' }
      ]);
      res.send({ status: 200, cartItem });
    } catch (err) {
      console.log(err);
    }
  }
);

router.post('/migrate', customerMiddleware, async (req, res) => {
  const { guestId } = req.body;
  const customer = req.customer;

  try {
    const cartItems = await cartModel.find({ guestId });
    await Promise.all(cartItems.map(item => {
      item.customerId = customer._id;
      return item.save();
    }));
    return res.send({ status: 200 });
  } catch (err) {
    console.log(err);
  }
});

router.post("/checkout", customerMiddleware, async (req, res) => {
  const { cartItems, donation } = req.body;
  const customer = req.customer;

  try {
    await Promise.all(cartItems.map(async item => {
      const cartItem = await cartModel.findById(item._id).populate([
        { path: 'vendorId' },
        { path: 'productId' }
      ]);
      const orderItem = {
        orderID: cartItem.orderId,
        vendorID: cartItem.vendorId._id,
        customerID: customer._id,
        deliveryType: cartItem.deliveryType,
        product: {
          ...pick(cartItem, ['price', 'quantity', 'discount', 'image', 'subscription']),
          name: cartItem.productId.name,
          category: cartItem.productId.category,
          tags: cartItem.productId.tags,
          description: cartItem.productId.shortDesc,
          soldByUnit: cartItem.productId.soldByUnit
        },
        orderDate: new Date()
      };
      let targetAddress = '', instruction = '';

      if (cartItem.buymode === 'recurring') {
        if (cartItem.subscription.iscsa) {
          const subscribe = cartItem.subscription.csa.frequency;
          const subTexts = subscribe.split('-');

          orderItem.subscription = {
            iscsa: true,
            csa: { ...cartItem.subscription.csa, cycle: 1 },
            frequency: {
              interval: Number(subTexts[0]),
              period: subTexts[1]
            }
          };
        } else {
          const subscribe = cartItem.subscription.subscribe;
          const subTexts = subscribe.split('-');

          orderItem.subscription = {
            iscsa: false,
            frequency: {
              interval: Number(subTexts[0]),
              period: subTexts[1]
            }
          };
        }
      }

      if (cartItem.deliveryType === 'Shipping') {
        const shipment = await shipmentModel.findOne({ cartID: cartItem._id });
        const shippoAccountID = cartItem.vendorId.shippoAccountID;
        const transaction = await createTransaction({
          accountID: shippoAccountID,
          shipment: {
            addressFrom: shipment.addressFrom,
            addressTo: shipment.addressTo,
            parcels: shipment.parcels
          },
          carrierAccount: shipment.carrierAccount,
          servicelevelToken: shipment.serviceLevelToken
        });
        const webhook = await createWebhook({
          carrier: transaction.rate.provider,
          trackingNumber: transaction.tracking_number,
        });
        console.log(webhook);
        const { rate: { amount, servicelevel_name } } = transaction;
        const { tracking_number, tracking_status: {
          status, status_details, status_date
        } } = webhook;

        orderItem.shippingInfo = {
          trackingNumber: tracking_number,
          trackingStatus: {
            status,
            statusDetails: status_details,
            statusDate: status_date
          },
          rate: {
            service: servicelevel_name,
            amount: Number(amount)
          }
        }
      }

      if (cartItem.deliveryType === 'Shipping' || cartItem.deliveryType === 'Home Delivery') {
        const { delivery } = cartItem;
        const { street, city, state, zipcode } = cartItem.delivery || {};
        instruction = delivery.instruction;
        targetAddress = `${street} ${city}, ${state} ${zipcode}`;
      } else if (cartItem.deliveryType === 'Pickup Location') {
        const { pickuplocation } = cartItem;
        instruction = pickuplocation.instruction;
        targetAddress = pickuplocation.address;
      }
      orderItem.deliveryInfo = {
        classification: cartItem.buymode === 'recurring' ? `Subscription, ${cartItem.deliveryType}` : cartItem.deliveryType,
        address: targetAddress,
        instruction, isSubstitute: false
      };
      if (cartItem.gift) orderItem.gift = cartItem.gift.receiver;
      if (cartItem.personalization) orderItem.personalization = cartItem.personalization.message;
      if (cartItem.deliveryType === 'Pickup Location') {
        const { pickupDate, pickupTime } = cartItem.pickuplocation;
        orderItem.locationInfo = {
          ...cartItem.pickuplocation, pickDate: pickupDate, pickTime: `${pickupTime.from} ${pickupTime.to}`
        }
      };

      await orderModel.create(orderItem);
      return Promise.resolve();
    }));

    res.send({ status: 200 });
  } catch (err) {
    console.log(err);
    return res.json({ status: 500 });
  }
});

router.post('/shipping', async (req, res) => {
  try {
    const { id } = req.query;
    const { recipient, delivery } = req.body;
    const cartItem = await cartModel.findById(id).populate([
      { path: 'vendorId' },
      { path: 'productId' }
    ]);
    const vendor = cartItem.vendorId;

    if (!vendor.shipping?.address || !vendor.shippoAccountID)
      return res.send({ status: 400, message: 'Vendor shipping information invalid.' });
    if (!cartItem.parcel)
      return res.send({ status: 400, message: 'Parcel is not selected for the product.' });

    const fromAddress = {
      ...vendor.shipping.address,
      name: vendor.business.owner,
      email: vendor.business.email,
      phone: vendor.business.phone,
    }
    const toAddress = { ...recipient, ...delivery, country: 'US' };
    const parcels = [cartItem.parcel];

    const shipment = await createShipment({
      accountID: vendor.shippoAccountID,
      fromAddress, toAddress, parcels
    });
    const checkShipment = await shipmentModel.findOne({ cartID: cartItem._id });
    if (!checkShipment) {
      await shipmentModel.create({
        cartID: cartItem._id,
        addressFrom: fromAddress,
        addressTo: toAddress,
        parcels
      });
    } else {
      await shipmentModel.findOneAndUpdate({ cartID: cartItem._id }, {
        addressFrom: fromAddress,
        addressTo: toAddress,
        parcels
      });
    }

    const services = vendor.shipping.services || [];
    const shipmentRates = shipment.rates;
    const allowedRates = services.map(service => {
      const rateItem = shipmentRates.find(rate => rate.servicelevel.token === service);
      return rateItem;
    }).filter(item => item)
      .map(item => ({
        name: `${item.provider} - ${item.servicelevel.name} $${item.amount}`,
        amount: item.amount,
        serviceLevelToken: item.servicelevel.token,
        carrierAccount: item.carrier_account
      }));

    if (!cartItem.shipping) cartItem.shipping = {};
    cartItem.shipping.rates = allowedRates;
    cartItem.deliveryType = 'Shipping';
    await cartItem.save();

    res.send({ status: 200, rates: allowedRates });
  } catch (err) {
    throw err;
  }
});

router.put('/total', async (req, res) => {
  try {
    const cartItems = req.body;
    await Promise.all(
      cartItems.map(item => {
        return new Promise((resolve) => resolve(
          cartModel.findByIdAndUpdate(item._id, item)
        ))
      })
    );
    res.json({ status: 200 });
  } catch (err) {
    throw err;
  }
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const {
    quantity,
    subscription,
    gift,
    deliveryType,
    pickuplocation,
    fulfillday,
    shipping,
  } = req.body;
  try {
    const cartItem = await cartModel.findById(id).populate([
      { path: 'vendorId' }
    ]);
    if (!cartItem) {
      return res.json({ status: 404 });
    }
    if (quantity) cartItem.quantity = quantity;
    if (subscription) {
      cartItem.subscription = subscription;
      cartItem.buymode = 'recurring';
    }
    if (gift) cartItem.gift = gift;
    if (deliveryType || deliveryType === '') {
      console.log('Delivery type', deliveryType);
      if (cartItem.deliveryType === 'Shipping' && deliveryType === '') {
        cartItem.shipping = { rates: [], carrierAccount: '', serviceLevelToken: '', charge: 0 };
      };
      cartItem.deliveryType = deliveryType;
    }
    if (pickuplocation) cartItem.pickuplocation = pickuplocation;
    if (fulfillday) cartItem.fulfillday = fulfillday;
    if (shipping) {
      cartItem.shipping = shipping;

      const { carrierAccount = '', serviceLevelToken = '' } = shipping;
      await shipmentModel.findOneAndUpdate({ cartID: cartItem._id },
        { carrierAccount, serviceLevelToken });
    }

    await cartItem.save();
    return res.json({ status: 200 });
  } catch (err) {
    console.log(err);
    return res.json({ status: 500 });
  }
});

router.delete("/:id", /*customerMiddleware,*/ async (req, res) => {
  const { id } = req.params;
  try {
    await cartModel.findByIdAndDelete(id);
    return res.json({ status: 200 });
  } catch (err) {
    return res.json({ status: 500 });
  }
});

export default router;
