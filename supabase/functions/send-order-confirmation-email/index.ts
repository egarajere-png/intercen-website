// supabase/functions/send-order-confirmation-email/index.ts

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.14";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Env vars ──────────────────────────────────────────────────────────────────
const EMAIL_USER     = Deno.env.get("EMAIL_USERNAME");
const EMAIL_PASS     = Deno.env.get("EMAIL_PASSWORD");
const BUSINESS_EMAIL = Deno.env.get("BUSINESS_EMAIL");

if (!EMAIL_USER || !EMAIL_PASS) {
  console.error("EMAIL_USERNAME or EMAIL_PASSWORD is missing in env vars!");
}
if (!BUSINESS_EMAIL) {
  console.error("BUSINESS_EMAIL is missing — owner notifications will not be sent!");
}

// ── SMTP transporter ──────────────────────────────────────────────────────────
const createTransporter = () =>
  nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    tls: { rejectUnauthorized: true },
    connectionTimeout: 10_000,
    greetingTimeout:   10_000,
    socketTimeout:     10_000,
  });

// Verify SMTP connection on startup
createTransporter()
  .verify()
  .then(() => console.log("Gmail SMTP ready"))
  .catch((err: any) => {
    console.error("Gmail SMTP connection failed:", err.message);
    if (err.message.includes("535")) {
      console.error("Wrong App Password. Fix: https://myaccount.google.com/apppasswords");
    }
  });

