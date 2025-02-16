import type { Context, Next } from 'hono';
import { PaymeError } from '../constants/payme-error.js';
import { TransactionError } from '../errors/transaction.error.js';

const PAYME_LOGIN = process.env.PAYME_LOGIN;
const PAYME_PASSWORD = process.env.PAYME_PASSWORD;

export async function paymeMiddleware(c: Context, next: Next) {
  try {
    const body = await c.req.json();
    const { id } = body;

    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Basic ')) {
      throw new TransactionError(PaymeError.InvalidAuthorization, id, {
        message: 'Basic authorization required',
      });
    }

    const [type, token] = authHeader.split(' ');

    try {
      const decodedData = Buffer.from(token, 'base64').toString();

      const [username, password] = decodedData.split(':');

      const isValidUsername = username === PAYME_LOGIN;
      const isValidPassword = password === PAYME_PASSWORD;

      if (!isValidUsername || !isValidPassword) {
        throw new TransactionError(PaymeError.InvalidAuthorization, id, {
          message: 'Invalid credentials',
        });
      }
    } catch (error) {
      throw new TransactionError(PaymeError.InvalidAuthorization, id, {
        message: 'Invalid authorization token',
      });
    }

    await next();
  } catch (err) {
    if (err instanceof TransactionError) {
      if (err instanceof TransactionError) {
        return c.json({
          error: {
            code: err.transactionErrorCode,
            message: err.transactionErrorMessage,
          },
          data: err.transactionData,
          id: err.transactionId,
        });
      }
      throw err;
    }
  }
}
