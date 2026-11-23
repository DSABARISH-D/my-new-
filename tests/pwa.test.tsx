// @vitest-environment jsdom
import React from "react";
import {cleanup,fireEvent,render,screen} from "@testing-library/react";
import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {PwaInstall} from "@/components/pwa-install";

beforeEach(()=>{
  vi.spyOn(window,"matchMedia").mockImplementation(query=>({
    matches:false,media:query,onchange:null,addListener:vi.fn(),removeListener:vi.fn(),
    addEventListener:vi.fn(),removeEventListener:vi.fn(),dispatchEvent:vi.fn(),
  }));
  sessionStorage.clear();
});
afterEach(()=>{cleanup();vi.restoreAllMocks();});

describe("PWA install guidance",()=>{
  it("offers iOS install instructions and can dismiss them",()=>{
    Object.defineProperty(navigator,"userAgent",{configurable:true,value:"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)"});
    render(<PwaInstall/>);
    expect(screen.getByRole("region",{name:"Install Sabarish Fast Food"})).toBeTruthy();
    expect(screen.getByText(/Add to Home Screen/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button",{name:"Got it"}));
    expect(screen.queryByRole("region",{name:"Install Sabarish Fast Food"})).toBeNull();
  });
});
