import { Structuring } from '../../compatible-engine/structuring.ts';
import { Function } from '../../function.ts';
import { Verbatim } from '../../verbatim.ts';
import { RoleMessage } from './session.ts';
import { Validator as CompatibleValidator } from '../../compatible-engine/validation.ts';
import { ResponseInvalid, Engine } from '../../engine.ts';



export class Validator<
    in out fdu extends Function.Decl.Proto,
    in out vdu extends Verbatim.Decl.Proto,
> implements Engine.Validator<RoleMessage.User<fdu>, RoleMessage.Ai<fdu, vdu>> {
    protected compatibleValidator: CompatibleValidator<fdu, vdu>;
    public constructor(protected ctx: Validator.Context<fdu, vdu>) {
        this.compatibleValidator = new CompatibleValidator({ choice: ctx.choice });
    }

    public validateMessageParts(
        message: RoleMessage.Ai<fdu, vdu>,
    ): void {
        const parts = message.getParts();
        if (parts.length) {} else throw new ResponseInvalid('Empty message.');
    }

    public validateStructuring(
        fcs: Function.Call.Of<fdu>[],
        vrs: Verbatim.Request.Of<vdu>[],
    ) {
        return this.compatibleValidator.validateStructuring(fcs, vrs);
    }

    public validateMessageStructuring(
        message: RoleMessage.Ai<fdu, vdu>,
    ) {
        const fcs = message.getFunctionCalls();
        const vrs = message.getVerbatimRequests();
        return this.validateStructuring(fcs, vrs);
    }
}

export namespace Validator {
    export type From<
        fdm extends Function.Decl.Map.Proto,
        vdm extends Verbatim.Decl.Map.Proto,
    > = Validator<Function.Decl.From<fdm>, Verbatim.Decl.From<vdm>>;

    export interface Context<
        in out fdu extends Function.Decl.Proto,
        in out vdu extends Verbatim.Decl.Proto,
    > {
        choice: Structuring.Choice<fdu, vdu>;
    }
    export namespace Context {
        export type From<
            fdm extends Function.Decl.Map.Proto,
            vdm extends Verbatim.Decl.Map.Proto,
        > = Context<Function.Decl.From<fdm>, Verbatim.Decl.From<vdm>>;
    }
}
