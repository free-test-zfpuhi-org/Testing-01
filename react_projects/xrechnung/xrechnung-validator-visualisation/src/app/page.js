"use client";

import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { GridBackground } from "@/components/gridbackground";
import { FileUpload } from "@/components/ui/file-upload"; // Assuming you have this custom component

const HomePage = () => {
  const [file, setFile] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [error, setError] = useState("");

  // Reference to the file input element in the FileUpload component
  const fileUploadRef = useRef(null);

  // Handles the file selection in the new FileUpload component
  const handleFileUpload = (files) => {
    if (files && files[0]) {
      const selectedFile = files[0];

      // Check if the selected file is an XML file
      if (selectedFile.name.endsWith(".xml")) {
        setFile(selectedFile);
        setValidationResult(null);
        setError("");
      } else {
        setError("Please upload a valid XML file.");
      }
    }
  };

  // Handle file upload process
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

  // Clear the results, reset the file, and clear the file input
  const handleClear = () => {
    setFile(null);
    setValidationResult(null);
    setError("");

    // Reset the file input using ref
    if (fileUploadRef.current) {
      fileUploadRef.current.value = null; // Clear the file input manually
    }
  };

  return (
    <div className="relative min-h-screen">
      <GridBackground />
      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen p-6">
        <div className="w-full max-w-md p-6 bg-white rounded shadow-md">
          <h1 className="text-2xl font-bold text-center mb-6">XML Validator</h1>
          <div className="flex flex-col gap-4">
            {/* File upload with styling and XML validation */}
            <div className="w-full max-w-4xl mx-auto min-h-96 border border-dashed bg-white dark:bg-black border-neutral-200 dark:border-neutral-800 rounded-lg">
              <FileUpload
                onChange={handleFileUpload}
                accept=".xml" // Enforces only XML file selection
                multiple={false} // Ensures only one file can be uploaded
                ref={fileUploadRef} // Attach ref to the FileUpload component
              />
            </div>
            <Button onClick={handleUpload}>Validate File</Button>
            {/* Clear Results Button */}
            <Button variant="secondary" onClick={handleClear}>
              Clear Results
            </Button>
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
