
// require daemon
const config = require('config');
const Daemon = require('daemon');
const paypal = require('paypal-rest-sdk');

/**
 * Stripe Daemon
 *
 * @extends Daemon
 */
class PaypalDaemon extends Daemon {
  /**
   * construct paypal daemon
   */
  constructor(...args) {
    // run super
    super(...args);

    // bind variables
    paypal.configure(config.get('paypal'));

    // add endpoint
    this.eden.endpoint('subscription.paypal.cancel', async (subscription, payment) => {
      // return on no sub id
      if (!subscription.get('paypal.id') || !payment.get('data.payment.id')) return;

      // cancel subscription
      subscription.set('cancel', await new Promise((resolve, reject) => paypal.billingAgreement.cancel(subscription.get('paypal.id') || payment.get('data.payment.id'), {
        note : 'Cancelled as per request',
      }, (err, res) => {
        // check error
        if (err) return reject(err);

        // resolve
        return resolve(res);
      })));

      // set state
      subscription.set('state', 'cancelled');
      subscription.set('cancel_at', new Date());

      // save subscription
      await subscription.save();
    });

    // update agreement
    this.eden.endpoint('subscription.paypal.update', async (subscription, payment) => {
      // return on no sub id
      if (!subscription.get('paypal.id') || !payment.get('data.payment.id')) return;

      // cancel subscription
      const agreement = await new Promise((resolve, reject) => paypal.billingAgreement.get(subscription.get('paypal.id') || payment.get('data.payment.id'), (err, res) => {
        // check error
        if (err) return reject(err);

        // resolve
        return resolve(res);
      }));

      // check state
      if (agreement.state === 'Cancelled') {
        // set state
        subscription.set('cancel', agreement);
        subscription.set('cancel_at', new Date());

        // set state
        subscription.set('state', 'cancelled');

        // save subscription
        await subscription.save();
      }
    });
  }
}

/**
 * export paypal daemon
 *
 * @type {*}
 */
module.exports = PaypalDaemon;
