import Handlebars from 'handlebars';
import Assets from '../../assets.ts';


const template = Handlebars.compile<template.Input>(Assets.verbatim.system);
namespace template {
    export interface Input {
        name: string;
        text: string;
    }
}

export function encode(name: string, text: string): string {
    if (text.includes(']]>')) throw new Error('`]]>` is not allowed in CDATA sections.');
    return template({ name, text });
}
