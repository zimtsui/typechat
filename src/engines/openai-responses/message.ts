import { Engine } from '../../engine.ts';
import { Function } from '../../function.ts';
import { Tool } from './tool.ts';
import OpenAI from 'openai';

const NOMINAL = Symbol();


export namespace RoleMessage {
    export class Ai<
        in out fdu extends Function.Decl.Proto,
    > extends Engine.RoleMessage.Ai<fdu> {
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
        public getToolCalls(): Tool.Call.Of<fdu>[] {
            const tcs: Tool.Call.Of<fdu>[] = [];
            for (const part of this.parts)
                if (part instanceof Function.Call || part instanceof Tool.ApplyPatch.Call) {
                    const tc = part as Tool.Call.Of<fdu>;
                    tcs.push(tc);
                }
            return tcs;
        }
        public getOnlyToolCall(): Tool.Call.Of<fdu> {
            const tcs = this.getToolCalls();
            if (tcs.length === 1) {} else throw new Error();
            return tcs[0]!;
        }
    }

    export namespace Ai {
        export type From<
            fdm extends Function.Decl.Map.Proto,
        > = Ai<Function.Decl.From<fdm>>;
    }

    export import Part = Engine.RoleMessage.Part;
    export import User = Engine.RoleMessage.User;
    export import Developer = Engine.RoleMessage.Developer;
}
