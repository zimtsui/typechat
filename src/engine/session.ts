import { Function } from '../function.ts';
import { Message } from './message.ts';



export interface Session<
    out fdu extends Function.Decl.Proto,
> {
    chatMessages: Session.ChatMessage<fdu>[];
    developerMessage?: Message.Developer;
}

export namespace Session {
    export type From<
        fdm extends Function.Decl.Map.Proto,
    > = Session<Function.Decl.From<fdm>>;

    export type ChatMessage<
        fdu extends Function.Decl.Proto,
    > = Message.Input<fdu> | Message.Output<fdu>;
    export namespace ChatMessage {
        export type From<
            fdm extends Function.Decl.Map.Proto,
        > = ChatMessage<Function.Decl.From<fdm>>;
    }
}
