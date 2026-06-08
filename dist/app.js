import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";
import products from "./routes/v1/product.routes.js";
// import orders from "./routes/v1/order.routes.js";
import health from "./routes/v1/health.routes.js";
import categories from "./routes/v1/category.routes.js";
import subcategories from "./routes/v1/subcategory.routes.js";
import adminAuth from "./routes/v1/admin.auth.routes.js";
import adminProducts from "./routes/v1/admin.product.routes.js";
import adminCategories from "./routes/v1/admin.category.routes.js";
import adminSubcategories from "./routes/v1/admin.subcategory.routes.js";
import adminManufacturers from "./routes/v1/admin.manufacturer.routes.js";
import adminInventory from "./routes/v1/admin.inventory.routes.js";
import adminNotifications from "./routes/v1/admin.notification.routes.js";
import adminCustomers from "./routes/v1/admin.customer.routes.js";
import uploads from "./routes/v1/uploads.routes.js";
import banners from "./routes/v1/banner.routes.js";
import adminBanners from "./routes/v1/admin.banner.routes.js";
import customerOrders from "./routes/v1/customer.orders.routes.js";
import customerAuth from "./routes/v1/customer.auth.routes.js";
import adminDelivery from "./routes/v1/admin.delivery.routes.js";
import adminSettings from "./routes/v1/admin.settings.routes.js";
import adminReturns from "./routes/v1/admin.returns.routes.js";
import delivery from "./routes/v1/delivery.routes.js";
import settings from "./routes/v1/settings.routes.js";
import promoRouter from "./routes/v1/promocard.routes.js";
import manufacturerRouter from "./routes/v1/manufacturer.routes.js";
import publicInvoiceRouter from "./routes/v1/invoicePublic.routes.js";
import { env } from "./env.js";
import { errorMiddleware } from "./middlewares/error.js";
import invoiceRouter from "./routes/v1/invoice.routes.js";
import adminInvoicesRouter from "./routes/v1/adminInvoice.routes.js";
import OrdersRouter from "./routes/v1/order.routes.js";
import stockRouter from "./routes/v1/stock.routes.js";
import adminCourier from "./routes/v1/admin.courier.routes.js";
import invoicePdfRoutes from "./routes/v1/invoicePdf.routes.js";
const app = express();
// replace existing corsOptions block with this
const allowedOrigins = (env.CORS_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
// console.log("CORS allowed origins:", allowedOrigins);
const corsOptions = {
    origin: function (origin, callback) {
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin))
            return callback(null, true);
        return callback(null, false);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
        "Content-Type",
        "Accept",
        "Authorization",
        "X-Requested-With",
        "X-Idempotency-Key",
        "X-Request-Id",
    ],
    exposedHeaders: ["X-Request-Id", "Content-Length"],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));
// Defensive explicit options handler — ensures the exact headers on preflight
app.options("*", (req, res) => {
    const origin = req.get("Origin");
    if (origin && allowedOrigins.includes(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
    }
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept, Authorization, X-Requested-With, X-Idempotency-Key, X-Request-Id");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    return res.status(204).end();
});
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
//  Rate limit
if (process.env.NODE_ENV === "production") {
    const limiter = rateLimit({
        windowMs: 1 * 60 * 1000,
        limit: 500,
        message: "Too many requests, please try again later.",
    });
    app.use(limiter);
}
app.use(bodyParser.json({ limit: "1mb" }));
// Serve uploaded images as static files with CORS headers
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsPath = path.resolve(process.cwd(), "uploads");
app.use("/uploads", (req, res, next) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.set("Cross-Origin-Resource-Policy", "cross-origin");
    next();
}, express.static(uploadsPath));
//  Routes
app.get("/", (req, res) => {
    res.json({
        ok: true,
        message: "🛍 Rajib Elecronics Backend API running",
        timestamp: new Date().toISOString(),
    });
});
app.use("/api/v1", health);
app.use("/api/v1", products);
// app.use("/api/v1", orders);
app.use("/api/v1", customerOrders);
app.use("/api/v1", categories);
app.use("/api/v1", subcategories);
app.use("/api/v1", banners);
app.use("/api/v1", uploads);
app.use("/api/v1", customerAuth);
app.use("/api/v1", settings);
app.use("/api/v1/invoices", publicInvoiceRouter);
app.use("/api/v1", OrdersRouter);
// অন্য routes-এর সাথে add করুন
app.use("/api/v1", invoicePdfRoutes);
app.use("/api/v1/admin/invoices", adminInvoicesRouter);
app.use("/api/v1/admin/invoices", invoiceRouter);
app.use("/api/v1/admin", adminBanners);
app.use("/api/v1/admin", adminAuth);
app.use("/api/v1/admin", adminProducts);
app.use("/api/v1/admin", adminCategories);
app.use("/api/v1/admin", adminSubcategories);
app.use("/api/v1/admin", adminManufacturers);
app.use("/api/v1/admin", adminInventory);
app.use("/api/v1/admin", adminNotifications);
app.use("/api/v1/admin", adminCustomers);
app.use("/api/v1/admin", adminReturns);
app.use("/api/v1/admin", adminDelivery);
app.use("/api/v1/admin", adminCourier);
app.use("/api/v1/admin", adminSettings);
app.use("/api/v1", delivery);
app.use("/api/v1/promocard", promoRouter);
app.use("/api/v1/manufacturers", manufacturerRouter);
app.use("/api/v1", stockRouter);
app.use((req, res) => res.status(404).json({ ok: false, code: "NOT_FOUND" }));
app.use(errorMiddleware);
export default app;
