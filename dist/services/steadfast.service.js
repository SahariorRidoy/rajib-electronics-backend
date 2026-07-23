import { env } from "../env.js";
// Official base URL per docs: https://portal.packzy.com/api/v1
const BASE = "https://portal.packzy.com/api/v1";
const headers = () => ({
    "Content-Type": "application/json",
    "Api-Key": env.STEADFAST_API_KEY,
    "Secret-Key": env.STEADFAST_API_SECRET,
});
async function safeFetch(url, options) {
    const res = await fetch(url, options);
    const text = await res.text();
    try {
        return JSON.parse(text);
    }
    catch {
        // Steadfast sometimes returns plain text errors e.g. "Account is not active"
        return { status: res.status, message: text.trim() };
    }
}
export async function steadfastCreateConsignment(data) {
    return safeFetch(`${BASE}/create_order`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(data),
    });
}
export async function steadfastBulkCreate(orders) {
    const dataStr = JSON.stringify(orders.map(o => ({ ...o })));
    const res = await fetch(`${BASE}/create_order/bulk-order`, {
        method: "POST",
        headers: {
            "Api-Key": env.STEADFAST_API_KEY,
            "Secret-Key": env.STEADFAST_API_SECRET,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ data: dataStr }),
    });
    const text = await res.text();
    try {
        return JSON.parse(text);
    }
    catch {
        return { status: res.status, message: text.trim() };
    }
}
export async function steadfastTrackByConsignment(consignment_id) {
    return safeFetch(`${BASE}/status_by_cid/${consignment_id}`, { headers: headers() });
}
export async function steadfastTrackByInvoice(invoice) {
    return safeFetch(`${BASE}/status_by_invoice/${invoice}`, { headers: headers() });
}
export async function steadfastTrackByTracking(tracking_code) {
    return safeFetch(`${BASE}/status_by_trackingcode/${tracking_code}`, { headers: headers() });
}
export async function steadfastBalance() {
    return safeFetch(`${BASE}/get_balance`, { headers: headers() });
}
export async function steadfastCreateReturnRequest(data) {
    return safeFetch(`${BASE}/create_return_request`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(data),
    });
}
export async function steadfastGetReturnRequest(id) {
    return safeFetch(`${BASE}/get_return_request/${id}`, { headers: headers() });
}
export async function steadfastGetReturnRequests() {
    return safeFetch(`${BASE}/get_return_requests`, { headers: headers() });
}
export async function steadfastGetPayments() {
    return safeFetch(`${BASE}/payments`, { headers: headers() });
}
export async function steadfastGetPayment(payment_id) {
    return safeFetch(`${BASE}/payments/${payment_id}`, { headers: headers() });
}
export async function steadfastGetPoliceStations() {
    return safeFetch(`${BASE}/police_stations`, { headers: headers() });
}
