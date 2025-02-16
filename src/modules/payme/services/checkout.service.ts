export class PaymeCheckoutService {
  private readonly CHECKOUT_URL = 'https://checkout.paycom.uz';
  private readonly MERCHANT_ID = process.env.PAYME_MERCHANT_ID;

  generatePaymentLink(params: {
    orderId: string;
    amount: number;
    returnUrl?: string;
    locale?: 'uz' | 'ru' | 'en';
  }): string {
    const { orderId, amount, returnUrl, locale = 'uz' } = params;

    const amountInTiyin = amount;

    const paymentParams = {
      merchantId: this.MERCHANT_ID,
      account: {
        order_id: orderId,
      },
      amount: amountInTiyin,
      language: locale,
      returnUrl,
      timeout: 15000,
    };

    const paycomParams = {
      m: paymentParams.merchantId,
      ac: {
        order_id: paymentParams.account.order_id,
      },
      a: paymentParams.amount,
      l: paymentParams.language,
      c: paymentParams.returnUrl,
      ct: paymentParams.timeout,
    };

    const paramsString = Object.entries(paycomParams)
      .map(([key, value]) => {
        if (key === 'ac' && typeof value === 'object') {
          return Object.entries(value)
            .map(([k, v]) => `ac.${k}=${v}`)
            .join(';');
        }
        return `${key}=${value}`;
      })
      .join(';');

    const encodedParams = Buffer.from(paramsString).toString('base64');

    return `${this.CHECKOUT_URL}/${encodedParams}`;
  }
}
