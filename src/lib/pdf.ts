import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb } from "pdf-lib";
import type { Report } from "./report";

export async function reportPDF(report:Report):Promise<Uint8Array>{
  const doc=await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font=await doc.embedFont(await readFile(resolve(process.cwd(),"public/fonts/ReportSansTamil.ttf")),{subset:true});
  doc.setTitle(report.title);
  doc.setAuthor(report.business);
  const width=842,height=595,margin=34,usable=width-2*margin;
  const ink=rgb(.12,.12,.16), muted=rgb(.32,.33,.37), brand=rgb(.86,.21,.14);
  let page=doc.addPage([width,height]), y=height-margin;
  const label=(text:string,x:number,top:number,size=10,color=ink)=>page.drawText(text.replace(/[\u0000-\u001f]/g," "),{x,y:top-size,font,size,color});
  function wrap(text:string,available:number,size:number) {
    const lines:string[]=[];let part="";
    for(const char of text.replace(/[\u0000-\u001f]/g," ")) {
      if(part && font.widthOfTextAtSize(part+char,size)>available){lines.push(part);part="";}
      part+=char;
    }
    lines.push(part);
    return lines;
  }
  function runningHeader() {
    page.drawRectangle({x:margin,y:y-28,width:28,height:28,color:brand});
    label("SF",margin+5,y-3,15,rgb(1,1,1));
    label(report.business,margin+40,y,15);
    label("Financial records  /  INR",margin+40,y-21,8,muted);
    y-=46;
    for(const line of wrap(report.title,usable,18)){label(line,margin,y,18);y-=24;}
    label(report.from+"  —  "+report.to,margin,y,10,muted);
    y-=25;
  }
  function nextPage() {page=doc.addPage([width,height]);y=height-margin;runningHeader();}
  runningHeader();
  for(const [key,value] of report.summary) {label(key,margin,y);label(value,margin+200,y);y-=17;}
  y-=8;
  for(const table of report.tables) {
    const count=table.headers.length,col=usable/count;
    const heading=()=>{
      label(table.title,margin,y,13);y-=22;
      page.drawRectangle({x:margin,y:y-22,width:usable,height:22,color:rgb(.95,.95,.96)});
      table.headers.forEach((s,i)=>label(s,margin+i*col+4,y-4,8.5));y-=24;
    };
    if(y<125) nextPage();
    heading();
    if(!table.rows.length) { label("No matching records",margin+4,y-2,9,muted);y-=22; }
    for(const row of table.rows){
      const cells=row.map(value=>wrap(typeof value==="number"?value.toFixed(2):value,col-10,8.5));
      const h=8+Math.max(...cells.map(c=>c.length))*12;
      if(y-h<48){nextPage();heading();}
      cells.forEach((lines,i)=>lines.forEach((line,j)=>label(line,margin+i*col+4,y-3-j*12,8.5)));
      y-=h;
      page.drawLine({start:{x:margin,y},end:{x:margin+usable,y},thickness:.4,color:rgb(.85,.85,.87)});
    }
    y-=20;
  }
  const pages=doc.getPages();
  const stamp=new Intl.DateTimeFormat("en-IN",{timeZone:"Asia/Kolkata",dateStyle:"medium",timeStyle:"medium"}).format(new Date(report.generated));
  pages.forEach((p,i)=>{
    p.drawText("Generated "+stamp+" IST",{font,size:8,x:margin,y:20,color:muted});
    p.drawText((i+1)+" / "+pages.length,{font,size:8,x:width-70,y:20,color:muted});
  });
  return doc.save();
}
