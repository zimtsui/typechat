import * as VerbatimCodec from './verbatim/codec.ts';

const NOMINAL = Symbol();


export abstract class Media {
    protected declare [NOMINAL]: never;
    public abstract mimeType: string;
}

export namespace Media {
    export type Options = Omit<Media, never>;

    export class Image extends Media {
        public override mimeType: `image/${string}`;
        public base64: string;
        public resolution: Media.Image.Resolution;
        public constructor(options: Media.Image.Options) {
            super();
            this.mimeType = options.mimeType;
            this.base64 = options.base64;
            this.resolution = options.resolution;
        }
    }
    export namespace Image {
        export type Options = Omit<Media.Image, never>;
        export const enum Resolution {
            AUTO,
            LOW,
            HIGH,
            HIGHEST,
        }
    }

    export class Pdf extends Media {
        public override mimeType = 'application/pdf';
        public base64: string;
        public constructor(options: Media.Pdf.Options) {
            super();
            this.base64 = options.base64;
        }
    }
    export namespace Pdf {
        export type Options = Omit<Media.Pdf, 'mimeType'>;
    }

    export class Text extends Media {
        public override mimeType: `text/${string}`;
        public text: string;
        public constructor(options: Media.Text.Options) {
            super();
            this.mimeType = options.mimeType;
            this.text = options.text;
        }

        public quote(): string {
            return VerbatimCodec.Quotation.encode(this.mimeType, this.text);
        }
    }
    export namespace Text {
        export type Options = Omit<Media.Text, never>;
    }
}
