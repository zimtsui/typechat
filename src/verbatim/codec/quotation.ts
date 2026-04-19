import Assets from '../../assets.ts';
import Handlebars from './helpers.ts';
import { loggers } from '../../telemetry.ts';
import { MIMEType } from 'whatwg-mimetype';


const template = Handlebars.compile<template.Input>(Assets.verbatim.quotation);
namespace template {
    export interface Input {
        mimeType: string;
        text: string;
        author?: string;
    }
}

export function encode(mimeType: MIMEType, text: string, author?: string): string {
    if (text.includes(']]>'))
        loggers.message.warn('The quotation contains "]]>", which is not allowed in XML CDATA sections. ');
    return template({ mimeType: `${mimeType}`, text, author });
}
