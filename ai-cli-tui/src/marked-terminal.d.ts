declare module "marked-terminal" {
  import type { Renderer } from "marked";
  
  interface TerminalRendererOptions {
    code?: (code: string) => string;
    blockquote?: (quote: string) => string;
    html?: (html: string) => string;
    heading?: (text: string) => string;
    firstHeading?: (text: string) => string;
    hr?: () => string;
    list?: (body: string, ordered: boolean) => string;
    listitem?: (text: string) => string;
    paragraph?: (text: string) => string;
    table?: (header: string, body: string) => string;
    tablerow?: (content: string) => string;
    tablecell?: (content: string, flags: { header: boolean; align: string | null }) => string;
    strong?: (text: string) => string;
    em?: (text: string) => string;
    codespan?: (code: string) => string;
    br?: () => string;
    del?: (text: string) => string;
    link?: (href: string, title: string, text: string) => string;
    image?: (href: string, title: string, text: string) => string;
    text?: (text: string) => string;
    width?: number;
    showSectionPrefix?: boolean;
    tab?: number;
    tableOptions?: object;
    reflowText?: boolean;
  }
  
  class TerminalRenderer extends Renderer {
    constructor(options?: TerminalRendererOptions);
  }
  
  export default TerminalRenderer;
}
