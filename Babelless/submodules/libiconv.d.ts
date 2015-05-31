declare namespace libiconv {
    function convert(inBytes: number[]| Uint8Array, inCharset: string, outCharset: string): number[];
}