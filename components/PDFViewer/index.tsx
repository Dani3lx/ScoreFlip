"use client";
import { Document, Page } from "react-pdf";
import "@/lib/pdfWorker";

type Props = {
    file: string | null;
    pageNumber: number;
    setPageNumber: (n: number) => void;
    numPages: number;
    setNumPages: (n: number) => void;
};

export default function PDFViewer({ file, pageNumber, numPages, setNumPages }: Props) {
    return (
        <div>
            <Document file={file} onLoadSuccess={({ numPages }) => setNumPages(numPages)}>
                <Page key={pageNumber} pageNumber={pageNumber} renderTextLayer={false} renderAnnotationLayer={false} />
            </Document>
            <div>
                <span>
                    {pageNumber} / {numPages}
                </span>
            </div>
        </div>
    );
}
