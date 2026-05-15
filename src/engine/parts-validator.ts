import { Function } from '../function.ts';
import { RoleMessage } from './message.ts';
import { isRepeating } from '../repetition.ts';
import * as Exceptions from './exceptions.ts';


export class PartsValidator<
    in out fdu extends Function.Decl.Proto,
> {

    public validate(
        message: RoleMessage.Ai<fdu>,
    ): void {
        if (message.getParts().length) {} else throw new Exceptions.InferenceError('Empty message.');
        if (isRepeating(message.getText())) throw new Exceptions.InferenceError('Repeating');
    }

}
export namespace PartsValidator {
    export type From<
        fdm extends Function.Decl.Map.Proto,
    > = PartsValidator<Function.Decl.From<fdm>>;
}
