import stripe from "stripe";
import express from "express";

import {
  STRIPE_SECRET_KEY,
  STRIPE_CONNECT_WEBHOOK_SIGN,
  STRIPE_REFRESH_URI,
  STRIPE_SUCCESS_FRONTEND_URI
} from "../config";
import cartModel from "../model/cart.model";
import customerMiddleware from "../middleware/customer.middleware";
import stripeAccountModel from "../model/stripeaccount.model";
import vendorModel from "../model/vendor.model";

const router = express.Router();
const stripeClient = new stripe(STRIPE_SECRET_KEY);

const createAccount = async (vendor) => {
  try {
    const account = await stripeClient.accounts.create({
      type: 'express',
      country: 'US',
      email: vendor.business.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });
    return account;
  } catch (error) {
    throw error;
  }
};

const createAccountLink = async (account) => {
  try {
    const accountLink = await stripeClient.accountLinks.create({
      account: account.id,
      refresh_url: STRIPE_REFRESH_URI,
      return_url: STRIPE_SUCCESS_FRONTEND_URI,
      type: 'account_onboarding',
    });
    return accountLink;
  } catch (error) {
    throw error;
  }
};

const retrieveAccount = async (accountID) => {
  try {
    const account = await stripeClient.accounts.retrieve(accountID);
    return account;
  } catch (err) {
    throw err;
  }
}

const createCustomer = async (token, detail, connectedAccountID) => {
  // const checkCustomer = await stripeCustomerModel.findOne({
  //   customerID: customer._id,
  //   vendorConnectedID: connectedAccountID,
  //   paymentMethodID,
  // });
  // if (!checkCustomer) {
  const stripeCustomer = await stripeClient.customers.create(
    {
      name: detail.name,
      email: detail.email,
      phone: detail.phone,
      address: detail.address,
      source: token,
    },
    { stripeAccount: connectedAccountID }
  );
  // await stripeCustomerModel.create({
  //   customerID: customer._id,
  //   vendorConnectedID: connectedAccountID,
  //   paymentMethodID,
  //   stripeCustomerID: stripeCustomer.id,
  // });
  // await attachPaymentMethod(
  //   connectedAccountID,
  //   paymentMethodID,
  //   stripeCustomer.id
  // );
  return stripeCustomer;
  // } else {
  //   const stripeCustomer = await stripeClient.customers.retrieve(
  //     checkCustomer.stripeCustomerID,
  //     { stripeAccount: connectedAccountID }
  //   );
  //   await attachPaymentMethod(
  //     connectedAccountID,
  //     paymentMethodID,
  //     stripeCustomer.id
  //   );
  //   return stripeCustomer;
  // }
};

const createTransfer = async (
  amount,
  applicationFeePercent,
  connectedAccountID,
  customerID
) => {
  console.log("---------------Application Fee Percent", applicationFeePercent);
  try {
    const transfer = await stripeClient.transfers.create({
      amount: parseInt(amount * (100 - applicationFeePercent)),
      currency: "usd",
      destination: connectedAccountID,
      metadata: {
        customer_id: customerID,
      },
    });
    return transfer;
  } catch (err) {
    console.log(err);
  }
};

const createPrice = async (cart, connectedAccountID) => {
  return await stripeClient.prices.create(
    {
      unit_amount: parseInt(
        cart.price * cart.quantity * (cart.subscription.duration || 1) * 100
      ),
      currency: "usd",
      recurring: {
        interval: cart.subscription.frequency.unit,
        interval_count: cart.subscription.frequency.interval,
      },
      product_data: {
        name: cart.inventoryId.productId.name,
        metadata: {
          category: cart.inventoryId.productId.category,
        },
      },
    },
    { stripeAccount: connectedAccountID }
  );
};

// const createSubscription = async (
//   customerId,
//   priceId,
//   connectedAccountId,
//   applicationFeePercent
// ) => {
//   try {
//     const subscription = await stripeClient.subscriptions.create(
//       {
//         customer: customerId,
//         items: [{ price: priceId }],
//         application_fee_percent: applicationFeePercent, // For a percentage fee
//         // or
//         // application_fee_amount: applicationFeeAmount, // For a fixed amount fee
//         expand: ["latest_invoice.payment_intent"],
//       },
//       {
//         stripeAccount: connectedAccountId, // This header is used for making a request on behalf of a connected account
//       }
//     );

