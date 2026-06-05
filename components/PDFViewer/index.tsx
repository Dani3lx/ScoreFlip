"use client";

import { Document, Page } from "react-pdf";
import { useEffect, useState } from "react";
import "@/lib/pdfWorker";

type Props = {
    file: string | null;
    pageNumber: number;
    setNumPages: (n: number) => void;
};

export default function PDFViewer({ file, pageNumber, setNumPages }: Props) {
    const [viewport, setViewport] = useState({
        width: 0,
        height: 0,
    });

    useEffect(() => {
        const updateViewport = () => {
            setViewport({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        };

        updateViewport();

        window.addEventListener("resize", updateViewport);

        return () => {
            window.removeEventListener("resize", updateViewport);
        };
    }, []);

    return (
        <div className="flex items-center justify-center">
            <Document file={file} onLoadSuccess={({ numPages }) => setNumPages(numPages)}>
                <Page
                    pageNumber={pageNumber}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    height={Math.min(viewport.height * 0.9, viewport.width / (8.5 / 11))}
                />
            </Document>
        </div>
    );
}
