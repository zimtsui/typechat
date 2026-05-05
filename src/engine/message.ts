import { Function } from '../function.ts';
import { Verbatim } from '../verbatim.ts';

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
            return this.getTextParts();
        }
        public getTextParts(): RoleMessage.Developer.Part.Text[] {
            const textParts: RoleMessage.Developer.Part.Text[] = [];
            for (const part of this.parts)
                if (part instanceof RoleMessage.Developer.Part.Text) {
                    const textPart = part;
                    textParts.push(textPart);
                }
            return textParts;
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
        public allChat(): boolean {
            return this.parts.every(part => part instanceof RoleMessage.Ai.Part.Text && !part.vreqs.length);
        }
        public getTextParts(): RoleMessage.Ai.Part.Text<vdu>[] {
            const textParts: RoleMessage.Ai.Part.Text<vdu>[] = [];
            for (const part of this.parts)
                if (part instanceof RoleMessage.Ai.Part.Text) {
                    const textPart = part as RoleMessage.Ai.Part.Text<vdu>;
                    textParts.push(textPart);
                }
            return textParts;
        }
        public getChat(): string {
            return this.getTextParts().filter(part => !part.vreqs.length).map(part => part.text).join('');
        }
        public getText(): string {
            return this.getTextParts().map(part => part.text).join('');
        }
        public getFunctionCalls(): Function.Call.Of<fdu>[] {
            const fcalls: Function.Call.Of<fdu>[] = [];
            for (const part of this.parts)
                if (part instanceof Function.Call) {
                    const fcall = part as Function.Call.Of<fdu>;
                    fcalls.push(fcall);
                }
            return fcalls;
        }
        public getVerbatimRequests(): Verbatim.Request.Of<vdu>[] {
            return this.getTextParts().flatMap(part => part.vreqs);
        }
        public getOnlyFunctionCall(): Function.Call.Of<fdu> {
            const fcalls = this.getFunctionCalls();
            if (fcalls.length === 1) {} else throw new Error();
            return fcalls[0]!;
        }
        public getOnlyVerbatimRequest(): Verbatim.Request.Of<vdu> {
            const vreqs = this.getVerbatimRequests();
            if (vreqs.length === 1) {} else throw new Error();
            return vreqs[0]!;
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
                    public vreqs: Verbatim.Request.Of<vdu>[],
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
            const fress: Function.Response.Of<fdu>[] = [];
            for (const part of this.parts)
                if (part instanceof Function.Response) {
                    const fres = part as Function.Response.Of<fdu>;
                    fress.push(fres);
                }
            return fress;
        }
        public getOnlyFunctionResponse(): Function.Response.Of<fdu> {
            if (this.parts.length === 1) {} else throw new Error();
            const part = this.parts[0]!;
            if (part instanceof Function.Response) {} else throw new Error();
            const fres = part as Function.Response.Of<fdu>;
            return fres;
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
