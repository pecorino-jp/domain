/**
 * 取引ファクトリー
 */
import * as factory from '../../factory';

/**
 * 転送アクション属性作成
 */
export function createMoneyTransferActionAttributes<T extends factory.account.AccountType>(params: {
    transaction: factory.transaction.ITransaction<any, T>;
}): factory.action.transfer.moneyTransfer.IAttributes<T> {
    const transaction = params.transaction;

    const fromLocation: factory.action.transfer.moneyTransfer.ILocation<T> =
        (transaction.object.fromLocation !== undefined && transaction.object.fromLocation !== null)
            ? transaction.object.fromLocation
            : /* istanbul ignore next */ {
                typeOf: transaction.agent.typeOf,
                name: transaction.agent.name
            };
    const toLocation: factory.action.transfer.moneyTransfer.ILocation<T> =
        (transaction.object.toLocation !== undefined && transaction.object.toLocation !== null)
            ? transaction.object.toLocation
            : /* istanbul ignore next */ {
                typeOf: transaction.recipient.typeOf,
                name: transaction.recipient.name
            };

    return {
        project: transaction.project,
        typeOf: factory.actionType.MoneyTransfer,
        description: transaction.object.description,
        result: {
            amount: transaction.object.amount
        },
        object: {},
        agent: transaction.agent,
        recipient: transaction.recipient,
        amount: transaction.object.amount,
        fromLocation: fromLocation,
        toLocation: toLocation,
        purpose: {
            typeOf: transaction.typeOf,
            id: transaction.id
        }
    };
}
