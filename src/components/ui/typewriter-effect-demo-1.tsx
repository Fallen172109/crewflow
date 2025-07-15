"use client";
import FixedMaintenanceTypewriter from "@/components/ui/FixedMaintenanceTypewriter";
import { useState, useRef } from "react";
import { motion } from "framer-motion";

export default function TypewriterEffectSmoothDemo() {
  const [password, setPassword] = useState("");
  const [showPasswordBox, setShowPasswordBox] = useState(false);

  const [error, setError] = useState("");
  const hasTriggeredPasswordBox = useRef(false);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "CrewFlow2025!") {
      // Redirect to auth/login page
      window.location.href = "/auth/login";
    } else {
      setError("Incorrect password");
      setPassword("");
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    // Clear error when user starts typing
    if (error) {
      setError("");
    }
  };

  const handleTypingComplete = () => {
    // Prevent multiple triggers
    if (hasTriggeredPasswordBox.current) return;
    hasTriggeredPasswordBox.current = true;

    // Show password box after typewriter animation completes
    setTimeout(() => {
      setShowPasswordBox(true);
    }, 1000);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="text-center">
        <FixedMaintenanceTypewriter onComplete={handleTypingComplete} />

        {showPasswordBox && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mt-8"
          >
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <input
                  type="password"
                  value={password}
                  onChange={handlePasswordChange}
                  placeholder="Enter password to continue"
                  className="w-64 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  autoFocus
                />
              </div>
              {error && (
                <p className="text-red-400 text-sm mt-2">{error}</p>
              )}
            </form>
          </motion.div>
        )}
      </div>
    </div>
  );
}
