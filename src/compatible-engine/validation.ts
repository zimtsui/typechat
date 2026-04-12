import { Structuring } from './structuring.ts';
import { Function } from '../function.ts';
import { Verbatim } from '../verbatim.ts';
import { RoleMessage } from './session.ts';
import { ResponseInvalid } from '../engine.ts';
import type { Engine } from '../engine.ts';
import * as VerbatimCodec from '../verbatim/codec.ts';
import { isRepeating } from '../repetition.ts';


export class StructuringValidator<
    in out fdu extends Function.Decl.Proto,
    in out vdu extends Verbatim.Decl.Proto,
> implements Engine.StructuringValidator<RoleMessage.User<fdu>, RoleMessage.Ai<fdu, vdu>> {
    public constructor(protected ctx: StructuringValidator.Context<fdu, vdu>) {}

    public validate(
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
                        VerbatimCodec.Meta.encode(`Error: No valid verbatim request found. Check your output format.`),
                    ),
                ]);

        } else if (this.ctx.choice === Structuring.Choice.VRequest.ANYONE) {
            if (!vrs.length)
                return new RoleMessage.User<fdu>([
                    RoleMessage.Part.Text.paragraph(
                        VerbatimCodec.Meta.encode(`Error: No valid verbatim request found. Check your output format.`),
                    ),
                ]);
            if (vrs.length > 1)
                return new RoleMessage.User<fdu>([
                    RoleMessage.Part.Text.paragraph(
                        VerbatimCodec.Meta.encode(`Error: Only 1 verbatim request allowed, but multiple found.`),
                    ),
                ]);

        } else if (this.ctx.choice instanceof Structuring.Choice.VRequest) {
            if (!vrs.length)
                return new RoleMessage.User<fdu>([
                    RoleMessage.Part.Text.paragraph(
                        VerbatimCodec.Meta.encode(`Error: No valid verbatim request through channel \`${this.ctx.choice.name}\` found. Check your output format.`),
                    ),
                ]);
            if (vrs.length > 1)
                return new RoleMessage.User<fdu>([
                    RoleMessage.Part.Text.paragraph(
                        VerbatimCodec.Meta.encode(`Error: Only 1 verbatim request through channel \`${this.ctx.choice.name}\` allowed.`),
                    ),
                ]);
            if (vrs[0]!.name !== this.ctx.choice.name)
                return new RoleMessage.User<fdu>([
                    RoleMessage.Part.Text.paragraph(
                        VerbatimCodec.Meta.encode(`Error: Only verbatim request through channel \`${this.ctx.choice.name}\` allowed.`),
                    ),
                ]);

        } else if (this.ctx.choice === Structuring.Choice.REQUIRED) {
            if (fcs.length + vrs.length) {} else
                return new RoleMessage.User<fdu>([
                    RoleMessage.Part.Text.paragraph(
                        VerbatimCodec.Meta.encode(`Error: No function call or valid verbatim request found. Check your output format.`),
                    ),
                ]);

        } else if (this.ctx.choice === Structuring.Choice.ANYONE) {
            if (fcs.length + vrs.length) {} else
                return new RoleMessage.User<fdu>([
                    RoleMessage.Part.Text.paragraph(
                        VerbatimCodec.Meta.encode(`Error: No function call or valid verbatim request found. Check your output format.`),
                    ),
                ]);
            if (fcs.length + vrs.length > 1)
                return new RoleMessage.User<fdu>([
                    RoleMessage.Part.Text.paragraph(
                        VerbatimCodec.Meta.encode(`Error: Only 1 function call or verbatim request allowed, but multiple found.`),
                    ),
                ]);

        } else if (this.ctx.choice === Structuring.Choice.NONE) {
            if (fcs.length + vrs.length)
                return new RoleMessage.User<fdu>([
                    RoleMessage.Part.Text.paragraph(
                        VerbatimCodec.Meta.encode(`Error: Neither function call nor verbatim request allowed.`),
                    ),
                ]);
        }
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
    public constructor() {}

    public validateMessageTextParts(
        parts: RoleMessage.Part.Text<vdu>[],
    ): void {
        for (const part of parts)
            if (isRepeating(part.text, 2, 20))
                throw new ResponseInvalid('Repeating');
    }

    public validate(
        message: RoleMessage.Ai<fdu, vdu>,
    ): void {
        if (message.getParts().length) {} else throw new ResponseInvalid('Empty message.');
        this.validateMessageTextParts(message.getTextParts());
    }

}
export namespace PartsValidator {
    export type From<
        fdm extends Function.Decl.Map.Proto,
        vdm extends Verbatim.Decl.Map.Proto,
    > = PartsValidator<Function.Decl.From<fdm>, Verbatim.Decl.From<vdm>>;
}
