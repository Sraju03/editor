"use client"

import { useState } from "react"
import {
  BrainIcon,
  RefreshCwIcon,
  UploadIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CheckIcon,
  XIcon,
  SettingsIcon,
  InfoIcon,
  EditIcon,
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

interface RTAItem {
  id: string
  name: string
  status: "passed" | "failed"
  description: string
  suggestion: string
}

interface DeviceDetails {
  name: string
  deviceClass: string
  intendedUse: string
  mechanism: string
}

export default function ExecutiveSummarySection() {
  const [summary, setSummary] = useState(
    "The ACME Glucose Monitor Pro is a Class II in vitro diagnostic device intended for the quantitative detection of glucose in human whole blood specimens. The device utilizes electrochemical biosensor technology and provides accurate glucose measurements for diabetes management. The device is substantially equivalent to the predicate device OneTouch Ultra (K012345) with similar intended use, technological characteristics, and performance specifications. The device is intended for use by trained healthcare professionals in clinical laboratory settings and point-of-care environments.",
  )

  const [showRTAPanel, setShowRTAPanel] = useState(true)
  const [showDeviceModal, setShowDeviceModal] = useState(false)
  const [expandedRTA, setExpandedRTA] = useState<string | null>(null)

  const [deviceDetails, setDeviceDetails] = useState<DeviceDetails>({
    name: "ACME Glucose Monitor Pro",
    deviceClass: "Class II",
    intendedUse: "Quantitative measurement of glucose in human whole blood specimens",
    mechanism: "Electrochemical biosensor technology",
  })

  const [rtaItems, setRtaItems] = useState<RTAItem[]>([
    {
      id: "device-overview",
      name: "Device Overview",
      status: "passed",
      description: "Clear description of device type and function",
      suggestion: "",
    },
    {
      id: "intended-use",
      name: "Intended Use",
      status: "passed",
      description: "Specific intended use statement included",
      suggestion: "",
    },
    {
      id: "predicate-comparison",
      name: "Predicate Comparison",
      status: "failed",
      description: "Missing detailed comparison with predicate device substantial equivalence rationale",
      suggestion:
        "Add: 'The device demonstrates substantial equivalence through identical intended use, similar technological characteristics including electrochemical detection method, and comparable performance specifications for accuracy and precision as established in predicate device K012345.'",
    },
    {
      id: "user-environment",
      name: "User Environment",
      status: "failed",
      description: "Insufficient description of clinical settings and user qualifications",
      suggestion:
        "Add: 'The device is designed for use in CLIA-waived environments, clinical laboratories, and point-of-care settings by trained healthcare professionals with appropriate quality control procedures.'",
    },
  ])

  const lastUpdated = "January 15, 2024 at 2:30 PM"
  const confidence = "High"

  const handleGenerateAI = () => {
    // Simulate AI generation
    console.log("Generating with AI...")
  }

  const handleRegenerate = () => {
    // Simulate regeneration
    console.log("Regenerating...")
  }

  const handleUpload = () => {
    // Simulate file upload
    console.log("Uploading existing summary...")
  }

  const handleFixWithAI = (itemId: string) => {
    const item = rtaItems.find((rta) => rta.id === itemId)
    if (item && item.suggestion) {
      setSummary(summary + " " + item.suggestion)
      setRtaItems(rtaItems.map((rta) => (rta.id === itemId ? { ...rta, status: "passed" as const } : rta)))
    }
  }

  const handleSaveDeviceDetails = () => {
    setShowDeviceModal(false)
    // Regenerate summary based on new details
    console.log("Device details updated:", deviceDetails)
  }

  const isComplete = rtaItems.every((item) => item.status === "passed") && summary.length > 100

  const passedCount = rtaItems.filter((item) => item.status === "passed").length
  const totalCount = rtaItems.length

  return (
    <TooltipProvider>
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold text-gray-900">Executive Summary</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Action Buttons */}
          <div className="flex gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={handleGenerateAI} variant="outline" className="flex-1 bg-transparent">
                  <BrainIcon className="mr-2 h-4 w-4" />
                  Generate with AI
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Generate executive summary using AI based on device details</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={handleRegenerate} variant="outline" className="flex-1 bg-transparent">
                  <RefreshCwIcon className="mr-2 h-4 w-4" />
                  Regenerate
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Regenerate summary with updated device information</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={handleUpload} variant="outline" className="flex-1 bg-transparent">
                  <UploadIcon className="mr-2 h-4 w-4" />
                  Upload Existing Summary
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Upload an existing executive summary document</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Executive Summary Text */}
          <div className="space-y-3">
            <Textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="min-h-[200px] resize-none border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Executive summary will appear here..."
            />

            {/* Metadata Bar */}
            <div className="flex items-center gap-4 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded border">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  AI-generated
                </Badge>
                <span>•</span>
                <span>Last updated: {lastUpdated}</span>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <span>Confidence:</span>
                  <Badge
                    variant="outline"
                    className={
                      confidence === "High"
                        ? "bg-green-50 text-green-700 border-green-200"
                        : confidence === "Medium"
                          ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                          : "bg-red-50 text-red-700 border-red-200"
                    }
                  >
                    {confidence}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* FDA RTA Checklist */}
          <div className="border-t border-gray-200 pt-6">
            <Collapsible open={showRTAPanel} onOpenChange={setShowRTAPanel}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-medium text-gray-900">FDA RTA Checklist</h3>
                    <Badge
                      variant="outline"
                      className={
                        passedCount === totalCount
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-yellow-50 text-yellow-700 border-yellow-200"
                      }
                    >
                      {passedCount} of {totalCount} passed
                    </Badge>
                  </div>
                  {showRTAPanel ? (
                    <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                  )}
                </Button>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="mt-4 space-y-3">
                  {rtaItems.map((item) => (
                    <div key={item.id} className="border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                          {item.status === "passed" ? (
                            <CheckIcon className="h-5 w-5 text-green-600" />
                          ) : (
                            <XIcon className="h-5 w-5 text-red-600" />
                          )}
                          <span className="font-medium text-gray-900">{item.name}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {item.status === "failed" && (
                            <Button size="sm" onClick={() => handleFixWithAI(item.id)} variant="outline">
                              <SettingsIcon className="mr-1 h-3 w-3" />
                              Fix with AI
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setExpandedRTA(expandedRTA === item.id ? null : item.id)}
                          >
                            <InfoIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {expandedRTA === item.id && (
                        <div className="border-t border-gray-200 p-4 bg-gray-50">
                          <div className="space-y-3">
                            <div>
                              <Label className="text-sm font-medium text-gray-700">What's missing:</Label>
                              <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                            </div>
                            {item.status === "failed" && item.suggestion && (
                              <div>
                                <Label className="text-sm font-medium text-gray-700">AI suggestion:</Label>
                                <div className="mt-1 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                                  {item.suggestion}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Bottom Actions */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <Button onClick={() => setShowDeviceModal(true)} variant="outline">
              <EditIcon className="mr-2 h-4 w-4" />
              Edit Device Details
            </Button>

            <Button className="bg-blue-600 hover:bg-blue-700" disabled={!isComplete}>
              <CheckIcon className="mr-2 h-4 w-4" />
              Mark Section Complete
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Device Details Modal */}
      <Dialog open={showDeviceModal} onOpenChange={setShowDeviceModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Device Details</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="device-name" className="text-sm font-medium text-gray-700">
                  Device Name
                </Label>
                <Input
                  id="device-name"
                  value={deviceDetails.name}
                  onChange={(e) => setDeviceDetails({ ...deviceDetails, name: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="device-class" className="text-sm font-medium text-gray-700">
                  Device Class
                </Label>
                <Select
                  value={deviceDetails.deviceClass}
                  onValueChange={(value) => setDeviceDetails({ ...deviceDetails, deviceClass: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Class I">Class I</SelectItem>
                    <SelectItem value="Class II">Class II</SelectItem>
                    <SelectItem value="Class III">Class III</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="intended-use" className="text-sm font-medium text-gray-700">
                  Intended Use
                </Label>
                <Textarea
                  id="intended-use"
                  value={deviceDetails.intendedUse}
                  onChange={(e) => setDeviceDetails({ ...deviceDetails, intendedUse: e.target.value })}
                  className="mt-1 min-h-[80px]"
                />
              </div>

              <div>
                <Label htmlFor="mechanism" className="text-sm font-medium text-gray-700">
                  Mechanism of Action
                </Label>
                <Input
                  id="mechanism"
                  value={deviceDetails.mechanism}
                  onChange={(e) => setDeviceDetails({ ...deviceDetails, mechanism: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
            <Button variant="outline" onClick={() => setShowDeviceModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveDeviceDetails}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
