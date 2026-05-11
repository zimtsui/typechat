import { Function } from '../../function.ts';
import * as Google from '@google/genai';
import { Engine } from '../../engine.ts';

const NOMINAL = Symbol();


export namespace RoleMessage {

    export class Ai<
        in out fdu extends Function.Decl.Proto,
    > extends Engine.RoleMessage.Ai<fdu> {
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
        public override allText(): boolean {
            return this.parts.every(
                part => part instanceof RoleMessage.Part.Text ||
                    part instanceof RoleMessage.Ai.Part.ExecutableCode ||
                    part instanceof RoleMessage.Ai.Part.CodeExecutionResult
            );
        }
        public static encodeExecutableCodePart(part: RoleMessage.Ai.Part.ExecutableCode): string {
            return RoleMessage.Part.Text.paragraph(
                '```' + (part.language ?? '') + '\n' + part.code + '\n```',
            ).text;
        }
        public static encodeCodeExecutionResultPart(part: RoleMessage.Ai.Part.CodeExecutionResult): string {
            const textParts: RoleMessage.Part.Text[] = [];
            if (part.output) textParts.push(
                RoleMessage.Part.Text.paragraph(
                    '```\n' + part.output + '\n```',
                ),
            );
            textParts.push(
                RoleMessage.Part.Text.paragraph(part.outcome),
            );
            return textParts.map(part => part.text).join('');
        }
    }
    export namespace Ai {
        export type From<
            fdm extends Function.Decl.Map.Proto,
        > = Ai<Function.Decl.From<fdm>>;

        export namespace Part {

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

    export import Part = Engine.RoleMessage.Part;
    export import User = Engine.RoleMessage.User;
    export import Developer = Engine.RoleMessage.Developer;
}
