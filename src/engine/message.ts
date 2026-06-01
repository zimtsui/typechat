import assert from 'node:assert';
import { Function } from '../function.ts';
import { Media } from '../media.ts';
import { Text } from '../text.ts';

const NOMINAL = Symbol();


export namespace Message {

    export class Developer {
        protected declare [NOMINAL]: never;

        public constructor(public parts: Message.Developer.Part[]) {}
        public allTextParts(): boolean {
            return this.parts.every(part => part instanceof Text);
        }
        public getOnlyTextParts(): Text[] {
            assert(this.allTextParts());
            return this.getTextParts();
        }
        public getTextParts(): Text[] {
            return this.parts.filter(part => part instanceof Text);
        }
        public joinText(delimiter = ''): string {
            return this.getTextParts().map(part => part.raw).join(delimiter);
        }

    }
    export namespace Developer {
        export type Part = Text | Media;
    }


    export class Output<
        out fdu extends Function.Decl.Proto,
    > {
        protected declare [NOMINAL]: never;

        public constructor(public parts: Message.Output.Part<fdu>[]) {}
        public allTextParts(): boolean {
            return this.parts.every(part => part instanceof Text);
        }
        public getTextParts(): Text[] {
            return this.parts.filter(part => part instanceof Text);
        }
        public joinText(delimiter = ''): string {
            return this.getTextParts().map(part => part.raw).join(delimiter);
        }
        public getFunctionCalls(): Function.Call.Of<fdu>[] {
            return this.parts.filter(part => part instanceof Function.Call) as Function.Call.Of<fdu>[];
        }
        public getOnlyFunctionCall(): Function.Call.Of<fdu> {
            const fcs = this.getFunctionCalls();
            assert(fcs.length === 1);
            return fcs[0]!;
        }
    }
    export namespace Output {
        export type From<
            fdm extends Function.Decl.Map.Proto,
        > = Message.Output<Function.Decl.From<fdm>>;

        export type Part<fdu extends Function.Decl.Proto> = Text | Media | Function.Call.Of<fdu>;
        export namespace Part {
            export type From<
                fdm extends Function.Decl.Map.Proto,
            > = Message.Output.Part<Function.Decl.From<fdm>>;
        }
    }

    export class Input<
        out fdu extends Function.Decl.Proto,
    > {
        protected declare [NOMINAL]: never;

        public constructor(public parts: Message.Input.Part<fdu>[]) {}
        public getFunctionResponses(): Function.Response.Of<fdu>[] {
            return this.parts.filter(part => part instanceof Function.Response) as Function.Response.Of<fdu>[];
        }
        public getOnlyFunctionResponse(): Function.Response.Of<fdu> {
            assert(this.parts.length === 1 && this.parts[0]! instanceof Function.Response);
            return this.parts[0]! as Function.Response.Of<fdu>;
        }
        public getTextParts(): Text[] {
            return this.parts.filter(part => part instanceof Text);
        }
    }
    export namespace Input {
        export type From<
            fdm extends Function.Decl.Map.Proto,
        > = Message.Input<Function.Decl.From<fdm>>;

        export type Part<fdu extends Function.Decl.Proto> = Text | Media | Function.Response.Of<fdu>;
        export namespace Part {
            export type From<
                fdm extends Function.Decl.Map.Proto,
            > = Message.Input.Part<Function.Decl.From<fdm>>;
        }
    }

}
