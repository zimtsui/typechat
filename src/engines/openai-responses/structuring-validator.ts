import { OpenAIResponsesStructuringChoice } from './structuring-choice.ts';
import { Function } from '../../function.ts';
import { Verbatim } from '../../verbatim.ts';
import { RoleMessage } from '../../message.ts';
import type { Engine } from '../../engine.ts';
import * as VerbatimCodec from '../../verbatim/codec.ts';
import { Tool } from './tool.ts';
import { NativeRoleMessage } from './message.ts';


export class StructuringValidator<
    in out fdu extends Function.Decl.Proto,
    in out vdu extends Verbatim.Decl.Proto,
> implements Engine.StructuringValidator<fdu, vdu> {
    protected structuringChoice: OpenAIResponsesStructuringChoice<fdu, vdu>;
    public constructor(options: StructuringValidator.Options<fdu, vdu>) {
        this.structuringChoice = options.structuringChoice;
    }

    public validate(message: RoleMessage.Ai<fdu, vdu>): RoleMessage.User<never> | void {
        let tcs: Tool.Call.Of<fdu>[];
        if (message instanceof NativeRoleMessage.Ai) {
            const nativeMessage = message as NativeRoleMessage.Ai<fdu, vdu>;
            tcs = nativeMessage.getToolCalls();
        } else {
            const roleMessage = message as RoleMessage.Ai<fdu, vdu>;
            tcs = roleMessage.getFunctionCalls();
        }
        const vrs = message.getVerbatimRequests();

        if (this.structuringChoice === OpenAIResponsesStructuringChoice.TCall.REQUIRED) {
            if (!tcs.length) throw new SyntaxError('Tool call required.');

        } else if (this.structuringChoice === OpenAIResponsesStructuringChoice.TCall.ANYONE) {
            if (!tcs.length) throw new SyntaxError('Tool call required.');
            if (tcs.length > 1) throw new SyntaxError('Only one tool call allowed.');

        } else if (this.structuringChoice instanceof OpenAIResponsesStructuringChoice.TCall.FCall) {
            if (!tcs.length) throw new SyntaxError(`Function call of ${this.structuringChoice.name} required.`);
            if (tcs.length > 1) throw new SyntaxError('Only one function call allowed.');
            const tc = tcs[0]!;
            if (tc instanceof Function.Call) {
                const fc = tc as Function.Call.Of<fdu>;
                if (fc.name === this.structuringChoice.name) {} else
                    throw new SyntaxError(`Only function call of ${this.structuringChoice.name} allowed.`);
            } else throw new SyntaxError(`Only function call of ${this.structuringChoice.name} allowed.`);

        } else if (this.structuringChoice === OpenAIResponsesStructuringChoice.VRequest.REQUIRED) {
            if (!vrs.length)
                return new RoleMessage.User<never>([
                    RoleMessage.User.Part.Text.paragraph(
                        VerbatimCodec.System.encode(`Error: No valid verbatim request found. Check your output format.`),
                    ),
                ]);

        } else if (this.structuringChoice === OpenAIResponsesStructuringChoice.VRequest.ANYONE) {
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

        } else if (this.structuringChoice instanceof OpenAIResponsesStructuringChoice.VRequest) {
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

        } else if (this.structuringChoice === OpenAIResponsesStructuringChoice.REQUIRED) {
            if (tcs.length + vrs.length) {} else
                return new RoleMessage.User<never>([
                    RoleMessage.User.Part.Text.paragraph(
                        VerbatimCodec.System.encode(`Error: No function call or valid verbatim request found. Check your output format.`),
                    ),
                ]);

        } else if (this.structuringChoice === OpenAIResponsesStructuringChoice.ANYONE) {
            if (tcs.length + vrs.length) {} else
                return new RoleMessage.User<never>([
                    RoleMessage.User.Part.Text.paragraph(
                        VerbatimCodec.System.encode(`Error: No function call or valid verbatim request found. Check your output format.`),
                    ),
                ]);
            if (tcs.length + vrs.length > 1)
                return new RoleMessage.User<never>([
                    RoleMessage.User.Part.Text.paragraph(
                        VerbatimCodec.System.encode(`Error: Only 1 function call or verbatim request allowed, but multiple found.`),
                    ),
                ]);

        } else if (this.structuringChoice === OpenAIResponsesStructuringChoice.NONE) {
            if (tcs.length + vrs.length)
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
        structuringChoice: OpenAIResponsesStructuringChoice<fdu, vdu>;
    }
    export namespace Options {
        export type From<
            fdm extends Function.Decl.Map.Proto,
            vdm extends Verbatim.Decl.Map.Proto,
        > = Options<Function.Decl.From<fdm>, Verbatim.Decl.From<vdm>>;
    }
}
