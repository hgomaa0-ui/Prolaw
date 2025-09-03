import { Invoice, InvoiceItem } from "@/types/invoice";
import { Client } from "@/types/client";

interface RenderOptions {
  logoUrl?: string;
  firmName: string;
  firmAddress: string;
  firmContact: string;
  isArabic: boolean;
}

export function renderInvoiceHTML(
  invoice: Invoice & { items: InvoiceItem[]; client: Client },
  opts: RenderOptions
) {
  const { firmName, firmAddress, firmContact, logoUrl, isArabic } = opts;
  const dir = isArabic ? "rtl" : "ltr";
  const lang = isArabic ? "ar" : "en";

  // simple currency format (front-end handles sign)
  const fmt = (n: any) =>
    Number(n).toLocaleString(lang === "ar" ? "ar-EG" : "en-US", {
      style: "currency",
      currency: invoice.currency || "USD",
    });

  // precompute optional HTML snippets to avoid nested template confusion
  const discountHtml = invoice.discount ? `<p>${isArabic ? "الخصم" : "Discount"}: ${fmt(-invoice.discount)}</p>` : "";
  const taxHtml = invoice.tax ? `<p>${isArabic ? "الضريبة" : "Tax"}: ${fmt(invoice.tax)}</p>` : "";

  const rows = invoice.items
    .map(
      (it) => `
      <tr>
        <td>${it.description}</td>
        <td class="num">${it.quantity}</td>
        <td class="num">${fmt(it.unitPrice)}</td>
        <td class="num">${fmt(it.lineTotal)}</td>
      </tr>`
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="utf-8"/>
<style>
body{font-family:'Cairo','Noto Sans Arabic','Helvetica',sans-serif;margin:40px;color:#333;}
.header{display:flex;justify-content:space-between;align-items:flex-start;}
.firm h1{margin:0;font-size:24px;}
.firm p{margin:2px 0;font-size:12px;}
.table{width:100%;border-collapse:collapse;margin-top:30px;font-size:12px;}
.table th,.table td{border:1px solid #ddd;padding:8px;}
.table th{background:#f2f2f2;}
.footer{position:fixed;bottom:40px;left:40px;right:40px;font-size:12px;font-weight:bold;color:#444;border-top:1px solid #ccc;padding-top:6px;}
.num{text-align:${isArabic ? "left" : "right"};}
</style>
</head>
<body>
<div class="header">
  <div class="firm">
    <h1>${firmName}</h1>
    ${logoUrl ? '<img src="' + logoUrl + '" style="max-height:80px;margin-top:6px"/>' : ''}
          </div>
  <div class="meta">
    <h2>${isArabic ? "فاتورة" : "INVOICE"}</h2>
    <p>${isArabic ? "رقم" : "No"}: ${invoice.invoiceNumber}</p>
    <p>${isArabic ? "الإصدار" : "Issue"}: ${new Date(invoice.issueDate as any).toLocaleDateString()}</p>
    <p>${isArabic ? "الاستحقاق" : "Due"}: ${invoice.dueDate?new Date(invoice.dueDate as any).toLocaleDateString():""}</p>
  </div>
</div>

<h3>${isArabic ? "فاتورة إلى" : "Bill To"}</h3>
<p>${invoice.client?.name || ""}</p>

<table class="table">
<thead>
<tr>
<th>${isArabic ? "الوصف" : "Description"}</th>
<th>${isArabic ? "الكمية" : "Qty"}</th>
<th>${isArabic ? "سعر الوحدة" : "Unit Price"}</th>
<th>${isArabic ? "الإجمالي" : "Line Total"}</th>
</tr>
</thead>
<tbody>
${rows}
</tbody>
</table>

<div style="margin-top:20px;${isArabic ? "text-align:left" : "text-align:right"}">
  <p>${isArabic ? "الإجمالي" : "Subtotal"}: ${fmt(invoice.subtotal)}</p>
  ${discountHtml}
  ${taxHtml}
  <h3>${isArabic ? "المجموع" : "Total"}: ${fmt(invoice.total)}</h3>
</div>
<footer class="footer">
  ${[
    firmAddress ? `${isArabic ? "العنوان" : "Address"}: ${firmAddress}` : "",
    firmContact ? `${isArabic ? "الهاتف" : "Phone"}: ${firmContact}` : ""
  ].filter(Boolean).join(' • ')}
</footer>
  </body>
</html>`;
}
