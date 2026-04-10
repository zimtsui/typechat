import { Structuring } from '../../compatible-engine/structuring.ts';
import { Function } from '../../function.ts';
import { Verbatim } from '../../verbatim.ts';
import { RoleMessage } from './session.ts';
import {
    StructuringValidator as CompatibleStructuringValidator,
    PartsValidator as CompatiblePartsValidator,
} from '../../compatible-engine/validation.ts';
import { ResponseInvalid, Engine } from '../../engine.ts';



export class StructuringValidator<
    in out fdu extends Function.Decl.Proto,
    in out vdu extends Verbatim.Decl.Proto,
> implements Engine.StructuringValidator<RoleMessage.User<fdu>, RoleMessage.Ai<fdu, vdu>> {
    protected compatibleStructuringValidator: CompatibleStructuringValidator<fdu, vdu>;
    public constructor(protected ctx: StructuringValidator.Context<fdu, vdu>) {
        this.compatibleStructuringValidator = new CompatibleStructuringValidator({ choice: this.ctx.choice });
    }

    public validate(
        message: RoleMessage.Ai<fdu, vdu>,
    ) {
        const fcs = message.getFunctionCalls();
        const vrs = message.getVerbatimRequests();
        return this.compatibleStructuringValidator.validateStructuring(fcs, vrs);
    }
}

export namespace StructuringValidator {
    export type From<
        fdm extends Function.Decl.Map.Proto,
        vdm extends Verbatim.Decl.Map.Proto,
    > = StructuringValidator<Function.Decl.From<fdm>, Verbatim.Decl.From<vdm>>;

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


export class PartsValidator<
    in out fdu extends Function.Decl.Proto,
    in out vdu extends Verbatim.Decl.Proto,
> implements Engine.PartsValidator<RoleMessage.User<fdu>, RoleMessage.Ai<fdu, vdu>> {
    protected compatiblePartsValidator: CompatiblePartsValidator<fdu, vdu>;
    public constructor() {
        this.compatiblePartsValidator = new CompatiblePartsValidator();
    }

    public validate(
        message: RoleMessage.Ai<fdu, vdu>,
    ): void {
        if (message.getParts().length) {} else throw new ResponseInvalid('Empty message.');
        this.compatiblePartsValidator.validateMessageTextParts(
            message.getChatParts().filter(part => part instanceof RoleMessage.Part.Text),
        );
    }
}
export namespace PartsValidator {
    export type From<
        fdm extends Function.Decl.Map.Proto,
        vdm extends Verbatim.Decl.Map.Proto,
    > = PartsValidator<Function.Decl.From<fdm>, Verbatim.Decl.From<vdm>>;
}
