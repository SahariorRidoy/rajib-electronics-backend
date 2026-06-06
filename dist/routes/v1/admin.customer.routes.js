import { Router } from "express";
import { dbConnect } from "../../db/connection.js";
import { Customer } from "../../models/Customer.js";
import { Order } from "../../models/Order.js";
import { requireAdmin } from "../../middlewares/auth.js";
const router = Router();
// GET /admin/customers - Get all customers (both registered users and auto-created)
router.get("/customers", requireAdmin, async (req, res, next) => {
    try {
        await dbConnect();
        const page = Math.max(1, Number(req.query.page ?? 1));
        const limit = Math.min(200, Math.max(1, Number(req.query.limit ?? 50)));
        const search = typeof req.query.search === "string" ? req.query.search.trim() : null;
        const filter = {};
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                { phone: { $regex: search, $options: "i" } },
            ];
        }
        const customers = await Customer.find(filter)
            .select("-passwordHash -resetToken -resetTokenExpiry")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();
        const total = await Customer.countDocuments(filter);
        // Get order count for each customer
        const customersWithOrders = await Promise.all(customers.map(async (customer) => {
            const orderCount = customer.phone
                ? await Order.countDocuments({ "customer.phone": customer.phone })
                : 0;
            return {
                ...customer,
                _id: customer._id.toString(),
                orderCount,
            };
        }));
        res.json({
            ok: true,
            data: {
                items: customersWithOrders,
                total,
                page,
                limit,
                pages: Math.ceil(total / limit),
            },
        });
    }
    catch (err) {
        next(err);
    }
});
// GET /admin/users - Get only registered users (not auto-created customers)
router.get("/users", requireAdmin, async (req, res, next) => {
    try {
        await dbConnect();
        const page = Math.max(1, Number(req.query.page ?? 1));
        const limit = Math.min(200, Math.max(1, Number(req.query.limit ?? 50)));
        const search = typeof req.query.search === "string" ? req.query.search.trim() : null;
        const filter = {
            $or: [
                { isAutoCreated: { $exists: false } },
                { isAutoCreated: false }
            ]
        };
        if (search) {
            filter.$and = [
                filter,
                {
                    $or: [
                        { name: { $regex: search, $options: "i" } },
                        { email: { $regex: search, $options: "i" } },
                        { phone: { $regex: search, $options: "i" } },
                    ]
                }
            ];
            delete filter.$or;
        }
        const users = await Customer.find(filter)
            .select("-passwordHash -resetToken -resetTokenExpiry")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();
        const total = await Customer.countDocuments(filter);
        // Get order count for each user
        const usersWithOrders = await Promise.all(users.map(async (user) => {
            const orderCount = user.phone
                ? await Order.countDocuments({ "customer.phone": user.phone })
                : 0;
            return {
                ...user,
                _id: user._id.toString(),
                orderCount,
            };
        }));
        res.json({
            ok: true,
            data: {
                items: usersWithOrders,
                total,
                page,
                limit,
                pages: Math.ceil(total / limit),
            },
        });
    }
    catch (err) {
        next(err);
    }
});
// GET /admin/customers/:id - Get single customer details
router.get("/customers/:id", requireAdmin, async (req, res, next) => {
    try {
        await dbConnect();
        const customer = await Customer.findById(req.params.id)
            .select("-passwordHash -resetToken -resetTokenExpiry")
            .lean();
        if (!customer) {
            return res.status(404).json({ ok: false, code: "CUSTOMER_NOT_FOUND" });
        }
        const orderCount = customer.phone
            ? await Order.countDocuments({ "customer.phone": customer.phone })
            : 0;
        res.json({
            ok: true,
            data: {
                ...customer,
                _id: customer._id.toString(),
                orderCount,
            },
        });
    }
    catch (err) {
        next(err);
    }
});
// GET /admin/customers/:id/orders - Get all orders for a specific customer
router.get("/customers/:id/orders", requireAdmin, async (req, res, next) => {
    try {
        await dbConnect();
        const page = Math.max(1, Number(req.query.page ?? 1));
        const limit = Math.min(200, Math.max(1, Number(req.query.limit ?? 50)));
        const customer = await Customer.findById(req.params.id);
        if (!customer) {
            return res.status(404).json({ ok: false, code: "CUSTOMER_NOT_FOUND" });
        }
        if (!customer.phone) {
            return res.json({
                ok: true,
                data: {
                    items: [],
                    total: 0,
                    page,
                    limit,
                    pages: 0,
                },
            });
        }
        const orders = await Order.find({ "customer.phone": customer.phone })
            .populate({
            path: "lines.productId",
            select: "title slug price image images stock availableStock categorySlug subcategorySlug brand manufacturer"
        })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();
        const total = await Order.countDocuments({ "customer.phone": customer.phone });
        const formattedOrders = orders.map((order) => ({
            ...order,
            _id: order._id.toString(),
            lines: order.lines.map((line) => ({
                qty: line.qty,
                title: line.title,
                price: line.price,
                image: line.image,
                productId: line.productId?._id ? String(line.productId._id) : String(line.productId),
                product: line.productId?._id ? {
                    _id: String(line.productId._id),
                    title: line.productId.title,
                    slug: line.productId.slug,
                    price: line.productId.price,
                    image: line.productId.image,
                    images: line.productId.images,
                    stock: line.productId.stock,
                    availableStock: line.productId.availableStock,
                    categorySlug: line.productId.categorySlug,
                    subcategorySlug: line.productId.subcategorySlug,
                    brand: line.productId.brand,
                    manufacturer: line.productId.manufacturer,
                } : null,
            })),
        }));
        res.json({
            ok: true,
            data: {
                items: formattedOrders,
                total,
                page,
                limit,
                pages: Math.ceil(total / limit),
            },
        });
    }
    catch (err) {
        next(err);
    }
});
export default router;
