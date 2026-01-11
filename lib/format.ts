export function formatPrice(amount: number): string {
  return `₹${amount}`;
}

export function formatPhoneNumber(phone: string): string {
  if (phone.startsWith('+91')) {
    return phone;
  }
  return `+91${phone}`;
}

export function parseGPSCoordinates(coords: string): { lat: number; lng: number } | null {
  const parts = coords.split(',');
  if (parts.length !== 2) return null;

  const lat = parseFloat(parts[0]);
  const lng = parseFloat(parts[1]);

  if (isNaN(lat) || isNaN(lng)) return null;

  return { lat, lng };
}

export function generateGoogleMapsLink(coords: string): string {
  return `https://maps.google.com/maps?q=${coords}`;
}

export function generateUPIDeepLink(
  upiId: string,
  restaurantName: string,
  amount: number,
  orderId: string
): string {
  const params = new URLSearchParams({
    pa: upiId,
    pn: restaurantName,
    am: amount.toString(),
    tn: `Order-${orderId}`,
    cu: 'INR',
  });
  return `upi://pay?${params.toString()}`;
}

export function generateWhatsAppMessage(order: {
  shortId: string;
  customerName: string;
  customerPhone: string;
  items: Array<{ name: string; quantity: number; is_mystery?: boolean }>;
  couponCode: string | null;
  discountAmount: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentMethod: string;
  isPrepaid: boolean;
  voiceNoteUrl: string | null;
  gpsCoordinates: string | null;
}): string {
  const mapLink = order.gpsCoordinates ? generateGoogleMapsLink(order.gpsCoordinates) : 'Not provided';

  const itemsList = order.items
    .map(item => `${item.quantity}x ${item.is_mystery ? '🎁 ' : ''}${item.name}`)
    .join('\n');

  const couponText = order.couponCode
    ? `🎟️ Coupon: ${order.couponCode} (Saved ₹${order.discountAmount})\n`
    : '';

  const voiceText = order.voiceNoteUrl
    ? `🎤 Voice Note: ${order.voiceNoteUrl}\n`
    : '';

  const paymentStatus = order.isPrepaid
    ? '✅ PAID ONLINE (Money in your Bank)'
    : '⚠️ COLLECT CASH/QR';

  return `🔔 NEW ORDER ${order.shortId}

👤 Customer: ${order.customerName} (${order.customerPhone})
📍 Nav: ${mapLink}

🍲 Items:
${itemsList}

${couponText}${voiceText}
💰 Bill Breakdown:
Food: ₹${order.subtotal}
Delivery: ${order.deliveryFee === 0 ? 'FREE' : `₹${order.deliveryFee}`}
TOTAL TO COLLECT: ₹${order.total}

💳 Payment Status:
${paymentStatus}`;
}

export function encodeWhatsAppMessage(message: string): string {
  return encodeURIComponent(message);
}

export function generateWhatsAppLink(phone: string, message: string): string {
  const formattedPhone = phone.replace(/[^0-9]/g, '');
  return `https://wa.me/${formattedPhone}?text=${encodeWhatsAppMessage(message)}`;
}
