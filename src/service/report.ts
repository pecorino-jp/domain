/**
 * レポートサービス
 */
import * as createDebug from 'debug';
import * as json2csv from 'json2csv';

import * as factory from '../factory';
import { MongoRepository as TransactionRepo } from '../repo/transaction';

const debug = createDebug('pecorino-domain:service');

/**
 * 取引ダウンロードフォーマット
 */
export type IDownloadFormat = 'csv';

/**
 * フォーマット指定でダウンロード
 * @param conditions 検索条件
 * @param format フォーマット
 */
// tslint:disable-next-line:max-func-body-length
export function download(
    conditions: {
        startFrom: Date;
        startThrough: Date;
    },
    format: IDownloadFormat
) {
    // tslint:disable-next-line:max-func-body-length
    return async (repos: {
        transaction: TransactionRepo;
    }): Promise<string> => {
        // 取引検索
        const transactions = await repos.transaction.search(conditions);
        debug('transactions:', transactions);

        // 取引ごとに詳細を検索し、csvを作成する
        const data = await Promise.all(transactions.map(async (t) => {
            if (t.status === factory.transactionStatusType.Confirmed) {
                return transaction2report({
                    transaction: t
                });
            } else {
                return transaction2report({
                    transaction: t
                });
            }
        }));
        debug('data:', data);

        if (format === 'csv') {
            return new Promise<string>((resolve) => {
                const fields: json2csv.json2csv.FieldInfo<any>[] = [
                    { label: '取引ID', default: '', value: 'id' },
                    { label: '取引タイプ', default: '', value: 'typeOf' },
                    { label: '取引ステータス', default: '', value: 'status' },
                    { label: '取引開始日時', default: '', value: 'startDate' },
                    { label: '取引終了日時', default: '', value: 'endDate' },
                    { label: '転送元タイプ', default: '', value: 'fromLocation.typeOf' },
                    { label: '転送元ID', default: '', value: 'fromLocation.id' },
                    { label: '転送元名', default: '', value: 'fromLocation.name' },
                    { label: '転送元URL', default: '', value: 'fromLocation.url' },
                    { label: '転送元口座番号', default: '', value: 'fromLocation.accountNumber' },
                    { label: '転送先タイプ', default: '', value: 'toLocation.typeOf' },
                    { label: '転送先ID', default: '', value: 'toLocation.id' },
                    { label: '転送先名', default: '', value: 'toLocation.name' },
                    { label: '転送先URL', default: '', value: 'fromLocation.url' },
                    { label: '転送先口座番号', default: '', value: 'toLocation.accountNumber' },
                    { label: '金額', default: '', value: 'amount' },
                    { label: '説明', default: '', value: 'description' }
                ];
                const json2csvParser = new json2csv.Parser({
                    fields: fields,
                    delimiter: ',',
                    eol: '\n',
                    // flatten: true,
                    // preserveNewLinesInValues: true,
                    unwind: 'reservedTickets'
                });
                const output = json2csvParser.parse(data);
                debug('output:', output);

                resolve(output);
                // resolve(jconv.convert(output, 'UTF8', 'SJIS'));
            });
        } else {
            throw new factory.errors.NotImplemented('specified format not implemented.');
        }
    };
}

/**
 * 取引レポートインターフェース
 */
export interface ITransactionReport {
    id: string;
    typeOf: string;
    status: string;
    startDate: string;
    endDate: string;
    fromLocation: {
        typeOf: string;
        id?: string;
        name?: any;
        url?: string;
        accountNumber?: string;
    };
    toLocation: {
        typeOf: string;
        id?: string;
        name?: any;
        url?: string;
        accountNumber?: string;
    };
    amount: number;
    description: string;
}

/**
 * 取引をレポート形式に変換する
 * @param transaction 取引オブジェクト
 */
export function transaction2report(params: {
    transaction: factory.account.transaction.ITransaction<factory.account.transactionType>;
}): ITransactionReport {
    const fromLocation = { ...params.transaction.agent, accountNumber: '' };
    const toLocation = { ...params.transaction.recipient, accountNumber: '' };
    switch (params.transaction.typeOf) {
        case factory.account.transactionType.Deposit:
            toLocation.accountNumber = params.transaction.object.toLocation.accountNumber;
            break;
        case factory.account.transactionType.Withdraw:
            fromLocation.accountNumber = params.transaction.object.fromLocation.accountNumber;
            break;
        case factory.account.transactionType.Transfer:
            toLocation.accountNumber = params.transaction.object.toLocation.accountNumber;
            fromLocation.accountNumber = params.transaction.object.fromLocation.accountNumber;
            break;

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore next */
        default:
    }
    if (params.transaction.result !== undefined) {
        return {
            id: params.transaction.id,
            typeOf: params.transaction.typeOf,
            status: params.transaction.status,
            startDate: (params.transaction.startDate !== undefined)
                ? params.transaction.startDate.toISOString()
                // tslint:disable-next-line:no-single-line-block-comment
                /* istanbul ignore next */
                : '',
            endDate: (params.transaction.endDate !== undefined)
                ? params.transaction.endDate.toISOString()
                // tslint:disable-next-line:no-single-line-block-comment
                /* istanbul ignore next */
                : '',
            fromLocation: fromLocation,
            toLocation: toLocation,
            amount: params.transaction.object.amount,
            description: (params.transaction.object.description !== undefined)
                ? params.transaction.object.description
                : /* istanbul ignore next */ ''
        };
    } else {
        return {
            id: params.transaction.id,
            typeOf: params.transaction.typeOf,
            status: params.transaction.status,
            startDate: (params.transaction.startDate !== undefined)
                ? params.transaction.startDate.toISOString()
                // tslint:disable-next-line:no-single-line-block-comment
                /* istanbul ignore next */
                : '',
            endDate: (params.transaction.endDate !== undefined)
                ? params.transaction.endDate.toISOString()
                // tslint:disable-next-line:no-single-line-block-comment
                /* istanbul ignore next */
                : '',
            fromLocation: fromLocation,
            toLocation: toLocation,
            amount: params.transaction.object.amount,
            description: (params.transaction.object.description !== undefined)
                ? params.transaction.object.description
                : /* istanbul ignore next */ ''
        };
    }
}
