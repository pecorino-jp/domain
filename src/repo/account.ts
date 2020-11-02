import * as createDebug from 'debug';
import { Connection } from 'mongoose';

import AccountModel from './mongoose/model/account';

import * as factory from '../factory';

const debug = createDebug('pecorino-domain:repository');

/**
 * 口座リポジトリ
 */
export class MongoRepository {
    public readonly accountModel: typeof AccountModel;

    constructor(connection: Connection) {
        this.accountModel = connection.model(AccountModel.modelName);
    }

    // tslint:disable-next-line:cyclomatic-complexity max-func-body-length
    public static CREATE_MONGO_CONDITIONS(params: factory.account.ISearchConditions) {
        const andConditions: any[] = [];

        const accountTypeEq = params.accountType;
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (typeof accountTypeEq === 'string') {
            andConditions.push({
                accountType: accountTypeEq
            });
        }

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.project !== undefined && params.project !== null) {
            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore else */
            if (params.project.id !== undefined && params.project.id !== null) {
                // tslint:disable-next-line:no-single-line-block-comment
                /* istanbul ignore else */
                if (typeof params.project.id.$eq === 'string') {
                    andConditions.push({
                        'project.id': {
                            $exists: true,
                            $eq: params.project.id.$eq
                        }
                    });
                }

                // tslint:disable-next-line:no-single-line-block-comment
                /* istanbul ignore else */
                if (typeof params.project.id.$ne === 'string') {
                    andConditions.push({
                        'project.id': {
                            $ne: params.project.id.$ne
                        }
                    });
                }
            }
        }

        const accountNumberEq = params.accountNumber?.$eq;
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (typeof accountNumberEq === 'string') {
            andConditions.push({
                accountNumber: { $eq: accountNumberEq }
            });
        }

        const accountNumberIn = params.accountNumber?.$in;
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (Array.isArray(accountNumberIn)) {
            andConditions.push({
                accountNumber: { $in: accountNumberIn }
            });
        }

        const accountNumberRegex = params.accountNumber?.$regex;
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (typeof accountNumberRegex === 'string') {
            andConditions.push({
                accountNumber: { $regex: new RegExp(accountNumberRegex) }
            });
        }

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (Array.isArray(params.accountNumbers) && params.accountNumbers.length > 0) {
            andConditions.push({
                accountNumber: { $in: params.accountNumbers }
            });
        }
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (Array.isArray(params.statuses) && params.statuses.length > 0) {
            andConditions.push({
                status: { $in: params.statuses }
            });
        }

        const nameRegex = params.name?.$regex;
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (typeof nameRegex === 'string') {
            andConditions.push({
                name: { $regex: new RegExp(nameRegex) }
            });
        }

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore if */
        if (typeof params.name === 'string') {
            andConditions.push({
                name: new RegExp(params.name)
            });
        }

        const openDateGte = params.openDate?.$gte;
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (openDateGte instanceof Date) {
            andConditions.push({
                openDate: { $gte: openDateGte }
            });
        }

        const openDateLte = params.openDate?.$lte;
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (openDateLte instanceof Date) {
            andConditions.push({
                openDate: { $lte: openDateLte }
            });
        }

        const typeOfEq = params.typeOf?.$eq;
        if (typeof typeOfEq === 'string') {
            andConditions.push({
                typeOf: { $eq: typeOfEq }
            });
        }

        const typeOfIn = params.typeOf?.$in;
        if (Array.isArray(typeOfIn)) {
            andConditions.push({
                typeOf: { $in: typeOfIn }
            });
        }

