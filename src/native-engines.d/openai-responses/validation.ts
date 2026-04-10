import { Structuring } from './structuring.ts';
import { Function } from '../../function.ts';
import { Verbatim } from '../../verbatim.ts';
import { RoleMessage } from './session.ts';
import { ResponseInvalid } from '../../engine.ts';
import type { Engine } from '../../engine.ts';
import * as VerbatimCodec from '../../verbatim/codec.ts';
import { PartsValidator as CompatiblePartsValidator } from '../../compatible-engine/validation.ts';


export class StructuringValidator<
    in out fdu extends Function.Decl.Proto,
    in out vdu extends Verbatim.Decl.Proto,
> implements Engine.StructuringValidator<RoleMessage.User<fdu>, RoleMessage.Ai<fdu, vdu>> {
    public constructor(protected ctx: StructuringValidator.Context<fdu, vdu>) {}

    public validate(message: RoleMessage.Ai<fdu, vdu>) {
        const tcs = message.getToolCalls();
        const vrs = message.getVerbatimRequests();

        if (this.ctx.choice === Structuring.Choice.TCall.REQUIRED) {
            if (!tcs.length) throw new ResponseInvalid('Tool call required.');

        } else if (this.ctx.choice === Structuring.Choice.TCall.ANYONE) {
            if (!tcs.length) throw new ResponseInvalid('Tool call required.');
            if (tcs.length > 1) throw new ResponseInvalid('Only one tool call allowed.');

        } else if (this.ctx.choice instanceof Structuring.Choice.TCall.FCall) {
            if (!tcs.length) throw new ResponseInvalid(`Function call of ${this.ctx.choice.name} required.`);
            if (tcs.length > 1) throw new ResponseInvalid('Only one function call allowed.');
            if (tcs[0]! instanceof Function.Call && tcs[0]!.name === this.ctx.choice.name) {} else
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
            if (tcs.length + vrs.length) {} else
                return new RoleMessage.User<fdu>([
                    RoleMessage.Part.Text.paragraph(
                        VerbatimCodec.Meta.encode(`No function call or valid verbatim request found.`),
                    ),
                ]);

        } else if (this.ctx.choice === Structuring.Choice.ANYONE) {
            if (tcs.length + vrs.length) {} else
                return new RoleMessage.User<fdu>([
                    RoleMessage.Part.Text.paragraph(
                        VerbatimCodec.Meta.encode(`No function call or valid verbatim request found.`),
                    ),
                ]);
            if (tcs.length + vrs.length > 1)
                return new RoleMessage.User<fdu>([
                    RoleMessage.Part.Text.paragraph(
                        VerbatimCodec.Meta.encode(`Only 1 function call or verbatim request allowed, but multiple found.`),
                    ),
                ]);

        } else if (this.ctx.choice === Structuring.Choice.NONE) {
            if (tcs.length + vrs.length)
                return new RoleMessage.User<fdu>([
                    RoleMessage.Part.Text.paragraph(
                        VerbatimCodec.Meta.encode(`Neither function call nor verbatim request allowed.`),
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
    protected compatiblePartsValidator: CompatiblePartsValidator<fdu, vdu>;
    public constructor() {
        this.compatiblePartsValidator = new CompatiblePartsValidator();
    }

    public validate(
        message: RoleMessage.Ai<fdu, vdu>,
    ): void {
        if (message.getParts().length) {} else throw new ResponseInvalid('Empty message.');
        this.compatiblePartsValidator.validateMessageTextParts(message.getTextParts());
    }
}

export namespace PartsValidator {
    export type From<
        fdm extends Function.Decl.Map.Proto,
        vdm extends Verbatim.Decl.Map.Proto,
    > = PartsValidator<Function.Decl.From<fdm>, Verbatim.Decl.From<vdm>>;
}
