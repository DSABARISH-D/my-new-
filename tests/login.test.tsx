// @vitest-environment jsdom
import React from "react";
import {cleanup,fireEvent,render,screen,waitFor} from "@testing-library/react";
import {afterEach,describe,expect,it,vi} from "vitest";
import {AuthScreen} from "@/components/auth-screen";
const calls=vi.hoisted(()=>({login:vi.fn(),recover:vi.fn(),setPassword:vi.fn(),replace:vi.fn(),refresh:vi.fn()}));
vi.mock("@/app/actions/auth",()=>calls);
vi.mock("next/navigation",()=>({useRouter:()=>calls}));
vi.mock("next/image",()=>({default:()=>null}));
afterEach(()=>{cleanup();vi.clearAllMocks()});
describe("Staff sign in",()=>{
 it("keeps inputs after a failed sign in and exposes a labelled password toggle",async()=>{
 calls.login.mockResolvedValue({ok:false,error:"Check your email and password."});render(<AuthScreen/>);
 fireEvent.change(screen.getByLabelText("Email address"),{target:{value:"staff@example.test"}});fireEvent.change(screen.getByLabelText("Password",{exact:true}),{target:{value:"test-password"}});
 fireEvent.click(screen.getByRole("button",{name:"Show password"}));expect((screen.getByLabelText("Password",{exact:true}) as HTMLInputElement).type).toBe("text");
 fireEvent.click(screen.getByRole("button",{name:"Sign in",exact:true}));expect(await screen.findByRole("alert")).toHaveProperty("textContent","Check your email and password.");expect((screen.getByLabelText("Email address") as HTMLInputElement).value).toBe("staff@example.test");
 });
 it("submits a recovery request and shows a generic acknowledgement",async()=>{calls.recover.mockResolvedValue({ok:true});render(<AuthScreen/>);fireEvent.click(screen.getByText("Forgot password?"));fireEvent.change(screen.getByLabelText("Email address"),{target:{value:"owner@example.test"}});fireEvent.click(screen.getByRole("button",{name:"Send recovery link"}));await waitFor(()=>expect(screen.getByRole("status").textContent).toContain("If your account is active"));});
});
