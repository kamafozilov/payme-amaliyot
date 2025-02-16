import type { LocalizedMessage } from '@/payme/constants/transaction-types.js';
import { BaseError } from '@/payme/errors/base.error.js';
import type { PaymeErrorType } from '@/payme/types/transaction.types.js';

export class TransactionError extends BaseError {
  public transactionErrorCode: number;
  public transactionErrorMessage: LocalizedMessage;
  public transactionData: unknown;
  public transactionId: string | number;
  public isTransactionError: boolean;

  constructor(transactionError: PaymeErrorType, id: string | number, data: unknown) {
    super(400, transactionError.name);

    this.transactionErrorCode = transactionError.code;
    this.transactionErrorMessage = transactionError.message;
    this.transactionData = data;
    this.transactionId = id;
    this.isTransactionError = true;

    Object.setPrototypeOf(this, TransactionError.prototype);
  }
}
