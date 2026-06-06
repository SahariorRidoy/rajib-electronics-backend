import { env } from "../env.js";
const BASE = env.PATHAO_BASE_URL || "https://courier-api-sandbox.pathao.com";
const TOKEN_URL = `${BASE}/aladdin/api/v1/issue-token`;
// ─── Token cache (in-memory) ──────────────────────────────────────────────────
let _accessToken = "";
let _refreshToken = "";
let _tokenExpiry = 0;
async function issueToken() {
    const res = await fetch(TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            client_id: env.PATHAO_CLIENT_ID,
            client_secret: env.PATHAO_CLIENT_SECRET,
            grant_type: "password",
            username: env.PATHAO_USERNAME,
            password: env.PATHAO_PASSWORD,
        }),
    });
    const data = await res.json();
    if (!data.access_token) {
        throw new Error("Pathao token issue failed: " + JSON.stringify(data));
    }
    _accessToken = data.access_token;
    _refreshToken = data.refresh_token;
    // expires_in is in seconds; subtract 60s buffer
    _tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
}
async function refreshToken() {
    const res = await fetch(TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            client_id: env.PATHAO_CLIENT_ID,
            client_secret: env.PATHAO_CLIENT_SECRET,
            grant_type: "refresh_token",
            refresh_token: _refreshToken,
        }),
    });
    const data = await res.json();
    if (!data.access_token) {
        // refresh failed — fall back to full re-issue
        await issueToken();
        return;
    }
    _accessToken = data.access_token;
    _refreshToken = data.refresh_token;
    _tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
}
async function getToken() {
    if (_accessToken && Date.now() < _tokenExpiry)
        return _accessToken;
    // Try refresh first if we have a refresh token, otherwise issue fresh
    if (_refreshToken) {
        await refreshToken();
    }
    else {
        await issueToken();
    }
    return _accessToken;
}
async function authHeaders() {
    const token = await getToken();
    return {
        "Content-Type": "application/json; charset=UTF-8",
        Authorization: `Bearer ${token}`,
    };
}
// ─── Stores ───────────────────────────────────────────────────────────────────
export async function pathaoGetStores() {
    const res = await fetch(`${BASE}/aladdin/api/v1/stores`, {
        headers: await authHeaders(),
    });
    return res.json();
}
export async function pathaoCreateStore(data) {
    const res = await fetch(`${BASE}/aladdin/api/v1/stores`, {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify(data),
    });
    return res.json();
}
// ─── Geo ──────────────────────────────────────────────────────────────────────
// Correct endpoint per docs: /aladdin/api/v1/city-list
export async function pathaoGetCities() {
    const res = await fetch(`${BASE}/aladdin/api/v1/city-list`, {
        headers: await authHeaders(),
    });
    return res.json();
}
export async function pathaoGetZones(cityId) {
    const res = await fetch(`${BASE}/aladdin/api/v1/cities/${cityId}/zone-list`, {
        headers: await authHeaders(),
    });
    return res.json();
}
export async function pathaoGetAreas(zoneId) {
    const res = await fetch(`${BASE}/aladdin/api/v1/zones/${zoneId}/area-list`, {
        headers: await authHeaders(),
    });
    return res.json();
}
// ─── Price plan ───────────────────────────────────────────────────────────────
// All 6 fields required per docs
export async function pathaoGetPriceplan(data) {
    const res = await fetch(`${BASE}/aladdin/api/v1/merchant/price-plan`, {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify(data),
    });
    return res.json();
}
// ─── Orders ───────────────────────────────────────────────────────────────────
export async function pathaoCreateOrder(data) {
    const res = await fetch(`${BASE}/aladdin/api/v1/orders`, {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify(data),
    });
    return res.json();
}
export async function pathaoCreateBulkOrders(orders) {
    const res = await fetch(`${BASE}/aladdin/api/v1/orders/bulk`, {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ orders }),
    });
    return res.json();
}
// GET order info by consignment_id
export async function pathaoTrack(consignment_id) {
    const res = await fetch(`${BASE}/aladdin/api/v1/orders/${consignment_id}/info`, {
        headers: await authHeaders(),
    });
    return res.json();
}
// Cancel order — not in official docs but kept for compatibility
export async function pathaoCancelOrder(consignment_id) {
    const res = await fetch(`${BASE}/aladdin/api/v1/orders/${consignment_id}/cancel`, {
        method: "POST",
        headers: await authHeaders(),
    });
    return res.json();
}
