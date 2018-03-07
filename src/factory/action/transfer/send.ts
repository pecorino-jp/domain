/**
 * 送信(配送)アクションファクトリー
 */

import * as ActionFactory from '../../action';
import ActionType from '../../actionType';

export type IAgent = ActionFactory.IParticipant;
export type IRecipient = ActionFactory.IParticipant;

export type IObject = any;
export type IResult = any;
export type IPotentialActions = any;
export type IPurpose = any;

export interface IAttributes<TObject, TResult> extends ActionFactory.IAttributes<TObject, TResult> {
    recipient: ActionFactory.IParticipant;
}

export type IAction<TAttributes extends IAttributes<IObject, IResult>> = ActionFactory.IAction<TAttributes>;

export function createAttributes<TObject, TResult>(params: {
    result?: TResult;
    object: TObject;
    agent: IAgent;
    recipient: ActionFactory.IParticipant;
    potentialActions?: IPotentialActions;
    purpose?: IPurpose;
}): IAttributes<TObject, TResult> {
    return {
        typeOf: ActionType.SendAction,
        result: params.result,
        object: params.object,
        agent: params.agent,
        recipient: params.recipient,
        potentialActions: params.potentialActions,
        purpose: params.purpose
    };
}
