/**
 * 取引タイプ
 */

enum TransactionType {
    /**
     * 支払取引
     */
    Pay = 'Pay',
    /**
     * 入金取引
     */
    Deposit = 'Deposit',
    /**
     * 転送取引
     */
    Transfer = 'Transfer'
}

export default TransactionType;
