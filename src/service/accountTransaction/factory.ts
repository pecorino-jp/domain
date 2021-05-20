/**
 * 取引ファクトリー
 */
import * as factory from '../../factory';

/**
 * 転送アクション属性作成
 */
export function createMoneyTransferActionAttributes(params: {
    transaction: factory.account.transaction.ITransaction<factory.account.transactionType>;
}): factory.account.action.moneyTransfer.IAttributes {
    const transaction = params.transaction;

    const fromLocation: factory.account.action.moneyTransfer.ILocation =
        (transaction.object.fromLocation !== undefined && transaction.object.fromLocation !== null)
            ? {
                ...transaction.object.fromLocation,
                name: transaction.agent.name
            }
            : /* istanbul ignore next */ {
                typeOf: transaction.agent.typeOf,
                name: transaction.agent.name
            };
    const toLocation: factory.account.action.moneyTransfer.ILocation =
        (transaction.object.toLocation !== undefined && transaction.object.toLocation !== null)
            ? {
                ...transaction.object.toLocation,
                name: transaction.recipient.name
            }
            : /* istanbul ignore next */ {
                typeOf: transaction.recipient.typeOf,
                name: transaction.recipient.name
            };

    let accountType: string;
    switch (params.transaction.typeOf) {
        case factory.account.transactionType.Deposit:
            accountType = params.transaction.object.toLocation.accountType;
            break;
        case factory.account.transactionType.Transfer:
            accountType = params.transaction.object.fromLocation.accountType;
            break;
        case factory.account.transactionType.Withdraw:
            accountType = params.transaction.object.fromLocation.accountType;
            break;

        default:
            throw new factory.errors.NotImplemented(`transaction type ${(<any>params.transaction).typeOf} not implemented`);
    }

    return {
        project: transaction.project,
        typeOf: factory.actionType.MoneyTransfer,
        identifier: `${factory.actionType.MoneyTransfer}-${transaction.typeOf}-${transaction.id}`,
        description: transaction.object.description,
        result: {
            amount: transaction.object.amount
        },
        object: {},
        agent: transaction.agent,
        recipient: transaction.recipient,
        amount: {
            typeOf: 'MonetaryAmount',
            currency: accountType,
            value: transaction.object.amount
        },
        fromLocation: fromLocation,
        toLocation: toLocation,
        purpose: {
            typeOf: transaction.typeOf,
            id: transaction.id,
            ...(typeof transaction.identifier === 'string')
                ? { identifier: transaction.identifier }
                : /* istanbul ignore next */ undefined,
            ...(typeof transaction.transactionNumber === 'string')
                ? { transactionNumber: transaction.transactionNumber }
                : /* istanbul ignore next */ undefined
        }
    };
}
