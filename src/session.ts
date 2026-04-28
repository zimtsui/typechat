import { Function } from './function.ts';
import { Verbatim } from './verbatim.ts';
import { RoleMessage } from './message.ts';



export interface Session<
    in out fdu extends Function.Decl.Proto,
    in out vdu extends Verbatim.Decl.Proto,
> {
    chatMessages: Session.ChatMessage<fdu, vdu>[];
    developerMessage?: RoleMessage.Developer;
}

export namespace Session {
    export type From<
        fdm extends Function.Decl.Map.Proto,
        vdm extends Verbatim.Decl.Map.Proto,
    > = Session<
        Function.Decl.From<fdm>,
        Verbatim.Decl.From<vdm>
    >;

    export type ChatMessage<
        fdu extends Function.Decl.Proto,
        vdu extends Verbatim.Decl.Proto,
    > = RoleMessage.User<fdu> | RoleMessage.Ai<fdu, vdu>;
    export namespace ChatMessage {
        export type From<
            fdm extends Function.Decl.Map.Proto,
            vdm extends Verbatim.Decl.Map.Proto,
        > = ChatMessage<
            Function.Decl.From<fdm>,
            Verbatim.Decl.From<vdm>
        >;
    }
}
