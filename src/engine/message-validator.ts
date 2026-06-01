import { Function } from '../function.ts';
import { Message } from './message.ts';
import { isRepeating } from '../repetition.ts';
import * as Exceptions from './exceptions.ts';
import { Text } from '../text.ts';
import { Media } from '../media.ts';


export class MessageValidator<
    in out fdu extends Function.Decl.Proto,
> {

    public validateOutputMessage(
        message: Message.Output<fdu>,
    ): void {
        if (message.parts.length) {} else throw new Exceptions.InferenceError('Empty message.');
        if (isRepeating(message.joinText())) throw new Exceptions.InferenceError('Repeating');
    }

    public validateInputMessage(
        message: Message.Input<fdu>,
    ): void {
        let i = 0;
        for (; i < message.parts.length; i++)
            if (message.parts[i]! instanceof Function.Response) {} else break;
        for (; i < message.parts.length; i++)
            if (message.parts[i]! instanceof Text || message.parts[i]! instanceof Media) {} else break;
        if (i < message.parts.length) throw new Error();
    }

}
export namespace MessageValidator {
    export type From<
        fdm extends Function.Decl.Map.Proto,
    > = MessageValidator<Function.Decl.From<fdm>>;
}
