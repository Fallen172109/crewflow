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
    <div className="flex flex-col items-center justify-center h-[40rem] space-y-8">
      <FixedMaintenanceTypewriter onComplete={handleTypingComplete} />

      {showPasswordBox && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm"
        >
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={handlePasswordChange}
              placeholder="Enter password"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent backdrop-blur-sm"
            />
            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-red-400 text-sm text-center"
              >
                {error}
              </motion.p>
            )}
          </form>
        </motion.div>
      )}
    </div>
  );
}
