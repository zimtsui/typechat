import { Function } from '../function.ts';
import { Verbatim } from '../verbatim.ts';
import { RoleMessage } from '../message.ts';
import { isRepeating } from '../repetition.ts';



export class PartsValidator<
    in out fdu extends Function.Decl.Proto,
    in out vdu extends Verbatim.Decl.Proto,
> {

    public validate(
        message: RoleMessage.Ai<fdu, vdu>,
    ): void {
        if (message.getParts().length) {} else throw new SyntaxError('Empty message.');
        if (isRepeating(message.getText())) throw new SyntaxError('Repeating');
    }

}
export namespace PartsValidator {
    export type From<
        fdm extends Function.Decl.Map.Proto,
        vdm extends Verbatim.Decl.Map.Proto,
    > = PartsValidator<Function.Decl.From<fdm>, Verbatim.Decl.From<vdm>>;
}
