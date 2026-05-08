import { Function } from '../../function.ts';
import { RoleMessage } from './message.ts';
import * as XmlCodec from '../../xml.ts';
import { StructuringChoice } from '../../structuring-choice.ts';
import { Engine } from '../../engine.ts';
import { Tool } from './tool.ts';


export class StructuringValidator<
    in out fdu extends Function.Decl.Proto,
> extends Engine.StructuringValidator<fdu> {
    public constructor(options: StructuringValidator.Options) {
        super(options);
    }

    public override validate(
        aiMessage: RoleMessage.Ai<fdu>,
    ): RoleMessage.User<fdu> | void {
        const tcalls = aiMessage.getToolCalls();
        const tress = tcalls.map(
            tcall => tcall instanceof Tool.ApplyPatch.Call
                ? new Tool.ApplyPatch.Response({
                    id: tcall.raw.call_id,
                    failure: XmlCodec.System.encode('Cancelled by system.'),
                })
                : Function.Response.Failed.of({
                    id: tcall.id,
                    name: tcall.name,
                    error: XmlCodec.System.encode('Cancelled by system.'),
                } as Function.Response.Failed.Options.Of<fdu>),
        );

        if (this.structuringChoice === StructuringChoice.REQUIRED) {
            if (tcalls.length) {} else
                return new RoleMessage.User<never>([
                    RoleMessage.User.Part.Text.paragraph(
                        XmlCodec.System.encode(`Error: Tool call required, but not found.`),
                    ),
                ]);

        } else if (this.structuringChoice === StructuringChoice.ANYONE) {
            if (tcalls.length) {} else
                return new RoleMessage.User<never>([
                    RoleMessage.User.Part.Text.paragraph(
                        XmlCodec.System.encode(`Error: Tool call required, but not found.`),
                    ),
                ]);
            if (tcalls.length > 1)
                return new RoleMessage.User<fdu>([
                    ...tress,
                    RoleMessage.User.Part.Text.paragraph(
                        XmlCodec.System.encode(`Error: Only 1 tool call allowed, but multiple found.`),
                    ),
                ]);

        } else if (this.structuringChoice === StructuringChoice.NONE) {
            if (tcalls.length)
                return new RoleMessage.User<fdu>([
                    RoleMessage.User.Part.Text.paragraph(
                        XmlCodec.System.encode(`Error: No tool call allowed.`),
                    ),
                ]);
        }
    }
}
export namespace StructuringValidator {
    export type From<
        fdm extends Function.Decl.Map.Proto,
    > = StructuringValidator<Function.Decl.From<fdm>>;

    export type Options = Engine.StructuringValidator.Options;
}
