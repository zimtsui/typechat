import { StructuringChoice } from './structuring-choice.ts';
import { Function } from '../function.ts';
import { Verbatim } from '../verbatim.ts';
import { RoleMessage } from '../message.ts';
import type { Engine } from '../engine.ts';
import * as VerbatimCodec from '../verbatim/codec.ts';


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
        const tcalls = aiMessage.getToolCalls();
        const vreqs = aiMessage.getVerbatimRequests();

        if (this.structuringChoice === StructuringChoice.TCall.REQUIRED) {
            if (!tcalls.length) throw new SyntaxError('Tool call required.');

        } else if (this.structuringChoice === StructuringChoice.TCall.ANYONE) {
            if (!tcalls.length) throw new SyntaxError('Tool call required.');
            if (tcalls.length > 1) throw new SyntaxError('Only 1 tool call allowed.');

        } else if (this.structuringChoice instanceof StructuringChoice.TCall.FCall) {
            if (!tcalls.length) throw new SyntaxError(`Function call of ${this.structuringChoice.name} required.`);
            if (tcalls.length > 1) throw new SyntaxError(`Only 1 function call of ${this.structuringChoice.name} required.`);
            const tcall = tcalls[0]!;
            if (tcall instanceof Function.Call && tcall.name !== this.structuringChoice.name) {} else
                throw new SyntaxError(`Only function call of ${this.structuringChoice.name} allowed.`);

        } else if (this.structuringChoice === StructuringChoice.VRequest.REQUIRED) {
            if (!vreqs.length)
                return new RoleMessage.User<never>([
                    RoleMessage.User.Part.Text.paragraph(
                        VerbatimCodec.System.encode(`Error: Verbatim request required, but not found. Check your output format.`),
                    ),
                ]);

        } else if (this.structuringChoice === StructuringChoice.VRequest.ANYONE) {
            if (!vreqs.length)
                return new RoleMessage.User<never>([
                    RoleMessage.User.Part.Text.paragraph(
                        VerbatimCodec.System.encode(`Error: Verbatim request required, but not found. Check your output format.`),
                    ),
                ]);
            if (vreqs.length > 1)
                return new RoleMessage.User<never>([
                    RoleMessage.User.Part.Text.paragraph(
                        VerbatimCodec.System.encode(`Error: Only 1 verbatim request allowed, but multiple found.`),
                    ),
                ]);

        } else if (this.structuringChoice === StructuringChoice.REQUIRED) {
            if (tcalls.length + vreqs.length) {} else
                return new RoleMessage.User<never>([
                    RoleMessage.User.Part.Text.paragraph(
                        VerbatimCodec.System.encode(`Error: Either tool call or verbatim request required, but none found. Check your output format.`),
                    ),
                ]);

        } else if (this.structuringChoice === StructuringChoice.ANYONE) {
            if (tcalls.length + vreqs.length) {} else
                return new RoleMessage.User<never>([
                    RoleMessage.User.Part.Text.paragraph(
                        VerbatimCodec.System.encode(`Error: Either 1 tool call or 1 verbatim request required, but none found. Check your output format.`),
                    ),
                ]);
            if (tcalls.length + vreqs.length > 1)
                return new RoleMessage.User<never>([
                    RoleMessage.User.Part.Text.paragraph(
                        VerbatimCodec.System.encode(`Error: Either Only 1 tool call or only 1 verbatim request allowed, but multiple found.`),
                    ),
                ]);

        } else if (this.structuringChoice === StructuringChoice.NONE) {
            if (tcalls.length + vreqs.length)
                return new RoleMessage.User<never>([
                    RoleMessage.User.Part.Text.paragraph(
                        VerbatimCodec.System.encode(`Error: Neither tool call nor verbatim request allowed.`),
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
