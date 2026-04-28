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
        const fcalls = aiMessage.getFunctionCalls();
        const vreqs = aiMessage.getVerbatimRequests();
        return this.validateStructuring(fcalls, vreqs);
    }

    public validateStructuring(
        fcalls: Function.Call.Of<fdu>[],
        vreqs: Verbatim.Request.Of<vdu>[],
    ): RoleMessage.User<never> | void {
        if (this.structuringChoice === StructuringChoice.FCall.REQUIRED) {
            if (!fcalls.length) throw new SyntaxError('Function call required.');

        } else if (this.structuringChoice === StructuringChoice.FCall.ANYONE) {
            if (!fcalls.length) throw new SyntaxError('Function call required.');
            if (fcalls.length > 1) throw new SyntaxError('Only one function call allowed.');

        } else if (this.structuringChoice instanceof StructuringChoice.FCall) {
            if (!fcalls.length) throw new SyntaxError(`Function call of ${this.structuringChoice.name} required.`);
            if (fcalls.length > 1) throw new SyntaxError('Only one function call allowed.');
            if (fcalls[0]!.name !== this.structuringChoice.name)
                throw new SyntaxError(`Only function call of ${this.structuringChoice.name} allowed.`);

        } else if (this.structuringChoice === StructuringChoice.VRequest.REQUIRED) {
            if (!vreqs.length)
                return new RoleMessage.User<never>([
                    RoleMessage.User.Part.Text.paragraph(
                        VerbatimCodec.System.encode(`Error: No valid verbatim request found. Check your output format.`),
                    ),
                ]);

        } else if (this.structuringChoice === StructuringChoice.VRequest.ANYONE) {
            if (!vreqs.length)
                return new RoleMessage.User<never>([
                    RoleMessage.User.Part.Text.paragraph(
                        VerbatimCodec.System.encode(`Error: No valid verbatim request found. Check your output format.`),
                    ),
                ]);
            if (vreqs.length > 1)
                return new RoleMessage.User<never>([
                    RoleMessage.User.Part.Text.paragraph(
                        VerbatimCodec.System.encode(`Error: Only 1 verbatim request allowed, but multiple found.`),
                    ),
                ]);

        } else if (this.structuringChoice instanceof StructuringChoice.VRequest) {
            if (!vreqs.length)
                return new RoleMessage.User<never>([
                    RoleMessage.User.Part.Text.paragraph(
                        VerbatimCodec.System.encode(`Error: No valid verbatim request through channel \`${this.structuringChoice.name}\` found. Check your output format.`),
                    ),
                ]);
            if (vreqs.length > 1)
                return new RoleMessage.User<never>([
                    RoleMessage.User.Part.Text.paragraph(
                        VerbatimCodec.System.encode(`Error: Only 1 verbatim request through channel \`${this.structuringChoice.name}\` allowed.`),
                    ),
                ]);
            if (vreqs[0]!.name !== this.structuringChoice.name)
                return new RoleMessage.User<never>([
                    RoleMessage.User.Part.Text.paragraph(
                        VerbatimCodec.System.encode(`Error: Only verbatim request through channel \`${this.structuringChoice.name}\` allowed.`),
                    ),
                ]);

        } else if (this.structuringChoice === StructuringChoice.REQUIRED) {
            if (fcalls.length + vreqs.length) {} else
                return new RoleMessage.User<never>([
                    RoleMessage.User.Part.Text.paragraph(
                        VerbatimCodec.System.encode(`Error: No function call or valid verbatim request found. Check your output format.`),
                    ),
                ]);

        } else if (this.structuringChoice === StructuringChoice.ANYONE) {
            if (fcalls.length + vreqs.length) {} else
                return new RoleMessage.User<never>([
                    RoleMessage.User.Part.Text.paragraph(
                        VerbatimCodec.System.encode(`Error: No function call or valid verbatim request found. Check your output format.`),
                    ),
                ]);
            if (fcalls.length + vreqs.length > 1)
                return new RoleMessage.User<never>([
                    RoleMessage.User.Part.Text.paragraph(
                        VerbatimCodec.System.encode(`Error: Only 1 function call or verbatim request allowed, but multiple found.`),
                    ),
                ]);

        } else if (this.structuringChoice === StructuringChoice.NONE) {
            if (fcalls.length + vreqs.length)
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
