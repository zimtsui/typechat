import { Function } from '../../function.ts';
import Anthropic from '@anthropic-ai/sdk';
import Ajv from 'ajv';
import { type TObject } from '@sinclair/typebox';

const ajv = new Ajv();


export class ToolCodec<in out fdm extends Function.Decl.Map.Proto> {
    protected fdm: fdm;
    public constructor(options: ToolCodec.Options<fdm>) {
        this.fdm = options.fdm;
    }

    public encodeFunctionCall(
        fc: Function.Call.From<fdm>,
    ): Anthropic.ToolUseBlock {
        throw new Error('Anthropic compatible engine requires native function calls.');
    }

    public decodeFunctionCall(
        apifc: Anthropic.ToolUseBlock,
    ): Function.Call.From<fdm> {
        const fditem = this.fdm[apifc.name];
        if (fditem) {} else throw new SyntaxError('Unknown function call', { cause: apifc });
        if (ajv.validate(fditem.parameters, apifc.input)) {}
        else throw new SyntaxError('Function call not conforming to schema', { cause: apifc });
        return Function.Call.of({
            id: apifc.id,
            name: apifc.name,
            args: apifc.input,
        } as Function.Call.Options.From<fdm>);
    }

    public encodeFunctionResponse(
        fr: Function.Response.From<fdm>,
    ): Anthropic.ToolResultBlockParam {
        if (fr.id) {} else throw new Error();
        if (fr instanceof Function.Response.Successful)
            return {
                type: 'tool_result',
                tool_use_id: fr.id,
                content: fr.text,
            };
        else if (fr instanceof Function.Response.Failed)
            return {
                type: 'tool_result',
                tool_use_id: fr.id,
                content: fr.error,
            };
        else throw new Error();
    }

    protected encodeFunctionDeclarationEntry(
        fdentry: Function.Decl.Entry.From<fdm>,
    ): Anthropic.Tool {
        return {
            name: fdentry[0],
            description: fdentry[1].description,
            input_schema: fdentry[1].parameters satisfies TObject,
        };
    }

    public encodeFunctionDeclarationMap(
        fdm: fdm,
    ): Anthropic.Tool[] {
        const fdentries = Object.entries(fdm) as Function.Decl.Entry.From<fdm>[];

        return fdentries.map(fdentry => this.encodeFunctionDeclarationEntry(fdentry));
    }

}

export namespace ToolCodec {
    export interface Options<in out fdm extends Function.Decl.Map.Proto> {
        fdm: fdm;
    }
}
