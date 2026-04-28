import { RoleMessage } from '../../message.ts';
import { Function } from '../../function.ts';
import { Tool } from './tool.ts';
import type { Verbatim } from '../../verbatim.ts';
import OpenAI from 'openai';

const NOMINAL = Symbol();


export namespace NativeRoleMessage {
    export class Ai<
        in out fdu extends Function.Decl.Proto,
        in out vdu extends Verbatim.Decl.Proto,
    > extends RoleMessage.Ai<fdu, vdu> {
        protected declare [NOMINAL]: never;
        public constructor(
            parts: unknown[],
            protected raw: OpenAI.Responses.ResponseOutputItem[],
        ) {
            super(parts);
        }

        public getRaw(): OpenAI.Responses.ResponseOutputItem[] {
            return this.raw;
        }
        public override getToolCalls(): Tool.Call.Of<fdu>[] {
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
            vdm extends Verbatim.Decl.Map.Proto,
        > = Ai<Function.Decl.From<fdm>, Verbatim.Decl.From<vdm>>;

        export namespace Part {
            export import Text = RoleMessage.Ai.Part.Text;
        }
    }

    export import User = RoleMessage.User;
    export import Developer = RoleMessage.Developer;
}
