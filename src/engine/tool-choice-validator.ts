import { ToolChoice } from '../tool-choice.ts';
import { Function } from '../function.ts';
import { Message } from './message.ts';
import * as XmlCodec from '../xml.ts';
import { Text } from '../text.ts';


export class ToolChoiceValidator<
    in out fdu extends Function.Decl.Proto,
> {
    protected toolChoice: ToolChoice;
    public constructor(options: ToolChoiceValidator.Options) {
        this.toolChoice = options.toolChoice;
    }

    public validate(
        aiMessage: Message.Output<fdu>,
    ): Message.Input<fdu> | void {
        const fcs = aiMessage.getFunctionCalls();

        if (this.toolChoice === ToolChoice.REQUIRED) {
            if (fcs.length === 0)
                return new Message.Input<fdu>([
                    new Text(
                        XmlCodec.System.encode(`Error: Function call required, but not found.`),
                    ),
                ]);

        } else if (this.toolChoice === ToolChoice.ANYONE) {
            if (fcs.length === 0)
                return new Message.Input<never>([
                    new Text(
                        XmlCodec.System.encode(`Error: Function call required, but not found.`),
                    ),
                ]);
            if (fcs.length > 1)
                return new Message.Input<fdu>(
                    fcs.map(
                        fc => Function.Response.Failed.of({
                            id: fc.id,
                            name: fc.name,
                            error: XmlCodec.System.encode('Error: Only 1 function call allowed, but multiple found. This function call is cancelled by system.'),
                        } as Function.Response.Failed.Options.Of<fdu>),
                    ),
                );

        } else if (this.toolChoice === ToolChoice.NONE) {
            if (fcs.length)
                return new Message.Input<fdu>(
                    fcs.map(
                        fc => Function.Response.Failed.of({
                            id: fc.id,
                            name: fc.name,
                            error: XmlCodec.System.encode('Error: No function call allowed. This function call is cancelled by system.'),
                        } as Function.Response.Failed.Options.Of<fdu>),
                    ),
                );
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
