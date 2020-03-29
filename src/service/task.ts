/**
 * タスクサービス
 */
import * as createDebug from 'debug';
import * as moment from 'moment';
import * as mongoose from 'mongoose';

import * as factory from '../factory';
import { MongoRepository as TaskRepo } from '../repo/task';

import * as NotificationService from './notification';
import * as TaskFunctionsService from './taskFunctions';

export type TaskOperation<T> = (repos: { task: TaskRepo }) => Promise<T>;
export type TaskAndConnectionOperation<T> = (settings: {
    taskRepo: TaskRepo;
    connection: mongoose.Connection;
}) => Promise<T>;

const debug = createDebug('pecorino-domain:service');

export const ABORT_REPORT_SUBJECT = 'Task aborted !!!';

/**
 * タスク名でタスクをひとつ実行する
 */
export function executeByName(taskName: factory.taskName): TaskAndConnectionOperation<void> {
    return async (settings: {
        taskRepo: TaskRepo;
        connection: mongoose.Connection;
    }) => {
        // 未実行のタスクを取得
        // tslint:disable-next-line:no-null-keyword
        let task: factory.task.ITask | null = null;
        try {
            task = await settings.taskRepo.executeOneByName(taskName);
            debug('task found', task);
        } catch (error) {
            debug('executeByName error:', error);
        }

        // タスクがなければ終了
        if (task !== null) {
            await execute(task)(settings);
        }
    };
}

/**
 * タスクを実行する
 */
export function execute(task: factory.task.ITask): TaskAndConnectionOperation<void> {
    debug('executing a task...', task);
    const now = new Date();

    return async (settings: {
        taskRepo: TaskRepo;
        connection: mongoose.Connection;
    }) => {
        try {
            // タスク名の関数が定義されていなければ、TypeErrorとなる
            await (<any>TaskFunctionsService)[task.name](task)(settings);

            const result = {
                executedAt: now,
                error: ''
            };
            await settings.taskRepo.pushExecutionResultById(task.id, factory.taskStatus.Executed, result);
        } catch (error) {
            // 実行結果追加
            const result = {
                executedAt: now,
                error: { ...error, message: error.message }
            };
            // 失敗してもここではステータスを戻さない(Runningのまま待機)
            await settings.taskRepo.pushExecutionResultById(task.id, task.status, result);
        }
    };
}

/**
 * 実行中ステータスのままになっているタスクをリトライする
 */
export function retry(intervalInMinutes: number): TaskOperation<void> {
    return async (repos: { task: TaskRepo }) => {
        await repos.task.retry(intervalInMinutes);
    };
}

/**
 * トライ可能回数が0に達したタスクを実行中止する
 */
export function abort(intervalInMinutes: number): TaskOperation<void> {
    return async (repos: { task: TaskRepo }) => {
        const abortedTask = await repos.task.abortOne(intervalInMinutes);

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore if */
        if (abortedTask === null) {
            return;
        }
        debug('abortedTask found', abortedTask);

        // 開発者へ報告
        const lastResult = (abortedTask.executionResults.length > 0) ?
            abortedTask.executionResults[abortedTask.executionResults.length - 1].error :
            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore next */
            '';

        await NotificationService.report2developers(
            ABORT_REPORT_SUBJECT,
            `id:${abortedTask.id}
name:${abortedTask.name}
runsAt:${moment(abortedTask.runsAt)
                .toISOString()}
lastTriedAt:${moment(<Date>abortedTask.lastTriedAt)
                .toISOString()}
numberOfTried:${abortedTask.numberOfTried}
lastResult:${lastResult}`
        )();
    };
}
