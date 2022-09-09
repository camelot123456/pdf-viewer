"use strict";

if (!pdfjsLib.getDocument || !pdfjsViewer.PDFPageView) {
    // eslint-disable-next-line no-alert
    alert("Please build the pdfjs-dist library using\n  `gulp dist-install`");
}

// The workerSrc property shall be specified.
//
pdfjsLib.GlobalWorkerOptions.workerSrc = "./pdf.worker.js";

// Some PDFs need external cmaps.
//
const CMAP_URL = "./cmaps/";
const CMAP_PACKED = true;
const DEFAULT_URL = "./pdfs/1.pdf";
let scaleDefault = 1.0;
const ENABLE_XFA = true;

const container = document.getElementById("pageContainer");
const eventBus = new pdfjsViewer.EventBus();
// declare var
let isDown = false;
let origX;
let origY;
let action;
let objectAnnot;
let canvas;
// declare var

// Loading document.
let loadingTask = pdfjsLib.getDocument({
    url: DEFAULT_URL,
    cMapUrl: CMAP_URL,
    cMapPacked: CMAP_PACKED,
    enableXfa: ENABLE_XFA,
});

loadingTask.onPassword = function (updatePassword, reason) {
    if (reason === 1) { // need a password
        var new_password = prompt('Please enter a password:');
        updatePassword(new_password);
    } else { // Invalid password
        var new_password = prompt('Invalid! Please enter a password:');
        updatePassword(new_password);
    }
};

renderPdf(scaleDefault, 0);

async function renderPdf (scale, rotate) {
    const pdfDocument = await loadingTask.promise;
    console.log('asd',pdfDocument.getMetadata());
    const numPages = pdfDocument.numPages;

    for (let pageNumber = 1; pageNumber <= numPages; pageNumber++) {
        renderPage(pdfDocument, pageNumber, scale, rotate);
    }
}

async function renderPage(pdfDocument, pageNumber, _scale, _rotate) {
    // Document loaded, retrieving the page.
    const pdfPage = await pdfDocument.getPage(pageNumber);
    // Creating the page view with default parameters.
    const pdfPageView = new pdfjsViewer.PDFPageView({
        container,
        id: pageNumber,
        scale: _scale,
        defaultViewport: pdfPage.getViewport({ scale: _scale }),
        eventBus,
        // We can enable text/annotationUtil.js/xfa/struct-layers, as needed.
        textLayerFactory: !pageNumber.isPureXfa
            ? new pdfjsViewer.DefaultTextLayerFactory()
            : null,
        annotationLayerFactory: new pdfjsViewer.DefaultAnnotationLayerFactory(),
        xfaLayerFactory: pageNumber.isPureXfa
            ? new pdfjsViewer.DefaultXfaLayerFactory()
            : null,
        structTreeLayerFactory: new pdfjsViewer.DefaultStructTreeLayerFactory(),
    });
    // Associate the actual page with the view, and draw it.

    pdfPageView.setPdfPage(pdfPage);
    return pdfPageView.draw().then(() => {
        const pageItem = document.getElementsByClassName('page')[pageNumber - 1];
        pageItem.setAttribute('id', `pageContainer${pageNumber}`);
        return pageItem;
    }).then(page => {
        const canvasWrapper = page.querySelector('.canvasWrapper canvas');
        canvasWrapper.setAttribute('id', `pageContainer-canvas-${pageNumber}`);
        const src = canvasWrapper.toDataURL({format: 'png', enableRetinaScaling: true});

        canvas = new fabric.Canvas(canvasWrapper, {
            hoverCursor: 'pointer',
            selection: true
        });
        fabric.Object.prototype.transparentCorners = false;

        fabric.Image.fromURL(src, image => {
            canvas.setBackgroundImage(
                image,
                () => {
                    canvas.requestRenderAll();
                },
                {
                    originX: 'left',
                    originY: 'top',
                }
            );
        });
        handleEvents(canvas, pageNumber);
        randomAnnots(canvas);
    });
}

