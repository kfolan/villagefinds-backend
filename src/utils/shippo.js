import axios from "axios";
import express from "express";

import { SHIPPO_SECRET_KEY, SHIPPO_API_VERSION, TEST_MODE } from '../config';

const router = express.Router();
const shippoClient = axios.create({
    baseURL: 'https://api.goshippo.com',
    headers: {
        'Authorization': `ShippoToken ${SHIPPO_SECRET_KEY}`,
        'Content-Type': 'application/json',
        'SHIPPO-API-VERSION': SHIPPO_API_VERSION
    },
    proxy: false
});

// const shippoClient = new Shippo({
//     apiKeyHeader: SHIPPO_SECRET_KEY,
//     shippoApiVersion: "2018-02-08",
// });

const createShippoAccount = async ({ name = '', email = '', companyName = '' }) => {
    try {
        const names = name.split(' ');
        const accountData = {
            first_name: names[0] || '',
            last_name: names[1] || '',
            email: email,
            company_name: companyName,

        };
        const account = await shippoClient.post('/shippo-accounts', accountData).then(response => response.data);
        return account;
    } catch (err) {
        if (err.statusCode === 201) {
            const account = JSON.parse(err.body);
            return account;
        } else {
            throw err;
        }
    }
}

const retrieveShippoAccount = async (accountID) => {
    try {
        const account = await shippoClient.get(`/shippo-accounts/${accountID}`).then(response => response.data);
        return account;
    } catch (err) {
        throw err;
    }
}

const createCarrierAccount = async ({ accountID, carrier, parameters }) => {
    try {
        // const account = await shippoClient.carrierAccounts.create({
        //     accountId: accountID,
        //     carrier: type,
        //     parameters: {},
        //     active: true,
        //     test: true
        // });
        const carrierAccount = {
            carrier, parameters, active: true, test: TEST_MODE
        }
        const account = await shippoClient.post('/carrier_accounts/register/new', carrierAccount, {
            headers: {
                'SHIPPO-ACCOUNT-ID': accountID
            }
        }).then(response => response.data);
        return account;
    } catch (err) {
        throw err;
    }
}

const createParcel = async ({ accountID, parcel }) => {
    try {
        const result = await shippoClient.post('/parcels', {
            length: `${parcel.length}`,
            width: `${parcel.width}`,
            height: `${parcel.height}`,
            distance_unit: `${parcel.sizeUnit}`,
            weight: `${parcel.maxWeight}`,
            mass_unit: `${parcel.massUnit}`
        }, {
            'SHIPPO-ACCOUNT-ID': accountID
        }).then(response => response.data);

        console.log('Parcel created:', result);
        return Promise.resolve(result);
    } catch (err) {
        throw err;
    }
}

const convertParcelForm = (parcel) => {
    const { width, height, length, weight, massUnit, distanceUnit } = parcel;
    return { width, height, length, weight, mass_unit: massUnit, distance_unit: distanceUnit };
}

const createShipment = async ({ accountID, fromAddress, toAddress, parcels = [] }) => {
    try {
        const shipmentData = {
            address_from: fromAddress,
            address_to: toAddress,
            parcels: parcels.map(parcel => convertParcelForm(parcel))
        };
        const shipment = await shippoClient.post('/shipments', shipmentData, {
            headers: {
                'SHIPPO-ACCOUNT-ID': accountID
            }
        }).then(response => response.data);
        return Promise.resolve(shipment);
    } catch (err) {
        throw err;
    }
}

const retrieveShipment = async (shipmentID) => {
    try {
        const shipment = await shippoClient.shipments.get(shipmentID);
        return shipment;
    } catch (err) {
        throw err;
    }
}

const retrieveRates = async (shipmentID) => {
    try {
        const rates = await shippoClient.rates.listShipmentRates(shipmentID);
        return rates;
    } catch (err) {
        throw err;
    }
}

const createTransaction = async ({ accountID, shipment: { addressFrom, addressTo, parcels }, carrierAccount, servicelevelToken }) => {
    try {
        const transactionData = {
            shipment: {
                address_from: addressFrom,
                address_to: addressTo,
                parcels: parcels.map(item => convertParcelForm(item))
            },
            carrier_account: carrierAccount,
            servicelevel_token: servicelevelToken
        }
        const transaction = await shippoClient.post('/transactions', transactionData, {
            headers: {
                'SHIPPO-ACCOUNT-ID': accountID
            }
        }).then(response => response.data);
        return transaction;
    } catch (err) {
        throw err;
    }
}

const createWebhook = async ({ carrier, trackingNumber }) => {
    try {
        const webhook = await shippoClient.post('/tracks', {
            carrier: TEST_MODE ? 'shippo' : carrier,
            tracking_number: TEST_MODE ? 'SHIPPO_TRANSIT' : trackingNumber,
        }).then(response => response.data);
        return webhook;
    } catch (err) {
        throw err;
    }
}

export {
    createShippoAccount,
    retrieveShippoAccount,
    createCarrierAccount,
    createParcel,
    createShipment,
    retrieveShipment,
    retrieveRates,
    createTransaction,
    createWebhook
};
export default router;
