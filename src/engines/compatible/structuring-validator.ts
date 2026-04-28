import { StructuringChoice } from './structuring-choice.ts';
import { Function } from '../../function.ts';
import { Verbatim } from '../../verbatim.ts';
import { RoleMessage } from '../../message.ts';
import type { Engine } from '../../engine.ts';
import * as VerbatimCodec from '../../verbatim/codec.ts';


export class StructuringValidator<
    in out fdu extends Function.Decl.Proto,
    in out vdu extends Verbatim.Decl.Proto,
> implements Engine.StructuringValidator<fdu, vdu> {
    protected structuringChoice: StructuringChoice<fdu, vdu>;
    public constructor(options: StructuringValidator.Options<fdu, vdu>) {
        this.structuringChoice = options.structuringChoice;
    }

    public validate(
        aiMessage: RoleMessage.Ai<fdu, vdu>,
    ): RoleMessage.User<never> | void {
        const fcs = aiMessage.getFunctionCalls();
        const vrs = aiMessage.getVerbatimRequests();
        return this.validateStructuring(fcs, vrs);
    }

    public validateStructuring(
        fcs: Function.Call.Of<fdu>[],
        vrs: Verbatim.Request.Of<vdu>[],
    ): RoleMessage.User<never> | void {
        if (this.structuringChoice === StructuringChoice.FCall.REQUIRED) {
            if (!fcs.length) throw new SyntaxError('Function call required.');

        } else if (this.structuringChoice === StructuringChoice.FCall.ANYONE) {
            if (!fcs.length) throw new SyntaxError('Function call required.');
            if (fcs.length > 1) throw new SyntaxError('Only one function call allowed.');

        } else if (this.structuringChoice instanceof StructuringChoice.FCall) {
            if (!fcs.length) throw new SyntaxError(`Function call of ${this.structuringChoice.name} required.`);
            if (fcs.length > 1) throw new SyntaxError('Only one function call allowed.');
            if (fcs[0]!.name !== this.structuringChoice.name)
                throw new SyntaxError(`Only function call of ${this.structuringChoice.name} allowed.`);

        } else if (this.structuringChoice === StructuringChoice.VRequest.REQUIRED) {
            if (!vrs.length)
                return new RoleMessage.User<never>([
                    RoleMessage.User.Part.Text.paragraph(
                        VerbatimCodec.System.encode(`Error: No valid verbatim request found. Check your output format.`),
                    ),
                ]);

        } else if (this.structuringChoice === StructuringChoice.VRequest.ANYONE) {
            if (!vrs.length)
                return new RoleMessage.User<never>([
                    RoleMessage.User.Part.Text.paragraph(
                        VerbatimCodec.System.encode(`Error: No valid verbatim request found. Check your output format.`),
                    ),
                ]);
            if (vrs.length > 1)
                return new RoleMessage.User<never>([
                    RoleMessage.User.Part.Text.paragraph(
                        VerbatimCodec.System.encode(`Error: Only 1 verbatim request allowed, but multiple found.`),
                    ),
                ]);

        } else if (this.structuringChoice instanceof StructuringChoice.VRequest) {
            if (!vrs.length)
                return new RoleMessage.User<never>([
                    RoleMessage.User.Part.Text.paragraph(
                        VerbatimCodec.System.encode(`Error: No valid verbatim request through channel \`${this.structuringChoice.name}\` found. Check your output format.`),
                    ),
                ]);
            if (vrs.length > 1)
                return new RoleMessage.User<never>([
                    RoleMessage.User.Part.Text.paragraph(
                        VerbatimCodec.System.encode(`Error: Only 1 verbatim request through channel \`${this.structuringChoice.name}\` allowed.`),
                    ),
                ]);
            if (vrs[0]!.name !== this.structuringChoice.name)
                return new RoleMessage.User<never>([
                    RoleMessage.User.Part.Text.paragraph(
                        VerbatimCodec.System.encode(`Error: Only verbatim request through channel \`${this.structuringChoice.name}\` allowed.`),
                    ),
                ]);

        } else if (this.structuringChoice === StructuringChoice.REQUIRED) {
            if (fcs.length + vrs.length) {} else
                return new RoleMessage.User<never>([
                    RoleMessage.User.Part.Text.paragraph(
                        VerbatimCodec.System.encode(`Error: No function call or valid verbatim request found. Check your output format.`),
                    ),
                ]);

        } else if (this.structuringChoice === StructuringChoice.ANYONE) {
            if (fcs.length + vrs.length) {} else
                return new RoleMessage.User<never>([
                    RoleMessage.User.Part.Text.paragraph(
                        VerbatimCodec.System.encode(`Error: No function call or valid verbatim request found. Check your output format.`),
                    ),
                ]);
            if (fcs.length + vrs.length > 1)
                return new RoleMessage.User<never>([
                    RoleMessage.User.Part.Text.paragraph(
                        VerbatimCodec.System.encode(`Error: Only 1 function call or verbatim request allowed, but multiple found.`),
                    ),
                ]);

        } else if (this.structuringChoice === StructuringChoice.NONE) {
            if (fcs.length + vrs.length)
                return new RoleMessage.User<never>([
                    RoleMessage.User.Part.Text.paragraph(
                        VerbatimCodec.System.encode(`Error: Neither function call nor verbatim request allowed.`),
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
        structuringChoice: StructuringChoice<fdu, vdu>;
    }
    export namespace Options {
        export type From<
            fdm extends Function.Decl.Map.Proto,
            vdm extends Verbatim.Decl.Map.Proto,
        > = Options<Function.Decl.From<fdm>, Verbatim.Decl.From<vdm>>;
    }
}