//     return subscription;
//   } catch (err) {
//     console.error("Failed to create subscription:", err);
//     // Handle errors appropriately in your app
//   }
// };

const attachPaymentMethod = async (
  connectedAccountID,
  paymentMethodID,
  customerID
) => {
  await stripeClient.paymentMethods.attach(
    paymentMethodID,
    {
      customer: customerID,
    },
    { stripeAccount: connectedAccountID }
  );
  await stripeClient.customers.update(
    customerID,
    {
      invoice_settings: {
        default_payment_method: paymentMethodID,
      },
    },
    { stripeAccount: connectedAccountID }
  );
};

const fulfillOrders = async (items, commission, accountID, customerID) => {
  try {
    // const cartItems = await cartModel
    //   .find({
    //     customerId: customerID,
    //     status: "active",
    //   })
    //   .populate({
    //     path: "vendorId",
    //   })
    //   .populate({
    //     path: "inventoryId",
    //     populate: {
    //       path: "productId",
    //     },
    //   });
    // const customer = await customerModel.findById(customerID);

    const subscriptions = items.filter(
      (item) => item.subscription && item.subscription.issubscribed
    );
    const regularItems = items.filter(
      (item) => !(item.subscription && item.subscription.issubscribed)
    );

    regularItems.forEach(async (item) => {
      createTransfer(
        item.price * item.quantity,
        commission,
        accountID,
        customerID
      );
    });
    subscriptions.forEach(async (item) => {
      const price = await createPrice(item, accountID);
      const subscription = await createSubscription(
        customerID,
        price.id,
        accountID,
        commission
      );
    });
  } catch (err) {
    console.log(err);
  }
};

// const createPaymentMethodByToken = async (token, connectedAccountID) => {
//   const paymentMethod = await stripeClient.paymentMethods.create(
//     {
//       type: "card",
//       card: { token },
//     },
//     {
//       stripeAccount: connectedAccountID,
//     }
//   );
//   return paymentMethod;
// };

async function createStripeCustomer({ email, name, vendorStripeAccountId }) {
  try {
    const customer = await stripe.customers.create(
      {
        email: email,
        name: name,
      },
      {
        stripeAccount: vendorStripeAccountId, // Create customer on the connected account
      }
    );
    return customer;
  } catch (error) {
    console.error(
      "Error creating Stripe customer on connected account:",
      error
    );
    throw error;
  }
}

async function handlePaymentAndTransfer({
  customerId,
  token,
  amount,
  applicationFee,
  connectedAccountId,
}) {
  const charge = await stripeClient.charges.create({
    amount: amount,
    currency: "usd",
    source: token,
    customer: customerId,
    application_fee_amount: applicationFee,
  });

  const transfer = await stripeClient.transfers.create({
    amount: amount * (100 - applicationFee), // Deducting the application fee
    currency: "usd",
    destination: connectedAccountId,
    source_transaction: charge.id, // Link the transfer to the original charge
  });

  return { charge, transfer };
}

// async function createOneTimePayment({
//   customerId,
//   source,
//   amount,
//   currency,
//   applicationFee,
//   vendorStripeAccountId,
// }) {
//   try {
//     const charge = await stripeClient.charges.create(
//       {
//         amount: amount, // Amount is in cents
//         currency: currency,
//         source: source, // Token created on the frontend or a saved source ID
//         customer: customerId,
//         application_fee_amount: applicationFee, // Amount in cents
//       },
//       {
//         stripeAccount: vendorStripeAccountId, // Charges the vendor's Stripe connected account
//       }
//     );

//     return charge;
//   } catch (error) {
//     console.error("Error creating one-time charge:", error);
//     throw error;
//   }
// }

async function createSubscription({
  customerId,
  priceId,
  vendorStripeAccountId,
}) {
  try {
    const subscription = await stripeClient.subscriptions.create(
      {
        customer: customerId,
        items: [{ price: priceId }],
        expand: ["latest_invoice.payment_intent"],
      },
      {
        stripeAccount: vendorStripeAccountId,
      }
    );

    return subscription;
  } catch (error) {
    console.error("Error creating subscription:", error);
    throw error;
  }
}