function handleEvents(canvas, pageNumber) {
    canvas.on('mouse:over', function(e) {
        // e.target.set('fill', 'red');
        canvas.renderAll();
    });

    canvas.on('mouse:out', function(e) {
        // e.target.set('fill', 'green');
        canvas.renderAll();
    });

    canvas.on('mouse:down', function(e) {
        isDown = true;
        const pointer = canvas.getPointer(e.e);
        onMouseDown(canvas, pointer, pageNumber);
        canvas.requestRenderAll();
    });

    canvas.on('mouse:up', function(e) {
        onMouseUp(canvas);
        canvas.requestRenderAll();
    });

    canvas.on('mouse:move', function(e) {
        const pointer = canvas.getPointer(e.e);
        onMouseMove(canvas, pointer);
        canvas.requestRenderAll();
    });

    canvas.on('object:moving', function(e) {
        if (action !== '') {
            isDown = false;
        }
        var obj = e.target;
        if(obj.currentHeight > obj.canvas.height || obj.currentWidth > obj.canvas.width){
            return;
        }
        obj.setCoords();
        // top-left corner
        if(obj.getBoundingRect().top < 0 || obj.getBoundingRect().left < 0){
            obj.top = Math.max(obj.top, obj.top-obj.getBoundingRect().top);
            obj.left = Math.max(obj.left, obj.left-obj.getBoundingRect().left);
        }
        // bot-right corner
        if(obj.getBoundingRect().top+obj.getBoundingRect().height  > obj.canvas.height || obj.getBoundingRect().left+obj.getBoundingRect().width  > obj.canvas.width){
            obj.top = Math.min(obj.top, obj.canvas.height-obj.getBoundingRect().height+obj.top-obj.getBoundingRect().top);
            obj.left = Math.min(obj.left, obj.canvas.width-obj.getBoundingRect().width+obj.left-obj.getBoundingRect().left);
        }
        canvas.remove(objectAnnot);
        canvas.requestRenderAll();
    });

    let left1 = 0;
    let top1 = 0 ;
    let scale1x = 0 ;
    let scale1y = 0 ;
    let width1 = 0 ;
    let height1 = 0 ;
    canvas.on('object:scaling', function (e){
        let obj = e.target;
        obj.setCoords();
        let brNew = obj.getBoundingRect();

        if (((brNew.width+brNew.left)>=obj.canvas.width) || ((brNew.height+brNew.top)>=obj.canvas.height) || ((brNew.left<0) || (brNew.top<0))) {
            obj.left = left1;
            obj.top=top1;
            obj.scaleX=scale1x;
            obj.scaleY=scale1y;
            obj.width=width1;
            obj.height=height1;
        }
        else{
            left1 =obj.left;
            top1 =obj.top;
            scale1x = obj.scaleX;
            scale1y=obj.scaleY;
            width1=obj.width;
            height1=obj.height;
        }
        canvas.requestRenderAll();
    });
}

function onMouseMove(canvas, pointer) {
    if (pointer.x <= 0) {
        pointer.x = 0;
    }
    if (pointer.y <= 0) {
        pointer.y = 0;
    }
    if (pointer.x >= canvas.width / canvas.getZoom()) {
        pointer.x = canvas.width / canvas.getZoom();
    }
    if (pointer.y >= canvas.height / canvas.getZoom()) {
        pointer.y = canvas.height / canvas.getZoom();
    }
    if (!isDown || !objectAnnot) {
        return;
    }
    switch (action) {
        case 'rectangle':
            if (origX > pointer.x) {
                objectAnnot.set({ left: Math.abs(pointer.x) });
            }
            if (origY > pointer.y) {
                objectAnnot.set({ top: Math.abs(pointer.y) });
            }
            objectAnnot.set({ width: Math.abs(origX - pointer.x) });
            objectAnnot.set({ height: Math.abs(origY - pointer.y) });
            break;
    }
}

