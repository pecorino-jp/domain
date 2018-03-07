/**
 * pecorino-factory
 * @module
 */

import * as AccountFactory from './factory/account';

import * as ActionFactory from './factory/action';
import * as MoneyTransferActionFactory from './factory/action/transfer/moneyTransfer';
import * as SendEmailMessageActionFactory from './factory/action/transfer/send/message/email';
import ActionStatusType from './factory/actionStatusType';
import ActionType from './factory/actionType';

import * as ClientUserFactory from './factory/clientUser';
import * as EmailMessageFactory from './factory/creativeWork/message/email';
import CreativeWorkType from './factory/creativeWorkType';
import IMultilingualString from './factory/multilingualString';
import OrganizationType from './factory/organizationType';
import PersonType from './factory/personType';
import PriceCurrency from './factory/priceCurrency';
import * as TaskFactory from './factory/task';
import * as CancelMoneyTransferTaskFactory from './factory/task/cancelMoneyTransfer';
import * as MoneyTransferTaskFactory from './factory/task/moneyTransfer';
import * as TaskExecutionResultFactory from './factory/taskExecutionResult';
import TaskName from './factory/taskName';
import TaskStatus from './factory/taskStatus';
import * as TransactionFactory from './factory/transaction';
import * as DepositTransactionFactory from './factory/transaction/deposit';
import * as PayTransactionFactory from './factory/transaction/pay';
import TransactionStatusType from './factory/transactionStatusType';
import TransactionTasksExportationStatus from './factory/transactionTasksExportationStatus';
import TransactionType from './factory/transactionType';
import * as URLFactory from './factory/url';

import ErrorCode from './factory/errorCode';
import * as errors from './factory/errors';

export import errors = errors;
export import errorCode = ErrorCode;

export import actionStatusType = ActionStatusType;
export import actionType = ActionType;
export namespace action {
    export import IAction = ActionFactory.IAction;
    export import IAttributes = ActionFactory.IAttributes;
    export import IParticipant = ActionFactory.IParticipant;
    export import IPurpose = ActionFactory.IPurpose;

    export namespace transfer {
        export import moneyTransfer = MoneyTransferActionFactory;

        export namespace send {
            export namespace message {
                export import email = SendEmailMessageActionFactory;
            }
        }
    }
}
export import account = AccountFactory;
export import clientUser = ClientUserFactory;
export namespace creativeWork {
    export namespace message {
        export import email = EmailMessageFactory;
    }
}
export import creativeWorkType = CreativeWorkType;
export type multilingualString = IMultilingualString;
export import organizationType = OrganizationType;
export import personType = PersonType;
export import priceCurrency = PriceCurrency;
export namespace task {
    export import IAttributes = TaskFactory.IAttributes;
    export import ITask = TaskFactory.ITask;
    export import cancelMoneyTransfer = CancelMoneyTransferTaskFactory;
    export import moneyTransfer = MoneyTransferTaskFactory;
}
export import taskExecutionResult = TaskExecutionResultFactory;
export import taskName = TaskName;
export import taskStatus = TaskStatus;
export namespace transaction {
    export import ITransaction = TransactionFactory.ITransaction;
    export import pay = PayTransactionFactory;
    export import deposit = DepositTransactionFactory;
}
export import transactionStatusType = TransactionStatusType;
export import transactionTasksExportationStatus = TransactionTasksExportationStatus;
export import transactionType = TransactionType;
export import url = URLFactory;
