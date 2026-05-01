import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs'
import mammoth from 'mammoth'

// Set worker src to the local node_modules via Vite URL import
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url
).toString()

export async function extractTextFromFile(file: File): Promise<string> {
    const ext = file.name.split('.').pop()?.toLowerCase()

    if (ext === 'pdf') {
        return extractTextFromPdf(file)
    } else if (ext === 'docx') {
        return extractTextFromDocx(file)
    } else {
        // For txt or unsupported
        return await file.text()
    }
}

async function extractTextFromPdf(file: File): Promise<string> {
    try {
        const arrayBuffer = await file.arrayBuffer()
        const data = new Uint8Array(arrayBuffer)
        const loadingTask = pdfjsLib.getDocument({ data })
        const pdf = await loadingTask.promise

        let text = ''
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i)
            const content = await page.getTextContent()
            const strings = content.items.map((item: any) => item.str)
            text += strings.join(' ') + '\n\n'
        }
        return text.trim()
    } catch (error) {
        console.error('Error extracting PDF:', error)
        return 'Could not extract text from PDF.'
    }
}

async function extractTextFromDocx(file: File): Promise<string> {
    try {
        const arrayBuffer = await file.arrayBuffer()
        const result = await mammoth.extractRawText({ arrayBuffer })
        return result.value
    } catch (error) {
        console.error('Error extracting DOCX:', error)
        return 'Could not extract text from DOCX.'
    }
}
