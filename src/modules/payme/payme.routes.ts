import { Hono } from 'hono';
import { PaymeCheckoutController } from './controllers/checkout.controller.js';
import { PaymeController } from './controllers/payme.controller.js';
import { paymeMiddleware } from './middlewares/payme.middleware.js';

const payme = new Hono();
const controller = new PaymeController();
const checkoutController = new PaymeCheckoutController();

payme.use('/', paymeMiddleware);
payme.post('/', c => controller.merchant(c));
payme.post('/create-payment-link', c => checkoutController.createPaymentLink(c));

export const paymeRoutes = payme;
