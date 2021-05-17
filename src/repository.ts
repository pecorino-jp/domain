// tslint:disable:max-classes-per-file completed-docs
/**
 * リポジトリ
 */
import { MongoRepository as AccountRepo } from './repo/account';
import { MongoRepository as AccountActionRepo } from './repo/accountAction';
import { MongoRepository as AccountTransactionRepo } from './repo/accountTransaction';
import { MongoRepository as TaskRepo } from './repo/task';

export class Account extends AccountRepo { }
export class AccountAction extends AccountActionRepo { }
export class AccountTransaction extends AccountTransactionRepo { }
export class Task extends TaskRepo { }
