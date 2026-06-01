import { Engine } from '../../engine.ts';
import { Function } from '../../function.ts';
import OpenAI from 'openai';

const NOMINAL = Symbol();


export namespace RoleMessage {
    export class Ai<
        in out fdu extends Function.Decl.Proto,
    > extends Engine.Message.Output<fdu> {
        protected declare [NOMINAL]: never;
        public constructor(
            parts: unknown[],
            protected raw: OpenAI.Responses.Response,
        ) {
            super(parts);
        }

        public getRaw(): OpenAI.Responses.Response {
            return this.raw;
        }
    }

    export namespace Ai {
        export type From<
            fdm extends Function.Decl.Map.Proto,
        > = Ai<Function.Decl.From<fdm>>;
    }

    export import Part = Engine.Message.Part;
    export import User = Engine.Message.Input;
    export import Developer = Engine.Message.Developer;
}
