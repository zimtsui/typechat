import Handlebars from 'handlebars';
import assert from 'node:assert';


function assertXmlAttr(value: string): string {
    assert(/^[^<>&'"]+$/.test(value));
    return value;
}
Handlebars.registerHelper('AssertXmlAttr', (value: unknown) => {
    assert(typeof value === 'string');
    return new Handlebars.SafeString(assertXmlAttr(value));
});


function escapeXmlAttr(value: string): string {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&apos;')
    ;
}
Handlebars.registerHelper('XmlAttr', (value: unknown) => {
    assert(typeof value === 'string');
    return new Handlebars.SafeString(escapeXmlAttr(value));
});


function escapeXmlBody(value: string): string {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
    ;
}
Handlebars.registerHelper('XmlBody', (value: unknown) => {
    assert(typeof value === 'string');
    return new Handlebars.SafeString(escapeXmlBody(value));
});

Handlebars.registerHelper('isDefined', function (value) {
    return value !== undefined;
});


export default Handlebars;
