// tslint:disable:max-classes-per-file completed-docs

/**
 * pecorino-domain リポジトリー
 * @module
 */

import { MongoRepository as AccountRepo } from './repo/account';
import { RedisRepository as AccountNumberRepo } from './repo/accountNumber';
import { MongoRepository as ActionRepo } from './repo/action';
import { MongoRepository as TaskRepo } from './repo/task';
import { MongoRepository as TransactionRepo } from './repo/transaction';

export class Account extends AccountRepo { }
export class AccountNumber extends AccountNumberRepo { }
export class Action extends ActionRepo { }
export class Task extends TaskRepo { }
export class Transaction extends TransactionRepo { }
