"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Edit3, Check } from "lucide-react"

interface PerformanceMetric {
  id: string
  metricName: string
  subjectValue: string
  predicateValue: string
  difference: string
  evaluation: string
  confidence: "High" | "Medium" | "Low"
  justification?: string
}

interface PredicateDevice {
  id: string
  deviceName: string
  kNumber: string
  manufacturer: string
  clearanceDate: string
  indication: string
  classification: string
}

export default function SubstantialEquivalenceSection() {
  const [showAddMetricModal, setShowAddMetricModal] = useState(false)
  const [showJustificationModal, setShowJustificationModal] = useState(false)
  const [selectedMetric, setSelectedMetric] = useState<PerformanceMetric | null>(null)
  const [editingPredicate, setEditingPredicate] = useState<string | null>(null)
  const [justificationText, setJustificationText] = useState("")
  const [autoSaved, setAutoSaved] = useState(false)

  const [newMetric, setNewMetric] = useState({
    metricName: "",
    subjectValue: "",
    predicateValue: "",
  })

  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>([
    {
      id: "1",
      metricName: "Sensitivity",
      subjectValue: "95.2%",
      predicateValue: "94.8%",
      difference: "+0.4%",
      evaluation: "Superior",
      confidence: "High",
    },
    {
      id: "2",
      metricName: "Specificity",
      subjectValue: "98.1%",
      predicateValue: "97.9%",
      difference: "+0.2%",
      evaluation: "Equivalent",
      confidence: "High",
    },
    {
      id: "3",
      metricName: "Precision (CV%)",
      subjectValue: "2.1%",
      predicateValue: "2.8%",
      difference: "-0.7%",
      evaluation: "Superior",
      confidence: "Medium",
    },
    {
      id: "4",
      metricName: "Sample Volume",
      subjectValue: "10 μL",
      predicateValue: "15 μL",
      difference: "-5 μL",
      evaluation: "Superior",
      confidence: "High",
    },
  ])

  const [predicateDevices, setPredicateDevices] = useState<PredicateDevice[]>([
    {
      id: "1",
      deviceName: "ACME Glucose Test System",
      kNumber: "K123456",
      manufacturer: "ACME Diagnostics Inc.",
      clearanceDate: "2023-08-15",
      indication: "Quantitative glucose measurement",
      classification: "Class II",
    },
    {
      id: "2",
      deviceName: "BioTest Immunoassay Platform",
      kNumber: "K234567",
      manufacturer: "BioTest Corporation",
      clearanceDate: "2023-07-22",
      indication: "Multi-analyte immunoassay",
      classification: "Class II",
    },
  ])

  const handleAddMetric = () => {
    if (newMetric.metricName && newMetric.subjectValue && newMetric.predicateValue) {
      const difference = calculateDifference(newMetric.subjectValue, newMetric.predicateValue)
      const evaluation = determineEvaluation(difference)

      const metric: PerformanceMetric = {
        id: Date.now().toString(),
        metricName: newMetric.metricName,
        subjectValue: newMetric.subjectValue,
        predicateValue: newMetric.predicateValue,
        difference,
        evaluation,
        confidence: "Medium",
      }

      setPerformanceMetrics([...performanceMetrics, metric])
      setNewMetric({ metricName: "", subjectValue: "", predicateValue: "" })
      setShowAddMetricModal(false)
    }
  }

  const calculateDifference = (subject: string, predicate: string): string => {
    const subjectNum = Number.parseFloat(subject.replace(/[^\d.-]/g, ""))
    const predicateNum = Number.parseFloat(predicate.replace(/[^\d.-]/g, ""))

    if (!isNaN(subjectNum) && !isNaN(predicateNum)) {
      const diff = subjectNum - predicateNum
      const sign = diff >= 0 ? "+" : ""
      return `${sign}${diff.toFixed(1)}${subject.includes("%") ? "%" : subject.includes("μL") ? " μL" : ""}`
    }
    return "N/A"
  }

  const determineEvaluation = (difference: string): string => {
    const num = Number.parseFloat(difference.replace(/[^\d.-]/g, ""))
    if (Math.abs(num) < 0.5) return "Equivalent"
    return num > 0 ? "Superior" : "Inferior"
  }

  const handleEditPredicate = (id: string, field: keyof PredicateDevice, value: string) => {
    setPredicateDevices((devices) =>
      devices.map((device) => (device.id === id ? { ...device, [field]: value } : device)),
    )
  }

  const handleJustifyMetric = (metric: PerformanceMetric) => {
    setSelectedMetric(metric)
    setJustificationText(metric.justification || "")
    setAutoSaved(false)
    setShowJustificationModal(true)
  }

  const handleSaveJustification = () => {
    if (selectedMetric && justificationText.trim().split(" ").length >= 20) {
      setPerformanceMetrics((metrics) =>
        metrics.map((metric) =>
          metric.id === selectedMetric.id ? { ...metric, justification: justificationText } : metric,
        ),
      )
      setShowJustificationModal(false)
      setSelectedMetric(null)
      setJustificationText("")
    }
  }

  const getGuidanceSuggestion = (metricName: string): string => {
    const suggestions: Record<string, string> = {
      Sensitivity:
        "Reference FDA Guidance on Clinical Performance Studies. Justify any differences >5% with clinical significance data.",
      Specificity:
        "Cite 21 CFR 820.30 for design controls. Document statistical significance of performance differences.",
      Precision:
        "Reference CLSI EP05-A3 guidelines. Lower CV% indicates superior precision - highlight this advantage.",
      "Sample Volume":
        "Reduced sample volume improves patient comfort and reduces collection errors. Cite clinical benefits.",
      default:
        "Reference relevant FDA guidance documents and provide clinical justification for performance differences.",
    }
    return suggestions[metricName] || suggestions.default
  }

  // Simulate auto-save
  const handleJustificationChange = (value: string) => {
    setJustificationText(value)
    setAutoSaved(false)

    // Simulate auto-save after 2 seconds
    setTimeout(() => {
      if (value.trim()) {
        setAutoSaved(true)
      }
    }, 2000)
  }

  const wordCount = justificationText
    .trim()
    .split(" ")
    .filter((word) => word.length > 0).length
  const isValidWordCount = wordCount >= 20

  return (
    <div className="space-y-8">
      {/* Performance Comparison Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-gray-900">Performance Comparison</CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Compare key performance metrics between your device and predicate devices
            </p>
          </div>
          <Dialog open={showAddMetricModal} onOpenChange={setShowAddMetricModal}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-blue-800 hover:bg-blue-900">
                <Plus className="h-4 w-4 mr-2" />
                Add Metric
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Performance Metric</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Metric Name</label>
                  <Input
                    value={newMetric.metricName}
                    onChange={(e) => setNewMetric({ ...newMetric, metricName: e.target.value })}
                    placeholder="e.g., Sensitivity, Specificity"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Subject Device Value</label>
                  <Input
                    value={newMetric.subjectValue}
                    onChange={(e) => setNewMetric({ ...newMetric, subjectValue: e.target.value })}
                    placeholder="e.g., 95.2%"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Predicate Device Value</label>
                  <Input
                    value={newMetric.predicateValue}
                    onChange={(e) => setNewMetric({ ...newMetric, predicateValue: e.target.value })}
                    placeholder="e.g., 94.8%"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setShowAddMetricModal(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddMetric} className="bg-blue-800 hover:bg-blue-900">
                    Add Metric
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Performance Metric</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Subject Device</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Predicate Device</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Difference</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Evaluation</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Confidence</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {performanceMetrics.map((metric, index) => (
                  <tr key={metric.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{metric.metricName}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{metric.subjectValue}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{metric.predicateValue}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{metric.difference}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          metric.evaluation === "Superior"
                            ? "default"
                            : metric.evaluation === "Equivalent"
                              ? "secondary"
                              : "destructive"
                        }
                        className={
                          metric.evaluation === "Superior"
                            ? "bg-green-100 text-green-800 hover:bg-green-100"
                            : metric.evaluation === "Equivalent"
                              ? "bg-blue-100 text-blue-800 hover:bg-blue-100"
                              : "bg-red-100 text-red-800 hover:bg-red-100"
                        }
                      >
                        {metric.evaluation}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={
                          metric.confidence === "High"
                            ? "border-green-300 text-green-700"
                            : metric.confidence === "Medium"
                              ? "border-yellow-300 text-yellow-700"
                              : "border-red-300 text-red-700"
                        }
                      >
                        {metric.confidence}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleJustifyMetric(metric)}
                        className="text-xs"
                      >
                        Justify
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Predicate Devices Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">Predicate Devices</CardTitle>
          <p className="text-sm text-gray-600">FDA-cleared devices used as comparison for substantial equivalence</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Device Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">K-Number</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Manufacturer</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Clearance Date</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Indication</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Classification</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {predicateDevices.map((device, index) => (
                  <tr key={device.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-4 py-3">
                      {editingPredicate === `${device.id}-deviceName` ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={device.deviceName}
                            onChange={(e) => handleEditPredicate(device.id, "deviceName", e.target.value)}
                            className="border-0 p-0 h-auto focus-visible:ring-0 text-sm"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingPredicate(null)}
                            className="h-6 w-6 p-0"
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">{device.deviceName}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingPredicate(`${device.id}-deviceName`)}
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{device.kNumber}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{device.manufacturer}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{device.clearanceDate}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{device.indication}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs">
                        {device.classification}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="ghost" className="text-xs text-gray-500">
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Substantial Equivalence Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">Substantial Equivalence Summary</CardTitle>
          <p className="text-sm text-gray-600">Overall assessment of substantial equivalence to predicate devices</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="text-sm font-medium text-green-800">Equivalent Metrics</div>
                <div className="text-2xl font-bold text-green-900">
                  {performanceMetrics.filter((m) => m.evaluation === "Equivalent").length}
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-sm font-medium text-blue-800">Superior Metrics</div>
                <div className="text-2xl font-bold text-blue-900">
                  {performanceMetrics.filter((m) => m.evaluation === "Superior").length}
                </div>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-800">Total Metrics</div>
                <div className="text-2xl font-bold text-gray-900">{performanceMetrics.length}</div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Equivalence Assessment</h4>
              <p className="text-sm text-blue-800">
                Based on the performance comparison, the subject device demonstrates substantial equivalence to the
                predicate devices with {performanceMetrics.filter((m) => m.evaluation === "Superior").length} superior
                metrics and {performanceMetrics.filter((m) => m.evaluation === "Equivalent").length} equivalent metrics.
                All performance differences are within acceptable clinical ranges.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metric Justification Modal */}
      <Dialog open={showJustificationModal} onOpenChange={setShowJustificationModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-gray-900">Performance Metric Justification</DialogTitle>
          </DialogHeader>

          {selectedMetric && (
            <div className="space-y-6 pt-4">
              {/* Summary Card */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-gray-700">Metric Name</div>
                    <div className="text-base font-semibold text-gray-900">{selectedMetric.metricName}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-700">Calculated Difference</div>
                    <div className="text-base font-semibold text-gray-900">
                      {selectedMetric.difference}
                      <span className="ml-2 text-sm">
                        (
                        {Number.parseFloat(selectedMetric.difference.replace(/[^\d.-]/g, "")) >= 0
                          ? "Subject Superior"
                          : "Predicate Superior"}
                        )
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-700">Subject Device Value</div>
                    <div className="text-base font-semibold text-gray-900">{selectedMetric.subjectValue}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-700">Predicate Device Value</div>
                    <div className="text-base font-semibold text-gray-900">{selectedMetric.predicateValue}</div>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Badge
                    variant={
                      selectedMetric.evaluation === "Superior"
                        ? "default"
                        : selectedMetric.evaluation === "Equivalent"
                          ? "secondary"
                          : "destructive"
                    }
                    className={
                      selectedMetric.evaluation === "Superior"
                        ? "bg-green-100 text-green-800 hover:bg-green-100"
                        : selectedMetric.evaluation === "Equivalent"
                          ? "bg-blue-100 text-blue-800 hover:bg-blue-100"
                          : "bg-red-100 text-red-800 hover:bg-red-100"
                    }
                  >
                    {selectedMetric.evaluation}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={
                      selectedMetric.confidence === "High"
                        ? "border-green-300 text-green-700"
                        : selectedMetric.confidence === "Medium"
                          ? "border-yellow-300 text-yellow-700"
                          : "border-red-300 text-red-700"
                    }
                  >
                    {selectedMetric.confidence} Confidence
                  </Badge>
                </div>
              </div>

              {/* Regulatory Justification */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">Regulatory Justification</label>
                  {autoSaved && (
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      Saved ✓
                    </span>
                  )}
                </div>
                <Textarea
                  value={justificationText}
                  onChange={(e) => handleJustificationChange(e.target.value)}
                  placeholder="Provide regulatory justification for this performance metric difference. Include references to FDA guidance documents, clinical significance, and statistical analysis..."
                  className="min-h-[120px] resize-none"
                  rows={6}
                />
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>
                    {wordCount} words (minimum 20 required)
                    {!isValidWordCount && wordCount > 0 && (
                      <span className="text-red-500 ml-1">- Need {20 - wordCount} more words</span>
                    )}
                  </span>
                  {isValidWordCount && <span className="text-green-600">✓ Word count met</span>}
                </div>
              </div>

              {/* Guidance Suggestion */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <span className="text-blue-600 text-sm">💡</span>
                  <div>
                    <div className="text-sm font-medium text-blue-900 mb-1">Guidance Suggestion</div>
                    <p className="text-sm text-blue-800">{getGuidanceSuggestion(selectedMetric.metricName)}</p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-between pt-4 border-t border-gray-200">
                <Button variant="outline" onClick={() => setShowJustificationModal(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveJustification}
                  disabled={!isValidWordCount}
                  className="bg-black hover:bg-gray-800 text-white"
                >
                  Save & Use Justification
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
