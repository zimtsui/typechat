# XML Verbatim Channel

## Motivation

When a LLM outputs structured data in JSON format, if there are too many special characters in the parameters (for example, a large Markdown document containing a lot of LaTeX math formulas), the LLM is prone to make mistakes in JSON escaping.

XML Verbatim Channel is designed to avoid escaping in structured output of large text.

## Declaration

The LLM system/user message is expected to declare all available XML Verbatim Channels in the form of

<verbatim:declaration name="NAME_OF_CHANNEL">
    <verbatim:description>DESCRIPTION_OF_CHANNEL</verbatim:description>
    <verbatim:parameter name="NAME_OF_PARAMETER_1">
        <verbatim:description>DESCRIPTION_OF_PARAMETER</verbatim:description>
        <verbatim:mime-type>MIME_TYPE_OF_PARAMETER</verbatim:mime-type>
        <verbatim:required>WHETHER_PARAMETER_IS_REQUIRED</verbatim:required>
    </verbatim:parameter>
    <verbatim:parameter name="NAME_OF_PARAMETER_2">
        <verbatim:description>DESCRIPTION_OF_PARAMETER</verbatim:description>
        <verbatim:mime-type>MIME_TYPE_OF_PARAMETER</verbatim:mime-type>
        <verbatim:required>WHETHER_PARAMETER_IS_REQUIRED</verbatim:required>
    </verbatim:parameter>
</verbatim:declaration>

## Request

You can make a request through a channel in the form of

<verbatim:request name="NAME_OF_CHANNEL">
    <verbatim:parameter name="NAME_OF_PARAMETER_1"><![CDATA[ARGUMENT_OF_PARAMETER]]></verbatim:parameter>
    <verbatim:parameter name="NAME_OF_PARAMETER_2"><![CDATA[ARGUMENT_OF_PARAMETER]]></verbatim:parameter>
</verbatim:request>

-   The only attribute of <verbatim:request> is `name`. Additional attributes will be ignored.
-   The only attribute of <verbatim:parameter> is `name`. Additional attributes will be ignored.
-   All arguments must be wrapped in CDATA.

## Response

The LLM system/user message may contain the responses of your request in the form of

<verbatim:response name="NAME_OF_CHANNEL"><![CDATA[RESPONSE]]></verbatim:response>

Not all requests have a response.

## Quotation

The LLM system/user message may contain verbatim quotations in the form of

<verbatim:quotation><![CDATA[QUOTATION]]></verbatim:quotation>

## Meta Message

The LLM system/user message may contain meta messages from the agent loop infrastructure in the form of

<verbatim:meta></verbatim:meta>
