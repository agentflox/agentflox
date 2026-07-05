import React from "react";
import Link from "next/link";
import Image from "next/image";

interface AuthContainerProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: React.ReactNode;
}

export const AuthContainer = ({ children, title, subtitle }: AuthContainerProps) => (
  <div className="w-full bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden">
    <div className="p-8 sm:p-10">
      {/* Mobile-only Logo */}
      <div className="lg:hidden flex justify-center mb-8">
        <div className="flex items-center gap-2">
          <span className="relative inline-block h-9 w-9">
            <Image
              src="/images/logo.png"
              alt="Agentflox logo"
              fill
              className="object-contain"
              priority
            />
          </span>
          <span className="font-bold text-2xl tracking-tight">Agentflox</span>
        </div>
      </div>

      <div className="w-full">
        {title && <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 mb-[4px]">{title}</h1>}
        {subtitle && <div className="text-gray-500 mb-6 text-sm sm:text-base leading-relaxed">{subtitle}</div>}
        {children}
      </div>
    </div>
  </div>
);
