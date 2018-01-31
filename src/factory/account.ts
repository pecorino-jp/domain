/**
 * 口座ファクトリー
 * @namespace account
 */

export interface ITransaction {
    id: string;
}
export type IHistory = any;
export type AccountStatusType = any;

export interface IAccount {
    id: string;
    name: string;
    balance: number;
    safeBalance: number;
    pendingTransactions: ITransaction[];
    openDate: Date;
    closeDate?: Date;
    status: AccountStatusType;
}
