
import {
    getDocument,
    GlobalWorkerOptions
} from "/lib/pdfjs-dist/build/pdf.mjs";

GlobalWorkerOptions.workerSrc =
    "/lib/pdfjs-dist/build/pdf.worker.mjs";

const uploadForm = document.getElementById("uploadForm");
const fileInput = document.getElementById("fileInput");

const uploadSection = document.getElementById("uploadSection");
const readingSection = document.getElementById("readingSection");

const pagesContainer = document.getElementById("pagesContainer");
const textContainer = document.getElementById("textContainer");
const docxContainer = document.getElementById("docxContainer");
const epubContainer = document.getElementById("epubContainer");

const epubControls = document.getElementById("epubControls");
const epubPrev = document.getElementById("epubPrev");
const epubNext = document.getElementById("epubNext");

const errorMessage = document.getElementById("errorMessage");

let epubRendition = null;

uploadForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const file = fileInput.files[0];

    if (!file) return;

    errorMessage.hidden = true;
    errorMessage.textContent = "";

    uploadSection.hidden = true;
    readingSection.hidden = false;

    pagesContainer.replaceChildren();
    textContainer.textContent = "";
    docxContainer.replaceChildren();
    epubContainer.replaceChildren();

    pagesContainer.hidden = true;
    textContainer.hidden = true;
    docxContainer.hidden = true;
    epubContainer.hidden = true;
    epubControls.hidden = true;

    if (epubRendition) {
        epubRendition.destroy();
        epubRendition = null;
    }

    try {
        const formData = new FormData();
        formData.append("uploadedFile", file);

        const token = document.querySelector(
            'input[name="__RequestVerificationToken"]'
        ).value;

        const response = await fetch("/?handler=Read", {
            method: "POST",
            body: formData,
            headers: {
                "RequestVerificationToken": token
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "An error occurred.");
        }

        const content = await response.arrayBuffer();

        const documentFile = new File(
            [content],
            file.name,
            {
                type: response.headers.get("Content-Type")
            }
        );

        const extension = file.name.split(".").pop().toLowerCase();

        if (extension === "pdf") {
            await openPdf(documentFile);
        }
        else if (extension === "txt") {
            await openText(documentFile);
        }
        else if (extension === "docx") {
            await openDocx(documentFile);
        }
        else if (extension === "epub") {
            await openEpub(documentFile);
        }
        else {
            throw new Error("Unsupported file format.");
        }
    }
    catch (error) {
        console.error(error);

        readingSection.hidden = true;
        uploadSection.hidden = false;

        errorMessage.textContent = error.message;
        errorMessage.hidden = false;
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

async function openDocx(file) {
    if (!window.mammoth || !window.DOMPurify) {
        throw new Error("DOCX libraries could not be loaded.");
    }

    docxContainer.hidden = false;
    docxContainer.replaceChildren();

    const arrayBuffer = await file.arrayBuffer();

    const result = await window.mammoth.convertToHtml(
        { arrayBuffer },
        {
            convertImage: window.mammoth.images.imgElement(function (image) {
                return image.read("base64").then(function (imageBuffer) {
                    return {
                        src: "data:" + image.contentType + ";base64," + imageBuffer
                    };
                });
            })
        }
    );

    const sanitizedHtml = window.DOMPurify.sanitize(result.value, {
        ADD_DATA_URI_TAGS: ["img"]
    });

    const content = document.createElement("div");
    content.innerHTML = sanitizedHtml;

    paginateDocx(content);
}

function paginateDocx(content) {
    let currentPage = createDocumentPage();

    const elements = Array.from(content.children);

    for (const element of elements) {
        currentPage.appendChild(element);

        if (
            currentPage.scrollHeight > currentPage.clientHeight &&
            currentPage.children.length > 1
        ) {
            currentPage.removeChild(element);

            currentPage = createDocumentPage();
            currentPage.appendChild(element);
        }
    }
}

function createDocumentPage() {
    const page = document.createElement("div");
    page.className = "document-page";

    docxContainer.appendChild(page);

    return page;
}

async function openEpub(file) {
    if (!window.ePub) {
        throw new Error("EPUB library could not be loaded.");
    }

    epubContainer.hidden = false;
    epubControls.hidden = false;
    epubContainer.replaceChildren();

    const arrayBuffer = await file.arrayBuffer();

    const book = window.ePub(arrayBuffer);

    epubRendition = book.renderTo(epubContainer, {
        width: "100%",
        height: "100%",
        flow: "paginated",
        manager: "default",
        spread: "none",
        allowScriptedContent: false
    });

    await epubRendition.display();
}

epubPrev.addEventListener("click", async () => {
    if (epubRendition) {
        await epubRendition.prev();
    }
});

epubNext.addEventListener("click", async () => {
    if (epubRendition) {
        await epubRendition.next();
    }
});

document.addEventListener("keydown", async (event) => {
    if (!epubRendition || epubContainer.hidden) {
        return;
    }

    const target = event.target;

    if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target.isContentEditable
    ) {
        return;
    }

    if (event.key === "ArrowRight") {
        event.preventDefault();
        await epubRendition.next();
    }
    else if (event.key === "ArrowLeft") {
        event.preventDefault();
        await epubRendition.prev();
    }
});
