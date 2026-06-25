declare module "mammoth/mammoth.browser.js" {
  type MammothMarkdownResult = {
    value: string;
    messages?: Array<{ type?: string; message?: string }>;
  };

  const mammoth: {
    convertToMarkdown(input: { arrayBuffer: ArrayBuffer }, options?: Record<string, unknown>): Promise<MammothMarkdownResult>;
  };

  export default mammoth;
}