// ── Types ─────────────────────────────────────────────────────────────────────
interface OrderItem {
  content_id:  string;
  quantity:    number;
  unit_price:  number;
  total_price: number;
  content: {
    title: string;
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatCurrency(amount: number): string {
  return `KES ${Number(amount).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString("en-KE", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone:  "Africa/Nairobi",
  });
}

function paymentMethodLabel(method: string | null): string {
  switch (method) {
    case "mpesa":    return "M-Pesa";
    case "paystack": return "Paystack (Card / Bank / Mobile Money)";
    default:         return method ?? "N/A";
  }
}

// ── Shared item rows HTML ─────────────────────────────────────────────────────
function buildItemRows(items: OrderItem[]): string {
  return items
    .map(
      (item) => `
      <tr>
        <td style="padding:13px 18px; border-bottom:1px solid #e8ecef; font-size:14px; color:#1a2332;">
          ${item.content?.title ?? "Unknown Item"}
        </td>
        <td style="padding:13px 18px; border-bottom:1px solid #e8ecef; font-size:14px; color:#4a5568; text-align:center;">
          ${item.quantity}
        </td>
        <td style="padding:13px 18px; border-bottom:1px solid #e8ecef; font-size:14px; color:#4a5568; text-align:right;">
          ${formatCurrency(item.unit_price)}
        </td>
        <td style="padding:13px 18px; border-bottom:1px solid #e8ecef; font-size:14px; font-weight:600; color:#1a2332; text-align:right;">
          ${formatCurrency(item.total_price)}
        </td>
      </tr>`
    )
    .join("");
}

// ── Shared totals block HTML ──────────────────────────────────────────────────
function buildTotalsBlock(params: {
  subtotal:   number;
  shipping:   number;
  tax:        number;
  discount:   number;
  totalPrice: number;
}): string {
  const { subtotal, shipping, tax, discount, totalPrice } = params;
  return `
    <table style="margin-left:auto; width:320px;">
      <tr>
        <td style="padding:7px 0; font-size:14px; color:#4a5568; border-bottom:1px solid #e8ecef;">Subtotal</td>
        <td style="padding:7px 0; font-size:14px; color:#4a5568; text-align:right; border-bottom:1px solid #e8ecef;">${formatCurrency(subtotal)}</td>
      </tr>
      <tr>
        <td style="padding:7px 0; font-size:14px; color:#4a5568; border-bottom:1px solid #e8ecef;">Shipping &amp; Handling</td>
        <td style="padding:7px 0; font-size:14px; color:#4a5568; text-align:right; border-bottom:1px solid #e8ecef;">${formatCurrency(shipping)}</td>
      </tr>
      ${tax > 0 ? `
      <tr>
        <td style="padding:7px 0; font-size:14px; color:#4a5568; border-bottom:1px solid #e8ecef;">Tax (VAT)</td>
        <td style="padding:7px 0; font-size:14px; color:#4a5568; text-align:right; border-bottom:1px solid #e8ecef;">${formatCurrency(tax)}</td>
      </tr>` : ""}
      ${discount > 0 ? `
      <tr>
        <td style="padding:7px 0; font-size:14px; color:#1a6b3a; border-bottom:1px solid #e8ecef;">Discount Applied</td>
        <td style="padding:7px 0; font-size:14px; color:#1a6b3a; text-align:right; border-bottom:1px solid #e8ecef;">−${formatCurrency(discount)}</td>
      </tr>` : ""}
      <tr>
        <td style="padding:14px 0 0; font-size:15px; font-weight:700; color:#1a2332; letter-spacing:0.3px; text-transform:uppercase;">Total Amount Due</td>
        <td style="padding:14px 0 0; font-size:16px; font-weight:700; color:#1a2332; text-align:right;">${formatCurrency(totalPrice)}</td>
      </tr>
    </table>`;
}

// ── CUSTOMER email template ───────────────────────────────────────────────────
function generateCustomerEmail(params: {
  fullName:        string;
  orderNumber:     string;
  orderDate:       string;
  items:           OrderItem[];
  subtotal:        number;
  shipping:        number;
  tax:             number;
  discount:        number;
  totalPrice:      number;
  shippingAddress: string;
  paymentMethod:   string | null;
}): string {
  const {
    fullName, orderNumber, orderDate, items,
    subtotal, shipping, tax, discount, totalPrice,
    shippingAddress, paymentMethod,
  } = params;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Order Confirmation – ${orderNumber} | Intercen Books</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500;600&family=Source+Sans+3:wght@400;500;600;700&display=swap');
    body {
      margin: 0;
      padding: 0;
      background: #eef0f3;
      font-family: 'Source Sans 3', 'Helvetica Neue', Arial, sans-serif;
      color: #1a2332;
      line-height: 1.65;
      -webkit-font-smoothing: antialiased;
    }
    a { color: #1e3a5f; text-decoration: underline; }
    table { border-collapse: collapse; width: 100%; }
  </style>
</head>
<body>
  <div style="background:#eef0f3; padding:40px 16px;">
    <table style="max-width:640px; margin:0 auto;">

      <!-- Letterhead Bar -->
      <tr>
        <td style="background:#1e3a5f; padding:28px 48px; border-radius:4px 4px 0 0;">
          <table>
            <tr>
              <td>
                <p style="margin:0; font-family:'EB Garamond', Georgia, serif; font-size:22px; font-weight:600; color:#ffffff; letter-spacing:0.5px;">
                  Intercen Books
                </p>
                <p style="margin:4px 0 0; font-size:12px; color:#a8bdd4; letter-spacing:1.5px; text-transform:uppercase;">
                  Order Confirmation
                </p>
              </td>
              <td style="text-align:right; vertical-align:top;">
                <p style="margin:0; font-size:11px; color:#a8bdd4; line-height:1.8;">
                  Ref: ${orderNumber}<br/>
                  Date: ${formatDate(orderDate)}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- White Body -->
      <tr>
        <td style="background:#ffffff; padding:48px 48px 40px; border-left:1px solid #d4dbe4; border-right:1px solid #d4dbe4;">

          <!-- Salutation -->
          <p style="margin:0 0 6px; font-size:13px; color:#4a5568; letter-spacing:1.2px; text-transform:uppercase; font-weight:600;">
            Dear ${fullName},
          </p>
          <p style="margin:0 0 28px; font-size:15px; color:#1a2332;">
            We are pleased to confirm receipt of your order and successful processing of your payment.
            Please retain this correspondence for your records.
          </p>

          <!-- Status Notice -->
          <div style="background:#f0f5fb; border-left:3px solid #1e3a5f; border-radius:0 4px 4px 0; padding:14px 20px; margin-bottom:36px;">
            <p style="margin:0; font-size:14px; color:#1e3a5f; font-weight:600;">
              Payment Received &amp; Order Confirmed
            </p>
            <p style="margin:4px 0 0; font-size:13px; color:#4a5568;">
              Your order is currently being prepared for dispatch. You will receive a further notification upon shipment.
            </p>
          </div>

          <!-- Order Summary Heading -->
          <p style="margin:0 0 16px; font-size:11px; font-weight:700; color:#1e3a5f; letter-spacing:1.8px; text-transform:uppercase; border-bottom:2px solid #1e3a5f; padding-bottom:8px;">
            Order Details
          </p>

          <!-- Order Meta Grid -->
          <table style="margin-bottom:32px; background:#f8f9fb; border:1px solid #dde2ea; border-radius:4px;">
            <tr>
              <td style="padding:14px 20px; width:50%; border-right:1px solid #dde2ea; border-bottom:1px solid #dde2ea; vertical-align:top;">
                <p style="margin:0 0 3px; font-size:10px; font-weight:700; color:#6b7a8d; letter-spacing:1.2px; text-transform:uppercase;">Order Reference</p>
                <p style="margin:0; font-size:15px; font-weight:700; color:#1a2332; font-family:'EB Garamond', Georgia, serif;">${orderNumber}</p>
              </td>
              <td style="padding:14px 20px; vertical-align:top; border-bottom:1px solid #dde2ea;">
                <p style="margin:0 0 3px; font-size:10px; font-weight:700; color:#6b7a8d; letter-spacing:1.2px; text-transform:uppercase;">Date Placed</p>
                <p style="margin:0; font-size:14px; color:#1a2332;">${formatDate(orderDate)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 20px; width:50%; border-right:1px solid #dde2ea; vertical-align:top;">
                <p style="margin:0 0 3px; font-size:10px; font-weight:700; color:#6b7a8d; letter-spacing:1.2px; text-transform:uppercase;">Payment Method</p>
                <p style="margin:0; font-size:14px; color:#1a2332; font-weight:600;">${paymentMethodLabel(paymentMethod)}</p>
              </td>
              <td style="padding:14px 20px; vertical-align:top;">
                <p style="margin:0 0 3px; font-size:10px; font-weight:700; color:#6b7a8d; letter-spacing:1.2px; text-transform:uppercase;">Delivery Address</p>
                <p style="margin:0; font-size:14px; color:#1a2332;">${shippingAddress}</p>
              </td>
            </tr>
          </table>

          <!-- Items Table Heading -->
          <p style="margin:0 0 12px; font-size:11px; font-weight:700; color:#1e3a5f; letter-spacing:1.8px; text-transform:uppercase; border-bottom:2px solid #1e3a5f; padding-bottom:8px;">
            Itemised Statement
          </p>

          <!-- Items Table -->
          <table style="border:1px solid #dde2ea; border-radius:4px; overflow:hidden; margin-bottom:28px;">
            <thead>
              <tr style="background:#f0f4f8;">
                <th style="padding:11px 18px; text-align:left; font-size:10px; font-weight:700; color:#1e3a5f; text-transform:uppercase; letter-spacing:1px;">Description</th>
                <th style="padding:11px 18px; text-align:center; font-size:10px; font-weight:700; color:#1e3a5f; text-transform:uppercase; letter-spacing:1px;">Qty</th>
                <th style="padding:11px 18px; text-align:right; font-size:10px; font-weight:700; color:#1e3a5f; text-transform:uppercase; letter-spacing:1px;">Unit Price</th>
                <th style="padding:11px 18px; text-align:right; font-size:10px; font-weight:700; color:#1e3a5f; text-transform:uppercase; letter-spacing:1px;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${buildItemRows(items)}
            </tbody>
          </table>

          <!-- Totals -->
          ${buildTotalsBlock({ subtotal, shipping, tax, discount, totalPrice })}

          <!-- Dispatch Note -->
          <div style="margin-top:36px; background:#f8f9fb; border:1px solid #dde2ea; border-radius:4px; padding:18px 22px;">
            <p style="margin:0 0 6px; font-size:11px; font-weight:700; color:#1e3a5f; letter-spacing:1.2px; text-transform:uppercase;">Next Steps</p>
            <p style="margin:0; font-size:14px; color:#1a2332; line-height:1.7;">
              Your order is being reviewed and prepared for fulfillment. A dispatch confirmation, including tracking information where applicable, will be forwarded to you upon shipment.
              Should you have any queries regarding this order, please contact our client services team, quoting reference <strong>${orderNumber}</strong>.
            </p>
          </div>

          <!-- Closing -->
          <p style="margin:36px 0 0; font-size:14px; color:#1a2332;">
            Yours sincerely,
          </p>
          <p style="margin:8px 0 0; font-size:14px; font-weight:600; color:#1a2332;">
            The Orders Team<br/>
            <span style="font-weight:400; color:#4a5568;">Intercen Books</span>
          </p>

        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background:#1a2332; padding:24px 48px; border-radius:0 0 4px 4px; text-align:center;">
          <p style="margin:0 0 6px; font-family:'EB Garamond', Georgia, serif; font-size:14px; color:#a8bdd4; letter-spacing:0.5px;">
            Intercen Books
          </p>
          <p style="margin:0; font-size:11px; color:#6b7a8d; line-height:1.8;">
            © ${new Date().getFullYear()} Intercen Books. All rights reserved.<br/>
            This is a system-generated notification. Please do not reply to this message directly.
          </p>
        </td>
      </tr>

    </table>
  </div>
</body>
</html>`;
}

// ── OWNER / BUSINESS email template ──────────────────────────────────────────
function generateOwnerEmail(params: {
  orderNumber:      string;
  orderDate:        string;
  customerName:     string;
  customerEmail:    string;
  customerPhone:    string | null;
  items:            OrderItem[];
  subtotal:         number;
  shipping:         number;
  tax:              number;
  discount:         number;
  totalPrice:       number;
  shippingAddress:  string;
  paymentMethod:    string | null;
  paymentReference: string | null;
}): string {
  const {
    orderNumber, orderDate, customerName, customerEmail, customerPhone,
    items, subtotal, shipping, tax, discount, totalPrice,
    shippingAddress, paymentMethod, paymentReference,
  } = params;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Internal Order Notification – ${orderNumber} | Intercen Books</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500;600&family=Source+Sans+3:wght@400;500;600;700&display=swap');
    body {
      margin: 0;
      padding: 0;
      background: #eef0f3;
      font-family: 'Source Sans 3', 'Helvetica Neue', Arial, sans-serif;
      color: #1a2332;
      line-height: 1.65;
      -webkit-font-smoothing: antialiased;
    }
    a { color: #1e3a5f; text-decoration: underline; }
    table { border-collapse: collapse; width: 100%; }
  </style>
</head>
<body>
  <div style="background:#eef0f3; padding:40px 16px;">
    <table style="max-width:640px; margin:0 auto;">

      <!-- Letterhead Bar -->
      <tr>
        <td style="background:#1a2332; padding:28px 48px; border-radius:4px 4px 0 0;">
          <table>
            <tr>
              <td>
                <p style="margin:0; font-family:'EB Garamond', Georgia, serif; font-size:22px; font-weight:600; color:#ffffff; letter-spacing:0.5px;">
                  Intercen Books
                </p>
                <p style="margin:4px 0 0; font-size:12px; color:#a8bdd4; letter-spacing:1.5px; text-transform:uppercase;">
                  Internal Order Notification — Confidential
                </p>
              </td>
              <td style="text-align:right; vertical-align:top;">
                <p style="margin:0; font-size:11px; color:#a8bdd4; line-height:1.8;">
                  Order Ref: ${orderNumber}<br/>
                  Received: ${formatDate(orderDate)}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- White Body -->
      <tr>
        <td style="background:#ffffff; padding:48px 48px 40px; border-left:1px solid #d4dbe4; border-right:1px solid #d4dbe4;">

          <!-- Action Notice -->
          <div style="background:#f0f5fb; border-left:3px solid #1e3a5f; border-radius:0 4px 4px 0; padding:14px 20px; margin-bottom:36px;">
            <p style="margin:0; font-size:14px; color:#1e3a5f; font-weight:700; letter-spacing:0.3px;">
              Action Required — New Confirmed Order
            </p>
            <p style="margin:4px 0 0; font-size:13px; color:#1a2332;">
              A new paid order has been received and confirmed. Please review the details below and proceed with fulfillment accordingly.
            </p>
          </div>

          <!-- Customer Details Heading -->
          <p style="margin:0 0 12px; font-size:11px; font-weight:700; color:#1e3a5f; letter-spacing:1.8px; text-transform:uppercase; border-bottom:2px solid #1e3a5f; padding-bottom:8px;">
            Customer Information
          </p>

          <table style="margin-bottom:32px; background:#f8f9fb; border:1px solid #dde2ea; border-radius:4px;">
            <tr>
              <td style="padding:14px 20px; width:50%; border-right:1px solid #dde2ea; border-bottom:1px solid #dde2ea; vertical-align:top;">
                <p style="margin:0 0 3px; font-size:10px; font-weight:700; color:#6b7a8d; letter-spacing:1.2px; text-transform:uppercase;">Full Name</p>
                <p style="margin:0; font-size:15px; font-weight:600; color:#1a2332;">${customerName}</p>
              </td>
              <td style="padding:14px 20px; vertical-align:top; border-bottom:1px solid #dde2ea;">
                <p style="margin:0 0 3px; font-size:10px; font-weight:700; color:#6b7a8d; letter-spacing:1.2px; text-transform:uppercase;">Email Address</p>
                <p style="margin:0; font-size:14px; color:#1a2332;">${customerEmail}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 20px; width:50%; border-right:1px solid #dde2ea; vertical-align:top;">
                <p style="margin:0 0 3px; font-size:10px; font-weight:700; color:#6b7a8d; letter-spacing:1.2px; text-transform:uppercase;">Telephone</p>
                <p style="margin:0; font-size:14px; color:#1a2332;">${customerPhone ?? "Not provided"}</p>
              </td>
              <td style="padding:14px 20px; vertical-align:top;">
                <p style="margin:0 0 3px; font-size:10px; font-weight:700; color:#6b7a8d; letter-spacing:1.2px; text-transform:uppercase;">Delivery Address</p>
                <p style="margin:0; font-size:14px; color:#1a2332;">${shippingAddress}</p>
              </td>
            </tr>
          </table>

          <!-- Payment Details Heading -->
          <p style="margin:0 0 12px; font-size:11px; font-weight:700; color:#1e3a5f; letter-spacing:1.8px; text-transform:uppercase; border-bottom:2px solid #1e3a5f; padding-bottom:8px;">
            Payment Particulars
          </p>

          <table style="margin-bottom:32px; background:#f8f9fb; border:1px solid #dde2ea; border-radius:4px;">
            <tr>
              <td style="padding:14px 20px; width:50%; border-right:1px solid #dde2ea; vertical-align:top;">
                <p style="margin:0 0 3px; font-size:10px; font-weight:700; color:#6b7a8d; letter-spacing:1.2px; text-transform:uppercase;">Payment Method</p>
                <p style="margin:0; font-size:14px; font-weight:600; color:#1a2332;">${paymentMethodLabel(paymentMethod)}</p>
              </td>
              <td style="padding:14px 20px; vertical-align:top;">
                <p style="margin:0 0 3px; font-size:10px; font-weight:700; color:#6b7a8d; letter-spacing:1.2px; text-transform:uppercase;">Transaction Reference / Receipt No.</p>
                <p style="margin:0; font-size:14px; color:#1a2332; font-family:'Courier New', Courier, monospace; font-weight:600;">${paymentReference ?? "N/A"}</p>
              </td>
            </tr>
          </table>

          <!-- Items Table Heading -->
          <p style="margin:0 0 12px; font-size:11px; font-weight:700; color:#1e3a5f; letter-spacing:1.8px; text-transform:uppercase; border-bottom:2px solid #1e3a5f; padding-bottom:8px;">
            Itemised Order Statement
          </p>

          <!-- Items Table -->
          <table style="border:1px solid #dde2ea; border-radius:4px; overflow:hidden; margin-bottom:28px;">
            <thead>
              <tr style="background:#f0f4f8;">
                <th style="padding:11px 18px; text-align:left; font-size:10px; font-weight:700; color:#1e3a5f; text-transform:uppercase; letter-spacing:1px;">Description</th>
                <th style="padding:11px 18px; text-align:center; font-size:10px; font-weight:700; color:#1e3a5f; text-transform:uppercase; letter-spacing:1px;">Qty</th>
                <th style="padding:11px 18px; text-align:right; font-size:10px; font-weight:700; color:#1e3a5f; text-transform:uppercase; letter-spacing:1px;">Unit Price</th>
                <th style="padding:11px 18px; text-align:right; font-size:10px; font-weight:700; color:#1e3a5f; text-transform:uppercase; letter-spacing:1px;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${buildItemRows(items)}
            </tbody>
          </table>

          <!-- Totals -->
          ${buildTotalsBlock({ subtotal, shipping, tax, discount, totalPrice })}

          <!-- Fulfillment Instruction -->
          <div style="margin-top:36px; background:#f0f5fb; border:1px solid #c6d6e8; border-radius:4px; padding:18px 22px;">
            <p style="margin:0 0 6px; font-size:11px; font-weight:700; color:#1e3a5f; letter-spacing:1.2px; text-transform:uppercase;">Fulfillment Instruction</p>
            <p style="margin:0; font-size:14px; color:#1a2332; line-height:1.7;">
              Payment has been verified and confirmed. Kindly proceed with the preparation and dispatch of this order at the earliest convenience.
              All internal processing should reference order number <strong>${orderNumber}</strong>.
            </p>
          </div>

          <!-- Internal Sign-off -->
          <p style="margin:36px 0 0; font-size:14px; color:#1a2332;">
            This notification has been generated automatically by the Intercen Books order management system.
          </p>
          <p style="margin:10px 0 0; font-size:14px; font-weight:600; color:#1a2332;">
            Order Management System<br/>
            <span style="font-weight:400; color:#4a5568;">Intercen Books — Internal Operations</span>
          </p>

        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background:#1a2332; padding:24px 48px; border-radius:0 0 4px 4px; text-align:center;">
          <p style="margin:0 0 6px; font-family:'EB Garamond', Georgia, serif; font-size:14px; color:#a8bdd4; letter-spacing:0.5px;">
            Intercen Books — Internal Use Only
          </p>
          <p style="margin:0; font-size:11px; color:#6b7a8d; line-height:1.8;">
            © ${new Date().getFullYear()} Intercen Books. All rights reserved.<br/>
            This is a confidential internal notification. Do not forward or distribute outside authorised personnel.
          </p>
        </td>
      </tr>

    </table>
  </div>
</body>
</html>`;
}

// ── Main handler ──────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  console.log("=== send-order-confirmation-email Started ===");

  try {
    // ── 1. Parse body ──────────────────────────────────────────────────────
    let body: { order_id: string };
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { order_id } = body;
    if (!order_id) {
      return new Response(
        JSON.stringify({ success: false, error: "order_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Processing email for order:", order_id);

    // ── 2. Supabase admin client ───────────────────────────────────────────
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── 3. Fetch order ─────────────────────────────────────────────────────
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select(`
        id,
        order_number,
        total_price,
        sub_total,
        tax,
        shipping,
        discount,
        status,
        payment_status,
        payment_method,
        payment_reference,
        shipping_address,
        created_at,
        user_id
      `)
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      console.error("Order not found:", orderError?.message);
      return new Response(
        JSON.stringify({ success: false, error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Order found:", order.order_number, "| payment_status:", order.payment_status);

    // ── 4. Fetch order items with product titles ───────────────────────────
    const { data: orderItems, error: itemsError } = await supabaseAdmin
      .from("order_items")
      .select(`
        content_id,
        quantity,
        unit_price,
        total_price,
        content:content_id (title)
      `)
      .eq("order_id", order_id);

    if (itemsError || !orderItems || orderItems.length === 0) {
      console.error("Failed to fetch order items:", itemsError?.message);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to fetch order items" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Order items fetched:", orderItems.length, "item(s)");

    // ── 5. Fetch user profile ──────────────────────────────────────────────
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, phone")
      .eq("id", order.user_id)
      .maybeSingle();

    // ── 6. Fetch user email from auth ──────────────────────────────────────
    const { data: authData } = await supabaseAdmin.auth.admin.getUserById(order.user_id);

    const customerEmail = authData?.user?.email ?? null;
    const customerName  =
      profile?.full_name ??
      authData?.user?.user_metadata?.full_name ??
      "Customer";
    const customerPhone = profile?.phone ?? null;

    if (!customerEmail) {
      console.error("Could not resolve customer email for user:", order.user_id);
      return new Response(
        JSON.stringify({ success: false, error: "Customer email not found" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Customer resolved:", customerName, "|", customerEmail);

    // ── 7. Build shared email params ───────────────────────────────────────
    const sharedParams = {
      orderNumber:     order.order_number,
      orderDate:       order.created_at,
      items:           orderItems as unknown as OrderItem[],
      subtotal:        order.sub_total,
      shipping:        order.shipping,
      tax:             order.tax,
      discount:        order.discount,
      totalPrice:      order.total_price,
      shippingAddress: order.shipping_address,
      paymentMethod:   order.payment_method,
    };

    // ── 8. Generate HTML for both emails ───────────────────────────────────
    const customerHtml = generateCustomerEmail({
      fullName: customerName,
      ...sharedParams,
    });

    const ownerHtml = generateOwnerEmail({
      customerName,
      customerEmail,
      customerPhone,
      paymentReference: order.payment_reference,
      ...sharedParams,
    });

    // ── 9. Send emails ─────────────────────────────────────────────────────
    const transporter = createTransporter();
    const errors: string[] = [];

    // Send to customer
    try {
      await transporter.sendMail({
        from:    `"Intercen Books" <${EMAIL_USER}>`,
        to:      customerEmail,
        subject: `Order Confirmation – Reference ${order.order_number} | Intercen Books`,
        html:    customerHtml,
      });
      console.log("✅ Customer email sent to:", customerEmail);
    } catch (err: any) {
      console.error("Customer email failed:", err.message);
      errors.push(`Customer email failed: ${err.message}`);
    }

    // Send to business owner
    if (BUSINESS_EMAIL) {
      try {
        await transporter.sendMail({
          from:    `"Intercen Books Orders" <${EMAIL_USER}>`,
          to:      BUSINESS_EMAIL,
          subject: `[INTERNAL] New Confirmed Order – ${order.order_number} | ${formatCurrency(order.total_price)}`,
          html:    ownerHtml,
        });
        console.log("✅ Owner email sent to:", BUSINESS_EMAIL);
      } catch (err: any) {
        console.error("Owner email failed:", err.message);
        errors.push(`Owner email failed: ${err.message}`);
      }
    } else {
      console.warn("BUSINESS_EMAIL not set — skipping owner notification");
      errors.push("BUSINESS_EMAIL not set — owner notification skipped");
    }

    console.log("=== send-order-confirmation-email Completed ===");

    return new Response(
      JSON.stringify({
        success:        true,
        order_id,
        order_number:   order.order_number,
        customer_email: customerEmail,
        owner_email:    BUSINESS_EMAIL ?? null,
        errors:         errors.length > 0 ? errors : undefined,
        message:
          errors.length === 0
            ? "Both emails sent successfully"
            : "Completed with some errors — check logs",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("=== send-order-confirmation-email Fatal Error ===", err.message);
    return new Response(
      JSON.stringify({ success: false, error: err.message || "Server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});