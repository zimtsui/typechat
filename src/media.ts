import * as XmlCodec from './xml.ts';
import { MIMEType } from 'whatwg-mimetype';

const NOMINAL = Symbol();


export abstract class Media {
    protected declare [NOMINAL]: never;
    public abstract mimeType: MIMEType;
}

export namespace Media {
    export class Image extends Media {
        public override mimeType: MIMEType;
        public base64: string;
        public constructor(options: Media.Image.Options) {
            super();
            if (options.mimeType.type === 'image') {} else
                throw new TypeError('Major MIME type of image must be `image`.');
            this.mimeType = options.mimeType;
            this.base64 = options.base64;
        }
    }
    export namespace Image {
        export interface Options {
            mimeType: MIMEType;
            base64: string;
        }
    }

    export class Pdf extends Media {
        public override mimeType = new MIMEType('application/pdf');
        public constructor(public base64: string) {
            super();
        }
    }

    export class Text extends Media {
        public override mimeType: MIMEType;
        public text: string;
        public constructor(options: Media.Text.Options) {
            super();
            if (options.mimeType.type === 'text') {} else
                throw new TypeError('Major MIME type of text must be `text`.');
            this.mimeType = options.mimeType;
            this.text = options.text;
        }

        public quote(): string {
            return XmlCodec.Quotation.encode(this.mimeType, this.text);
        }
    }
    export namespace Text {
        export interface Options {
            mimeType: MIMEType;
            text: string;
        }
    }
}
