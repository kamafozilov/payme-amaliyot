import db from '@/lib/db.js';
import { PaymeError } from '../constants/payme-error.js';
import { TransactionState } from '../constants/transaction-state.js';
import { TransactionError } from '../errors/transaction.error.js';

interface CheckPerformResult {
  allow: boolean;
  detail?: {
    receipt_type: number;
    items: Array<{
      title: string;
      price: number;
      count: number;
      code: string;
      package_code: string;
      vat_percent: number;
    }>;
  };
}

export class PaymeService {
  async checkPerformTransaction(params: any, id: string): Promise<CheckPerformResult> {
    const { account, amount } = params;

    const order = await db.order.findUnique({
      where: {
        id: account.order_id,
      },
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
      },
    });

    console.log('Order data:', {
      id: order?.id,
      totalAmount: order?.totalAmount,
      orderItemsCount: order?.orderItems?.length,
      orderItems: order?.orderItems,
    });

    if (!order) {
      throw new TransactionError(PaymeError.OrderNotFound, id, {
        order_id: account.order_id,
      });
    }

    if (Number(order.totalAmount) * 100 !== Number(amount)) {
      throw new TransactionError(PaymeError.InvalidAmount, id, {
        required: order.totalAmount * 100,
        received: amount,
      });
    }

    if (!order.orderItems?.length) {
      return {
        allow: true,
      };
    }

    return {
      allow: true,
      detail: {
        receipt_type: 0,
        items: order.orderItems.map(item => ({
          title: item.product.name,
          price: item.price * 100,
          count: item.quantity,
          code: item.product.id,
          package_code: item.product.id,
          vat_percent: 0,
        })),
      },
    };
  }

  async checkTransaction(params: any, id: string) {
    const transaction = await db.transaction.findUnique({
      where: {
        id: params.id,
      },
    });

    if (!transaction) {
      throw new TransactionError(PaymeError.TransactionNotFound, id, null);
    }

    return {
      create_time: Number(transaction.createTime),
      perform_time: Number(transaction.performTime),
      cancel_time: Number(transaction.cancelTime),
      transaction: transaction.id,
      state: Number(transaction.state),
      reason: transaction.reason,
    };
  }

  async createTransaction(params: any, id: string) {
    try {
      const { account, time, amount } = params;
      const currentTime = Date.now();
      const transactionId = params.id;

      const order = await db.order.findUnique({
        where: {
          id: account.order_id,
        },
      });

      if (!order) {
        throw new TransactionError(PaymeError.OrderNotFound, id, {
          order_id: account.order_id,
        });
      }

      if (Number(order.totalAmount) * 100 !== Number(amount)) {
        throw new TransactionError(PaymeError.InvalidAmount, id, {
          required: order.totalAmount * 100,
          received: amount,
        });
      }

      const existingTransaction = await db.transaction.findFirst({
        where: {
          OR: [
            { id: transactionId },
            {
              AND: [
                { orderId: account.order_id },
                { provider: 'PAYME' },
                {
                  state: {
                    in: [TransactionState.Pending, TransactionState.Paid],
                  },
                },
              ],
            },
          ],
        },
      });

      if (existingTransaction) {
        if (existingTransaction.id === transactionId) {
          if (existingTransaction.state !== TransactionState.Pending) {
            throw new TransactionError(PaymeError.CantDoOperation, id, null);
          }

          const expirationTime =
            (currentTime - Number(existingTransaction.createTime)) / 60000 < 12;
          if (!expirationTime) {
            await db.transaction.update({
              where: { id: transactionId },
              data: {
                state: TransactionState.PendingCanceled,
                reason: 4,
              },
            });
            throw new TransactionError(PaymeError.CantDoOperation, id, null);
          }

          return {
            create_time: Number(existingTransaction.createTime),
            transaction: existingTransaction.id,
            state: Number(existingTransaction.state),
          };
        }

        if (existingTransaction.state === TransactionState.Paid) {
          throw new TransactionError(PaymeError.OrderNotFound, id, null);
        }
        if (existingTransaction.state === TransactionState.Pending) {
          throw new TransactionError(PaymeError.Pending, id, null);
        }
      }

      const transaction = await db.transaction.create({
        data: {
          id: transactionId,
          amount: Number(amount) / 100,
          state: TransactionState.Pending,
          createTime: time,
          provider: 'PAYME',
          order: {
            connect: {
              id: account.order_id,
            },
          },
          user: {
            connect: {
              id: order.userId,
            },
          },
        },
      });

      return {
        create_time: Number(transaction.createTime),
        transaction: transaction.id,
        state: Number(transaction.state),
      };
    } catch (error) {
      console.error('Error in createTransaction:', error);
      throw error;
    }
  }

  async performTransaction(params: any, id: string) {
    const transaction = await db.transaction.findUnique({
      where: {
        id: params.id,
      },
    });

    if (!transaction) {
      throw new TransactionError(PaymeError.TransactionNotFound, id, null);
    }

    if (transaction.state === TransactionState.Pending) {
      const updatedTransaction = await db.transaction.update({
        where: {
          id: transaction.id,
        },
        data: {
          state: TransactionState.Paid,
          performTime: Date.now(),
        },
      });

      return {
        perform_time: Number(updatedTransaction.performTime),
        transaction: updatedTransaction.id,
        state: Number(updatedTransaction.state),
      };
    }

    if (transaction.state === TransactionState.Paid) {
      return {
        perform_time: Number(transaction.performTime),
        transaction: transaction.id,
        state: Number(transaction.state),
      };
    }

    throw new TransactionError(PaymeError.CantDoOperation, id, null);
  }

  async cancelTransaction(params: any, id: string) {
    const { reason } = params;

    const transaction = await db.transaction.findUnique({
      where: {
        id: params.id,
      },
    });

    if (!transaction) {
      throw new TransactionError(PaymeError.TransactionNotFound, id, null);
    }

    if (
      transaction.state === TransactionState.PendingCanceled ||
      transaction.state === TransactionState.PaidCanceled
    ) {
      return {
        cancel_time: Number(transaction.cancelTime),
        transaction: transaction.id,
        state: Number(transaction.state),
      };
    }

    if (
      transaction.state === TransactionState.Pending ||
      transaction.state === TransactionState.Paid
    ) {
      const newState =
        transaction.state === TransactionState.Pending
          ? TransactionState.PendingCanceled
          : TransactionState.PaidCanceled;

      const updatedTransaction = await db.transaction.update({
        where: {
          id: transaction.id,
        },
        data: {
          state: newState,
          reason,
          cancelTime: Date.now(),
        },
      });

      return {
        cancel_time: Number(updatedTransaction.cancelTime),
        transaction: updatedTransaction.id,
        state: Number(updatedTransaction.state),
      };
    }

    throw new TransactionError(PaymeError.CantDoOperation, id, null);
  }

  async getStatement(params: any) {
    const { from, to } = params;

    const transactions = await db.transaction.findMany({
      where: {
        createTime: {
          gte: from,
          lte: to,
        },
        provider: 'PAYME',
      },
      orderBy: {
        createTime: 'asc',
      },
    });

    return transactions.map(transaction => ({
      id: transaction.id,
      time: Number(transaction.createTime),
      amount: transaction.amount * 100,
      account: {
        order_id: transaction.orderId,
      },
      create_time: Number(transaction.createTime),
      perform_time: Number(transaction.performTime),
      cancel_time: Number(transaction.cancelTime),
      transaction: transaction.id,
      state: Number(transaction.state),
      reason: transaction.reason,
      receivers: null,
    }));
  }
}
