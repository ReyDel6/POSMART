import jsPDF from 'jspdf';
import QRCode from 'qrcode';

export async function generateInvoicePdf(order) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const left = 40;
  const pageWidth = doc.internal.pageSize.getWidth();
  const usableWidth = pageWidth - left * 2;
  const lineHeight = 18;
  let currentY = 40;

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Invoice POSMart', left, currentY);

  currentY += 30;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Order ID: ${order.order_id}`, left, currentY);
  currentY += lineHeight;
  doc.text(`Customer ID: ${order.customer_id ?? '-'}`, left, currentY);
  currentY += lineHeight;
  doc.text(`Customer Name: ${order.customer_name}`, left, currentY);
  currentY += lineHeight;
  doc.text(`Phone: ${order.phone}`, left, currentY);
  currentY += lineHeight;
  doc.text(`Address: ${order.address}`, left, currentY);
  currentY += lineHeight;
  doc.text(`Courier: ${order.courier}`, left, currentY);

  currentY += 30;
  doc.setFont('helvetica', 'bold');
  doc.text('Order Items', left, currentY);
  currentY += 20;

  doc.setFont('helvetica', 'normal');
  order.items.forEach((item, index) => {
    const itemText = `${index + 1}. ${item.name} x${item.qty} @ Rp ${item.price.toLocaleString('id-ID')} = Rp ${item.total.toLocaleString('id-ID')}`;
    const split = doc.splitTextToSize(itemText, usableWidth);
    doc.text(split, left, currentY);
    currentY += lineHeight * split.length;
  });

  currentY += 10;
  doc.text(`Subtotal: Rp ${order.subtotal.toLocaleString('id-ID')}`, left, currentY);
  currentY += lineHeight;
  doc.text(`Shipping Fee: Rp ${order.shipping_fee.toLocaleString('id-ID')}`, left, currentY);
  currentY += lineHeight;
  doc.setFont('helvetica', 'bold');
  doc.text(`Total: Rp ${order.total_price.toLocaleString('id-ID')}`, left, currentY);

  const qrData = `Order:${order.order_id}|Customer:${order.customer_id ?? 'N/A'}|Total:${order.total_price}`;
  const qrOptions = { errorCorrectionLevel: 'H', margin: 1, width: 150 };
  const qrDataUrl = await QRCode.toDataURL(qrData, qrOptions);

  const qrSize = 120;
  doc.addImage(qrDataUrl, 'PNG', pageWidth - left - qrSize, 40, qrSize, qrSize);

  return doc;
}
