
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
const xlsxContainer = document.getElementById("xlsxContainer");

const epubControls = document.getElementById("epubControls");
const epubPrev = document.getElementById("epubPrev");
const epubNext = document.getElementById("epubNext");

const errorMessage = document.getElementById("errorMessage");
const dropOverlay = document.getElementById("dropOverlay");

let epubRendition = null;
let pdfDocument = null;
let pdfRenderVersion = 0;
let pdfResizeTimer = null;
let dragCounter = 0;

const allowedExtensions = [
    "pdf",
    "txt",
    "docx",
    "epub",
    "xlsx"
];

// Automatic Text Direction

function applyAutoDirection(root) {
    const rootElement =
        root.nodeType === Node.DOCUMENT_NODE
            ? root.documentElement
            : root;

    if (!rootElement) return;

    rootElement.setAttribute("dir", "auto");

    const textElements = root.querySelectorAll(
        "p, h1, h2, h3, h4, h5, h6, li, td, th, blockquote"
    );

    textElements.forEach(element => {
        if (element.textContent.trim()) {
            element.setAttribute("dir", "auto");
        }
    });
}

// Upload Form

uploadForm.addEventListener("submit", async event => {
    event.preventDefault();

    const file = fileInput.files[0];

    if (!file) return;

    await uploadFile(file);
});

// Shared Upload Function

async function uploadFile(file) {
    const extension = file.name.split(".").pop().toLowerCase();

    if (!allowedExtensions.includes(extension)) {
        showError("Unsupported file format.");
        return;
    }

    errorMessage.hidden = true;
    errorMessage.textContent = "";

    pdfDocument = null;
    pdfRenderVersion++;

    if (pdfResizeTimer) {
        clearTimeout(pdfResizeTimer);
        pdfResizeTimer = null;
    }

    uploadSection.hidden = true;
    readingSection.hidden = false;

    pagesContainer.replaceChildren();
    textContainer.textContent = "";
    docxContainer.replaceChildren();
    epubContainer.replaceChildren();
    xlsxContainer.replaceChildren();

    pagesContainer.hidden = true;
    textContainer.hidden = true;
    docxContainer.hidden = true;
    epubContainer.hidden = true;
    epubControls.hidden = true;
    xlsxContainer.hidden = true;

    if (epubRendition) {
        epubRendition.destroy();
        epubRendition = null;
    }

    try {
        const formData = new FormData();
        formData.append("uploadedFile", file);

        const tokenElement = document.querySelector(
            'input[name="__RequestVerificationToken"]'
        );

        const token = tokenElement?.value;

        const response = await fetch("/?handler=Read", {
            method: "POST",
            body: formData,
            headers: token
                ? {
                    "RequestVerificationToken": token
                }
                : {}
        });

        if (!response.ok) {
            const errorText = await response.text();

            let message = "An error occurred while reading the file.";

            try {
                const error = JSON.parse(errorText);
                message = error.message || message;
            }
            catch {
                if (errorText.trim()) {
                    message = errorText;
                }
            }

            throw new Error(message);
        }

        const content = await response.arrayBuffer();

        const documentFile = new File(
            [content],
            file.name,
            {
                type: response.headers.get("Content-Type") || file.type
            }
        );

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
        else if (extension === "xlsx") {
            await openXlsx(documentFile);
        }
    }
    catch (error) {
        console.error(error);

        pdfDocument = null;
        pdfRenderVersion++;

        if (epubRendition) {
            epubRendition.destroy();
            epubRendition = null;
        }

        readingSection.hidden = true;
        uploadSection.hidden = false;

        showError(error.message);
    }
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.hidden = false;
}

// Drag and Drop

function isFileDrag(event) {
    return event.dataTransfer &&
        Array.from(event.dataTransfer.types).includes("Files");
}

document.addEventListener("dragenter", event => {
    if (!isFileDrag(event)) return;

    event.preventDefault();

    dragCounter++;

    dropOverlay.hidden = false;
    document.body.classList.add("dragging-file");
});

document.addEventListener("dragover", event => {
    if (!isFileDrag(event)) return;

    event.preventDefault();

    event.dataTransfer.dropEffect = "copy";
});

document.addEventListener("dragleave", event => {
    if (!isFileDrag(event)) return;

    event.preventDefault();

    dragCounter--;

    if (dragCounter <= 0) {
        dragCounter = 0;
        hideDropOverlay();
    }
});

document.addEventListener("drop", async event => {
    if (!isFileDrag(event)) return;

    event.preventDefault();

    dragCounter = 0;
    hideDropOverlay();

    const file = event.dataTransfer?.files?.[0];

    if (!file) return;

    fileInput.value = "";

    await uploadFile(file);
});

