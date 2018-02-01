// tslint:disable:max-classes-per-file completed-docs

/**
 * pecorino-domain リポジトリー
 * @module
 */

import { MongoRepository as AccountRepo } from './repo/account';
import { MongoRepository as ActionRepo } from './repo/action';
import { MongoRepository as PayActionRepo } from './repo/action/trade/pay';
import { MongoRepository as TaskRepo } from './repo/task';
import { MongoRepository as TransactionRepo } from './repo/transaction';
import { MongoRepository as DepositTransactionRepo } from './repo/transaction/deposit';

export namespace action {
    export namespace trade {
        export class Pay extends PayActionRepo { }
    }
}
export class Action extends ActionRepo { }
export class Account extends AccountRepo { }
export class Task extends TaskRepo { }
export class Transaction extends TransactionRepo { }
export namespace transaction {
    export class Deposit extends DepositTransactionRepo { }
}
