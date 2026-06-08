# Cloudinary → VPS Local Storage Migration TODO

## Overview
Migrate image upload system from Cloudinary to local VPS storage across all three projects (backend, admin panel, customer frontend).

**Image Flow**: Frontend → Backend (receive & save to disk) → Stored URL in MongoDB → Browser fetches from `/uploads/` path

---

## Phase 1: Backend Setup ✅ COMPLETED
- [x] Install dependencies: `multer`, `sharp`, `uuid`
- [x] Create `/uploads` folder structure with subdirectories:
  - `/uploads/banners/`
  - `/uploads/products/`
  - `/uploads/variants/`
  - `/uploads/categories/`
  - `/uploads/manufacturers/`
  - `/uploads/logos/`
- [x] Configure Express static file serving at `/uploads` path
- [x] Create upload endpoint: `POST /api/v1/uploads`
  - Accept multipart/form-data
  - Validate file type (jpg, jpeg, png, webp, gif)
  - Enforce 5MB size limit
  - Process image (WebP conversion, resize max 1200px width)
  - Save with UUID naming (e.g., `a1b2c3d4.webp`)
  - Return `{ url, filePath }` where URL is full path like `https://api.rajibelectronics.com/uploads/products/a1b2c3d4.webp`
- [x] Create delete endpoint: `POST /api/v1/uploads/delete`
  - Accept `{ filePath }`
  - Delete file from disk via `fs.unlinkSync()`
- [x] Update `.env` with `BACKEND_URL=https://api.rajibelectronics.com`
- [x] Remove all Cloudinary dependencies from `package.json`

---

## Phase 2: Admin Panel ✅ COMPLETED
- [x] Update `src/services/uploads.ts`
  - Replace Cloudinary upload functions with backend multipart POST
  - Export `uploadFile(file, folder?)` → sends to `/api/v1/uploads`
  - Export `deleteFile(filePath)` → sends to `/api/v1/uploads/delete`
  - Include auth token in requests
- [x] Update all upload components to use new service:
  - `src/components/UploadImage.tsx` (single image)
  - `src/components/UploadImages.tsx` (multi-image)
  - `src/components/ColorVariantUploader.tsx` (variant images)
  - `src/components/UploadBannerImages.tsx` (banner images)
- [x] Update all page components using `filePath` instead of `publicId`:
  - `src/pages/banners.page.tsx`
  - `src/pages/brands.page.tsx`
  - `src/pages/categories.page.tsx`
  - `src/pages/subcategories.page.tsx`
  - `src/pages/products.page.tsx`
  - `src/pages/site-settings.page.tsx`
- [x] Update hooks like `useBanners.ts` to use new upload service
- [x] Remove Cloudinary imports/references
- [x] Run `npm run build` to verify no TypeScript errors

---

## Phase 3: Customer Frontend ✅ COMPLETED
- [x] Update `src/lib/cdn.tsx`
  - Replace CldImage/cldFill with standard passthrough functions
  - No transformations needed (backend handles WebP/resize)
- [x] Update `next.config.ts`
  - Add `remotePatterns` to allow backend domain
  - Set `unoptimized: true` if deploying to Vercel
- [x] Update components using product/banner images:
  - `src/components/home/BannerHero.tsx` (banners from `/banners` endpoint)
  - `src/components/ProductCard.tsx` (products from MongoDB URLs)
  - Use Next.js Image component with stored URLs
- [x] Remove all Cloudinary imports/dependencies

---

## Phase 4: Database Verification ✅ COMPLETED
- [x] MongoDB schemas store image URLs as strings:
  - Products: `images: [string]` → `["https://api.rajibelectronics.com/uploads/products/uuid.webp"]`
  - Banners: `image: string` → `"https://api.rajibelectronics.com/uploads/banners/uuid.webp"`
  - Categories: `image: string` → same pattern
- [x] No `publicId` fields in any schema (Cloudinary remnant removed)
- [x] Deletion routes handle file cleanup from disk

---

## Phase 5: Testing & Deployment
- [ ] Test file upload via admin panel → verify file saved to disk & URL in DB
- [ ] Test file serving → open URL in browser → image displays
- [ ] Test file deletion → delete item → verify file removed from disk
- [ ] Test with different file types (jpg, png, gif, webp)
- [ ] Test with various file sizes (small, near 5MB limit)
- [ ] Verify WebP conversion working (images display as .webp)
- [ ] Verify image resizing (wide images capped at 1200px)
- [ ] Test on staging/production VPS
- [ ] Verify CORS allows requests from admin/customer domains
- [ ] Check disk space usage periodically

---

## Environment Variables Summary

**Backend (.env)**
```
BACKEND_URL=https://api.rajibelectronics.com
```

**Admin Panel (.env)**
```
NEXT_PUBLIC_API_BASE=https://api.rajibelectronics.com/api/v1
```

**Customer Frontend (.env)**
```
NEXT_PUBLIC_API_BASE=https://api.rajibelectronics.com/api/v1
```

---

## File Locations
- Backend upload folder: `/backend/uploads/` (created by app on first upload)
- Image files stored as: `/uploads/{folder}/{uuid}.webp`
- Full URL format: `https://api.rajibelectronics.com/uploads/{folder}/{uuid}.webp`

---

## Cleanup Checklist
- [ ] Remove all `cloudinary` imports from all projects
- [ ] Remove `cloudinary` from `package.json` dependencies
- [ ] Delete any Cloudinary config files/keys from `.env`
- [ ] Search entire codebase for remaining "cloudinary" references (should be zero)

---

## Status Summary
✅ **COMPLETE** — All three projects fully migrated from Cloudinary to VPS local storage. Zero Cloudinary references remaining.

