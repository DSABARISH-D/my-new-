import {describe,expect,it} from "vitest";
import {dailySeries,displayDate,money,shiftDate,summarize,todayISO,validDate} from "../src/lib/analytics";
import type {Ledger,Expense} from "../src/lib/types";
const date="2026-04-12",base={business_date:date,recorded_by:"u",created_at:date,updated_at:date,version:1};
function bill(id:string,category_id:string,amount:number,payment_method:Expense["payment_method"]="cash"):Expense {
 return {...base,id,category_id,amount,payment_method,payment_status:"paid",voided_at:null,receipt_path:null,notes:null,unit:null,quantity:null,vendor_name:null};
}
const ledger:Ledger={people:[],ledger:[],reconciliations:[],closings:[],categories:["Chicken","Market","Packaging"].map(name=>({id:name,name,color:"#a23456",active:true})),sales:[{...base,id:"s",cash_collected:3000,upi_collected:1250,opening_float:500,notes:null}],expenses:[bill("1","Chicken",600),bill("2","Market",450),bill("3","Packaging",200,"upi")]};
describe("Financial calculations",()=>{
 it("reconciles the brief’s example without counting the float or expenses twice",()=>{expect(summarize(ledger,date,date)).toMatchObject({sales:4250,recorded:1250,paid:1250,surplus:3000,cashPaid:1050,expected:2450,actual:null,variance:null});});
 it("tracks pending, due and void expenses independently",()=>{const data={...ledger,expenses:[...ledger.expenses,{...bill("4","Market",80),payment_status:"pending" as const},{...bill("5","Chicken",20),payment_status:"due" as const},{...bill("6","Market",50),voided_at:date}]};expect(summarize(data,date,date)).toMatchObject({paid:1250,recorded:1350,pending:80,due:20,cashPaid:1050,expenseCount:5});});
 it("sums exact paise, signed cash adjustments and a physical count",()=>{const data:Ledger={...ledger,expenses:[bill("1","Market",0.1),bill("2","Market",0.2)],ledger:[{...base,id:"a",transaction_type:"cash_out",amount:15.42,notes:"Change"}],reconciliations:[{...base,id:"c",actual_amount:3485}]};expect(summarize(data,date,date)).toMatchObject({recorded:.3,expected:3484.28,actual:3485,variance:.72});});
 it("groups categories and fills days without activity",()=>{expect(summarize(ledger,date,date).categories[0]).toMatchObject({name:"Chicken",amount:600,percent:48});expect(dailySeries(ledger,shiftDate(date,-1),date)).toEqual([{date:"2026-04-11",cash:0,upi:0,sales:0,recorded:0,paid:0,surplus:0},{date,cash:3000,upi:1250,sales:4250,recorded:1250,paid:1250,surplus:3000}]);expect(summarize(ledger,"2026-03-01","2026-03-31").sales).toBe(0)});
 it("uses Indian date boundaries and grouping",()=>{expect(todayISO("Asia/Kolkata",new Date("2026-04-11T18:30:00Z"))).toBe(date);expect(todayISO("Asia/Kolkata",new Date("2026-04-11T18:29:59Z"))).toBe("2026-04-11");expect(shiftDate("2024-03-01",-1)).toBe("2024-02-29");expect(validDate("2025-02-29")).toBe(false);expect(validDate("2024-02-29")).toBe(true);expect(money(1234567.58)).toContain("12,34,567.58");expect(displayDate(date)).toContain("2026")});
});
