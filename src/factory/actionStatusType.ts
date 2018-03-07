/**
 * アクションステータス
 */
enum ActionStatusType {
    ActiveActionStatus = 'ActiveActionStatus',
    CompletedActionStatus = 'CompletedActionStatus',
    FailedActionStatus = 'FailedActionStatus',
    PotentialActionStatus = 'PotentialActionStatus',
    CanceledActionStatus = 'CanceledActionStatus'
}

export default ActionStatusType;
