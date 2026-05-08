import { StructuringChoice } from '../structuring-choice.ts';
import { Function } from '../function.ts';
import { RoleMessage } from './message.ts';
import * as XmlCodec from '../xml.ts';


export class StructuringValidator<
    in out fdu extends Function.Decl.Proto,
> {
    protected structuringChoice: StructuringChoice;
    public constructor(options: StructuringValidator.Options) {
        this.structuringChoice = options.structuringChoice;
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

        if (this.structuringChoice === StructuringChoice.REQUIRED) {
            if (fcalls.length) {} else
                return new RoleMessage.User<fdu>([
                    ...fress,
                    RoleMessage.User.Part.Text.paragraph(
                        XmlCodec.System.encode(`Error: Function call required, but not found.`),
                    ),
                ]);

        } else if (this.structuringChoice === StructuringChoice.ANYONE) {
            if (!fcalls.length)
                return new RoleMessage.User<never>([
                    RoleMessage.User.Part.Text.paragraph(
                        XmlCodec.System.encode(`Error: Function call required, but not found.`),
                    ),
                ]);
            if (fcalls.length > 1)
                return new RoleMessage.User<fdu>([
                    ...fress,
                    RoleMessage.User.Part.Text.paragraph(
                        XmlCodec.System.encode(`Error: Only 1 function call allowed, but multiple found.`),
                    ),
                ]);

        } else if (this.structuringChoice === StructuringChoice.NONE) {
            if (fcalls.length)
                return new RoleMessage.User<fdu>([
                    ...fress,
                    RoleMessage.User.Part.Text.paragraph(
                        XmlCodec.System.encode(`Error: No function call allowed.`),
                    ),
                ]);
        }
    }
}
export namespace StructuringValidator {
    export type From<
        fdm extends Function.Decl.Map.Proto,
    > = StructuringValidator<Function.Decl.From<fdm>>;

    export interface Options {
        structuringChoice: StructuringChoice;
    }
}
