import { Router } from "express";
import mongoose from "mongoose";
import { dbConnect } from "../../db/connection.js";
import { Order } from "../../models/Order.js";
import { Product } from "../../models/Product.js";
import { Customer } from "../../models/Customer.js";
import { PendingPayment } from "../../models/PendingPayment.js";
import { SiteSettings } from "../../models/SiteSettings.js";
import { env } from "../../env.js";
const router = Router();
async function getPaystationConfig() {
    const settings = await SiteSettings.findOne().lean();
    const ps = settings?.paystationSettings;
    return {
        merchantId: ps?.merchantId || env.PAYSTATION_MERCHANT_ID,
        password: ps?.password || env.PAYSTATION_PASSWORD,
        baseUrl: ps?.baseUrl || env.PAYSTATION_BASE_URL,
    };
}
/** Creates a real order from a pending payment payload (same logic as order.routes.ts) */
async function createOrderFromPayload(payload, paymentInfo) {
    const items = Array.isArray(payload.items) ? payload.items : [];
    const normalized = items.map((it) => ({
        _id: String(it._id ?? it.productId),
        quantity: Math.max(1, Number(it.quantity ?? it.qty ?? 1)),
        original: it,
    }));
    // Deduct stock
    for (const line of normalized) {
        await Product.findOneAndUpdate({ _id: line._id, stock: { $gte: line.quantity } }, { $inc: { stock: -line.quantity } });
    }
    // Auto-create customer
    const customerPhone = payload.customer?.phone;
    if (customerPhone) {
        const exists = await Customer.findOne({ phone: customerPhone });
        if (!exists) {
            try {
                await Customer.create({
                    name: payload.customer?.name || "Customer",
                    email: `auto_${customerPhone}_${Date.now()}@customer.local`,
                    phone: customerPhone,
                    passwordHash: "AUTO_CREATED_NO_LOGIN",
                    isAutoCreated: true,
                    address: payload.customer?.address,
                });
            }
            catch {
                await Customer.create({
                    name: payload.customer?.name || "Customer",
                    email: `auto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@customer.local`,
                    phone: customerPhone,
                    passwordHash: "AUTO_CREATED_NO_LOGIN",
                    isAutoCreated: true,
                    address: payload.customer?.address,
                });
            }
        }
    }
    const order = await Order.create({
        customer: {
            name: payload.customer?.name ?? "Customer",
            phone: payload.customer?.phone ?? "",
            address: payload.customer?.address ?? "",
        },
        lines: normalized.map((n) => ({
            productId: new mongoose.Types.ObjectId(n._id),
            qty: n.quantity,
            title: n.original?.title ?? "Product",
            price: n.original?.price ?? 0,
            image: n.original?.image ?? "",
            color: n.original?.color ?? "",
        })),
        totals: payload.totals ?? { subTotal: 0, shipping: 0, grandTotal: 0 },
        status: "PENDING",
        payment: {
            method: paymentInfo.method || "ONLINE",
            status: "PAID",
            transactionId: paymentInfo.trx_id || "",
            invoiceNumber: paymentInfo.invoice_number || "",
            paidAmount: Number(paymentInfo.payment_amount) || 0,
            paidAt: new Date(),
            payerMobile: paymentInfo.payer_mobile_no || "",
        },
        deliveryZone: payload.deliveryZone === "inside" ? "inside" : "outside",
    });
    try {
        const { NotificationService } = await import("../../services/notification.service.js");
        await NotificationService.createOrderNotification(String(order._id), payload.customer?.name ?? "Customer", payload.totals?.grandTotal ?? 0);
    }
    catch { /* non-critical */ }
    return order;
}
/**
 * POST /api/v1/payment/initiate
 * Saves order payload to PendingPayment — does NOT create an order yet.
 */
