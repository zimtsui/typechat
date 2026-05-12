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
        const fcs = aiMessage.getFunctionCalls();
        const frs = fcs.map(
            fc => Function.Response.Failed.of({
                id: fc.id,
                name: fc.name,
                error: XmlCodec.System.encode('Cancelled by system.'),
            } as Function.Response.Failed.Options.Of<fdu>),
        );

        if (this.toolChoice === ToolChoice.REQUIRED) {
            if (fcs.length) {} else
                return new RoleMessage.User<fdu>([
                    new RoleMessage.Part.Text(
                        XmlCodec.System.encode(`Error: Function call required, but not found.`),
                    ),
                ]);

        } else if (this.toolChoice === ToolChoice.ANYONE) {
            if (!fcs.length)
                return new RoleMessage.User<never>([
                    new RoleMessage.Part.Text(
                        XmlCodec.System.encode(`Error: Function call required, but not found.`),
                    ),
                ]);
            if (fcs.length > 1)
                return new RoleMessage.User<fdu>([
                    ...frs,
                    new RoleMessage.Part.Text(
                        XmlCodec.System.encode(`Error: Only 1 function call allowed, but multiple found.`),
                    ),
                ]);

        } else if (this.toolChoice === ToolChoice.NONE) {
            if (fcs.length)
                return new RoleMessage.User<fdu>([
                    ...frs,
                    new RoleMessage.Part.Text(
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
