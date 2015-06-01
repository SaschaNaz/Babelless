declare namespace libiconv {
    interface IconvError extends Error {
        code: string;
    }
    function convert(inBytes: number[]| Uint8Array, inCharset: string, outCharset: string): number[];
}