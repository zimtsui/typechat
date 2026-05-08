import { Function } from '../function.ts';
import { RoleMessage } from './message.ts';



export interface Session<
    in out fdu extends Function.Decl.Proto,
> {
    chatMessages: Session.ChatMessage<fdu>[];
    developerMessage?: RoleMessage.Developer;
}

export namespace Session {
    export type From<
        fdm extends Function.Decl.Map.Proto,
    > = Session<
        Function.Decl.From<fdm>
    >;

    export type ChatMessage<
        fdu extends Function.Decl.Proto,
    > = RoleMessage.User<fdu> | RoleMessage.Ai<fdu>;
    export namespace ChatMessage {
        export type From<
            fdm extends Function.Decl.Map.Proto,
        > = ChatMessage<
            Function.Decl.From<fdm>
        >;
    }
}
