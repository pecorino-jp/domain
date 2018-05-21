// tslint:disable:max-classes-per-file completed-docs
/**
 * pecorino-domain index module
 * @module
 */
import * as ioredis from 'ioredis';
import * as mongoose from 'mongoose';

import * as factory from './factory';
import * as repository from './repository';

import * as AccountService from './service/account';
import * as NotificationService from './service/notification';
import * as ReportService from './service/report';
import * as TaskService from './service/task';
import * as DepositTransactionService from './service/transaction/deposit';
import * as PayTransactionService from './service/transaction/pay';
import * as TransferTransactionService from './service/transaction/transfer';

/**
 * MongoDBクライアント`mongoose`
 *
 * @example
 * var promise = pecorino.mongoose.connect('mongodb://localhost/myapp', {
 *     useMongoClient: true
 * });
 */
export import mongoose = mongoose;

export import ioredis = ioredis;

export namespace service {
    export import account = AccountService;
    export import notification = NotificationService;
    export import report = ReportService;
    export import task = TaskService;
    export namespace transaction {
        export import deposit = DepositTransactionService;
        export import pay = PayTransactionService;
        export import transfer = TransferTransactionService;
    }
}

export import factory = factory;

export import repository = repository;
