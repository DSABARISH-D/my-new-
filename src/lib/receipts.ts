export const MAX_RECEIPT_BYTES = 3 * 1024 * 1024;

export function receiptType(bytes:Uint8Array):{ext:string;mime:string}|null {
  const match=(at:number,magic:number[])=>magic.every((value,index)=>bytes[at+index]===value);
  if(match(0,[0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])) return {ext:"png",mime:"image/png"};
  if(match(0,[0xff,0xd8,0xff])) return {ext:"jpg",mime:"image/jpeg"};
  if(match(0,[0x25,0x50,0x44,0x46,0x2d])) return {ext:"pdf",mime:"application/pdf"};
  if(match(0,[0x52,0x49,0x46,0x46]) && match(8,[0x57,0x45,0x42,0x50])) return {ext:"webp",mime:"image/webp"};
  return null;
}
