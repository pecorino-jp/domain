/**
 * service module
 */
import { service } from '@chevre/domain';
import * as AccountService from './service/account';
import * as AccountTransactionService from './service/accountTransaction';
import * as ReportService from './service/report';
import * as TaskService from './service/task';

export import account = AccountService;
export import notification = service.notification;
export import report = ReportService;
export import task = TaskService;
export import accountTransaction = AccountTransactionService;
