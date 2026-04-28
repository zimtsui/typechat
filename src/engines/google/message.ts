import { RoleMessage } from '../../message.ts';
import { Function } from '../../function.ts';
import * as Google from '@google/genai';
import { Verbatim } from '../../verbatim.ts';

const NOMINAL = Symbol();


export namespace NativeRoleMessage {

    export class Ai<
        in out fdu extends Function.Decl.Proto,
        in out vdu extends Verbatim.Decl.Proto,
    > extends RoleMessage.Ai<fdu, vdu> {
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
                part => part instanceof NativeRoleMessage.Ai.Part.Text ||
                    part instanceof NativeRoleMessage.Ai.Part.ExecutableCode ||
                    part instanceof NativeRoleMessage.Ai.Part.CodeExecutionResult
            );
        }
        public getChatParts(): unknown[] {
            return this.parts.filter(
                part => part instanceof NativeRoleMessage.Ai.Part.Text ||
                    part instanceof NativeRoleMessage.Ai.Part.ExecutableCode ||
                    part instanceof NativeRoleMessage.Ai.Part.CodeExecutionResult
            );
        }
        public static encodeChatPart(part: unknown): string {
            if (part instanceof NativeRoleMessage.Ai.Part.Text)
                return part.text;
            else if (part instanceof NativeRoleMessage.Ai.Part.ExecutableCode)
                return NativeRoleMessage.Ai.Part.Text.paragraph(
                    '```' + part.language + '\n' + part.code + '\n```',
                ).text;
            else if (part instanceof NativeRoleMessage.Ai.Part.CodeExecutionResult) {
                const textParts: NativeRoleMessage.Ai.Part.Text<never>[] = [];
                if (part.output) textParts.push(
                    NativeRoleMessage.Ai.Part.Text.paragraph(
                        '```\n' + part.output + '\n```',
                    ),
                );
                textParts.push(
                    NativeRoleMessage.Ai.Part.Text.paragraph(part.outcome),
                );
                return textParts.map(part => part.text).join('');
            } else throw new Error();
        }
        public getChatText(): string {
            return this.getChatParts().map(part => NativeRoleMessage.Ai.encodeChatPart(part)).join('');
        }
    }
    export namespace Ai {
        export type From<
            fdm extends Function.Decl.Map.Proto,
            vdm extends Verbatim.Decl.Map.Proto,
        > = Ai<Function.Decl.From<fdm>, Verbatim.Decl.From<vdm>>;

        export namespace Part {

            export import Text = RoleMessage.Ai.Part.Text;

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

    export import User = RoleMessage.User;
    export import Developer = RoleMessage.Developer;
}
