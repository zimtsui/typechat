import { Engine } from '../../engine.ts';
import { Function } from '../../function.ts';
import Anthropic from '@anthropic-ai/sdk';

const NOMINAL = Symbol();


export namespace RoleMessage {
    export class Ai<
        in out fdu extends Function.Decl.Proto,
    > extends Engine.RoleMessage.Ai<fdu> {
        protected declare [NOMINAL]: never;

        public constructor(
            parts: unknown[],
            protected raw: Anthropic.ContentBlock[],
        ) {
            super(parts);
        }

        public getRaw(): Anthropic.ContentBlock[] {
            return this.raw;
        }
    }
    export namespace Ai {
        export type From<
            fdm extends Function.Decl.Map.Proto,
        > = Ai<Function.Decl.From<fdm>>;

        export namespace Part {
            export import Text = Engine.RoleMessage.Ai.Part.Text;
        }
    }

    export import User = Engine.RoleMessage.User;
    export import Developer = Engine.RoleMessage.Developer;
}