router.post("/payment/initiate", async (req, res) => {
    try {
        await dbConnect();
        const { amount, customerName, customerPhone, customerEmail, customerAddress, deliveryZone, orderPayload } = req.body;
        if (!amount || !customerName || !customerPhone || !orderPayload) {
            return res.status(400).json({ ok: false, message: "Missing required fields" });
        }
        const invoiceNumber = `RE-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        const callbackUrl = `${env.BACKEND_URL}/api/v1/payment/callback`;
        const { merchantId, password, baseUrl } = await getPaystationConfig();
        const formData = new URLSearchParams();
        formData.append("merchantId", merchantId);
        formData.append("password", password);
        formData.append("invoice_number", invoiceNumber);
        formData.append("currency", "BDT");
        formData.append("payment_amount", String(amount));
        formData.append("pay_with_charge", "1");
        formData.append("cust_name", customerName);
        formData.append("cust_phone", customerPhone);
        formData.append("cust_email", customerEmail || `${customerPhone}@customer.local`);
        formData.append("cust_address", customerAddress || "Bangladesh");
        formData.append("callback_url", callbackUrl);
        formData.append("opt_a", deliveryZone || "outside");
        formData.append("checkout_items", JSON.stringify({ type: "online_payment", deliveryZone }));
        const response = await fetch(`${baseUrl}/initiate-payment`, {
            method: "POST",
            headers: { "Accept": "application/json", "Content-Type": "application/x-www-form-urlencoded" },
            body: formData.toString(),
        });
        const data = await response.json();
        if (data.status_code !== "200" || data.status !== "success") {
            return res.status(400).json({ ok: false, message: data.message || "Payment initiation failed", data });
        }
        // Save cart/order data temporarily — no order created yet
        await PendingPayment.create({ invoiceNumber, orderPayload });
        return res.json({ ok: true, paymentUrl: data.payment_url, invoiceNumber });
    }
    catch (err) {
        console.error("Payment initiate error:", err);
        return res.status(500).json({ ok: false, message: "Payment initiation failed", error: String(err) });
    }
});
/**
 * GET|POST /api/v1/payment/callback
 * PayStation redirects here after payment. Creates order only on success.
 */
async function handleCallback(req, res) {
    try {
        await dbConnect();
        const params = { ...req.query, ...req.body };
        const { invoice_number, status, trx_id, payment_amount, payment_method, payer_mobile_no } = params;
        const frontendUrl = env.CUSTOMER_FRONTEND_URL;
        if (!invoice_number) {
            return res.redirect(`${frontendUrl}/payment/failed?reason=missing_invoice`);
        }
        const pending = await PendingPayment.findOne({ invoiceNumber: invoice_number });
        if (!pending) {
            return res.redirect(`${frontendUrl}/payment/failed?reason=session_expired`);
        }
        const isSuccess = ["success", "Success", "SUCCESS", "Successful", "SUCCESSFUL"].includes(status);
        if (isSuccess) {
            // Create the real order now that payment is confirmed
            const order = await createOrderFromPayload(pending.orderPayload, {
                method: payment_method || "ONLINE",
                trx_id,
                invoice_number,
                payment_amount,
                payer_mobile_no,
            });
            // Clean up pending record
            await PendingPayment.deleteOne({ invoiceNumber: invoice_number });
            return res.redirect(`${frontendUrl}/payment/success?orderId=${order._id}&invoice=${invoice_number}&trxId=${trx_id || ""}&amount=${payment_amount || ""}`);
        }
        else {
            // Payment failed/cancelled — just delete the pending record, no order created
            await PendingPayment.deleteOne({ invoiceNumber: invoice_number });
            return res.redirect(`${frontendUrl}/payment/failed?reason=payment_failed`);
        }
    }
    catch (err) {
        console.error("Payment callback error:", err);
        return res.redirect(`${env.CUSTOMER_FRONTEND_URL}/payment/failed?reason=server_error`);
    }
}
router.get("/payment/callback", handleCallback);
router.post("/payment/callback", handleCallback);
/**
 * GET /api/v1/payment/verify/:invoiceNumber
 */
router.get("/payment/verify/:invoiceNumber", async (req, res) => {
    try {
        await dbConnect();
        const { invoiceNumber } = req.params;
        const { merchantId, baseUrl } = await getPaystationConfig();
        const formData = new URLSearchParams();
        formData.append("invoice_number", invoiceNumber);
        const response = await fetch(`${baseUrl}/transaction-status`, {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/x-www-form-urlencoded",
                "merchantId": merchantId,
            },
            body: formData.toString(),
        });
        const data = await response.json();
        if (data.status_code !== "200") {
            return res.status(400).json({ ok: false, message: data.message, data });
        }
        return res.json({ ok: true, data: data.data });
    }
    catch (err) {
        console.error("Payment verify error:", err);
        return res.status(500).json({ ok: false, message: "Verification failed", error: String(err) });
    }
});
export default router;
