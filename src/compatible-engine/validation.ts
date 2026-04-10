import { Structuring } from './structuring.ts';
import { Function } from '../function.ts';
import { Verbatim } from '../verbatim.ts';
import { RoleMessage } from './session.ts';
import { ResponseInvalid } from '../engine.ts';
import type { Engine } from '../engine.ts';
import * as VerbatimCodec from '../verbatim/codec.ts';



export class Validator<
    in out fdu extends Function.Decl.Proto,
    in out vdu extends Verbatim.Decl.Proto,
> implements Engine.Validator<RoleMessage.User<fdu>, RoleMessage.Ai<fdu, vdu>> {
    public constructor(protected ctx: Validator.Context<fdu, vdu>) {}

    public validateMessageStructuring(
        aiMessage: RoleMessage.Ai<fdu, vdu>,
    ): RoleMessage.User<fdu> | void {
        const fcs = aiMessage.getFunctionCalls();
        const vrs = aiMessage.getVerbatimRequests();
        return this.validateStructuring(fcs, vrs);
    }

    public validateStructuring(
        fcs: Function.Call.Of<fdu>[],
        vrs: Verbatim.Request.Of<vdu>[],
    ): RoleMessage.User<fdu> | void {
        if (this.ctx.choice === Structuring.Choice.FCall.REQUIRED) {
            if (!fcs.length) throw new ResponseInvalid('Function call required.');

        } else if (this.ctx.choice === Structuring.Choice.FCall.ANYONE) {
            if (!fcs.length) throw new ResponseInvalid('Function call required.');
            if (fcs.length > 1) throw new ResponseInvalid('Only one function call allowed.');

        } else if (this.ctx.choice instanceof Structuring.Choice.FCall) {
            if (!fcs.length) throw new ResponseInvalid(`Function call of ${this.ctx.choice.name} required.`);
            if (fcs.length > 1) throw new ResponseInvalid('Only one function call allowed.');
            if (fcs[0]!.name !== this.ctx.choice.name)
                throw new ResponseInvalid(`Only function call of ${this.ctx.choice.name} allowed.`);

        } else if (this.ctx.choice === Structuring.Choice.VRequest.REQUIRED) {
            if (!vrs.length)
                return new RoleMessage.User<fdu>([
                    RoleMessage.Part.Text.paragraph(
                        VerbatimCodec.Meta.encode(`No valid verbatim request found.`),
                    ),
                ]);

        } else if (this.ctx.choice === Structuring.Choice.VRequest.ANYONE) {
            if (!vrs.length)
                return new RoleMessage.User<fdu>([
                    RoleMessage.Part.Text.paragraph(
                        VerbatimCodec.Meta.encode(`No valid verbatim request found.`),
                    ),
                ]);
            if (vrs.length > 1)
                return new RoleMessage.User<fdu>([
                    RoleMessage.Part.Text.paragraph(
                        VerbatimCodec.Meta.encode(`Only 1 verbatim request allowed, but multiple found.`),
                    ),
                ]);

        } else if (this.ctx.choice instanceof Structuring.Choice.VRequest) {
            if (!vrs.length)
                return new RoleMessage.User<fdu>([
                    RoleMessage.Part.Text.paragraph(
                        VerbatimCodec.Meta.encode(`No valid verbatim request through channel \`${this.ctx.choice.name}\` found.`),
                    ),
                ]);
            if (vrs.length > 1)
                return new RoleMessage.User<fdu>([
                    RoleMessage.Part.Text.paragraph(
                        VerbatimCodec.Meta.encode(`Only 1 verbatim request through channel \`${this.ctx.choice.name}\` allowed.`),
                    ),
                ]);
            if (vrs[0]!.name !== this.ctx.choice.name)
                return new RoleMessage.User<fdu>([
                    RoleMessage.Part.Text.paragraph(
                        VerbatimCodec.Meta.encode(`Only verbatim request through channel \`${this.ctx.choice.name}\` allowed.`),
                    ),
                ]);

        } else if (this.ctx.choice === Structuring.Choice.REQUIRED) {
            if (fcs.length + vrs.length) {} else
                return new RoleMessage.User<fdu>([
                    RoleMessage.Part.Text.paragraph(
                        VerbatimCodec.Meta.encode(`No function call or valid verbatim request found.`),
                    ),
                ]);

        } else if (this.ctx.choice === Structuring.Choice.ANYONE) {
            if (fcs.length + vrs.length) {} else
                return new RoleMessage.User<fdu>([
                    RoleMessage.Part.Text.paragraph(
                        VerbatimCodec.Meta.encode(`No function call or valid verbatim request found.`),
                    ),
                ]);
            if (fcs.length + vrs.length > 1)
                return new RoleMessage.User<fdu>([
                    RoleMessage.Part.Text.paragraph(
                        VerbatimCodec.Meta.encode(`Only 1 function call or verbatim request allowed, but multiple found.`),
                    ),
                ]);

        } else if (this.ctx.choice === Structuring.Choice.NONE) {
            if (fcs.length + vrs.length)
                return new RoleMessage.User<fdu>([
                    RoleMessage.Part.Text.paragraph(
                        VerbatimCodec.Meta.encode(`Neither function call nor verbatim request allowed.`),
                    ),
                ]);
        }
    }

    public validateMessageParts(
        message: RoleMessage.Ai<fdu, vdu>,
    ): void {
        const parts = message.getParts();
        if (parts.length) {} else throw new ResponseInvalid('Empty message.');
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
