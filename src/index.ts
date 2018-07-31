// tslint:disable:max-classes-per-file completed-docs
/**
 * domain index module
 */
import * as mongoose from 'mongoose';

import * as factory from './factory';
import * as repository from './repository';

import * as AccountService from './service/account';
import * as NotificationService from './service/notification';
import * as ReportService from './service/report';
import * as TaskService from './service/task';
import * as DepositTransactionService from './service/transaction/deposit';
import * as TransferTransactionService from './service/transaction/transfer';
import * as WithdrawTransactionService from './service/transaction/withdraw';

/**
 * MongoDBクライアント`mongoose`
 * @example
 * var promise = domain.mongoose.connect('mongodb://localhost/myapp', {
 *     useMongoClient: true
 * });
 */
export import mongoose = mongoose;

export namespace service {
    export import account = AccountService;
    export import notification = NotificationService;
    export import report = ReportService;
    export import task = TaskService;
    export namespace transaction {
        export import deposit = DepositTransactionService;
        export import transfer = TransferTransactionService;
        export import withdraw = WithdrawTransactionService;
    }
}

export import factory = factory;

export import repository = repository;
