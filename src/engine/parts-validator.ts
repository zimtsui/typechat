import { Function } from '../function.ts';
import { Message } from './message.ts';
import { isRepeating } from '../repetition.ts';
import * as Exceptions from './exceptions.ts';


export class PartsValidator<
    in out fdu extends Function.Decl.Proto,
> {

    public validate(
        message: Message.Output<fdu>,
    ): void {
        if (message.parts.length) {} else throw new Exceptions.InferenceError('Empty message.');
        if (isRepeating(message.joinText())) throw new Exceptions.InferenceError('Repeating');
    }

}
export namespace PartsValidator {
    export type From<
        fdm extends Function.Decl.Map.Proto,
    > = PartsValidator<Function.Decl.From<fdm>>;
}
