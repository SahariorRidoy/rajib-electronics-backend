## Remove Product Images Migration

This script removes all images array data from the MongoDB products collection while keeping all other data intact.

### How to Run:

```bash
npx tsx src/scripts/remove-product-images.ts
```

### What it does:
- Connects to your MongoDB database
- Updates ALL products in the collection
- Sets the `images` array to empty `[]` for each product
- Keeps all other fields untouched (title, slug, price, description, colorVariants, etc.)

### Result:
- After running, all products will have `images: []` instead of containing image URLs
- All other product data remains completely unchanged

### Note:
Make sure your `.env` file has `MONGODB_URI` configured before running this script.
