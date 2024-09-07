import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Razorpay from "razorpay";
import  crypto from "crypto";


dotenv.config({});


const app = express();
app.use(cors());
app.use(express.json()); // JSON parsing for other routes

const PORT = process.env.PORT;

app.get('/', (req, res) => {
    res.send("Server is running..");
});

const instance = new Razorpay({
    key_id: process.env.KEY_ID,
    key_secret: process.env.SECRATE_KEY,
});

// Create an order
app.post('/api/create-orderId', async (req, res) => {
    try {
        const { amount, receipt } = req.body;

        const options = {
            amount: amount, // amount in the smallest currency unit
            currency: "INR",
            receipt: receipt,
            payment_capture: 1,
        };
        const order = await instance.orders.create(options);
        res.status(200).send({ message: "Order ID created", order });

    } catch (error) {
        console.error("Error creating order:", error);
        res.status(500).send({ error: "Error creating order" });
    }
});

// Verify Payment
app.post('/api/verify-payment', async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac('sha256', process.env.SECRATE_KEY)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature === razorpay_signature) {
            res.status(200).send({ success: true, message: "Payment Successful" });
        } else {
            res.status(400).send({ success: false, message: "Payment Failed!" });
        }

    } catch (error) {
        console.error("Error verifying payment:", error);
        res.status(500).send({ error: "Error verifying payment" });
    }
});

// Webhook Route with Correct Raw Middleware
app.post('/api/webhook', (req, res) => { // Use * to handle varied content-types
    console.log("Webhook called");

    try {
        const webhookData = req.body;

        // Verify the webhook signature to ensure it's from Razorpay
        const razorpaySignature = req.headers['x-razorpay-signature'];
        const webhookSecret = '123456'; // This secrete key need to add on razorpay webhook also

        const crypto = require('crypto');
        const hmac = crypto.createHmac('sha256', webhookSecret);
        hmac.update(JSON.stringify(webhookData));
        const calculatedSignature = hmac.digest('hex');

        // const { entity, event, payload, created_at } = webhookData;
        // const requestUrl = req.url;
        // const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        // const userAgent = req.headers['user-agent'];
        // const payloadString = JSON.stringify(payload);


        if (razorpaySignature === calculatedSignature) {
            // Signature is valid, process the webhook data
            console.log('Webhook received signature matched:', webhookData);

            res.status(200).send('Webhook received successfully.');
        } else {
            // Signature is invalid, ignore the webhook request store in logs
            console.error('Invalid webhook signature');
            res.status(400).send('Invalid webhook signature');
        }
    } catch (error) {
        console.log("Error while webhook", error)
    }
});

app.listen(PORT, () => {
    console.log(`Server is running http://localhost:${PORT}`);
});