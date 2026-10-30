
import {
    getDocument,
    GlobalWorkerOptions
} from "/lib/pdfjs/build/pdf.mjs";

GlobalWorkerOptions.workerSrc =
    "/lib/pdfjs/build/pdf.worker.mjs";

const uploadForm = document.getElementById("uploadForm");
const fileInput = document.getElementById("fileInput");
const uploadSection = document.getElementById("uploadSection");
const readingSection = document.getElementById("readingSection");
const pagesContainer = document.getElementById("pagesContainer");
const textContainer = document.getElementById("textContainer");

uploadForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const file = fileInput.files[0];

    if (!file) return;

    uploadSection.hidden = true;
    readingSection.hidden = false;

    pagesContainer.replaceChildren();
    textContainer.replaceChildren();
    pagesContainer.hidden = true;
    textContainer.hidden = true;

    try {
        const extension = file.name.split(".").pop().toLowerCase();

        if (extension === "pdf") {
            await openPdf(file);
        } else if (extension === "txt") {
            await openText(file);
        } else {
            throw new Error("Unsupported file format.");
        }
    } catch (error) {
        console.error(error);

        readingSection.hidden = true;
        uploadSection.hidden = false;

        alert("Could not open this file.");
    }
});

async function openPdf(file) {
    pagesContainer.hidden = false;

    const data = new Uint8Array(await file.arrayBuffer());
    const pdf = await getDocument({ data }).promise;

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber);

        const containerWidth = pagesContainer.clientWidth - 32;
        const originalViewport = page.getViewport({ scale: 1 });

        const scale = Math.min(
            containerWidth / originalViewport.width,
            1.5
        );

        const viewport = page.getViewport({ scale });

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        canvas.className = "pdf-page";
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        pagesContainer.appendChild(canvas);

        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;
    }
}

async function openText(file) {
    textContainer.hidden = false;
    textContainer.textContent = await file.text();
}
