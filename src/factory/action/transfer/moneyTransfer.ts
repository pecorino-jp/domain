/**
 * 貨幣転送アクションファクトリー
 */

import * as ActionFactory from '../../action';
import ActionType from '../../actionType';
import TransactionType from '../../transactionType';

export type IAgent = ActionFactory.IParticipant;
export type IRecipient = ActionFactory.IParticipant;

export interface ILocation {
    typeOf: string;
    accountId: string;
    name: string;
}

export type IObject = any;
export type IResult = any;
export type IPotentialActions = any;
export interface IPurpose {
    typeOf: TransactionType;
    id: string;
}

export interface IAttributes extends ActionFactory.IAttributes<IObject, IResult> {
    purpose: IPurpose;
    amount: number;
    fromLocation: ILocation;
    toLocation: ILocation;
}

export type IAction = ActionFactory.IAction<IAttributes>;

export function createAttributes<TObject, TResult>(params: {
    result?: TResult;
    object: TObject;
    agent: IAgent;
    recipient: ActionFactory.IParticipant;
    potentialActions?: IPotentialActions;
    purpose: IPurpose;
    amount: number;
    fromLocation: ILocation;
    toLocation: ILocation;
}): IAttributes {
    return {
        typeOf: ActionType.MoneyTransfer,
        result: params.result,
        object: params.object,
        agent: params.agent,
        recipient: params.recipient,
        potentialActions: params.potentialActions,
        purpose: params.purpose,
        amount: params.amount,
        fromLocation: params.fromLocation,
        toLocation: params.toLocation
    };
}
