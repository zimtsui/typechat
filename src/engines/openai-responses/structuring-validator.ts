import { Function } from '../../function.ts';
import { Verbatim } from '../../verbatim.ts';
import { RoleMessage } from './message.ts';
import * as VerbatimCodec from '../../verbatim/codec.ts';
import { StructuringChoice } from '../../structuring-choice.ts';
import { Engine } from '../../engine.ts';
import { Tool } from './tool.ts';


export class StructuringValidator<
    in out fdu extends Function.Decl.Proto,
    in out vdu extends Verbatim.Decl.Proto,
> extends Engine.StructuringValidator<fdu, vdu> {
    public constructor(options: StructuringValidator.Options) {
        super(options);
    }

    public override validate(
        aiMessage: RoleMessage.Ai<fdu, vdu>,
    ): RoleMessage.User<never> | void {
        const tcalls = aiMessage.getToolCalls();
        const vreqs = aiMessage.getVerbatimRequests();
        const tress = tcalls.map(
            tcall => tcall instanceof Tool.ApplyPatch.Call
                ? new Tool.ApplyPatch.Response({
                    id: tcall.raw.call_id,
                    failure: VerbatimCodec.System.encode('Cancelled by system.'),
                })
                : Function.Response.Failed.of({
                    id: tcall.id,
                    name: tcall.name,
                    error: VerbatimCodec.System.encode('Cancelled by system.'),
                } as Function.Response.Failed.Options.Of<fdu>),
        );

        if (this.structuringChoice === StructuringChoice.TCall.REQUIRED) {
            if (!tcalls.length) throw new SyntaxError('Tool call required.');

        } else if (this.structuringChoice === StructuringChoice.TCall.ANYONE) {
            if (!tcalls.length) throw new SyntaxError('Tool call required.');
            if (tcalls.length > 1) throw new SyntaxError('Only 1 tool call allowed.');

        } else if (this.structuringChoice === StructuringChoice.VRequest.REQUIRED) {
            if (!vreqs.length)
                return new RoleMessage.User<never>([
                    ...tress,
                    RoleMessage.User.Part.Text.paragraph(
                        VerbatimCodec.System.encode(`Error: XML verbatim request required, but not found. Check your output format.`),
                    ),
                ]);

        } else if (this.structuringChoice === StructuringChoice.VRequest.ANYONE) {
            if (!vreqs.length)
                return new RoleMessage.User<never>([
                    ...tress,
                    RoleMessage.User.Part.Text.paragraph(
                        VerbatimCodec.System.encode(`Error: XML verbatim request required, but not found. Check your output format.`),
                    ),
                ]);
            if (vreqs.length > 1)
                return new RoleMessage.User<never>([
                    ...tress,
                    RoleMessage.User.Part.Text.paragraph(
                        VerbatimCodec.System.encode(`Error: Only 1 XML verbatim request allowed, but multiple found.`),
                    ),
                ]);

        } else if (this.structuringChoice === StructuringChoice.REQUIRED) {
            if (tcalls.length + vreqs.length) {} else
                return new RoleMessage.User<never>([
                    ...tress,
                    RoleMessage.User.Part.Text.paragraph(
                        VerbatimCodec.System.encode(`Error: Either tool call or XML verbatim request required, but none found. Check your output format.`),
                    ),
                ]);

        } else if (this.structuringChoice === StructuringChoice.ANYONE) {
            if (tcalls.length + vreqs.length) {} else
                return new RoleMessage.User<never>([
                    ...tress,
                    RoleMessage.User.Part.Text.paragraph(
                        VerbatimCodec.System.encode(`Error: Either 1 tool call or 1 XML verbatim request required, but none found. Check your output format.`),
                    ),
                ]);
            if (tcalls.length + vreqs.length > 1)
                return new RoleMessage.User<never>([
                    ...tress,
                    RoleMessage.User.Part.Text.paragraph(
                        VerbatimCodec.System.encode(`Error: Either Only 1 tool call or only 1 XML verbatim request allowed, but multiple found.`),
                    ),
                ]);

        } else if (this.structuringChoice === StructuringChoice.NONE) {
            if (tcalls.length + vreqs.length)
                return new RoleMessage.User<never>([
                    ...tress,
                    RoleMessage.User.Part.Text.paragraph(
                        VerbatimCodec.System.encode(`Error: Neither tool call nor XML verbatim request allowed.`),
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

    export type Options = Engine.StructuringValidator.Options;
}
