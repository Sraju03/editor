
import { CheckIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface GuidanceLink {
  label: string;
  url: string;
}

interface ChecklistItem {
  text: string;
}

interface FDAExpectationsProps {
  title: string;
  description: string;
  checklistItems: ChecklistItem[];
  guidanceLinks: GuidanceLink[];
}

export function FDAExpectations({
  title,
  description,
  checklistItems,
  guidanceLinks,
}: FDAExpectationsProps) {
  return (
    <Card className="bg-gray-50 border-gray-200">
      <CardContent className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{title}</h2>
        <p className="text-sm text-gray-700 mb-4">{description}</p>
        <ul className="list-none space-y-2 text-sm text-gray-700">
          {checklistItems.map((item, index) => (
            <li key={index} className="flex items-start gap-2">
              <CheckIcon className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>{item.text}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex gap-2">
          {guidanceLinks.map((link, index) => (
            <a key={index} href={link.url} target="_blank" rel="noopener noreferrer">
              <Button
                variant="outline"
                size="sm"
                className="text-blue-700 border-blue-300"
              >
                {link.label}
              </Button>
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
