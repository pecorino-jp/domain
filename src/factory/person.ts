/**
 * person factory
 * 人物ファクトリー
 * @namespace person
 */

import PersonType from './personType';
import * as ProgramMembershipFactory from './programMembership';

/**
 * contact interface
 * 連絡先インターフェース
 * @export
 * @interface {IPerson}
 * @memberof person
 */
export interface IContact {
    /**
     * Given name. In the U.S., the first name of a Person. This can be used along with familyName instead of the name property.
     * 名
     */
    givenName: string;
    /**
     * Family name. In the U.S., the last name of an Person. This can be used along with givenName instead of the name property.
     * 姓
     */
    familyName: string;
    /**
     * The telephone number.
     * 電話番号
     */
    telephone: string;
    /**
     * Email address.
     * メールアドレス
     */
    email: string;
}

/**
 * person interface
 * 人物インターフェース
 * @export
 * @interface {IPerson}
 * @memberof person
 */
export interface IPerson {
    /**
     * type of object
     */
    typeOf: PersonType;
    /**
     * person id (Amazon Cognito User Identifier)
     */
    id: string;
    /**
     * An Organization (or ProgramMembership) to which this Person or Organization belongs.
     * 所属会員プログラム
     */
    memberOf?: ProgramMembershipFactory.IProgramMembership;
    /**
     * URL of the item.
     */
    url: string;
}