router.post(
  "/create-payment-method",
  express.json(),
  customerMiddleware,
  async (req, res) => {
    const customer = req.customer;
    const { token, detail } = req.body;

    try {
      // const topicItem = await cartModel.findOne({
      //   customerId: customer._id,
      //   status: "active",
      // });
      // const vendor = await vendorModel.findById(topicItem.vendorId);
      const vendorCartItems = await cartModel.aggregate([
        {
          $match: {
            customerId: customer._id,
            status: "active",
          },
        },
        {
          $group: {
            _id: {
              vendorId: "$vendorId",
            },
            items: {
              $push: {
                // Include all fields you want to show in each item array
                orderId: "$orderId",
                price: "$price",
                quantity: "$quantity",
                discount: "$discount",
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            orderId: "$_id.orderId",
            vendorId: "$_id.vendorId",
            donation: "$_id.donation",
            items: 1,
          },
        },
        {
          $lookup: {
            from: "vendors",
            localField: "vendorId",
            foreignField: "_id",
            as: "vendor",
          },
        },
        {
          $addFields: {
            vendor: { $arrayElemAt: ["$vendor", 0] },
          },
        },
      ]);

      vendorCartItems.forEach(async (cartItem) => {
        // const paymentMethod = await createPaymentMethodByToken(
        //   token,
        //   cartItem.vendor.stripeAccountID
        // );
        const accountID = cartItem.vendor.stripeAccountID;
        const stripeCustomer = await createCustomer(token, detail, accountID);
        fulfillOrders(
          cartItem.items,
          cartItem.vendor.commission || 0,
          accountID,
          stripeCustomer.id
        );
        //   // await attachPaymentMethod(
        //   //   cartItem.vendor.stripeAccountID,
        //   //   paymentMethod.id,
        //   //   stripeCustomer.id
        //   // );
        //   cartItem.items.map(async (item) => {});
      });

      return res.send({ status: 200 });
    } catch (error) {
      console.log(error);
      return res.json({ status: 400 });
    }
  }
);

router.post(
  "/webhook/platform",
  express.raw({ type: "application/json" }),
  async (request, response) => {
    const sig = request.headers["stripe-signature"];

    console.log("Stripe Connect Webhook");

    let event;
    const endpointSecret = STRIPE_CONNECT_WEBHOOK_SIGN;

    // Verify webhook signature and extract the event.
    // See https://stripe.com/docs/webhooks#verify-events for more information.
    try {
      event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
    } catch (err) {
      console.log(err);
      return response.status(400).send(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
      case "account.updated":
        const accountUpdated = event.data.object;
        const stripeAccount = await stripeAccountModel.findOne({
          stripeAccountID: accountUpdated.id,
        });
        if (stripeAccount) {
          const vendor = await vendorModel.findById(stripeAccount.vendorID);
          vendor.stripeAccountID = stripeAccount.stripeAccountID;
          await vendor.save();
        }
        // Then define and call a function to handle the event account.updated
        break;
      case "account.application.authorized":
        const accountApplicationAuthorized = event.data.object;
        // Then define and call a function to handle the event account.application.authorized
        break;
      case "account.application.deauthorized":
        const accountApplicationDeauthorized = event.data.object;
        // Then define and call a function to handle the event account.application.deauthorized
        break;
      case "account.external_account.created":
        const accountExternalAccountCreated = event.data.object;
        // Then define and call a function to handle the event account.external_account.created
        break;
      case "account.external_account.deleted":
        const accountExternalAccountDeleted = event.data.object;
        // Then define and call a function to handle the event account.external_account.deleted
        break;
      case "account.external_account.updated":
        const accountExternalAccountUpdated = event.data.object;
        // Then define and call a function to handle the event account.external_account.updated
        break;
      case "payment_intent.succeeded":
        {
          console.log("payment intent succeeded");
          // Then define and call a function to handle the successful payment intent.
        }
        break;
      case "charge.succeeded":
        console.log("charge succeeded");
        // const intent = event.data.object;
        // const paymentIntent = await paymentIntentModel.findOne({
        //   paymentIntentID: intent.payment_intent,
        // });
        // console.log(paymentIntent);
        // paymentIntent.paymentMethod = intent.payment_method;
        // await paymentIntent.save();
        // await fulfillOrders(
        //   paymentIntent.customerID,
        //   intent.payment_method_details.card,
        //   intent.billing_details
        // );
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return response.json({ received: true });
  }
);

export {
  createAccount,
  createAccountLink,
  createCustomer,
  createPrice,
  createTransfer,
  createSubscription,
  retrieveAccount
};
export default router;
