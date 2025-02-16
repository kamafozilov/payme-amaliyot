import { PaymeService } from '@/payme/services/payme.service.js';
import type { Context } from 'hono';
import { PaymeError } from '../constants/payme-error.js';
import { TransactionMethods } from '../constants/transaction-methods.js';
import { TransactionError } from '../errors/transaction.error.js';

export class PaymeController {
  private service: PaymeService;

  constructor() {
    this.service = new PaymeService();
  }

  async merchant(c: Context) {
    try {
      const { method, params, id } = await c.req.json();

      switch (method) {
        case TransactionMethods.CheckPerformTransaction: {
          const result = await this.service.checkPerformTransaction(params, id);
          return c.json({
            result,
            id,
          });
        }

        case TransactionMethods.CheckTransaction: {
          const result = await this.service.checkTransaction(params, id);
          return c.json({
            result,
            id,
          });
        }

        case TransactionMethods.CreateTransaction: {
          const result = await this.service.createTransaction(params, id);
          return c.json({
            result,
            id,
          });
        }

        case TransactionMethods.PerformTransaction: {
          const result = await this.service.performTransaction(params, id);
          return c.json({
            result,
            id,
          });
        }

        case TransactionMethods.CancelTransaction: {
          const result = await this.service.cancelTransaction(params, id);
          return c.json({
            result,
            id,
          });
        }

        case TransactionMethods.GetStatement: {
          const transactions = await this.service.getStatement(params);
          return c.json({
            result: {
              transactions,
            },
            id,
          });
        }

        default: {
          throw new TransactionError(PaymeError.InvalidMethod, id, null);
        }
      }
    } catch (error) {
      console.error('PaymeController error:', error);

      if (error instanceof TransactionError) {
        return c.json({
          error: {
            code: error.transactionErrorCode,
            message: error.transactionErrorMessage,
          },
          data: error.transactionData,
          id: error.transactionId,
        });
      }

      // Agar TransactionError bo'lmasa, umumiy xatolik qaytaramiz
      return c.json(
        {
          error: {
            code: PaymeError.SystemError.code,
            message: PaymeError.SystemError.message,
          },
          data: null,
          id: null,
        },
        500,
      );
    }
  }
}
