/**
 * 口座ファクトリー
 */

import TransactionType from './transactionType';

export interface IPendingTransaction {
    typeOf: TransactionType;
    /**
     * 取引ID
     */
    id: string;
}

export type AccountStatusType = any;

/**
 * 口座インターフェース
 */
export interface IAccount {
    id: string;
    name: string;
    balance: number;
    safeBalance: number;
    /**
     * 進行中取引リスト
     */
    pendingTransactions: IPendingTransaction[];
    openDate: Date;
    closeDate?: Date;
    status: AccountStatusType;
}
