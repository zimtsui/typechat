

export interface StructuringValidator<
    out userm, in aim,
> {
    validate(aiMessage: aim): userm | void;
}
export namespace StructuringValidator {
    export type From<
        userm, aim,
    > = StructuringValidator<userm, aim>;
}

export interface PartsValidator<
    out userm, in aim,
> {
    validate(aiMessage: aim): void;
}
export namespace PartsValidator {
    export type From<
        userm, aim,
    > = PartsValidator<userm, aim>;
}
