import { Function } from '../function.ts';
import { Verbatim } from '../verbatim.ts';
import { Media } from '../media.ts';

const NOMINAL = Symbol();



export interface Session<userm, aim, devm> {
    chatMessages: Session.ChatMessage<userm, aim>[];
    developerMessage?: devm;
}

export namespace Session {
    export type ChatMessage<userm, aim> = userm | aim;
}

export namespace RoleMessage {

    export namespace Part {
        export class Text<out vdu extends Verbatim.Decl.Proto> {
            public static paragraph(text: string): Text<never> {
                return new RoleMessage.Part.Text(text.trimEnd() + '\n\n', []);
            }

            protected declare [NOMINAL]: never;
            public constructor(
                public text: string,
                public vrs: Verbatim.Request.Of<vdu>[],
            ) {}
        }
    }

    export namespace Ai {
        export type Part<
            fdu extends Function.Decl.Proto,
            vdu extends Verbatim.Decl.Proto,
        > =
            |   RoleMessage.Part.Text<vdu>
            |   Function.Call.Of<fdu>
        ;
        export namespace Part {
            export type From<
                fdm extends Function.Decl.Map.Proto,
                vdm extends Verbatim.Decl.Map.Proto,
            > = RoleMessage.Ai.Part<
                Function.Decl.From<fdm>,
                Verbatim.Decl.From<vdm>
            >;
        }
    }

    export namespace User {
        export type Part<fdu extends Function.Decl.Proto> =
            |   RoleMessage.Part.Text<never>
            |   Function.Response.Of<fdu>
            |   Media
        ;
        export namespace Part {
            export type From<
                fdm extends Function.Decl.Map.Proto,
            > = RoleMessage.User.Part<
                Function.Decl.From<fdm>
            >;
        }
    }

    export namespace Developer {
        export type Part = RoleMessage.Part.Text<never>;
    }
}
