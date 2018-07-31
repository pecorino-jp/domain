// tslint:disable:max-classes-per-file completed-docs
/**
 * リポジトリー
 * @module
 */
import { MongoRepository as AccountRepo } from './repo/account';
import { MongoRepository as ActionRepo } from './repo/action';
import { MongoRepository as TaskRepo } from './repo/task';
import { MongoRepository as TransactionRepo } from './repo/transaction';

export class Account extends AccountRepo { }
export class Action extends ActionRepo { }
export class Task extends TaskRepo { }
export class Transaction extends TransactionRepo { }
