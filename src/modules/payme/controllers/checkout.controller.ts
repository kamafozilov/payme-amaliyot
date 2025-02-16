import db from '@/lib/db.js';
import type { Context } from 'hono';
import { PaymeCheckoutService } from '../services/checkout.service.js';

export class PaymeCheckoutController {
  private checkoutService: PaymeCheckoutService;

  constructor() {
    this.checkoutService = new PaymeCheckoutService();
  }

  async createPaymentLink(c: Context) {
    try {
      const { orderId, returnUrl, locale } = await c.req.json();

      if (!orderId) {
        return c.json(
          {
            success: false,
            error: 'Order ID is required',
          },
          400,
        );
      }

      const order = await db.order.findUnique({
        where: {
          id: orderId,
        },
      });

      if (!order) {
        return c.json(
          {
            success: false,
            error: 'Order not found',
          },
          400,
        );
      }

      const paymentLink = this.checkoutService.generatePaymentLink({
        orderId,
        amount: order.totalAmount * 100,
        returnUrl,
        locale,
      });

      return c.json({
        success: true,
        data: {
          payment_link: paymentLink,
        },
      });
    } catch (error) {
      console.error('Create payment link error:', error);
      return c.json(
        {
          success: false,
          error: 'Failed to generate payment link',
        },
        500,
      );
    }
  }
}
