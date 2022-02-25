const encoder = new TextEncoder();

export class UnsafeOwnedPointer extends Deno.UnsafePointer {
  data: Uint8Array;
  constructor(size: number) {
    const data = new Uint8Array(size);
    super(Deno.UnsafePointer.of(data).value);
    this.data = data;
  }
}

/**
 * Encodes a C string.
 */
export const cstr = (str: string): Uint8Array => {
  const buf = new Uint8Array(str.length + 1);
  encoder.encodeInto(str, buf);
  return buf;
};

/**
 * Casts a pointer to string.
 */
export const pointerToString = (pointer: Deno.UnsafePointer): string => {
  const view = new Deno.UnsafePointerView(pointer);
  return view.getCString();
};
