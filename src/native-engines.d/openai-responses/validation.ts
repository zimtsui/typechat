import { Structuring } from './structuring.ts';
import { Function } from '../../function.ts';
import { Verbatim } from '../../verbatim.ts';
import { RoleMessage } from './session.ts';
import type { Engine } from '../../engine.ts';
import * as VerbatimCodec from '../../verbatim/codec.ts';
import { PartsValidator as CompatiblePartsValidator } from '../../compatible-engine/validation.ts';


export class StructuringValidator<
    in out fdu extends Function.Decl.Proto,
    in out vdu extends Verbatim.Decl.Proto,
> implements Engine.StructuringValidator<RoleMessage.User<fdu>, RoleMessage.Ai<fdu, vdu>> {
    public constructor(protected options: StructuringValidator.Options<fdu, vdu>) {}

    public validate(message: RoleMessage.Ai<fdu, vdu>) {
        const tcs = message.getToolCalls();
        const vrs = message.getVerbatimRequests();

        if (this.options.choice === Structuring.Choice.TCall.REQUIRED) {
            if (!tcs.length) throw new SyntaxError('Tool call required.');

        } else if (this.options.choice === Structuring.Choice.TCall.ANYONE) {
            if (!tcs.length) throw new SyntaxError('Tool call required.');
            if (tcs.length > 1) throw new SyntaxError('Only one tool call allowed.');

        } else if (this.options.choice instanceof Structuring.Choice.TCall.FCall) {
            if (!tcs.length) throw new SyntaxError(`Function call of ${this.options.choice.name} required.`);
            if (tcs.length > 1) throw new SyntaxError('Only one function call allowed.');
            if (tcs[0]! instanceof Function.Call && tcs[0]!.name === this.options.choice.name) {} else
                throw new SyntaxError(`Only function call of ${this.options.choice.name} allowed.`);

        } else if (this.options.choice === Structuring.Choice.VRequest.REQUIRED) {
            if (!vrs.length)
                return new RoleMessage.User<fdu>([
                    RoleMessage.Part.Text.paragraph(
                        VerbatimCodec.Meta.encode(`Error: No valid verbatim request found. Check your output format.`),
                    ),
                ]);

        } else if (this.options.choice === Structuring.Choice.VRequest.ANYONE) {
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

        } else if (this.options.choice instanceof Structuring.Choice.VRequest) {
            if (!vrs.length)
                return new RoleMessage.User<fdu>([
                    RoleMessage.Part.Text.paragraph(
                        VerbatimCodec.Meta.encode(`Error: No valid verbatim request through channel \`${this.options.choice.name}\` found. Check your output format.`),
                    ),
                ]);
            if (vrs.length > 1)
                return new RoleMessage.User<fdu>([
                    RoleMessage.Part.Text.paragraph(
                        VerbatimCodec.Meta.encode(`Error: Only 1 verbatim request through channel \`${this.options.choice.name}\` allowed.`),
                    ),
                ]);
            if (vrs[0]!.name !== this.options.choice.name)
                return new RoleMessage.User<fdu>([
                    RoleMessage.Part.Text.paragraph(
                        VerbatimCodec.Meta.encode(`Error: Only verbatim request through channel \`${this.options.choice.name}\` allowed.`),
                    ),
                ]);

        } else if (this.options.choice === Structuring.Choice.REQUIRED) {
            if (tcs.length + vrs.length) {} else
                return new RoleMessage.User<fdu>([
                    RoleMessage.Part.Text.paragraph(
                        VerbatimCodec.Meta.encode(`Error: No function call or valid verbatim request found. Check your output format.`),
                    ),
                ]);

        } else if (this.options.choice === Structuring.Choice.ANYONE) {
            if (tcs.length + vrs.length) {} else
                return new RoleMessage.User<fdu>([
                    RoleMessage.Part.Text.paragraph(
                        VerbatimCodec.Meta.encode(`Error: No function call or valid verbatim request found. Check your output format.`),
                    ),
                ]);
            if (tcs.length + vrs.length > 1)
                return new RoleMessage.User<fdu>([
                    RoleMessage.Part.Text.paragraph(
                        VerbatimCodec.Meta.encode(`Error: Only 1 function call or verbatim request allowed, but multiple found.`),
                    ),
                ]);

        } else if (this.options.choice === Structuring.Choice.NONE) {
            if (tcs.length + vrs.length)
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

    export interface Options<
        in out fdu extends Function.Decl.Proto,
        in out vdu extends Verbatim.Decl.Proto,
    > {
        choice: Structuring.Choice<fdu, vdu>;
    }
    export namespace Options {
        export type From<
            fdm extends Function.Decl.Map.Proto,
            vdm extends Verbatim.Decl.Map.Proto,
        > = Options<Function.Decl.From<fdm>, Verbatim.Decl.From<vdm>>;
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
        if (message.getParts().length) {} else throw new SyntaxError('Empty message.');
        this.compatiblePartsValidator.validateMessageTextParts(message.getTextParts());
    }
}

export namespace PartsValidator {
    export type From<
        fdm extends Function.Decl.Map.Proto,
        vdm extends Verbatim.Decl.Map.Proto,
    > = PartsValidator<Function.Decl.From<fdm>, Verbatim.Decl.From<vdm>>;
}
