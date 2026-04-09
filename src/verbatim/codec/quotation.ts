import Handlebars from 'handlebars';
import Assets from '../../assets.ts';
import { loggers } from '../../telemetry.ts';
import { MIMEType } from 'whatwg-mimetype';


const template = Handlebars.compile<template.Input>(Assets.verbatim.quotation);
namespace template {
    export interface Input {
        mimeType: string;
        text: string;
    }
}

export function encode(mimeType: MIMEType, text: string): string {
    if (text.includes(']]>'))
        loggers.message.warn('The quotation contains "]]>", which is not allowed in XML CDATA sections. ');
    return template({ mimeType: `${mimeType}`, text });
}
