declare module 'gifsicle-wasm-browser' {
  interface RunInput {
    file: ArrayBuffer | Blob | File | string;
    name: string;
  }
  interface RunOptions {
    input: RunInput[];
    command: string[];
    folder?: string[];
    isStrict?: boolean;
  }
  const gifsicle: {
    run(options: RunOptions): Promise<File[]>;
  };
  export default gifsicle;
}
