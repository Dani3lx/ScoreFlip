"use client";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import { useState, useCallback, useRef } from "react";

const PDFViewer = dynamic(() => import("@/components/PDFViewer"), {
  ssr: false,
});
const BlinkDetector = dynamic(() => import("@/components/BlinkDetector"), {
  ssr: false,
});

export default function ScoreDisplay({ file, onResetFile }: { file: string | null, onResetFile: (file: string) => void }) {
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
          <div className="flex justify-center gap-4 items-center w-screen p-4">
            <Button variant="secondary" className="absolute left-4" onClick={() => onResetFile(file)}>Change File</Button>
            <div className="flex gap-4 items-center justify-center">
              <Button onClick={prevPage} disabled={pageNumber === 1}>Back</Button>
              <span>
                {pageNumber} / {numPages}
              </span>
              <Button onClick={nextPage} disabled={pageNumber === numPages}>Next</Button>
            </div>

            <BlinkDetector
              onDoubleBlink={nextPage}
              className="hidden sm:block absolute right-4"
            />
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
