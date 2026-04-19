

export interface StructuringValidator<
    out userm, in aim,
> {
    validate(aiMessage: aim): userm | void;
}

export interface PartsValidator<
    in aim,
> {
    validate(aiMessage: aim): void;
}
