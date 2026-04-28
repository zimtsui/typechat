import { Function } from '../../function.ts';
import Anthropic from '@anthropic-ai/sdk';
import { Parse, ParseError } from 'typebox/schema';


export class ToolCodec<in out fdm extends Function.Decl.Map.Proto> {
    protected fdm: fdm;
    protected apiFds: Anthropic.Tool[];
    public constructor(options: ToolCodec.Options<fdm>) {
        this.fdm = options.fdm;
        const fdentries = Object.entries(this.fdm) as Function.Decl.Entry.From<fdm>[];
        this.apiFds = fdentries.map(fdentry => ToolCodec.encodeFunctionDeclarationEntry(fdentry));
    }

    public encodeFunctionCall(
        fcall: Function.Call.From<fdm>,
    ): Anthropic.ToolUseBlock {
        throw new Error('Anthropic engine requires native function calls.');
    }

    public decodeFunctionCall(
        apifc: Anthropic.ToolUseBlock,
    ): Function.Call.From<fdm> {
        const fditem = this.fdm[apifc.name];
        if (fditem) {} else throw new SyntaxError('Unknown function call', { cause: apifc });
        try {
            Parse(fditem.parameters, apifc.input);
        } catch (e) {
            if (e instanceof ParseError)
                throw new SyntaxError('Invalid arguments of function call.', { cause: e });
            else throw e;
        }
        return Function.Call.of({
            id: apifc.id,
            name: apifc.name,
            args: apifc.input,
        } as Function.Call.Options.From<fdm>);
    }

    public encodeFunctionResponse(
        fres: Function.Response.From<fdm>,
    ): Anthropic.ToolResultBlockParam {
        if (fres.id) {} else throw new Error();
        if (fres instanceof Function.Response.Successful)
            return {
                type: 'tool_result',
                tool_use_id: fres.id,
                content: fres.text,
            };
        else if (fres instanceof Function.Response.Failed)
            return {
                type: 'tool_result',
                tool_use_id: fres.id,
                content: fres.error,
            };
        else throw new Error();
    }

    protected static encodeFunctionDeclarationEntry<fdu extends Function.Decl.Proto>(
        fdentry: Function.Decl.Entry.Of<fdu>,
    ): Anthropic.Tool {
        return {
            name: fdentry[0],
            description: fdentry[1].description,
            input_schema: fdentry[1].parameters as unknown as Anthropic.Tool.InputSchema,
        };
    }

    public encodeFunctionDeclarationMap(): Anthropic.Tool[] {
        return this.apiFds;
    }
}

export namespace ToolCodec {
    export interface Options<in out fdm extends Function.Decl.Map.Proto> {
        fdm: fdm;
    }
}
