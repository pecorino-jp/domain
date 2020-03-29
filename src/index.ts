// tslint:disable:max-classes-per-file completed-docs
/**
 * domain index module
 */
import * as factory from './factory';
import * as repository from './repository';

import * as AccountService from './service/account';
import * as NotificationService from './service/notification';
import * as ReportService from './service/report';
import * as TaskService from './service/task';
import * as TransactionService from './service/transaction';

export namespace service {
    export import account = AccountService;
    export import notification = NotificationService;
    export import report = ReportService;
    export import task = TaskService;
    export import transaction = TransactionService;
}

export import factory = factory;
export import repository = repository;
