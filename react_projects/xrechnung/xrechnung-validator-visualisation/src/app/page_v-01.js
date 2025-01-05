"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { GridBackground } from "@/components/gridbackground";

const HomePage = () => {
  const [file, setFile] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [error, setError] = useState("");

  // Handles the file selection
  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile && selectedFile.name.endsWith(".xml")) {
      setFile(selectedFile);
      setValidationResult(null);
      setError("");
    } else {
      setError("Please upload a valid XML file.");
    }
  };

  // Handle file upload
  const handleUpload = async () => {
    if (!file) {
      setError("Please select an XML file to upload.");
      return;
    }

    const reader = new FileReader();

    reader.onload = async () => {
      const xmlContent = reader.result;

      try {
        const response = await fetch("/api/validate", {
          method: "POST",
          headers: {
            "Content-Type": "application/xml",
          },
          body: xmlContent,
        });

        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }

        const result = await response.text();
        setValidationResult(result);
        setError("");
      } catch (err) {
        console.error("Validation error:", err.message);
        setError(err.message || "An error occurred while validating the file.");
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className="relative min-h-screen">
      <GridBackground />
      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen p-6">
        <div className="w-full max-w-md p-6 bg-white rounded shadow-md">
          <h1 className="text-2xl font-bold text-center mb-6">XML Validator</h1>
          <div className="flex flex-col gap-4">
            {/* File input, allowing only XML files to be selected */}
            <input
              type="file"
              accept=".xml" // Ensures only XML files are visible
              onChange={handleFileChange}
              className="file-input file-input-bordered w-full"
            />
            <Button onClick={handleUpload}>Validate File</Button>
            <Button variant="secondary">Secondary</Button>
          </div>
          {error && <p className="text-red-500 mt-4">{error}</p>}
          {validationResult && (
            <div className="mt-6">
              <h2 className="text-lg font-semibold">Validation Result:</h2>
              <pre className="mt-2 p-2 bg-gray-100 border rounded text-sm overflow-auto">
                {validationResult}
              </pre>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default HomePage;
