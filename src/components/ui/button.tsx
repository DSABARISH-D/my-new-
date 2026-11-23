import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils";
export const buttonVariants=cva("button",{variants:{variant:{default:"button-brand",outline:"button-outline",ghost:"button-ghost"}},defaultVariants:{variant:"default"}});
export function Button({className,variant,...props}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants>) {
 return <button className={cn(buttonVariants({variant}),className)} {...props}/>;
}