        return andConditions;
    }

    /**
     * 口座を開設する
     */
    public async open(params: {
        project: { typeOf: 'Project'; id: string };
        /**
         * 口座種別
         */
        typeOf: string;
        /**
         * 口座タイプ
         */
        accountType: string;
        /**
         * 口座名義
         */
        name: string;
        /**
         * 口座番号
         */
        accountNumber: string;
        /**
         * 初期金額
         */
        initialBalance: number;
        /**
         * 開設日時
         */
        openDate: Date;
    }): Promise<factory.account.IAccount> {
        const account: factory.account.IAccount = {
            project: { typeOf: params.project.typeOf, id: params.project.id },
            typeOf: params.typeOf,
            accountType: params.accountType,
            accountNumber: params.accountNumber,
            name: params.name,
            balance: params.initialBalance,
            availableBalance: params.initialBalance,
            pendingTransactions: [],
            openDate: params.openDate,
            status: factory.accountStatusType.Opened
        };

        const doc = await this.accountModel.create(account);

        return doc.toObject();
    }

    /**
     * 口座を解約する
     */
    public async close(params: {
        /**
         * 口座番号
         */
        accountNumber: string;
        /**
         * 解約日時
         */
        closeDate: Date;
    }) {
        debug('closing account...');
        const doc = await this.accountModel.findOneAndUpdate(
            {
                accountNumber: params.accountNumber,
                pendingTransactions: { $size: 0 },
                status: factory.accountStatusType.Opened
            },
            {
                closeDate: params.closeDate,
                status: factory.accountStatusType.Closed
            },
            {
                new: true
            }
        )
            .exec();

        // NotFoundであれば口座状態確認
        if (doc === null) {
            const account = await this.findByAccountNumber({
                accountNumber: params.accountNumber
            });
            if (account.status === factory.accountStatusType.Closed) {
                // すでに口座解約済の場合
                return;
            } else if (account.pendingTransactions.length > 0) {
                // 進行中取引が存在する場合の場合
                throw new factory.errors.Argument('accountNumber', 'Pending transactions exist');
            } else {
                throw new factory.errors.NotFound(this.accountModel.modelName);
            }
        }
    }

    /**
     * 口座番号で検索する
     */
    public async findByAccountNumber(params: {
        /**
         * 口座番号
         */
        accountNumber: string;
    }): Promise<factory.account.IAccount> {
        const doc = await this.accountModel.findOne({
            accountNumber: params.accountNumber
        })
            .exec();
        if (doc === null) {
            throw new factory.errors.NotFound(this.accountModel.modelName);
        }

        return doc.toObject();
    }

    /**
     * 金額を確保する
     * @see https://en.wikipedia.org/wiki/Authorization_hold
     */
    public async authorizeAmount(params: {
        /**
         * 口座番号
         */
        accountNumber: string;
        /**
         * 金額
         */
        amount: number;
        /**
         * 進行取引
         */
        transaction: factory.account.IPendingTransaction;
    }) {
        const doc = await this.accountModel.findOneAndUpdate(
            {
                accountNumber: params.accountNumber,
                availableBalance: { $gte: params.amount }, // 利用可能金額確認
                status: factory.accountStatusType.Opened // 開いている口座
            },
            {
                $inc: { availableBalance: -params.amount }, // 残高を減らす
                $push: { pendingTransactions: params.transaction } // 進行中取引追加
            },
            { new: true }
        )
            .exec();

        // NotFoundであれば口座状態確認
        if (doc === null) {
            const account = await this.findByAccountNumber({
                accountNumber: params.accountNumber
            });
            if (account.status === factory.accountStatusType.Closed) {
                // 口座解約済の場合
                throw new factory.errors.Argument('accountNumber', 'Account already closed');
            } else if (account.availableBalance < params.amount) {
                // 残高不足の場合
                throw new factory.errors.Argument('accountNumber', 'Insufficient balance');
            } else {
                throw new factory.errors.NotFound(this.accountModel.modelName);
            }
        }
    }

    /**
     * 取引を開始する
     */
    public async startTransaction(params: {
        /**
         * 口座番号
         */
        accountNumber: string;
        /**
         * 進行取引
         */
        transaction: factory.account.IPendingTransaction;
    }) {
        const doc = await this.accountModel.findOneAndUpdate(
            {
                accountNumber: params.accountNumber,
                status: factory.accountStatusType.Opened // 開いている口座
            },
            { $push: { pendingTransactions: params.transaction } }
        )
            .exec();

        // NotFoundであれば口座状態確認
        if (doc === null) {
            const account = await this.findByAccountNumber({
                accountNumber: params.accountNumber
            });
            if (account.status === factory.accountStatusType.Closed) {
                // 口座解約済の場合
                throw new factory.errors.Argument('accountNumber', 'Account already closed');
            } else {
                throw new factory.errors.NotFound(this.accountModel.modelName);
            }
        }
    }

    /**
     * 決済処理を実行する
     * 口座上で進行中の取引について、実際に金額移動処理を実行します。
     */
    public async settleTransaction(params: {
        fromAccountNumber?: string;
        toAccountNumber?: string;
        amount: number;
        transactionId: string;
    }) {
        // 転送元があれば残高調整
        if (params.fromAccountNumber !== undefined) {
            await this.accountModel.findOneAndUpdate(
                {
                    accountNumber: params.fromAccountNumber,
                    'pendingTransactions.id': params.transactionId
                },
                {
                    $inc: {
                        balance: -params.amount // 残高調整
                    },
                    $pull: { pendingTransactions: { id: params.transactionId } }
                }
            )
                .exec();
        }

        // 転送先へがあれば入金
        if (params.toAccountNumber !== undefined) {
            await this.accountModel.findOneAndUpdate(
                {
                    accountNumber: params.toAccountNumber,
                    'pendingTransactions.id': params.transactionId
                },
                {
                    $inc: {
                        balance: params.amount,
                        availableBalance: params.amount
                    },
                    $pull: { pendingTransactions: { id: params.transactionId } }
                }
            )
                .exec();
        }
    }

    /**
     * 取引を取り消す
     * 口座上で進行中の取引を中止します。
     * @see https://www.investopedia.com/terms/v/void-transaction.asp
     */
    public async voidTransaction(params: {
        fromAccountNumber?: string;
        toAccountNumber?: string;
        amount: number;
        transactionId: string;
    }) {
        // 転送元があればhold解除
        if (params.fromAccountNumber !== undefined) {
            await this.accountModel.findOneAndUpdate(
                {
                    accountNumber: params.fromAccountNumber,
                    'pendingTransactions.id': params.transactionId
                },
                {
                    $inc: {
                        availableBalance: params.amount // 残高調整
                    },
                    $pull: { pendingTransactions: { id: params.transactionId } }
                }
            )
                .exec();
        }

        // 転送先へがあれば進行中取引削除
        if (params.toAccountNumber !== undefined) {
            await this.accountModel.findOneAndUpdate(
                {
                    accountNumber: params.toAccountNumber,
                    'pendingTransactions.id': params.transactionId
                },
                {
                    $pull: { pendingTransactions: { id: params.transactionId } }
                }
            )
                .exec();
        }
    }

    /**
     * 通貨転送返金
     */
    public async returnTransaction(params: {
        fromAccountNumber?: string;
        toAccountNumber?: string;
        amount: number;
        transactionId: string;
    }) {
        if (params.fromAccountNumber !== undefined) {
            await this.accountModel.findOneAndUpdate(
                {
                    accountNumber: params.fromAccountNumber,
                    'retunedTransaction.id': { $ne: params.transactionId }
                },
                {
                    $inc: {
                        balance: params.amount,
                        availableBalance: params.amount
                    },
                    $push: { retunedTransaction: { id: params.transactionId } }
                }
            )
                .exec();
        }

        if (params.toAccountNumber !== undefined) {
            await this.accountModel.findOneAndUpdate(
                {
                    accountNumber: params.toAccountNumber,
                    'retunedTransaction.id': { $ne: params.transactionId }
                },
                {
                    $inc: {
                        balance: -params.amount,
                        availableBalance: -params.amount
                    },
                    $push: { retunedTransaction: { id: params.transactionId } }
                }
            )
                .exec();
        }
    }

    public async count(params: factory.account.ISearchConditions): Promise<number> {
        const conditions = MongoRepository.CREATE_MONGO_CONDITIONS(params);

        return this.accountModel.countDocuments((conditions.length > 0) ? { $and: conditions } : {})
            .setOptions({ maxTimeMS: 10000 })
            .exec();
    }

    /**
     * 口座を検索する
     */
    public async search(
        params: factory.account.ISearchConditions
    ): Promise<factory.account.IAccount[]> {
        const conditions = MongoRepository.CREATE_MONGO_CONDITIONS(params);
        const query = this.accountModel.find(
            (conditions.length > 0) ? { $and: conditions } : {},
            {
                __v: 0,
                createdAt: 0,
                updatedAt: 0,
                pendingTransactions: 0
            }
        );
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.limit !== undefined && params.page !== undefined) {
            query.limit(params.limit)
                .skip(params.limit * (params.page - 1));
        }
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.sort !== undefined) {
            query.sort(params.sort);
        }

        return query.setOptions({ maxTimeMS: 10000 })
            .exec()
            .then((docs) => docs.map((doc) => doc.toObject()));
    }
}
