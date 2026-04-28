import { Function } from './function.ts';
import { Verbatim } from './verbatim.ts';

const NOMINAL = Symbol();


export namespace RoleMessage {

    export class Developer {
        protected declare [NOMINAL]: never;

        public constructor(protected parts: unknown[]) {}
        public allTextParts(): boolean {
            return this.parts.every(part => part instanceof RoleMessage.Developer.Part.Text);
        }
        public getParts(): unknown[] {
            return this.parts;
        }
        public getOnlyTextParts(): RoleMessage.Developer.Part.Text[] {
            if (this.allTextParts()) {} else throw new Error();
            return this.parts as RoleMessage.Developer.Part.Text[];
        }
        public getTextParts(): RoleMessage.Developer.Part.Text[] {
            return this.parts.filter(part => part instanceof RoleMessage.Developer.Part.Text);
        }
        public getText(): string {
            return this.getTextParts().map(part => part.text).join('');
        }
    }
    export namespace Developer {
        export namespace Part {
            export class Text {
                protected declare [NOMINAL]: never;
                public static paragraph(text: string): Text {
                    return new Text(text.trimEnd() + '\n\n');
                }
                public constructor(
                    public text: string,
                ) {}
            }
        }
    }


    export class Ai<
        out fdu extends Function.Decl.Proto,
        out vdu extends Verbatim.Decl.Proto,
    > {
        protected declare [NOMINAL]: never;

        public constructor(protected parts: unknown[]) {}
        public getParts(): unknown[] {
            return this.parts;
        }
        public allTextPart(): boolean {
            return this.parts.every(part => part instanceof RoleMessage.Ai.Part.Text);
        }
        public getTextParts(): RoleMessage.Ai.Part.Text<vdu>[] {
            return this.parts.filter(part => part instanceof RoleMessage.Ai.Part.Text) as RoleMessage.Ai.Part.Text<vdu>[];
        }
        public getText(): string {
            return this.getTextParts().map(part => part.text).join('');
        }
        public getFunctionCalls(): Function.Call.Of<fdu>[] {
            return this.parts.filter(part => part instanceof Function.Call) as Function.Call.Of<fdu>[];
        }
        public getVerbatimRequests(): Verbatim.Request.Of<vdu>[] {
            return this.getTextParts().flatMap(part => part.vrs);
        }
        public getOnlyFunctionCall(): Function.Call.Of<fdu> {
            const fcs = this.getFunctionCalls();
            if (fcs.length === 1) {} else throw new Error();
            return fcs[0]!;
        }
        public getOnlyVerbatimRequest(): Verbatim.Request.Of<vdu> {
            const vrs = this.getVerbatimRequests();
            if (vrs.length === 1) {} else throw new Error();
            return vrs[0]!;
        }
    }
    export namespace Ai {
        export type From<
            fdm extends Function.Decl.Map.Proto,
            vdm extends Verbatim.Decl.Map.Proto,
        > = RoleMessage.Ai<
            Function.Decl.From<fdm>,
            Verbatim.Decl.From<vdm>
        >;
        export namespace Part {
            export class Text<out vdu extends Verbatim.Decl.Proto> {
                protected declare [NOMINAL]: never;
                public static paragraph(text: string): Text<never> {
                    return new RoleMessage.Ai.Part.Text(text.trimEnd() + '\n\n', []);
                }
                public constructor(
                    public text: string,
                    public vrs: Verbatim.Request.Of<vdu>[],
                ) {}
            }
            export namespace Text {
                export type From<
                    vdm extends Verbatim.Decl.Map.Proto,
                > = Text<Verbatim.Decl.From<vdm>>;
            }
        }
    }

    export class User<
        out fdu extends Function.Decl.Proto,
    > {
        protected declare [NOMINAL]: never;

        public constructor(protected parts: unknown[]) {}
        public getParts(): unknown[] {
            return this.parts;
        }
        public getFunctionResponses(): Function.Response.Of<fdu>[] {
            return this.parts.filter(part => part instanceof Function.Response) as Function.Response.Of<fdu>[];
        }
        public getOnlyFunctionResponse(): Function.Response.Of<fdu> {
            if (this.parts.length === 1) {} else throw new Error();
            const part = this.parts[0]!;
            if (part instanceof Function.Response) {} else throw new Error();
            return part as Function.Response.Of<fdu>;
        }
    }
    export namespace User {
        export type From<
            fdm extends Function.Decl.Map.Proto,
        > = RoleMessage.User<Function.Decl.From<fdm>>;

        export namespace Part {
            export class Text {
                protected declare [NOMINAL]: never;
                public static paragraph(text: string): Text {
                    return new RoleMessage.User.Part.Text(text.trimEnd() + '\n\n');
                }
                public constructor(
                    public text: string,
                ) {}
            }
        }
    }
}
