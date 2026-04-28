import { Function } from '../function.ts';
import { RoleMessage } from '../message.ts';
import { Verbatim } from "../verbatim.js";


export interface StructuringValidator<
    in out fdu extends Function.Decl.Proto,
    in out vdu extends Verbatim.Decl.Proto,
> {
    validate(aiMessage: RoleMessage.Ai<fdu, vdu>): RoleMessage.User<never> | void;
}
export namespace StructuringValidator {
    export type From<
        fdm extends Function.Decl.Map.Proto,
        vdm extends Verbatim.Decl.Map.Proto,
    > = StructuringValidator<Function.Decl.From<fdm>, Verbatim.Decl.From<vdm>>;
}
