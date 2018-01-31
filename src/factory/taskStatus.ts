/**
 * タスクステータス
 *
 * @namespace taskStatus
 */

enum TaskStatus {
    /**
     * 準備OK
     */
    Ready = 'Ready',
    /**
     * 実行中
     */
    Running = 'Running',
    /**
     * 実行済
     */
    Executed = 'Executed',
    /**
     * 実行中止
     */
    Aborted = 'Aborted'
}

export default TaskStatus;