function onMouseUp(canvas) {
    if (objectAnnot && (objectAnnot.width === 0 || objectAnnot.height === 0)) {
        canvas.remove(objectAnnot);
    }
    objectAnnot = undefined;
    isDown = false;
}

function onMouseDown(canvas, pointer, pageNumber) {
    console.log('is down')
    origX = pointer.x;
    origY = pointer.y;
    canvas.isDrawingMode = false;
    switch (action) {
        case 'free-draw':
            canvas.freeDrawingBrush = new fabric.PencilBrush(this.canvas);
            canvas.freeDrawingBrush.color = '#f00';
            canvas.freeDrawingBrush.width = 2;
            canvas.isDrawingMode = !this.canvas.isDrawingMode;
            canvas.freeDrawingBrush.limitedToCanvasSize = true;
            objectAnnot = undefined;
            break;
        case 'rectangle':
            objectAnnot = new fabric.Rect({
                left: origX,
                top: origY,
                width: pointer.x - origX,
                height: pointer.y - origY,
                fill: 'transparent',
                strokeWidth: 2,
                stroke: '#ff0012',
                selectable: true,
                noScaleCache: false,
                hasControls: true,
                strokeUniform: true
            });
            canvas.add(objectAnnot);
            break;
        default:
            return null;
    }
    objectAnnot['uuid'] = uuidv4();
    objectAnnot['page'] = pageNumber;
    objectAnnot['class'] = 'Annotation';
    objectAnnot['createdAt'] = new Date().getTime().toString();
    objectAnnot['createdBy'] = 'Anonymous';
    objectAnnot['state'] = action;
    objectAnnot['isBurned'] = false;
    objectAnnot['initialWidth'] = canvas.getWidth();

    objectAnnot.setControlsVisibility({
        mtr: false
    });
    console.log(objectAnnot)
}

function chooseAction(_action) {
    action = _action;
    const canvasWrappers = document.querySelectorAll('#pageContainer .page');
    switch (_action) {
        case 'select':
        case 'rectangle':
            canvasWrappers.forEach(element => {
                if (element.querySelector('.textLayer')) {
                    element.querySelector('.textLayer').classList.add('hidden');
                }
                if (element.querySelector('.annotationLayer')) {
                    element.querySelector('.annotationLayer').classList.add('hidden');
                }
            });
            break;
        case 'non-select':
            canvasWrappers.forEach(element => {
                if (element.querySelector('.textLayer')) {
                    element.querySelector('.textLayer').classList.remove('hidden');
                }
                if (element.querySelector('.annotationLayer')) {
                    element.querySelector('.annotationLayer').classList.remove('hidden');
                }
                canvas.discardActiveObject();
                canvas.requestRenderAll();
            });

            break;
    }
}

function choosePdfTool(_toolName) {
    switch (_toolName) {
        case 'zoom-in':
            scaleDefault = scaleDefault + 0.1;
            renderPdf(scaleDefault, 0);
            break;
        case 'zoom-out':
            scaleDefault = scaleDefault - 0.1;
            renderPdf(scaleDefault, 0);
            break;
    }
}

function randomAnnots(canvas) {
    // add random objects
    for (var i = 15; i--; ) {
        var dim = fabric.util.getRandomInt(30, 60);
        var klass = ['Rect', 'Triangle', 'Circle'][fabric.util.getRandomInt(0,2)];
        var options = {
            top: fabric.util.getRandomInt(0, 600),
            left: fabric.util.getRandomInt(0, 600),
            fill: 'green'
        };
        if (klass === 'Circle') {
            options.radius = dim;
        }
        else {
            options.width = dim;
            options.height = dim;
        }
        canvas.add(new fabric[klass](options));
    }
}

function uuidv4() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}



