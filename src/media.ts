import assert from 'node:assert';
import * as XmlCodec from './xml.ts';
import { MIMEType } from 'node:util';

const NOMINAL = Symbol();


export abstract class Media {
    protected declare [NOMINAL]: never;
    public abstract mimeType: MIMEType;
}

export namespace Media {
    export class Image extends Media {
        public constructor(public binary: ArrayBuffer, public override mimeType: MIMEType) {
            super();
            if (this.mimeType.type === 'image') {} else
                throw new TypeError('Major MIME type of image must be `image`.');
        }
        public [Symbol.toPrimitive](hint: string): string {
            assert(hint === 'string');
            return Buffer.from(this.binary).toString('base64');
        }
    }

    export class Pdf extends Media {
        public override mimeType: MIMEType;
        public constructor(public binary: ArrayBuffer) {
            super();
            this.mimeType = new MIMEType('application/pdf');
        }
        public [Symbol.toPrimitive](hint: string): string {
            assert(hint === 'string');
            return Buffer.from(this.binary).toString('base64');
        }
    }

    export class Text extends Media {
        public constructor(public text: string, public override mimeType: MIMEType) {
            super();
            if (mimeType.type === 'text') {} else
                throw new TypeError('Major MIME type of text must be `text`.');
        }
        public quote(): string {
            return XmlCodec.Quotation.encode(this.mimeType, this.text);
        }
        public [Symbol.toPrimitive](hint: string): string {
            assert(hint === 'string');
            return this.text;
        }
    }
}
