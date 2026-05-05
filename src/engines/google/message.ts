import { Function } from '../../function.ts';
import * as Google from '@google/genai';
import { Verbatim } from '../../verbatim.ts';
import { Engine } from '../../engine.ts';

const NOMINAL = Symbol();


export namespace RoleMessage {

    export class Ai<
        in out fdu extends Function.Decl.Proto,
        in out vdu extends Verbatim.Decl.Proto,
    > extends Engine.RoleMessage.Ai<fdu, vdu> {
        protected declare [NOMINAL]: never;
        public constructor(
            parts: unknown[],
            protected raw: Google.Content,
        ) {
            super(parts);
        }

        public getRaw(): Google.Content {
            return this.raw;
        }
        public override allChat(): boolean {
            return this.parts.every(
                part => part instanceof RoleMessage.Ai.Part.Text && !part.vreqs.length ||
                    part instanceof RoleMessage.Ai.Part.ExecutableCode ||
                    part instanceof RoleMessage.Ai.Part.CodeExecutionResult
            );
        }
        public static encodeExecutableCodePart(part: RoleMessage.Ai.Part.ExecutableCode): string {
            return RoleMessage.Ai.Part.Text.paragraph(
                '```' + (part.language ?? '') + '\n' + part.code + '\n```',
            ).text;
        }
        public static encodeCodeExecutionResultPart(part: RoleMessage.Ai.Part.CodeExecutionResult): string {
            const textParts: RoleMessage.Ai.Part.Text<never>[] = [];
            if (part.output) textParts.push(
                RoleMessage.Ai.Part.Text.paragraph(
                    '```\n' + part.output + '\n```',
                ),
            );
            textParts.push(
                RoleMessage.Ai.Part.Text.paragraph(part.outcome),
            );
            return textParts.map(part => part.text).join('');
        }
    }
    export namespace Ai {
        export type From<
            fdm extends Function.Decl.Map.Proto,
            vdm extends Verbatim.Decl.Map.Proto,
        > = Ai<Function.Decl.From<fdm>, Verbatim.Decl.From<vdm>>;

        export namespace Part {

            export import Text = Engine.RoleMessage.Ai.Part.Text;

            export class ExecutableCode {
                protected declare [NOMINAL]: never;
                public constructor(public code: string, public language?: string) {}
            }

            export class CodeExecutionResult {
                protected declare [NOMINAL]: never;
                public constructor(public outcome: string, public output?: string) {}
            }
        }
    }

    export import User = Engine.RoleMessage.User;
    export import Developer = Engine.RoleMessage.Developer;
}
