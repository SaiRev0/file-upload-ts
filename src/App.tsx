import { useState, useCallback } from "react";
import { FilePreview } from "./components/FilePreview";
import axios from "axios";
const cloud_name = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string;

type UploadedFile = {
  url: string;
  resource_type: string;
  uploadTime?: number;
  videoId?: string;
  playbackUrl?: string;
  loadTime?: string | null;
};

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploadedFilesGCP, setUploadedFilesGCP] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [showCloudinaryFiles, setShowCloudinaryFiles] =
    useState<boolean>(false);
  const [showGCPFiles, setShowGCPFiles] = useState<boolean>(false);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        setFiles((prevFiles) => [
          ...prevFiles,
          ...Array.from(e.target.files || []),
        ]);
      }
    },
    []
  );

  const handleRemoveFile = useCallback((index: number) => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  }, []);

  const handleSubmitToCloudinary = async () => {
    if (files.length === 0) return;
    setIsUploading(true);
    setShowCloudinaryFiles(false);
    setShowGCPFiles(false);

    const uploadPromises = files.map(async (file) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "testing");
      const startTime = Date.now();

      try {
        const response = await axios.post(
          `https://api.cloudinary.com/v1_1/${cloud_name}/auto/upload`,
          formData
        );
        const endTime = Date.now();
        if (response.status === 200) {
          const uploadTime = (endTime - startTime) / 1000;
          setUploadedFiles((prevFiles) => [
            ...prevFiles,
            {
              url: response.data.url,
              resource_type: response.data.resource_type,
              uploadTime,
            },
          ]);
        } else {
          alert("Upload failed");
        }
      } catch (error) {
        console.error("Error:", error);
        alert("Upload failed");
      }
    });

    await Promise.all(uploadPromises);
    setIsUploading(false);
    setFiles([]);
  };

  const handleSubmitToGCP = async () => {
    if (files.length === 0) return;
    setIsUploading(true);
    setShowCloudinaryFiles(false);
    setShowGCPFiles(false);

    const uploadPromises = files.map(async (file) => {
      const formData = new FormData();
      const startTime = Date.now();

      try {
        if (file.type.startsWith("image/")) {
          formData.append("image", file);
          const response = await axios.post(
            `http://localhost:8000/v1/storage/upload-image`,
            formData
          );
          const endTime = Date.now();
          if (response.status === 201) {
            const uploadTime = (endTime - startTime) / 1000;
            setUploadedFilesGCP((prevFiles) => [
              ...prevFiles,
              {
                url: response.data.imageUrl,
                resource_type: "image",
                uploadTime,
              },
            ]);
          } else {
            alert("Upload failed");
          }
        } else if (file.type.startsWith("video/")) {
          formData.append("video", file);
          const { data, status } = await axios.post(
            `http://localhost:8000/v1/storage/upload-video`,
            formData
          );
          const endTime = Date.now();
          if (status === 201) {
            const uploadTime = (endTime - startTime) / 1000;
            setUploadedFilesGCP((prevFiles) => [
              ...prevFiles,
              {
                videoId: data.videoId,
                url: data.playbackUrl,
                resource_type: "video",
                uploadTime,
              },
            ]);
          } else {
            alert("Upload failed");
          }
        } else {
          alert("Invalid file type");
        }
      } catch (error) {
        console.error("Error:", error);
        alert("Upload failed");
      }
    });

    await Promise.all(uploadPromises);
    setIsUploading(false);
    setFiles([]);
  };

  const handleMeasureLoadTime = async (
    file: UploadedFile
  ): Promise<string | null> => {
    return new Promise((resolve) => {
      const startTime = performance.now();
      if (file.resource_type === "image") {
        const img = new Image();
        img.src = file.url;
        img.onload = () => {
          const endTime = performance.now();
          resolve(((endTime - startTime) / 1000).toFixed(2));
        };
        img.onerror = () => resolve(null);
      } else if (file.resource_type === "video") {
        const video = document.createElement("video");
        video.src = file.url;
        video.onloadeddata = () => {
          const endTime = performance.now();
          resolve(((endTime - startTime) / 1000).toFixed(2));
        };
        video.onerror = () => resolve(null);
      } else {
        resolve(null);
      }
    });
  };

  const handleShowFilesWithLoadTime = async (files: UploadedFile[]) => {
    const measuredFiles = await Promise.all(
      files.map(async (file) => {
        const loadTime = await handleMeasureLoadTime(file);
        return { ...file, loadTime };
      })
    );
    return measuredFiles;
  };

  const handleShowCloudinaryFiles = async () => {
    const filesWithLoadTime = await handleShowFilesWithLoadTime(uploadedFiles);
    setUploadedFiles(filesWithLoadTime);
    setShowCloudinaryFiles(!showCloudinaryFiles);
  };

  const handleShowGCPFiles = async () => {
    const filesWithLoadTime = await handleShowFilesWithLoadTime(
      uploadedFilesGCP
    );
    setUploadedFilesGCP(filesWithLoadTime);
    setShowGCPFiles(!showGCPFiles);
  };

  return (
    <main className="container mx-auto p-8 bg-gray-100 min-h-screen">
      <h1 className="text-4xl font-bold mb-8 text-center text-gray-800">
        File Manager
      </h1>
      <div className="bg-white rounded-lg shadow-lg p-6">
        {/* Upload handler */}
        <div className="mb-12">
          <form className="mb-6">
            <div className="flex items-center justify-center w-full">
              <label
                htmlFor="dropzone-file"
                className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
              >
                <input
                  id="dropzone-file"
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                  multiple
                  accept="image/*,video/*" // Allow both images and videos
                />
              </label>
            </div>
            <button
              type="button"
              className="mt-4 w-full bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition duration-300 flex items-center justify-center"
              disabled={files.length === 0 || isUploading}
              onClick={handleSubmitToCloudinary}
            >
              {isUploading ? "Uploading..." : "Upload Files to Cloudinary"}
            </button>
            <button
              type="button"
              className="mt-4 w-full bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition duration-300 flex items-center justify-center"
              disabled={files.length === 0 || isUploading}
              onClick={handleSubmitToGCP}
            >
              {isUploading ? "Uploading..." : "Upload Files to GCP"}
            </button>
          </form>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {files.map((file, index) => (
              <FilePreview
                key={index}
                file={file}
                onRemove={() => handleRemoveFile(index)}
              />
            ))}
          </div>
        </div>
        {/* File list in Cloudinary */}
        <div>
          <h2 className="text-2xl font-semibold mb-6 text-gray-800">
            Files in Cloudinary
          </h2>
          <button
            className="mb-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition duration-300"
            onClick={() => handleShowCloudinaryFiles()}
          >
            Show Files
          </button>
          {showCloudinaryFiles && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {uploadedFiles.map((file, index) => (
                <div
                  key={index}
                  className="bg-white rounded-lg shadow-md overflow-hidden"
                >
                  <div className="aspect-square bg-gray-200 flex items-center justify-center">
                    {file.resource_type === "image" ? (
                      <img
                        src={file.url}
                        className="w-full h-full object-cover"
                      />
                    ) : file.resource_type === "video" ? (
                      <video
                        loop={true}
                        autoPlay
                        controls
                        muted={true}
                        className="w-full h-full object-cover"
                      >
                        <source src={file.url} />
                        Your browser does not support the video tag.
                      </video>
                    ) : (
                      <svg
                        className="w-16 h-16 text-gray-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-gray-600">
                      Load Time:{" "}
                      {file.loadTime ? `${file.loadTime} seconds` : "N/A"}
                    </p>
                    <p className="text-sm text-gray-600">
                      Upload Time: {file.uploadTime} seconds
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* File list in GCP */}
        <div>
          <h2 className="text-2xl font-semibold mb-6 text-gray-800">
            Files in GCP
          </h2>
          <button
            className="mb-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition duration-300"
            onClick={() => handleShowGCPFiles()}
          >
            Show Files
          </button>
          {showGCPFiles && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {uploadedFilesGCP.map((file, index) => (
                <div
                  key={index}
                  className="bg-white rounded-lg shadow-md overflow-hidden"
                >
                  <div className="aspect-square bg-gray-200 flex items-center justify-center">
                    {file.resource_type === "image" ? (
                      <img
                        src={file.url}
                        className="w-full h-full object-cover"
                      />
                    ) : file.resource_type === "video" ? (
                      <div className="relative w-ful rounded-lg overflow-hidden">
                        <iframe
                          src={`https://customer-2n06osd9scxq0n66.cloudflarestream.com/${file.videoId}/iframe`}
                          title="Example Stream video"
                          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="w-full h-full"
                        />
                      </div>
                    ) : (
                      <svg
                        className="w-16 h-16 text-gray-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-gray-600">
                      Load Time:{" "}
                      {file.loadTime ? `${file.loadTime} seconds` : "N/A"}
                    </p>
                    <p className="text-sm text-gray-600">
                      Upload Time: {file.uploadTime} seconds
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
