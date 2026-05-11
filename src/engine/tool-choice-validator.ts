import { ToolChoice } from '../tool-choice.ts';
import { Function } from '../function.ts';
import { RoleMessage } from './message.ts';
import * as XmlCodec from '../xml.ts';


export class ToolChoiceValidator<
    in out fdu extends Function.Decl.Proto,
> {
    protected toolChoice: ToolChoice;
    public constructor(options: ToolChoiceValidator.Options) {
        this.toolChoice = options.toolChoice;
    }

    public validate(
        aiMessage: RoleMessage.Ai<fdu>,
    ): RoleMessage.User<fdu> | void {
        const fcalls = aiMessage.getFunctionCalls();
        const fress = fcalls.map(
            fcall => Function.Response.Failed.of({
                id: fcall.id,
                name: fcall.name,
                error: XmlCodec.System.encode('Cancelled by system.'),
            } as Function.Response.Failed.Options.Of<fdu>),
        );

        if (this.toolChoice === ToolChoice.REQUIRED) {
            if (fcalls.length) {} else
                return new RoleMessage.User<fdu>([
                    RoleMessage.Part.Text.paragraph(
                        XmlCodec.System.encode(`Error: Function call required, but not found.`),
                    ),
                ]);

        } else if (this.toolChoice === ToolChoice.ANYONE) {
            if (!fcalls.length)
                return new RoleMessage.User<never>([
                    RoleMessage.Part.Text.paragraph(
                        XmlCodec.System.encode(`Error: Function call required, but not found.`),
                    ),
                ]);
            if (fcalls.length > 1)
                return new RoleMessage.User<fdu>([
                    ...fress,
                    RoleMessage.Part.Text.paragraph(
                        XmlCodec.System.encode(`Error: Only 1 function call allowed, but multiple found.`),
                    ),
                ]);

        } else if (this.toolChoice === ToolChoice.NONE) {
            if (fcalls.length)
                return new RoleMessage.User<fdu>([
                    ...fress,
                    RoleMessage.Part.Text.paragraph(
                        XmlCodec.System.encode(`Error: No function call allowed.`),
                    ),
                ]);
        }
    }
}
export namespace ToolChoiceValidator {
    export type From<
        fdm extends Function.Decl.Map.Proto,
    > = ToolChoiceValidator<Function.Decl.From<fdm>>;

    export interface Options {
        toolChoice: ToolChoice;
    }
}
