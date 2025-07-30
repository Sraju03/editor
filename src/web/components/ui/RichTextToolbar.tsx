"use client";
 
import React from "react";
import {
  Bold,
  Italic,
  Underline,
  Highlighter,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
} from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
 
const RichTextToolbar: React.FC = () => {
  const exec = (command: string, value?: string) => {
    document.execCommand(command, false, value);
  };
 
  return (
    <div className="flex items-center flex-wrap gap-2  p-3 ">
      
      <Select onValueChange={(value) => exec("fontName", value)}>
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Font Family" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Arial">Arial</SelectItem>
          <SelectItem value="Times New Roman">Times New Roman</SelectItem>
          <SelectItem value="Calibri">Calibri</SelectItem>
          <SelectItem value="Georgia">Georgia</SelectItem>
          <SelectItem value="Verdana">Verdana</SelectItem>
        </SelectContent>
      </Select>
 
      <Select onValueChange={(value) => exec("fontSize", value)}>
        <SelectTrigger className="w-20">
          <SelectValue placeholder="Size" />
        </SelectTrigger>
        <SelectContent>
          {["1", "2", "3", "4", "5", "6", "7"].map((size) => (
            <SelectItem key={size} value={size}>
              {size}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
 

      <Button
        variant="outline"
        size="icon"
        onClick={() => exec("bold")}
        title="Bold"
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={() => exec("italic")}
        title="Italic"
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={() => exec("underline")}
        title="Underline"
      >
        <Underline className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={() => exec("hiliteColor", "yellow")}
        title="Highlight"
      >
        <Highlighter className="h-4 w-4" />
      </Button>
 

      <div className="flex gap-1">
        <Button
          variant="outline"
          size="icon"
          onClick={() => exec("justifyLeft")}
          title="Align Left"
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => exec("justifyCenter")}
          title="Align Center"
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => exec("justifyRight")}
          title="Align Right"
        >
          <AlignRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => exec("justifyFull")}
          title="Justify"
        >
          <AlignJustify className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
 
export default RichTextToolbar;