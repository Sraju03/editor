import { FileText, CheckCircle, Edit, Shield, ExternalLink, Plus } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface DHFDocument {
  id: string;
  name: string;
  type: string;
  dhfTag: string;
  linkedBy: string;
  dateLinked: string;
  sectionUsedIn: string;
  url: string;
}

interface StatusCardsProps {
  authoringProgress: number;
  fieldsCompleted: { completed: number; total: number };
  documentsUploaded: { uploaded: number; total: number };
  fdaReadiness: number;
  setShowDocumentsModal: (show: boolean) => void;
  setShowRTASectionModal: (show: boolean) => void;
  dhfDocuments?: DHFDocument[]; // Optional prop for DHF documents
  getTypeColor?: (type: string) => string; // Optional prop for type color
  onLinkDocument?: () => void; // Optional callback for linking documents
}

export default function StatusCards({
  authoringProgress,
  fieldsCompleted,
  documentsUploaded,
  fdaReadiness,
  setShowDocumentsModal,
  setShowRTASectionModal,
  dhfDocuments = [], // Default to empty array
  getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "pdf":
        return "text-blue-600 border-blue-200 bg-blue-50";
      case "doc":
      case "docx":
        return "text-green-600 border-green-200 bg-green-50";
      default:
        return "text-gray-600 border-gray-200 bg-gray-50";
    }
  },
  onLinkDocument,
}: StatusCardsProps) {
  const [showDocumentsModal, setShowDocumentsModalLocal] = useState(false);

  // Combine external and local modal control
  const handleOpenChange = (open: boolean) => {
    setShowDocumentsModalLocal(open);
    setShowDocumentsModal(open); // Call parent prop to sync state
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Authoring Progress Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 relative">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-gray-600 mb-1">Authoring Progress</div>
              <div className="text-2xl font-bold text-gray-900">{authoringProgress}%</div>
              <div className="text-xs text-gray-500 mt-1">Fields filled in this section</div>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Edit className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Fields Completed Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 relative">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-gray-600 mb-1">Fields Completed</div>
              <div className="text-2xl font-bold text-gray-900">
                {fieldsCompleted.completed} of {fieldsCompleted.total}
              </div>
              <div className="text-xs text-gray-500 mt-1">Required fields done</div>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </div>

        {/* Documents Uploaded Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 relative">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-gray-600 mb-1">Documents Uploaded</div>
              <div className="text-2xl font-bold text-gray-900">
                {documentsUploaded.uploaded} of {documentsUploaded.total}
              </div>
              <div className="text-xs text-gray-500 mt-1">Supportive files added</div>
              <button
                onClick={() => handleOpenChange(true)}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium mt-1"
                aria-label="View DHF documents"
              >
                View Evidence
              </button>
            </div>
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <FileText className="h-5 w-5 text-orange-600" />
            </div>
          </div>
        </div>

        {/* FDA Readiness Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 relative">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-gray-600 mb-1">FDA Readiness</div>
              <div className="text-2xl font-bold text-gray-900">{fdaReadiness}%</div>
              <div className="text-xs text-gray-500 mt-1">RTA checks passed</div>
              <button
                onClick={() => setShowRTASectionModal(true)}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium mt-1"
                aria-label="View section evaluation"
              >
                View Section Evaluation
              </button>
            </div>
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <Shield className="h-5 w-5 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* DHF Documents Modal */}
      <Dialog open={showDocumentsModal} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-gray-900">
              Documents Linked from DHF
            </DialogTitle>
          </DialogHeader>
          <div className="mt-6">
            <div className="overflow-hidden border border-gray-200 rounded-lg">
              <table className="w-full table-fixed">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-[25%] px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Document Name
                    </th>
                    <th className="w-[15%] px-4 py-3 text-left text-sm font-medium text-gray-700">
                      DHF Tag
                    </th>
                    <th className="w-[15%] px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Linked By
                    </th>
                    <th className="w-[12%] px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Date Linked
                    </th>
                    <th className="w-[18%] px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Section Used In
                    </th>
                    <th className="w-[15%] px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {dhfDocuments.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-2">
                          <span className="text-sm font-medium text-gray-900 truncate" title={doc.name}>
                            {doc.name}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-xs w-fit px-2 py-0.5 ${getTypeColor(doc.type)}`}
                          >
                            {doc.type}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-gray-600 font-mono">{doc.dhfTag}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-gray-900 truncate block" title={doc.linkedBy}>
                          {doc.linkedBy}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-gray-600">{doc.dateLinked}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-gray-900 truncate block" title={doc.sectionUsedIn}>
                          {doc.sectionUsedIn}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-blue-600 hover:text-blue-700 text-xs"
                          onClick={() => window.open(doc.url, "_blank")} // Assumes doc.url exists
                        >
                          📄 View Document
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-500">
                {dhfDocuments.length} document{dhfDocuments.length !== 1 ? "s" : ""} linked from DHF
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="gap-2 bg-transparent"
                  onClick={onLinkDocument}
                >
                  <Plus className="h-4 w-4" />
                  Link Document from DHF
                </Button>
                <Button onClick={() => handleOpenChange(false)}>Close</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}