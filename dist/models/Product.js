// // src/models/Product.ts
// import mongoose from "mongoose";
// const { Schema, model, models } = mongoose;
// export interface ProductDoc extends mongoose.Document {
//   _id: mongoose.Types.ObjectId;
//   title: string;
//   slug: string;
//   images: string[]; // multiple Cloudinary URLs
//   imageIds?: string[]; // Cloudinary public IDs for delete
//   price: number;
//   compareAtPrice?: number;
//   isDiscounted?: boolean;
//   stock?: number;
//   categorySlug?: string;
//   brand?: string;
//   description?: string;
//   tagSlugs?: string[];
//   status: "ACTIVE" | "DRAFT" | "HIDDEN";
//   // ⭐ Cosmetics additions (all optional)
//   featured?: boolean;
//   shade?: string;
//   colorHex?: string;
//   size?: { unit: "ml" | "g" | "pcs"; value: number };
//   variants?: Array<{
//     sku: string;
//     shade?: string;
//     colorHex?: string;
//     size?: { unit: "ml" | "g" | "pcs"; value: number };
//     price?: number;
//     compareAtPrice?: number;
//     stock?: number;
//     image?: string;
//   }>;
//   skinType?: string[]; // ["oily","dry","combination","sensitive"]
//   hairType?: string[]; // ["dry","oily","curly","straight"]
//   concerns?: string[]; // ["acne","dandruff","dullness"]
//   ingredients?: string[]; // ["Niacinamide","Hyaluronic Acid"]
//   allergens?: string[]; // ["Fragrance","SLS"]
//   claims?: string[]; // ["paraben-free","alcohol-free","vegan","cruelty-free","halal"]
//   howToUse?: string;
//   caution?: string;
//   benefits?: string[]; // ["Brightening","Hydrating"]
//   gender?: "unisex" | "female" | "male";
//   origin?: string; // "Korea"
//   expiry?: Date;
//   batchNo?: string;
//   createdAt?: Date;
//   updatedAt?: Date;
// }
// const ProductSchema = new Schema<ProductDoc>(
//   {
//     title: { type: String, required: true, index: true },
//     slug: { type: String, required: true, unique: true },
//     images: { type: [String], default: [] },
//     imageIds: { type: [String], default: [] },
//     price: { type: Number, required: true, min: 0 },
//     compareAtPrice: { type: Number, min: 0 },
//     isDiscounted: { type: Boolean, default: false },
//     stock: { type: Number, default: 0 },
//     categorySlug: { type: String, index: true },
//     brand: { type: String, default: "Generic" },
//     description: { type: String, default: "" },
//     tagSlugs: [{ type: String, index: true }],
//     status: {
//       type: String,
//       enum: ["ACTIVE", "DRAFT", "HIDDEN"],
//       default: "ACTIVE",
//       index: true,
//     },
//     // ⭐ Cosmetics additions
//     featured: { type: Boolean, default: false, index: true },
//     shade: { type: String },
//     colorHex: { type: String },
//     size: {
//       unit: { type: String, enum: ["ml", "g", "pcs"], required: false },
//       value: { type: Number, required: false, min: 0 },
//     },
//     variants: [
//       {
//         sku: { type: String, required: true },
//         shade: String,
//         colorHex: String,
//         size: {
//           unit: { type: String, enum: ["ml", "g", "pcs"] },
//           value: { type: Number, min: 0 },
//         },
//         price: { type: Number, min: 0 },
//         compareAtPrice: { type: Number, min: 0 },
//         stock: { type: Number, min: 0 },
//         image: String,
//       },
//     ],
//     skinType: [{ type: String }],
//     hairType: [{ type: String }],
//     concerns: [{ type: String }],
//     ingredients: [{ type: String }],
//     allergens: [{ type: String }],
//     claims: [{ type: String }],
//     howToUse: { type: String },
//     caution: { type: String },
//     benefits: [{ type: String }],
//     gender: {
//       type: String,
//       enum: ["unisex", "female", "male"],
//       required: false,
//     },
//     origin: { type: String },
//     expiry: { type: Date },
//     batchNo: { type: String },
//   },
//   { timestamps: true }
// );
// ProductSchema.index({ createdAt: -1 });
// export const Product =
//   (models.Product as mongoose.Model<ProductDoc>) ||
//   model<ProductDoc>("Product", ProductSchema);
// models/Product.js
import mongoose from "mongoose";
const { Schema, model, models } = mongoose;
const SizeSchema = new Schema({ unit: String, value: Number }, { _id: false });
const ColorVariantSchema = new Schema({
    colorName: { type: String, required: true },
    colorHex: { type: String },
    image: { type: String, required: true },
    imageId: { type: String }, // Cloudinary public_id for deletion
}, { _id: false });
const VariantSchema = new Schema({
    sku: String,
    shade: String,
    colorHex: String,
    size: SizeSchema,
    price: Number,
    compareAtPrice: Number,
    stock: Number,
    image: String,
    imageId: String,
}, { _id: false });
const ProductSchema = new Schema({
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true },
    price: { type: Number, required: true, default: 0 },
    buyingPrice: { type: Number, default: 0 },
    image: { type: String, default: "" },
    images: { type: [String], default: [] },
    compareAtPrice: { type: Number },
    isDiscounted: { type: Boolean, default: false },
    featured: { type: Boolean, default: false },
    stock: { type: Number, default: 0 },
    availableStock: { type: Number },
    categorySlug: { type: String },
    subcategorySlug: { type: String },
    tagSlugs: { type: [String], default: [] },
    brand: { type: String },
    manufacturer: { type: Schema.Types.ObjectId, ref: "Manufacturer" },
    manufacturerSlug: { type: String },
    description: { type: String, default: "" },
    colorVariants: { type: [ColorVariantSchema], default: [] },
    variants: { type: [VariantSchema], default: [] },
    status: { type: String, enum: ["ACTIVE", "DRAFT", "HIDDEN"], default: "ACTIVE" },
    salesCount: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
}, { timestamps: true });
ProductSchema.index({ slug: 1 }, { unique: true });
ProductSchema.index({ categorySlug: 1 });
ProductSchema.index({ subcategorySlug: 1 });
ProductSchema.index({ tagSlugs: 1 });
ProductSchema.index({ manufacturer: 1 });
ProductSchema.index({ manufacturerSlug: 1 });
ProductSchema.index({ status: 1 });
export const Product = models.Product ||
    model("Product", ProductSchema);
