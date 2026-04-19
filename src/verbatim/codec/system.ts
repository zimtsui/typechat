import Assets from '../../assets.ts';
import Handlebars from './helpers.ts';


const template = Handlebars.compile<template.Input>(Assets.verbatim.system);
namespace template {
    export interface Input {
        text: string;
    }
}

export function encode(text: string): string {
    return template({ text });
}
