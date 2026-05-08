import { StructuringChoice } from '../structuring-choice.ts';
import { Function } from '../function.ts';
import { Verbatim } from '../verbatim.ts';
import { RoleMessage } from './message.ts';
import * as VerbatimCodec from '../verbatim/codec.ts';


export class StructuringValidator<
    in out fdu extends Function.Decl.Proto,
    in out vdu extends Verbatim.Decl.Proto,
> {
    protected structuringChoice: StructuringChoice;
    public constructor(options: StructuringValidator.Options) {
        this.structuringChoice = options.structuringChoice;
    }

    public validate(
        aiMessage: RoleMessage.Ai<fdu, vdu>,
    ): RoleMessage.User<never> | void {
        const fcalls = aiMessage.getFunctionCalls();
        const vreqs = aiMessage.getVerbatimRequests();
        const fress = fcalls.map(
            fcall => Function.Response.Failed.of({
                id: fcall.id,
                name: fcall.name,
                error: VerbatimCodec.System.encode('Cancelled by system.'),
            } as Function.Response.Failed.Options.Of<fdu>),
        );

        if (this.structuringChoice === StructuringChoice.TCall.REQUIRED) {
            if (!fcalls.length) throw new SyntaxError('Function call required.');

        } else if (this.structuringChoice === StructuringChoice.TCall.ANYONE) {
            if (!fcalls.length) throw new SyntaxError('Function call required.');
            if (fcalls.length > 1) throw new SyntaxError('Only 1 function call allowed.');

        } else if (this.structuringChoice === StructuringChoice.VRequest.REQUIRED) {
            if (!vreqs.length)
                return new RoleMessage.User<never>([
                    ...fress,
                    RoleMessage.User.Part.Text.paragraph(
                        VerbatimCodec.System.encode(`Error: XML verbatim request required, but not found. Check your output format.`),
                    ),
                ]);

        } else if (this.structuringChoice === StructuringChoice.VRequest.ANYONE) {
            if (!vreqs.length)
                return new RoleMessage.User<never>([
                    ...fress,
                    RoleMessage.User.Part.Text.paragraph(
                        VerbatimCodec.System.encode(`Error: XML verbatim request required, but not found. Check your output format.`),
                    ),
                ]);
            if (vreqs.length > 1)
                return new RoleMessage.User<never>([
                    ...fress,
                    RoleMessage.User.Part.Text.paragraph(
                        VerbatimCodec.System.encode(`Error: Only 1 XML verbatim request allowed, but multiple found.`),
                    ),
                ]);

        } else if (this.structuringChoice === StructuringChoice.REQUIRED) {
            if (fcalls.length + vreqs.length) {} else
                return new RoleMessage.User<never>([
                    ...fress,
                    RoleMessage.User.Part.Text.paragraph(
                        VerbatimCodec.System.encode(`Error: Either function call or XML verbatim request required, but none found. Check your output format.`),
                    ),
                ]);

        } else if (this.structuringChoice === StructuringChoice.ANYONE) {
            if (fcalls.length + vreqs.length) {} else
                return new RoleMessage.User<never>([
                    ...fress,
                    RoleMessage.User.Part.Text.paragraph(
                        VerbatimCodec.System.encode(`Error: Either 1 function call or 1 XML verbatim request required, but none found. Check your output format.`),
                    ),
                ]);
            if (fcalls.length + vreqs.length > 1)
                return new RoleMessage.User<never>([
                    ...fress,
                    RoleMessage.User.Part.Text.paragraph(
                        VerbatimCodec.System.encode(`Error: Either Only 1 function call or only 1 XML verbatim request allowed, but multiple found.`),
                    ),
                ]);

        } else if (this.structuringChoice === StructuringChoice.NONE) {
            if (fcalls.length + vreqs.length)
                return new RoleMessage.User<never>([
                    ...fress,
                    RoleMessage.User.Part.Text.paragraph(
                        VerbatimCodec.System.encode(`Error: Neither function call nor XML verbatim request allowed.`),
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

    export interface Options {
        structuringChoice: StructuringChoice;
    }
}
