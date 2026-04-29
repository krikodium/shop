"use client";

import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      richColors
      position="top-center"
      toastOptions={{
        classNames: {
          toast: "border shadow-lg",
          success: "border-green-200 bg-green-50 text-green-900",
          error: "border-red-200 bg-red-50 text-red-900",
          warning: "border-amber-200 bg-amber-50 text-amber-900",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
