
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
let pdfRenderTasks = new Set();
let lastPdfRenderWidth = 0;
let lastPdfPixelRatio = 0;
let dragCounter = 0;

const allowedExtensions = [
    "pdf",
    "txt",
    "docx",
    "epub",
    "xlsx"
];

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

uploadForm.addEventListener("submit", async event => {
    event.preventDefault();

    const file = fileInput.files[0];

    if (!file) return;

    await uploadFile(file);
});

async function uploadFile(file) {
    const extension = file.name.split(".").pop().toLowerCase();

    if (!allowedExtensions.includes(extension)) {
        showError("Unsupported file format.");
        return;
    }

    errorMessage.hidden = true;
    errorMessage.textContent = "";

    releasePdfDocument();

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

        releasePdfDocument();

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

    pdfDocument = await getDocument({
        data
    }).promise;

    await renderPdfPages();
}

function getPdfRenderMetrics() {
    return {
        width: Math.max(
            100,
            pagesContainer.clientWidth - 32
        ),
        pixelRatio: Math.min(
            window.devicePixelRatio || 1,
            2.5
        )
    };
}

function cancelPdfRendering() {
    pdfRenderVersion++;

    for (const task of pdfRenderTasks) {
        try {
            task.cancel();
        }
        catch {
        }
    }

    pdfRenderTasks.clear();
}

function releasePdfDocument() {
    const previousDocument = pdfDocument;

    pdfDocument = null;

    cancelPdfRendering();

    lastPdfRenderWidth = 0;
    lastPdfPixelRatio = 0;

    if (pdfResizeTimer) {
        clearTimeout(pdfResizeTimer);
        pdfResizeTimer = null;
    }

    if (previousDocument) {
        previousDocument.destroy().catch(error => {
            console.warn("PDF cleanup failed:", error);
        });
    }
}

async function renderPdfPages() {
    if (!pdfDocument || pagesContainer.hidden) return;

    cancelPdfRendering();

    const currentVersion = pdfRenderVersion;
    const pdf = pdfDocument;
    const metrics = getPdfRenderMetrics();

    lastPdfRenderWidth = metrics.width;
    lastPdfPixelRatio = metrics.pixelRatio;

    pagesContainer.replaceChildren();

    for (
        let pageNumber = 1;
        pageNumber <= pdf.numPages;
        pageNumber++
    ) {
        if (
            currentVersion !== pdfRenderVersion ||
            pdf !== pdfDocument
        ) {
            return;
        }

        const page = await pdf.getPage(pageNumber);

        if (
            currentVersion !== pdfRenderVersion ||
            pdf !== pdfDocument
        ) {
            return;
        }

        const originalViewport = page.getViewport({
            scale: 1
        });

        const scale = Math.min(
            metrics.width / originalViewport.width,
            1.5
        );

        const viewport = page.getViewport({
            scale: Math.max(scale, 0.1)
        });

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (!context) {
            throw new Error(
                "Could not create PDF rendering context."
            );
        }

        canvas.className = "pdf-page";
        canvas.setAttribute(
            "aria-label",
            `PDF page ${pageNumber}`
        );

        canvas.width = Math.floor(
            viewport.width * metrics.pixelRatio
        );

        canvas.height = Math.floor(
            viewport.height * metrics.pixelRatio
        );

        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        pagesContainer.appendChild(canvas);

        const renderTask = page.render({
            canvasContext: context,
            viewport,
            transform: metrics.pixelRatio !== 1
                ? [
                    metrics.pixelRatio,
                    0,
                    0,
                    metrics.pixelRatio,
                    0,
                    0
                ]
                : null
        });

        pdfRenderTasks.add(renderTask);

        try {
            await renderTask.promise;
        }
        catch (error) {
            if (currentVersion !== pdfRenderVersion) {
                return;
            }

            throw error;
        }
        finally {
            pdfRenderTasks.delete(renderTask);
        }
    }
}

// PDF Resize

function schedulePdfResize() {
    if (
        !pdfDocument ||
        readingSection.hidden ||
        pagesContainer.hidden
    ) {
        return;
    }

    if (pdfResizeTimer) {
        clearTimeout(pdfResizeTimer);
    }

    pdfResizeTimer = setTimeout(async () => {
        pdfResizeTimer = null;

        if (
            !pdfDocument ||
            readingSection.hidden ||
            pagesContainer.hidden
        ) {
            return;
        }

        const metrics = getPdfRenderMetrics();

        const widthChanged =
            Math.abs(metrics.width - lastPdfRenderWidth) > 1;

        const pixelRatioChanged =
            Math.abs(metrics.pixelRatio - lastPdfPixelRatio) > 0.01;

        if (!widthChanged && !pixelRatioChanged) {
            return;
        }

        try {
            await renderPdfPages();
        }
        catch (error) {
            console.error(
                "PDF resize rendering failed:",
                error
            );
        }
    }, 180);
}

if ("ResizeObserver" in window) {
    const pdfResizeObserver = new ResizeObserver(() => {
        schedulePdfResize();
    });

    pdfResizeObserver.observe(pagesContainer);
}

window.addEventListener("resize", schedulePdfResize);

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

    const images = Array.from(content.querySelectorAll("img"));

    await Promise.all(
        images.map(image => {
            if (image.complete) {
                return Promise.resolve();
            }

            return new Promise(resolve => {
                image.addEventListener("load", resolve, { once: true });
                image.addEventListener("error", resolve, { once: true });
            });
        })
    );

    await paginateDocx(content);
}

async function paginateDocx(content) {
    docxContainer.replaceChildren();

    const elements = Array.from(content.children);

    if (elements.length === 0) {
        return;
    }

    const isMobile = window.matchMedia(
        "(max-width: 600px)"
    ).matches;

    let currentPage = createDocumentPage();

    if (isMobile) {
        elements.forEach(element => {
            currentPage.appendChild(element);
        });

        return;
    }

    let currentPageIsOverflowing = false;

    for (const element of elements) {
        if (currentPageIsOverflowing) {
            currentPage = createDocumentPage();
            currentPageIsOverflowing = false;
        }

        currentPage.appendChild(element);

        if (fitsInsidePage(currentPage, element)) {
            continue;
        }

        if (currentPage.children.length > 1) {
            currentPage.removeChild(element);

            currentPage = createDocumentPage();
            currentPage.appendChild(element);
        }

        if (!fitsInsidePage(currentPage, element)) {
            expandDocumentPage(currentPage);
            currentPageIsOverflowing = true;
        }
    }
}

function fitsInsidePage(page, element) {
    const pageRect = page.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();

    const styles = window.getComputedStyle(page);

    const bottomPadding =
        parseFloat(styles.paddingBottom) || 0;

    const availableBottom =
        pageRect.bottom - bottomPadding;

    return elementRect.bottom <= availableBottom + 1;
}

function expandDocumentPage(page) {
    page.style.height = "auto";

    page.style.minHeight = "1123px";
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
