"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PlusIcon,
  CheckIcon,
  XIcon,
  DatabaseIcon,
  AlertTriangleIcon,
} from "lucide-react";

interface SpecificationRow {
  parameter: string;
  value: string;
  confidence: string;
  source: string;
  status: string;
}

export default function DeviceSpecifications() {
  const [showAddParameter, setShowAddParameter] = useState(false);
  const [newParameter, setNewParameter] = useState({
    parameter: "",
    value: "",
  });

  // Initialize specifications from localStorage or default array
  const [specifications, setSpecifications] = useState<SpecificationRow[]>(() => {
    if (typeof window !== "undefined") {
      const savedSpecs = localStorage.getItem("deviceSpecifications");
      if (savedSpecs) {
        try {
          return JSON.parse(savedSpecs) as SpecificationRow[];
        } catch (error) {
          console.error("Error parsing localStorage specifications:", error);
        }
      }
    }
    return [
    ];
  });

  // Save specifications to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("deviceSpecifications", JSON.stringify(specifications));
      } catch (error) {
        console.error("Error saving specifications to localStorage:", error);
      }
    }
  }, [specifications]);

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case "High":
        return (
          <Badge
            variant="outline"
            className="text-green-700 border-green-300 bg-green-50 text-xs"
          >
            High
          </Badge>
        );
      case "Medium":
        return (
          <Badge
            variant="outline"
            className="text-yellow-700 border-yellow-300 bg-yellow-50 text-xs"
          >
            Medium
          </Badge>
        );
      case "Low":
        return (
          <Badge
            variant="outline"
            className="text-red-700 border-red-300 bg-red-50 text-xs"
          >
            Low
          </Badge>
        );
      default:
        return null;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "complete":
        return <CheckIcon className="h-4 w-4 text-green-600" />;
      case "review":
        return <AlertTriangleIcon className="h-4 w-4 text-yellow-600" />;
      case "missing":
        return <XIcon className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getSpecificationStatus = () => {
    const completeSpecs = specifications.filter(
      (spec) => spec.status === "complete"
    ).length;
    const totalSpecs = specifications.length;
    const missingSpecs = specifications.filter(
      (spec) => spec.status === "missing"
    ).length;

    if (missingSpecs > 0)
      return {
        label: "Needs Input",
        color: "bg-red-100 text-red-800 border-red-200",
      };
    if (completeSpecs === totalSpecs)
      return {
        label: "Complete",
        color: "bg-green-100 text-green-800 border-green-200",
      };
    return {
      label: "In Progress",
      color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    };
  };

  const specStatus = getSpecificationStatus();

  const addParameter = () => {
    if (newParameter.parameter && newParameter.value) {
      setSpecifications([
        ...specifications,
        {
          parameter: newParameter.parameter,
          value: newParameter.value,
          confidence: "Medium",
          source: "User Entry",
          status: "review",
        },
      ]);
      setNewParameter({ parameter: "", value: "" });
      setShowAddParameter(false);
    }
  };

  const updateParameter = (index: number, value: string) => {
    const newSpecs = [...specifications];
    newSpecs[index].value = value;
    newSpecs[index].status = value ? "review" : "missing";
    setSpecifications(newSpecs);
  };

  return (
    <div className="bg-white border rounded-lg shadow">
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Device Specifications</h2>
          <Badge className={specStatus.color}>{specStatus.label}</Badge>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAddParameter(true)}
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            Add Parameter
          </Button>
          <Button size="sm" variant="outline">
            <DatabaseIcon className="mr-2 h-4 w-4" />
            Autofill from Upload
          </Button>
        </div>
      </div>
      <div className="p-4 pt-0">
        <div className="overflow-hidden border border-gray-200 rounded-lg">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  Parameter
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  Value
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  Confidence
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  Source
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {specifications.map((spec, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {spec.parameter}
                  </td>
                  <td className="px-4 py-3">
                    <Input
                      value={spec.value}
                      onChange={(e) => updateParameter(index, e.target.value)}
                      className="border-0 p-0 h-auto focus-visible:ring-0 text-sm bg-transparent"
                      placeholder="Enter value..."
                    />
                  </td>
                  <td className="px-4 py-3">
                    {getConfidenceBadge(spec.confidence)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {spec.source}
                  </td>
                  <td className="px-4 py-3">{getStatusIcon(spec.status)}</td>
                </tr>
              ))}
              {showAddParameter && (
                <tr className="bg-blue-50">
                  <td className="px-4 py-3">
                    <Input
                      value={newParameter.parameter}
                      onChange={(e) =>
                        setNewParameter({
                          ...newParameter,
                          parameter: e.target.value,
                        })
                      }
                      placeholder="Parameter name..."
                      className="text-sm"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Input
                      value={newParameter.value}
                      onChange={(e) =>
                        setNewParameter({
                          ...newParameter,
                          value: e.target.value,
                        })
                      }
                      placeholder="Value..."
                      className="text-sm"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className="text-yellow-700 border-yellow-300 bg-yellow-50 text-xs"
                    >
                      Medium
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    User Entry
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button size="sm" onClick={addParameter}>
                        <CheckIcon className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowAddParameter(false)}
                      >
                        <XIcon className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}