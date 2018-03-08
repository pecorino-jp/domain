/**
 * 貨幣転送アクションファクトリー
 */

import * as AccountFactory from '../../account';
import * as ActionFactory from '../../action';
import ActionType from '../../actionType';
import TransactionType from '../../transactionType';

export type IAgent = ActionFactory.IParticipant;
export type IRecipient = ActionFactory.IParticipant;

/**
 * 口座以外の匿名場所インターフェース
 */
export interface IAnonymousLocation {
    typeOf: string;
    name: string;
}

/**
 * 口座インターフェース
 */
export interface IAccount {
    typeOf: AccountFactory.AccountType.Account;
    id: string;
    name: string;
}

/**
 * 転送元あるいは転送先の場所インターフェース
 */
export type ILocation = IAnonymousLocation | IAccount;

export type IObject = any;
export type IResult = any;
export type IPotentialActions = any;

/**
 * アクションの目的インターフェース
 * ここでは、取引が目的となる
 */
export interface IPurpose {
    /**
     * 取引タイプ
     */
    typeOf: TransactionType;
    /**
     * 取引ID
     */
    id: string;
}

export interface IAttributes extends ActionFactory.IAttributes<IObject, IResult> {
    /**
     * どんな取引によって発生した転送アクションか
     */
    purpose: IPurpose;
    /**
     * 転送量(金額)
     */
    amount: number;
    /**
     * 転送元
     */
    fromLocation: ILocation;
    /**
     * 転送先
     */
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
