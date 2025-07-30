"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Eye, EyeOff, X } from "lucide-react";
import { toast } from "sonner";

export default function AuthPage() {
  const router = useRouter();
  const [currentView, setCurrentView] = useState<
    "main" | "signup" | "google-signin" | "facebook-signin"
  >("main");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleEmailSignup = () => {
    setCurrentView("signup");
  };

  const handleBackToLogin = () => {
    setCurrentView("main");
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      toast.error("Please enter both email and password");
      return;
    }
    // Mock authentication
    try {
      localStorage.setItem("authToken", "mock-token");
      toast.success("Logged in successfully");
      router.push("/MainDashboard");
    } catch (error) {
      toast.error("Login failed. Please try again.");
      console.error(error);
    }
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formData.name ||
      !formData.email ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      toast.error("Please fill all required fields");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    // Mock signup
    try {
      localStorage.setItem("authToken", "mock-token");
      toast.success("Signed up successfully");
      router.push("/MainDashboard");
    } catch (error) {
      toast.error("Signup failed. Please try again.");
      console.error(error);
    }
  };

  const handleContinueAsUser = () => {
    // Mock social login
    try {
      localStorage.setItem("authToken", "mock-token");
      toast.success("Signed in successfully");
      router.push("/MainDashboard");
    } catch (error) {
      toast.error("Social sign-in failed. Please try again.");
      console.error(error);
    }
  };

  const handleBackToMain = () => {
    setCurrentView("main");
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundImage: "url(/login-bg.jpg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-blue-600 mb-2">Fignos</h1>
          <p className="text-gray-600">
            Unlimited free access to our resources
          </p>
        </div>
        <h2 className="text-xl font-semibold mb-6 text-center">Log in</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Label htmlFor="email" className="text-sm text-gray-600">
              Email address
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              className="mt-1 h-12 border-gray-300"
              required
            />
          </div>
          <div>
            <Label htmlFor="password" className="text-sm text-gray-600">
              Password
            </Label>
            <div className="relative mt-1">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                className="h-12 border-gray-300 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
          <div className="text-right">
            <a href="#" className="text-sm text-blue-600 hover:underline">
              Forgot your password?
            </a>
          </div>
          <Button
            type="submit"
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Log in
          </Button>
        </form>
      </div>
    </div>
  );
} 