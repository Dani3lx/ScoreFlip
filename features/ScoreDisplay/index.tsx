"use client";
import dynamic from "next/dynamic";
import { useState, useCallback, useRef } from "react";

const PDFViewer = dynamic(() => import("@/components/PDFViewer"), { ssr: false });
const BlinkDetector = dynamic(() => import("@/components/BlinkDetector"), { ssr: false });

export default function ScoreDisplay({ file }: { file: string | null }) {
    const [pageNumber, setPageNumber] = useState(1);
    const [numPages, setNumPages] = useState(0);
    const numPagesRef = useRef(0);

    const lastTurn = useRef(0);

    const nextPage = useCallback(() => {
        const now = Date.now();
        if (now - lastTurn.current < 1200) return;
        lastTurn.current = now;
        setPageNumber((p) => Math.min(p + 1, numPagesRef.current));
    }, []);

    return (
        <div>
            {file && (
                <>
                    <PDFViewer
                        file={file}
                        pageNumber={pageNumber}
                        setPageNumber={setPageNumber}
                        numPages={numPages}
                        setNumPages={(n) => {
                            numPagesRef.current = n;
                            setNumPages(n);
                        }}
                    />
                    <BlinkDetector onDoubleBlink={nextPage} />
                </>
            )}
        </div>
    );
}
