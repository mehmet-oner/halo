import { JSX } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { cn } from "@/lib/utils";

interface CardComponentProps {
  icon: JSX.Element;
  titleText: string;
  titleSubText?: string;
  titleAction: JSX.Element;
  content: JSX.Element | null;
}

export const CardComponent = ({
  icon,
  titleText,
  titleAction,
  content,
  titleSubText,
}: CardComponentProps) => {
  return (
    <Card
      className={cn(
        "w-full border border-slate-200 bg-white shadow-lg backdrop-blur gap-2 p-4"
      )}
    >
      <CardHeader>
        <CardTitle className="w-full text-xl font-normal text-[#0a1420] flex flex-row justify-between">
          <div className="flex flex-col">
            <h2 className="flex items-center gap-2 text-lg font-light text-slate-900">
              {icon}
              {titleText}
            </h2>
            <p className="text-sm text-slate-500 ">{titleSubText}</p>
          </div>
          <div className="flex items-center gap-2">{titleAction}</div>
        </CardTitle>
      </CardHeader>
      <CardContent className={cn("px-2")}>{content}</CardContent>
    </Card>
  );
};
