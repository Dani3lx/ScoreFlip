"use client";
import { useState } from "react";
import ScoreDisplay from "@/features/ScoreDisplay";

export default function Home() {
    const [file, setFile] = useState<string | null>(null);

    return (
        <>
            <input
                type="file"
                accept=".pdf"
                onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setFile(URL.createObjectURL(f));
                }}
            />
            <ScoreDisplay file={file} />
        </>
    );
}
