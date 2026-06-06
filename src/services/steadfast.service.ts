import { env } from "../env.js";

// Official base URL per docs: https://portal.packzy.com/api/v1
const BASE = "https://portal.packzy.com/api/v1";

const headers = () => ({
  "Content-Type": "application/json",
  "Api-Key": env.STEADFAST_API_KEY,
  "Secret-Key": env.STEADFAST_API_SECRET,
});

async function safeFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    // Steadfast sometimes returns plain text errors e.g. "Account is not active"
    return { status: res.status, message: text.trim() };
  }
}

export async function steadfastCreateConsignment(data: {
  invoice: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  cod_amount: number;
  alternative_phone?: string;
  recipient_email?: string;
  note?: string;
  item_description?: string;
  total_lot?: number;
  delivery_type?: number;
}) {
  return safeFetch(`${BASE}/create_order`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(data),
  });
}

export async function steadfastBulkCreate(orders: Array<{
  invoice: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  cod_amount: number;
  alternative_phone?: string;
  note?: string;
  item_description?: string;
  delivery_type?: number;
}>) {
  return safeFetch(`${BASE}/create_order/bulk-order`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ data: JSON.stringify(orders) }),
  });
}

export async function steadfastTrackByConsignment(consignment_id: string) {
  return safeFetch(`${BASE}/status_by_cid/${consignment_id}`, { headers: headers() });
}

export async function steadfastTrackByInvoice(invoice: string) {
  return safeFetch(`${BASE}/status_by_invoice/${invoice}`, { headers: headers() });
}

export async function steadfastTrackByTracking(tracking_code: string) {
  return safeFetch(`${BASE}/status_by_trackingcode/${tracking_code}`, { headers: headers() });
}

export async function steadfastBalance() {
  return safeFetch(`${BASE}/get_balance`, { headers: headers() });
}

export async function steadfastCreateReturnRequest(data: {
  consignment_id?: string | number;
  invoice?: string;
  tracking_code?: string;
  reason?: string;
}) {
  return safeFetch(`${BASE}/create_return_request`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(data),
  });
}

export async function steadfastGetReturnRequest(id: string | number) {
  return safeFetch(`${BASE}/get_return_request/${id}`, { headers: headers() });
}

export async function steadfastGetReturnRequests() {
  return safeFetch(`${BASE}/get_return_requests`, { headers: headers() });
}

export async function steadfastGetPayments() {
  return safeFetch(`${BASE}/payments`, { headers: headers() });
}

export async function steadfastGetPayment(payment_id: string | number) {
  return safeFetch(`${BASE}/payments/${payment_id}`, { headers: headers() });
}

export async function steadfastGetPoliceStations() {
  return safeFetch(`${BASE}/police_stations`, { headers: headers() });
}
