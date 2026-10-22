export function createPaymentIntent({ noTransaksi, total }) {
  const provider = process.env.PAYMENT_PROVIDER || 'prototype';
  if (provider !== 'prototype') {
    throw new Error(`Payment provider "${provider}" belum dikonfigurasi`);
  }

  const reference = `PAY-${noTransaksi}`;
  return {
    provider,
    metode: 'qr',
    reference,
    qrPayload: `QRIS-PROTOTYPE|${reference}|${noTransaksi}|${total}`,
  };
}
