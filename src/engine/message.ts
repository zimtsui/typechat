import { Function } from '../function.ts';

const NOMINAL = Symbol();


export namespace RoleMessage {
    export namespace Part {
        export class Text {
            protected declare [NOMINAL]: never;
            public static paragraph(text: string): Text {
                return new RoleMessage.Part.Text(text.trimEnd() + '\n\n');
            }
            public constructor(
                public text: string,
            ) {}
        }
    }

    export class Developer {
        protected declare [NOMINAL]: never;

        public constructor(protected parts: unknown[]) {}
        public allTextParts(): boolean {
            return this.parts.every(part => part instanceof RoleMessage.Part.Text);
        }
        public getParts(): unknown[] {
            return this.parts;
        }
        public getOnlyTextParts(): RoleMessage.Part.Text[] {
            if (this.allTextParts()) {} else throw new Error();
            return this.getTextParts();
        }
        public getTextParts(): RoleMessage.Part.Text[] {
            const textParts: RoleMessage.Part.Text[] = [];
            for (const part of this.parts)
                if (part instanceof RoleMessage.Part.Text) {
                    const textPart = part;
                    textParts.push(textPart);
                }
            return textParts;
        }
        public getText(): string {
            return this.getTextParts().map(part => part.text).join('');
        }
    }


    export class Ai<
        out fdu extends Function.Decl.Proto,
    > {
        protected declare [NOMINAL]: never;

        public constructor(protected parts: unknown[]) {}
        public getParts(): unknown[] {
            return this.parts;
        }
        public allText(): boolean {
            return this.parts.every(part => part instanceof RoleMessage.Part.Text);
        }
        public getTextParts(): RoleMessage.Part.Text[] {
            return this.parts.filter(part => part instanceof RoleMessage.Part.Text) as RoleMessage.Part.Text[];
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
        public getOnlyFunctionCall(): Function.Call.Of<fdu> {
            const fcalls = this.getFunctionCalls();
            if (fcalls.length === 1) {} else throw new Error();
            return fcalls[0]!;
        }
    }
    export namespace Ai {
        export type From<
            fdm extends Function.Decl.Map.Proto,
        > = RoleMessage.Ai<
            Function.Decl.From<fdm>
        >;

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
        public getTextParts(): RoleMessage.Part.Text[] {
            return this.parts.filter(part => part instanceof RoleMessage.Part.Text);
        }
    }
    export namespace User {
        export type From<
            fdm extends Function.Decl.Map.Proto,
        > = RoleMessage.User<Function.Decl.From<fdm>>;
    }
}
