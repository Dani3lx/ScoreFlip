"use client";
import { useState, useCallback } from "react";
import ScoreDisplay from "@/components/ScoreDisplay";
import { FileUpload } from "@/components/reui/fileUpload";
import { FileWithPreview } from "@/hooks/use-file-upload";
import { Button } from "@/components/ui/button";

export default function Home() {
    const [file, setFile] = useState<string | null>(null);
    const [ready, setReady] = useState<boolean>(false);
    const uploadFile = useCallback((files: FileWithPreview[]) => {
        if (!files.length) return;

        const f = files[0].file;
        if (!(f instanceof File)) return;

        const newUrl = URL.createObjectURL(f);

        queueMicrotask(() => {
            setFile((prev) => {
                if (prev) {
                    URL.revokeObjectURL(prev);
                }

                return newUrl;
            });
        });
    }, []);

    const clearFile = useCallback((file?: string) => {
        if (file) {
            URL.revokeObjectURL(file);
        }
        setFile(null);
        setReady(false);
    }, []);

    return (
        <>
            <div className="flex flex-col w-full h-screen items-center justify-center gap-4 min-w-100 p-4">
                {!ready && (
                    <div className="flex flex-col justify-center items-center text-center gap-4 mb-8">
                        <h1 className="font-bold text-3xl">Score Flip</h1>
                        <p className="text-gray-500">Upload a document and use eye-blink gestures to navigate</p>
                    </div>
                )}
                {!ready && <FileUpload onFilesChange={uploadFile} onFileRemove={clearFile} />}
                {file && !ready && (
                    <Button size="lg" variant={"outline"} onClick={() => setReady(true)}>
                        Continue
                    </Button>
                )}
                {file && ready && <ScoreDisplay file={file} onResetFile={clearFile} />}
            </div>
        </>
    );
}
