import { Verbatim } from '../../verbatim.ts';


/**
 * @throws {@link SyntaxError}
 */
export function decode<
    vdm extends Verbatim.Decl.Map.Proto,
>(str: string, vdm: vdm): Verbatim.Request.From<vdm>[] {
    type vdu = Verbatim.Decl.From<vdm>;
    const parts: Verbatim.Request.Of<vdu>[] = [];
    const requests = extractRequests(str);
    for (const [channelName, args] of requests) {
        const params = vdm[channelName]?.parameters;
        if (params) {} else throw new SyntaxError('Channel not found: ' + channelName);
        const paramNames = Object.keys(params);
        const argNames = Object.keys(args);
        for (const paramName of paramNames) {
            if (params[paramName]!.required) {} else continue;
            if (argNames.includes(paramName)) {} else
                throw new SyntaxError(`Argument of required parameter ${paramName} of channel ${channelName} is missing.`);
        }
        for (const argName of argNames)
            if (paramNames.includes(argName)) {} else
                throw new SyntaxError(`Parameter ${argName} is not defined in channel ${channelName}.`);
        const options = { name: channelName, args } as Verbatim.Request.Options.Of<vdu>;
        parts.push(Verbatim.Request.create(options));
    }
    return parts;
}


export const XML_ATTR_NAME = /(?<attr_name>[a-zA-Z_:][a-zA-Z0-9._:-]*)/;
export const XML_ATTR_VAL = /(?<attr_val_quote>['"])(?<attr_val_body>[\s\S]+?)\k<attr_val_quote>/;
export const XML_ATTR = new RegExp(`(?:${XML_ATTR_NAME.source})\\s*=\\s*(?:${XML_ATTR_VAL.source})`);
export const XML_ATTRS = new RegExp(`(?:${XML_ATTR.source}\\s*)*`);

export const VBT_ARG = new RegExp(
    `<verbatim:parameter\\s+(?<vbt_arg_attrs>${XML_ATTRS.source})\\s*>` +
    `\\s*<!\\[CDATA\\[(?<vbt_arg_cdata_body>[\\s\\S]*?)\\]\\]>\\s*` +
    `</verbatim:parameter\\s*>`,
);
export const VBT_REQ = new RegExp(
    `<verbatim:request\\s+(?<vbt_req_attrs>${XML_ATTRS.source})\\s*>` +
    `(?<vbt_req_body>[\\s\\S]*?)` +
    `</verbatim:request\\s*>`,
);


function extractArgs(argsString: string): Record<string, string> {
    const args: Record<string, string> = {};
    for (const argMatch of argsString.matchAll(new RegExp(VBT_ARG, 'g'))) {
        const argAttrs: Record<string, string> = {};
        for (const argAttrMatch of argMatch.groups!.vbt_arg_attrs!.matchAll(new RegExp(XML_ATTR, 'g'))) {
            if (argAttrs[argAttrMatch.groups!.attr_name!] === undefined) {} else
                throw new SyntaxError(`Duplicate attribute.`);
            argAttrs[argAttrMatch.groups!.attr_name!] = argAttrMatch.groups!.attr_val_body!;
        }
        if (argAttrs['name']) {} else
            throw new SyntaxError('Attribute `name` is required in <verbatim:parameter>.');
        const argCdataBody = argMatch.groups!.vbt_arg_cdata_body!;
        if (args[argAttrs['name']!] === undefined) {} else
            throw new SyntaxError(`Duplicate argument.`);
        args[argAttrs['name']!] = argCdataBody;
    }
    return args;
}

function extractRequests(reqsString: string): [name: string, params: Record<string, string>][] {
    const reqs: [name: string, params: Record<string, string>][] = [];
    for (const reqMatch of reqsString.matchAll(new RegExp(VBT_REQ, 'g'))) {
        const reqAttrs: Record<string, string> = {};
        for (const reqAttrMatch of reqMatch.groups!.vbt_req_attrs!.matchAll(new RegExp(XML_ATTR, 'g'))) {
            if (reqAttrs[reqAttrMatch.groups!.attr_name!] === undefined) {} else
                throw new SyntaxError(`Duplicate attribute.`);
            reqAttrs[reqAttrMatch.groups!.attr_name!] = reqAttrMatch.groups!.attr_val_body!;
        }
        if (reqAttrs['name']) {} else
            throw new SyntaxError('Attribute `name` is required in request.');
        const reqArgs = extractArgs(reqMatch.groups!.vbt_req_body!);
        reqs.push([reqAttrs['name']!, reqArgs]);
    }
    return reqs;
}
