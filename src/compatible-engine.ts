import { Function } from './function.ts';
import { Engine } from './engine.ts';
import type { Verbatim } from './verbatim.ts';
import * as StructuringModule from './compatible-engine/structuring.ts';
import * as ValidationModule from './compatible-engine/validation.ts';
import * as SessionModule from './compatible-engine/session.ts';



export type CompatibleEngine<
    fdm extends Function.Decl.Map.Proto,
    vdm extends Verbatim.Decl.Map.Proto,
> = CompatibleEngine.Instance<fdm, vdm>;
export namespace CompatibleEngine {
    export abstract class Instance<
        in out fdm extends Function.Decl.Map.Proto,
        in out vdm extends Verbatim.Decl.Map.Proto,
    > extends Engine.Instance<
        fdm, vdm,
        CompatibleEngine.RoleMessage.User.From<fdm>,
        CompatibleEngine.RoleMessage.Ai.From<fdm, vdm>,
        CompatibleEngine.RoleMessage.Developer,
        CompatibleEngine.Session.From<fdm, vdm>
    > {
        protected structuringChoice: CompatibleEngine.Structuring.Choice.From<fdm, vdm>;
        protected override structuringValidator: CompatibleEngine.StructuringValidator.From<fdm, vdm>;
        protected override partsValidator: CompatibleEngine.PartsValidator.From<fdm, vdm>;

        public constructor(options: CompatibleEngine.Options<fdm, vdm>) {
            super(options);
            this.structuringChoice = options.structuringChoice ?? CompatibleEngine.Structuring.Choice.AUTO;
            this.structuringValidator = new CompatibleEngine.StructuringValidator({ structuringChoice: this.structuringChoice });
            this.partsValidator = new CompatibleEngine.PartsValidator();
        }

        public override appendUserMessage(
            session: CompatibleEngine.Session.From<fdm, vdm>,
            message: CompatibleEngine.RoleMessage.User.From<fdm>,
        ): CompatibleEngine.Session.From<fdm, vdm> {
            return {
                developerMessage: session.developerMessage,
                chatMessages: [...session.chatMessages, message],
            };
        }

        public override pushUserMessage(
            session: CompatibleEngine.Session.From<fdm, vdm>,
            message: CompatibleEngine.RoleMessage.User.From<fdm>,
        ): CompatibleEngine.Session.From<fdm, vdm> {
            session.chatMessages.push(message);
            return session;
        }

        public abstract override clone(): CompatibleEngine<fdm, vdm>;
    }


    export interface Options<
        in out fdm extends Function.Decl.Map.Proto,
        in out vdm extends Verbatim.Decl.Map.Proto,
    > extends Engine.Options<fdm, vdm> {
        structuringChoice?: CompatibleEngine.Structuring.Choice.From<fdm, vdm>;
    }

    export import Session = SessionModule.Session;
    export import RoleMessage = SessionModule.RoleMessage;
    export import StructuringValidator = ValidationModule.StructuringValidator;
    export import PartsValidator = ValidationModule.PartsValidator;
    export import Structuring = StructuringModule.Structuring;
    export type Middleware<
        fdm extends Function.Decl.Map.Proto,
        vdm extends Verbatim.Decl.Map.Proto,
    > = Engine.Middleware<
        CompatibleEngine.RoleMessage.User.From<fdm>,
        CompatibleEngine.RoleMessage.Ai.From<fdm, vdm>,
        CompatibleEngine.RoleMessage.Developer,
        CompatibleEngine.Session.From<fdm, vdm>
    >;

}
