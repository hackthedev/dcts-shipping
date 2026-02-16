import JSONTools from "@hackthedev/json-tools";
import path from "path";

import dSyncPay from '@hackthedev/dsync-pay';
import dSyncShop from '@hackthedev/dsync-shop';
//import dSyncPay from 'E:\\network-z-dev\\dSyncPay\\index.mjs';
//import dSyncShop from "E:\\network-z-dev\\dSyncShop\\index.mjs";


import {db} from "../../index.mjs";
import express from "express";
import {validateMemberId} from "./main.mjs";

export let paymentConfig = {}
let paymentConfigPath = path.join(path.resolve(), "configs", "payments.json")

export let payments;
export let shop;

export function initPaymentSystem(app){
    // create payments config
    JSONTools.createConfig(paymentConfigPath)

    paymentConfig = JSONTools.getConfig(paymentConfigPath)

    // setup config
    JSONTools.checkObjectKeys(paymentConfig, "paypal.sandbox.id", "xxx", true)
    JSONTools.checkObjectKeys(paymentConfig, "paypal.sandbox.secret", "xxx", true)
    JSONTools.checkObjectKeys(paymentConfig, "paypal.live.id", "xxx", true)
    JSONTools.checkObjectKeys(paymentConfig, "paypal.live.secret", "xxx", true)
    JSONTools.checkObjectKeys(paymentConfig, "paypal.use_sandbox", true, true)
    //
    JSONTools.checkObjectKeys(paymentConfig, "coinbase.key", "xxx", true)
    JSONTools.checkObjectKeys(paymentConfig, "coinbase.webhook", "xxx", true)
    JSONTools.checkObjectKeys(paymentConfig, "domain", "http://localhost:2052", true)
    //
    JSONTools.saveConfig(paymentConfigPath, paymentConfig);

    payments = new dSyncPay({
        app,
        domain: paymentConfig.domain,
        paypal: {
            clientId: paymentConfig.paypal.sandbox.id,
            clientSecret: paymentConfig.paypal.sandbox.secret,
            sandbox: paymentConfig.paypal.use_sandbox
        },
        coinbase: {
            apiKey: paymentConfig.coinbase.key,
            webhookSecret: paymentConfig.coinbase.webhook // optional
        },

        onPaymentCreated: (data) => { console.log("Payment Created", data); },
        onPaymentCompleted: (data) => { console.log("Payment completed", data);},
        onPaymentFailed: (data) => { console.log("Payment failed", data);},
        onPaymentCancelled: (data) => { console.log("Payment canceled", data);},
        onSubscriptionCreated: (data) => { console.log("sub Created", data);},
        onSubscriptionActivated: (data) => { console.log("sub activated", data);},
        onSubscriptionCancelled: (data) => { console.log("sub canceled", data);},
    });

    shop = new dSyncShop({
        app,
        express,
        payments,
        db,
        isAdmin: async (req) => {
            const token = req.headers['x-token'];
            const userId = req.headers['x-user-id'];
            if (!token || !userId) return false

            return validateMemberId(userId, null, token);
        },
        enrichMetadata: async (req) => {
            const token = req.headers['x-token'];
            const userId = req.headers['x-user-id'];
            if (!token || !userId) throw new Error('missing auth headers');

            if(!validateMemberId(userId, null, token)) throw new Error('Failed auth');

            return { userId, token };
        },
        productActions: {
            'give_role': {
                label: 'Give Role',
                params: [
                    { key: 'role', label: 'Role ID', type: 'text' }
                ],
                handler: async (metadata, product, params) => {
                    console.log(metadata, params);
                    //await giveRoleToMember(metadata.userId, params.role);
                }
            },
            'remove_role': {
                label: 'Remove Role',
                params: [
                    { key: 'role', label: 'Role ID', type: 'text' }
                ],
                handler: async (metadata, product, params) => {
                    console.log(params);
                    //await removeRoleFromMember(metadata.userId, params.role);
                }
            }
        }
    })
}