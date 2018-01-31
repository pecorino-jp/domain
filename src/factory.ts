/**
 * pecorino-factory
 * @module
 */

import * as AccountFactory from './factory/account';
import * as ActionFactory from './factory/action';
import * as TradeActionFactory from './factory/action/trade';
import * as PayActionFactory from './factory/action/trade/pay';
import * as ClientUserFactory from './factory/clientUser';
import * as EmailMessageFactory from './factory/creativeWork/message/email';
import CreativeWorkType from './factory/creativeWorkType';
import IMultilingualString from './factory/multilingualString';
import OrganizationType from './factory/organizationType';
import PersonType from './factory/personType';
import PriceCurrency from './factory/priceCurrency';
import * as TaskFactory from './factory/task';
import * as CancelPayActionTaskFactory from './factory/task/cancelPayAction';
import * as ExecutePayActionTaskFactory from './factory/task/executePayAction';
import * as TaskExecutionResultFactory from './factory/taskExecutionResult';
import TaskName from './factory/taskName';
import TaskStatus from './factory/taskStatus';
import * as PayTransactionFactory from './factory/transaction/pay';
import TransactionStatusType from './factory/transactionStatusType';
import TransactionTasksExportationStatus from './factory/transactionTasksExportationStatus';
import TransactionType from './factory/transactionType';
import * as URLFactory from './factory/url';

import ErrorCode from './factory/errorCode';
import * as errors from './factory/errors';

export import errors = errors;
export import errorCode = ErrorCode;

export import actionStatusType = ActionFactory.ActionStatusType;
export import actionType = ActionFactory.ActionType;
export namespace action {
    export import IParticipant = ActionFactory.IParticipant;
    export namespace trade {
        export import IAction = TradeActionFactory.IAction;
        export import IAttributes = TradeActionFactory.IAttributes;
        export import pay = PayActionFactory;
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
    export import cancelPayAction = CancelPayActionTaskFactory;
    export import executePayAction = ExecutePayActionTaskFactory;
}
export import taskExecutionResult = TaskExecutionResultFactory;
export import taskName = TaskName;
export import taskStatus = TaskStatus;
export namespace transaction {
    export import pay = PayTransactionFactory;
}
export import transactionStatusType = TransactionStatusType;
export import transactionTasksExportationStatus = TransactionTasksExportationStatus;
export import transactionType = TransactionType;
export import url = URLFactory;
