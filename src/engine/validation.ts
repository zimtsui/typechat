

export interface Validator<
    out userm, in aim,
> {
    validateMessageStructuring(aiMessage: aim): userm | void;
    validateMessageParts(aiMessage: aim): void;
}

export namespace Validator {
    export type From<
        userm, aim,
    > = Validator<userm, aim>;
}
