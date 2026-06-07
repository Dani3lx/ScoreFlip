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

    const clearFile = useCallback((file: string) => {
        URL.revokeObjectURL(file);
        setFile(null);
        setReady(false);
    }, []);
    
    return (
        <>
            <div className="flex flex-col w-full h-screen items-center justify-center gap-4 min-w-100 p-4">
                {!ready && <FileUpload onFilesChange={uploadFile} />}
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
