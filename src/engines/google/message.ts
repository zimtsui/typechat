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
        public allChatPart(): boolean {
            return this.parts.every(
                part => part instanceof RoleMessage.Ai.Part.Text ||
                    part instanceof RoleMessage.Ai.Part.ExecutableCode ||
                    part instanceof RoleMessage.Ai.Part.CodeExecutionResult
            );
        }
        public getChatParts(): unknown[] {
            return this.parts.filter(
                part => part instanceof RoleMessage.Ai.Part.Text ||
                    part instanceof RoleMessage.Ai.Part.ExecutableCode ||
                    part instanceof RoleMessage.Ai.Part.CodeExecutionResult
            );
        }
        public static encodeChatPart(part: unknown): string {
            if (part instanceof RoleMessage.Ai.Part.Text)
                return part.text;
            else if (part instanceof RoleMessage.Ai.Part.ExecutableCode)
                return RoleMessage.Ai.Part.Text.paragraph(
                    '```' + part.language + '\n' + part.code + '\n```',
                ).text;
            else if (part instanceof RoleMessage.Ai.Part.CodeExecutionResult) {
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
            } else throw new Error();
        }
        public getChatText(): string {
            return this.getChatParts().map(part => RoleMessage.Ai.encodeChatPart(part)).join('');
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
                public constructor(public code: string, public language: string) {}
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
