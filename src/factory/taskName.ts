/**
 * task name
 * タスク名
 * @namespace taskName
 */

enum TaskName {
    /**
     * 支払取引中止
     */
    CancelPayAction = 'cancelPayAction',
    /**
     * 支払取引実行
     */
    ExecutePayAction = 'executePayAction',
    /**
     * 入金受取取引中止
     */
    CancelTakeAction = 'cancelTakeAction',
    /**
     * 入金受取取引実行
     */
    ExecuteTakeAction = 'executeTakeAction'
}

export default TaskName;
