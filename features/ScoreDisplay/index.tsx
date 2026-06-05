"use client";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import { useState, useCallback, useRef } from "react";

const PDFViewer = dynamic(() => import("@/components/PDFViewer"), { ssr: false });
const BlinkDetector = dynamic(() => import("@/components/BlinkDetector"), { ssr: false });

export default function ScoreDisplay({ file }: { file: string | null }) {
    const [pageNumber, setPageNumber] = useState(1);
    const [numPages, setNumPages] = useState(0);
    const numPagesRef = useRef(0);

    const nextPage = useCallback(() => {
        setPageNumber((p) => Math.min(p + 1, numPagesRef.current));
    }, []);

    const prevPage = useCallback(() => {
        setPageNumber((p) => Math.max(p - 1, 1));
    }, []);

    return (
        <>
            {file && (
                <div className="flex flex-col items-center max-sm:justify-between h-screen">
                    <div className="flex justify-center gap-4 items-center w-full p-4">
                        <Button onClick={prevPage}>Prev</Button>
                        <span>
                            {pageNumber} / {numPages}
                        </span>
                        <Button onClick={nextPage}>Next</Button>
                        <BlinkDetector onDoubleBlink={nextPage} className="hidden sm:block" />
                    </div>

                    <PDFViewer
                        file={file}
                        pageNumber={pageNumber}
                        setNumPages={(n) => {
                            numPagesRef.current = n;
                            setNumPages(n);
                        }}
                    />

                    <BlinkDetector onDoubleBlink={nextPage} className="sm:hidden p-4" />
                </div>
            )}
        </>
    );
}