function hideDropOverlay() {
    dropOverlay.hidden = true;
    document.body.classList.remove("dragging-file");
}

// PDF Reader

async function openPdf(file) {
    pagesContainer.hidden = false;

    const data = new Uint8Array(await file.arrayBuffer());

    pdfDocument = await getDocument({ data }).promise;

    await renderPdfPages();
}

async function renderPdfPages() {
    if (!pdfDocument || pagesContainer.hidden) return;

    const currentVersion = ++pdfRenderVersion;
    const pdf = pdfDocument;

    pagesContainer.replaceChildren();

    const containerWidth = Math.max(
        100,
        pagesContainer.clientWidth - 32
    );

    const pixelRatio = Math.min(
        window.devicePixelRatio || 1,
        2.5
    );

    for (
        let pageNumber = 1;
        pageNumber <= pdf.numPages;
        pageNumber++
    ) {
        if (currentVersion !== pdfRenderVersion) return;

        const page = await pdf.getPage(pageNumber);

        if (currentVersion !== pdfRenderVersion) return;

        const originalViewport = page.getViewport({
            scale: 1
        });

        const scale = Math.min(
            containerWidth / originalViewport.width,
            1.5
        );

        const viewport = page.getViewport({
            scale: Math.max(scale, 0.1)
        });

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (!context) {
            throw new Error("Could not create PDF rendering context.");
        }

        canvas.className = "pdf-page";

        canvas.width = Math.floor(
            viewport.width * pixelRatio
        );

        canvas.height = Math.floor(
            viewport.height * pixelRatio
        );

        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        pagesContainer.appendChild(canvas);

        await page.render({
            canvasContext: context,
            viewport: viewport,
            transform: pixelRatio !== 1
                ? [
                    pixelRatio,
                    0,
                    0,
                    pixelRatio,
                    0,
                    0
                ]
                : null
        }).promise;

        if (currentVersion !== pdfRenderVersion) return;
    }
}

// PDF Resize

window.addEventListener("resize", () => {
    if (!pdfDocument || readingSection.hidden) return;

    if (pdfResizeTimer) {
        clearTimeout(pdfResizeTimer);
    }

    pdfResizeTimer = setTimeout(async () => {
        if (!pdfDocument || readingSection.hidden) return;

        try {
            await renderPdfPages();
        }
        catch (error) {
            console.error("PDF resize rendering failed:", error);
        }
    }, 180);
});

// TXT Reader

async function openText(file) {
    textContainer.hidden = false;
    textContainer.textContent = await file.text();
    textContainer.setAttribute("dir", "auto");
}

// DOCX Reader

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

    applyAutoDirection(content);

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
    page.setAttribute("dir", "auto");

    docxContainer.appendChild(page);

    return page;
}

// EPUB Reader

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

    epubRendition.hooks.content.register(contents => {
        if (contents.document) {
            applyAutoDirection(contents.document);
        }
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

document.addEventListener("keydown", async event => {
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

// XLSX Reader

async function openXlsx(file) {
    if (!window.XLSX) {
        throw new Error("Excel library could not be loaded.");
    }

    xlsxContainer.hidden = false;
    xlsxContainer.replaceChildren();

    const workbook = window.XLSX.read(
        await file.arrayBuffer(),
        { type: "array" }
    );

    if (workbook.SheetNames.length === 0) {
        throw new Error("This Excel file contains no worksheets.");
    }

    const sheetTabs = document.createElement("div");
    sheetTabs.className = "xlsx-tabs";

    const sheetContent = document.createElement("div");
    sheetContent.className = "xlsx-sheet";

    xlsxContainer.append(sheetTabs, sheetContent);

    function showSheet(sheetName) {
        sheetTabs.replaceChildren();
        sheetContent.replaceChildren();

        workbook.SheetNames.forEach(name => {
            const button = document.createElement("button");

            button.type = "button";
            button.textContent = name;
            button.className = name === sheetName ? "active" : "";

            button.addEventListener("click", () => {
                showSheet(name);
            });

            sheetTabs.appendChild(button);
        });

        const rows = window.XLSX.utils.sheet_to_json(
            workbook.Sheets[sheetName],
            {
                header: 1,
                defval: ""
            }
        );

        const table = document.createElement("table");

        table.className = "xlsx-table";
        table.setAttribute("dir", "auto");

        rows.forEach(row => {
            const tr = document.createElement("tr");

            row.forEach(value => {
                const cell = document.createElement("td");

                cell.textContent = String(value ?? "");
                cell.setAttribute("dir", "auto");

                tr.appendChild(cell);
            });

            table.appendChild(tr);
        });

        sheetContent.appendChild(table);
    }

    showSheet(workbook.SheetNames[0]);
}
