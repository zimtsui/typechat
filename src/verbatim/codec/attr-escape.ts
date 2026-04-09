import Handlebars from 'handlebars';


function escapeXmlAttr(value: string): string {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('"', '&quot;');
}

Handlebars.registerHelper('XmlAttr', (value: unknown) => {
    return new Handlebars.SafeString(escapeXmlAttr(String(value)));
});
