const NOMINAL = Symbol();


export class Text {
    protected declare [NOMINAL]: never;
    public static paragraph(text: string): Text {
        return new Text(text.trimEnd() + '\n\n');
    }
    public constructor(
        public raw: string,
    ) {}
}
