// @ts-nocheck
import * as pdfjs from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.3.136/pdf.min.mjs';

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.3.136/pdf.worker.mjs`;

export const parsePdf = async (file: File): Promise<{ text: string }> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument(arrayBuffer).promise;
    const numPages = pdf.numPages;

    let fullText = '';

    for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);

        const textContent = await page.getTextContent();
        const items = textContent.items;
        if (items.length > 0) {
            // Sort items by vertical position first, then horizontal. Top-to-bottom, left-to-right.
            items.sort((a, b) => {
                if (Math.abs(a.transform[5] - b.transform[5]) > 1) {
                    return b.transform[5] - a.transform[5];
                }
                return a.transform[4] - b.transform[4];
            });

            let pageText = '';
            if (items.length > 0) {
                let lastY = items[0].transform[5];
                let lastHeight = items[0].height;

                for (const item of items) {
                    const currentY = item.transform[5];
                    const height = item.height > 0 ? item.height : lastHeight;
                    
                    // Heuristic for paragraph breaks: large vertical gap
                    if (Math.abs(currentY - lastY) > height * 1.5) {
                        pageText += '\n\n' + item.str;
                    } 
                    // Heuristic for line breaks: small vertical gap
                    else if (Math.abs(currentY - lastY) > 1) {
                        if (!pageText.endsWith('\n\n') && !pageText.endsWith('\n')) {
                            pageText += '\n';
                        }
                        pageText += item.str;
                    } 
                    // Heuristic for space: items on same line but separated
                    else {
                        if (pageText.length > 0 && !pageText.endsWith(' ') && !pageText.endsWith('\n')) {
                             pageText += ' ';
                        }
                        pageText += item.str;
                    }
                    lastY = currentY;
                    lastHeight = height > 0 ? height : lastHeight;
                }
            }
            fullText += pageText + '\n\n';
        }
    }

    return { text: fullText.trim() };
};