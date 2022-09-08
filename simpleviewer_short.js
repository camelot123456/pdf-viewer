"use strict";

if (!pdfjsLib.getDocument || !pdfjsViewer.PDFViewer) {
    alert("Please build the pdfjs-dist library using\n  `gulp dist-install`");
}
pdfjsLib.GlobalWorkerOptions.workerSrc = "./pdf.worker.js";

var zoominbutton = document.getElementById("pdfZoominbutton");
var zoomoutbutton = document.getElementById("pdfZoomOutbutton");
var rotatebutton = document.getElementById("pdfRotatebutton");
var input = document.getElementById("pdfInput");
var DEFAULT_SCALE_SIZE = .15;

const CMAP_URL = "./cmaps/";
const CMAP_PACKED = true;

const DEFAULT_URL = "./pdfs/4.pdf";

const ENABLE_XFA = true;
const SEARCH_FOR = "";

const container = document.getElementById("viewerContainer");

const eventBus = new pdfjsViewer.EventBus();

const pdfViewer = new pdfjsViewer.PDFViewer({
    container,
    eventBus,
    enableScripting: true,
});

// Loading document.
const loadingTask = pdfjsLib.getDocument({
    url: DEFAULT_URL,
    cMapUrl: CMAP_URL,
    cMapPacked: CMAP_PACKED,
});

loadingTask.promise.then((pdfDocument) => {
  pdfViewer.setDocument(pdfDocument);
})

loadingTask.onPassword = function (updatePassword, reason) {
    if (reason === 1) { // need a password
        var new_password = prompt('Please enter a password:');
        updatePassword(new_password);
    } else { // Invalid password
        var new_password = prompt('Invalid! Please enter a password:');
        updatePassword(new_password);
    }
};

zoominbutton.onclick = function () {
    var newScale = pdfViewer.currentScale + DEFAULT_SCALE_SIZE;
    pdfViewer.currentScaleValue = newScale;
}


zoomoutbutton.onclick = function () {
    var newScale = pdfViewer.currentScale - DEFAULT_SCALE_SIZE;
    pdfViewer.currentScaleValue = newScale;
}

rotatebutton.onclick = function () {
    var rotateVal = ((pdfViewer.pagesRotation + 90) >= 360) ? 0 : pdfViewer.pagesRotation + 90;
    console.log(rotateVal);
    pdfViewer.pagesRotation = rotateVal;
}

input.addEventListener("keyup", function (event) {
    var val = Number(input.value);
    if (event.keyCode === 13 && val) {
        // Cancel the default action, if needed
        event.preventDefault();
        if (val > pdfViewer.pagesCount) {
            val = pdfViewer.pagesCount;
        }
        console.log(val);
        pdfViewer.currentPageNumber = val;
    }
});

container.onscroll = function () {
    input.value = pdfViewer.currentPageNumber;
}


var canvas = this.__canvas = new fabric.Canvas('c');
