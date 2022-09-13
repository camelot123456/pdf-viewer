'use strict';
import {data} from './static/data-sample/data-docs.js';
import * as util from './utils/util.js';
import {ICON} from './utils/constants.js';
import * as annotsStorage from './utils/localStorageManagement.js'

if (!pdfjsLib.getDocument || !pdfjsViewer.PDFPageView) {
    alert('Please build the pdfjs-dist library using\n  `gulp dist-install`');
}
pdfjsLib.GlobalWorkerOptions.workerSrc = './static/pdf-lib/pdf.worker.js';
// pdfjsLib.GlobalWorkerOptions.workerSrc = '//mozilla.github.io/pdf.js/build/pdf.worker.js';
const CMAP_URL = './static/pdf-lib/cmaps/';
const CMAP_PACKED = true;
const ENABLE_XFA = true;
const SANDBOX_BUNDLE_SRC = "../../node_modules/pdfjs-dist/build/pdf.sandbox.js";

const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);

// declare var
let isDown = false;
let isEditAnnots = false;
let origX;
let origY;
let action;
let objectAnnot;
let canvasArr = [];
let docInfo = {
    pdfDocument: null,
    src: null,
    docId: '',
    docName: '',
    pages: 0,
    page: 1,
    rotate: 0,
    scale: 1.0
};
let loadingTask;
// declare var

const pageCountLbl = $('#page-count');
const findEdit = $('#find-edt');
const pageEdit = $('#page-edt');
const rlBtn = $('#rl-btn');
const rrBtn = $('#rr-btn');
const nextBtn = $('#next-btn');
const prevBtn = $('#prev-btn');
const showThumbBtn = $('#show-thumb-btn');
const zoomInBtn = $('#zoom-in-btn');
const zoomOutBtn = $('#zoom-out-btn');
const refreshBtn = $('#refresh-btn');
const scrollModeSelect = $('#scroll-mode-select');
const spreadModeSelect = $('#spread-mode-select');
const scaleModeSelect = $('#scale-mode-select');
const findMatch = $('#find-match');
const DEFAULT_SCALE_SIZE = 1;

// start init
init();

async function renderPdfjsViewer(src) {
    destroyWorker();
    const eventBus = new pdfjsViewer.EventBus();

    const pdfLinkService = new pdfjsViewer.PDFLinkService({
        eventBus,
    });

    const pdfFindController = new pdfjsViewer.PDFFindController({
        eventBus,
        linkService: pdfLinkService,
    });

    const pdfScriptingManager = new pdfjsViewer.PDFScriptingManager({
        eventBus,
        // sandboxBundleSrc: SANDBOX_BUNDLE_SRC,
    });

    const pdfViewer = new pdfjsViewer.PDFViewer({
        container: $('#viewerContainer'),
        eventBus,
        linkService: pdfLinkService,
        findController: pdfFindController,
        // scriptingManager: pdfScriptingManager,
        enableScripting: true, // Only necessary in PDF.js version 2.10.377 and below.
    });

    pdfLinkService.setViewer(pdfViewer);
    pdfScriptingManager.setViewer(pdfViewer);

    loadingTask = pdfjsLib.getDocument({
        url: src,
        cMapUrl: CMAP_URL,
        cMapPacked: CMAP_PACKED,
        enableXfa: ENABLE_XFA,
    });

    loadingTask.onPassword = (updatePassword, reason) => {
        if (reason === 1) { // need a password
            const new_password = prompt('Please enter a password:');
            updatePassword(new_password);
        } else { // Invalid password
            const new_password = prompt('Invalid! Please enter a password:');
            updatePassword(new_password);
        }
    };

    const pdfDocument = await loadingTask.promise;
    // Document loaded, specifying document for the viewer and
    // the (optional) linkService.

    pdfViewer.setDocument(pdfDocument);
    pdfLinkService.setDocument(pdfDocument, null);

    eventBus.on("annotationlayerrendered", evt => {
        // renderCanvasAnnots(pdfViewer._pages);
        console.log('annotationlayerrendered');
    });

    eventBus.on("baseviewerinit", evt => {
        // renderCanvasAnnots(pdfViewer._pages);
        console.log('baseviewerinit');
    });

    eventBus.on("rotationchanging", evt => {
        // renderCanvasAnnots(pdfViewer._pages);
        console.log('rotationchanging');
    });

    eventBus.on("pagesdestroy", evt => {
        // renderCanvasAnnots(pdfViewer._pages);
        console.log('pagesdestroy');
    });

    eventBus.on("pagesloaded", evt => {
        // renderCanvasAnnots(pdfViewer._pages);
        console.log('pagesloaded');
    });

    eventBus.on("pagerender", evt => {
        // renderCanvasAnnots(pdfViewer._pages);
        console.log('pagerendered');
    });

    eventBus.on("pagerender", evt => {
        // renderCanvasAnnots(pdfViewer._pages);
        console.log('pagerendered');
    });

    eventBus.on("scalechanging", evt => {
        // renderCanvasAnnots(pdfViewer._pages);
        console.log('scalechanging');
    });

    eventBus.on("updateviewarea", evt => {
        // renderCanvasAnnots(pdfViewer._pages);
        console.log('updateviewarea');
    });

    eventBus.on("optionalcontentconfigchanged", evt => {
        // renderCanvasAnnots(pdfViewer._pages);
        console.log('optionalcontentconfigchanged');
    });

    eventBus.on("xfalayerrendered", evt => {
        // renderCanvasAnnots(pdfViewer._pages);
        console.log('xfalayerrendered');
    });

    eventBus.on("textlayerrendered", evt => {
        // renderCanvasAnnots(pdfViewer._pages);
        console.log('textlayerrendered');
    });

    eventBus.on("updatetextlayermatches", evt => {
        // renderCanvasAnnots(pdfViewer._pages);
        console.log('updatetextlayermatches');
    });

    eventBus.on("pagechanging", evt => {
        // renderCanvasAnnots(pdfViewer._pages);
        console.log('pagechanging');
    });


    eventBus.on("pagesinit", function () {
        // We can use pdfViewer now, e.g. let's change default scale.
        console.log('pagesinit');
        pdfViewer.currentScaleValue = "page-actual";
        pageCountLbl.innerText = pdfDocument.numPages;
    });

    handleEventPdfTool(pdfFindController, pdfViewer, eventBus);
}

function renderCanvasAnnots(pdfPageViews) {
    for (let i = 0; i < pdfPageViews.length; i++) {
        settingPdfPageView(pdfPageViews[i]);
    }
}

function settingPdfPageView(pdfPageView) {
    const canvasWrapper = pdfPageView.canvas;
    const src = canvasWrapper.toDataURL({format: 'png', enableRetinaScaling: true});
    const canvas = new fabric.Canvas(canvasWrapper, {
        hoverCursor: 'pointer',
        selection: true
    });

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
    canvas.page = pdfPageView.id;

    initOnEvent();
    settingFabricCanvas();
    handleEventCanvas(canvas, pdfPageView.id);
    util.randomAnnots(canvas);
    canvasArr.push(canvas);
}

function initOnEvent() {
    const pdfTool = $('#pdf-tool').childNodes;
    const pdfAction = $('#pdf-annots').childNodes;
    // pdfTool.forEach(tool => {
    //     tool.addEventListener('click', e => {
    //         console.log(tool.id)
    //         choosePdfTool(tool.id);
    //     })
    // });
    pdfAction.forEach(action => {
        action.addEventListener('click', e => {
            chooseAction(action.id);
        })
    })
}

function deleteObject(eventData, transform) {
    const target = transform.target;
    const canvas = target.canvas;
    if (target) {
        if (confirm('Are you sure?')) {
            canvas.remove(target);
        }
    }
    canvas.requestRenderAll();
}

function duplicateObject(eventData, transform) {
    const target = transform.target;
    const canvas = target.canvas;
    target.clone(function (cloned) {
        cloned.left += 10;
        cloned.top += 10;
        canvas.add(cloned);
    });
}

function editObject(eventData, transform) {
    alert('Coming Soon!');
}

function renderIcon(icon) {
    const img = document.createElement('img');
    img.src = icon;
    return (ctx, left, top, styleOverride, fabricObject) => {
        let size = 24;
        ctx.save();
        ctx.translate(left, top);
        ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle));
        ctx.drawImage(img, -size / 2, -size / 2, size, size);
        ctx.restore();
    }
}

function settingFabricCanvas() {
    fabric.Object.prototype.transparentCorners = false;
    fabric.Object.prototype.cornerColor = '#b2ccff';
    fabric.Object.prototype.cornerStyle = 'rect'; // or circle
    fabric.Object.prototype.controls.deleteControl = new fabric.Control({
        x: 0.5,
        y: -0.5,
        offsetY: -20,
        offsetX: 16,
        cursorStyle: 'pointer',
        mouseUpHandler: deleteObject,
        render: renderIcon(ICON.deleteIcon),
        cornerSize: 24
    });
    fabric.Object.prototype.controls.clone = new fabric.Control({
        x: 0.5,
        y: -0.5,
        offsetY: -20,
        offsetX: -16,
        cursorStyle: 'pointer',
        mouseUpHandler: duplicateObject,
        render: renderIcon(ICON.duplicateIcon),
        cornerSize: 24
    });
    fabric.Object.prototype.controls.cloneControl = new fabric.Control({
        x: 0.5,
        y: -0.5,
        offsetY: -20,
        offsetX: -40,
        cursorStyle: 'pointer',
        mouseUpHandler: editObject,
        render: renderIcon(ICON.editIcon),
        cornerSize: 24
    });
}

function init() {
    renderListDocs();
}

function renderListDocs() {
    const listDocs = $('#list-docs');
    for (let i = 0; i < data.length; i++) {
        const item = document.createElement('li');
        item.id = `item-${i + 1}`;
        item.classList.add('docs-item');
        item.textContent = `doc ${i + 1}`;
        item.addEventListener('click', async e => {
            await changeDocument(data[i].path, data[i].docId);
        });
        listDocs.appendChild(item);
    }
}

function chooseAction(_action) {
    action = _action;
    const canvasWrappers = Array.from($$('#viewerContainer #viewer .page'));
    switch (_action) {
        case 'select':
        case 'free-draw':
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
            canvasArr.forEach(cs => {
                // console.log(cs.toJSON());
                // console.log(cs.getObjects());
                if (cs.getActiveObject() !== undefined) {
                    cs.discardActiveObject();
                    cs.requestRenderAll();
                }
            });
            canvasWrappers.forEach(element => {
                if (element.querySelector('.textLayer')) {
                    element.querySelector('.textLayer').classList.remove('hidden');
                }
                if (element.querySelector('.annotationLayer')) {
                    element.querySelector('.annotationLayer').classList.remove('hidden');
                }
            });
            break;
        case 'clear':
            if (confirm('Are you sure, clear?')) {
                canvasArr.forEach(async cs => {
                    await cs.getObjects().forEach(obj => {
                        cs.remove(obj);
                        cs.requestRenderAll();
                    });
                });
            }
            break;
    }
}

function handleEventPdfTool(pdfFindController, pdfViewer, eventBus) {
    zoomInBtn.addEventListener('click', e => {
        pdfViewer.increaseScale(DEFAULT_SCALE_SIZE);
    });
    zoomOutBtn.addEventListener('click', e => {
        pdfViewer.decreaseScale(DEFAULT_SCALE_SIZE);
    });
    rlBtn.addEventListener('click', e => {
        const rotateVal = (pdfViewer.pagesRotation - 90) % 360;
        pdfViewer.pagesRotation = rotateVal;
    });
    rrBtn.addEventListener('click', e => {
        const rotateVal = (pdfViewer.pagesRotation + 90) % 360;
        pdfViewer.pagesRotation = rotateVal;
    });
    nextBtn.addEventListener('click', e => {
        pdfViewer.nextPage();
    });
    prevBtn.addEventListener('click', e => {
        pdfViewer.previousPage();
    });
    scrollModeSelect.addEventListener('click', e => {
        pdfViewer.scrollMode = +scrollModeSelect.value;
    });
    spreadModeSelect.addEventListener('click', e => {
        pdfViewer.spreadMode = +spreadModeSelect.value;
    });
    scaleModeSelect.addEventListener('click', e => {
        pdfViewer._setScale(scaleModeSelect.value);
    });
    refreshBtn.addEventListener('click', e => {
        pdfViewer.refresh();
    });

    findEdit.addEventListener('blur', e => {
        if (findEdit.value) {
            eventBus.dispatch("find", {
                type: "",
                query: findEdit.value,
                phraseSearch: findEdit.value,
                caseSensitive: false,
                entireWord: false,
                highlightAll: true,
                findPrevious: false,
                matchDiacritics: true,
            });
        }
    });

    findMatch.addEventListener('click', e => {
        if (!findEdit.value) return;
        pdfFindController.highlightMatches;
    });

    pageEdit.addEventListener("keyup", e => {
        let val = Number(pageEdit.value);
        if (e.keyCode === 13 && val) {
            // Cancel the default action, if needed
            e.preventDefault();
            if (val > pdfViewer.pagesCount) {
                val = pdfViewer.pagesCount;
            }
            pdfViewer.scrollPageIntoView({pageNumber: val});
        }
    });

    showThumbBtn.addEventListener('click', e => {
        // console.log(pdfViewer._pages);
        // console.log(pdfViewer.getPageView(1));
        // pdfViewer.cleanup();
        const thumbnail = document.querySelector('#thumbnail');
        pdfViewer._pages.forEach(async page => {
            setTimeout(async () => {
                await makeThumb(page.pdfPage).then(data => {
                    const img = document.createElement('img');
                    img.src = data.toDataURL({format: 'png', enableRetinaScaling: true});
                    img.style.margin = '4px 0px';
                    thumbnail.appendChild(img);
                })
            }, 1000);
        })
    });
}

function makeThumb(page) {
    // draw page to fit into 96x96 canvas
    let vp = page.getViewport({scale: 1,});
    let canvas = document.createElement("canvas");
    let scalesize = 1;
    canvas.width = vp.width * scalesize;
    canvas.height = vp.height * scalesize;
    let scale = Math.min(canvas.width / vp.width, canvas.height / vp.height);
    return page.render({
        canvasContext: canvas.getContext("2d"),
        viewport: page.getViewport({scale: scale})
    }).promise.then(function () {
        return canvas;
    });
}

async function changeDocument(src, docId) {
    docInfo.docId = docId;
    docInfo.docName = docId;
    docInfo.src = src;
    updateDisplayName(docInfo.docName);
    await renderPdfjsViewer(docInfo.src).then(() => {
        console.log('hello')
    });
}

async function handleEventCanvas(canvas, pageNumber) {
    let leftScale = 0;
    let topScale = 0;
    let scaleXScale = 0;
    let scaleYScale = 0;
    let widthScale = 0;
    let heightScale = 0;
    canvas.on({
        'mouse:over': e => {
            // e.target.set('fill', 'red');
            canvas.renderAll();
        },
        'mouse:out': e => {
            // e.target.set('fill', 'green');
            canvas.renderAll();
        },
        'mouse:down': e => {
            onMouseDown(canvas, e);
        },
        'mouse:up': e => {
            onMouseUp(canvas, e);
        },
        'mouse:move': e => {
            if (isDown) onMouseMove(canvas, e);
        },
        'object:moving': e => {
            onObjectMoving(canvas, e);
        },
        'path:created': e => {
            e.path.set();
            canvas.renderAll();
        },
        'selection:created': e => {
            console.log(e.target);
        },
        'object:scaling': e => {
            isDown = false;
            const obj = e.target;
            obj.setCoords();
            const brNew = obj.getBoundingRect();

            if (
                brNew.width + brNew.left >= obj.canvas.width ||
                brNew.height + brNew.top >= obj.canvas.height ||
                (brNew.left < 0 || brNew.top < 0)
            ) {
                obj.left = leftScale;
                obj.top = topScale;
                obj.scaleX = scaleXScale;
                obj.scaleY = scaleYScale;
                obj.width = widthScale;
                obj.height = heightScale;
            } else {
                leftScale = obj.left;
                topScale = obj.top;
                scaleXScale = obj.scaleX;
                scaleYScale = obj.scaleY;
                widthScale = obj.width;
                heightScale = obj.height;
            }
            canvas.requestRenderAll();
        },
        'object:rotating': e => {
            isDown = false;
        },
        'object:modified': e => {
            isEditAnnots = true;
            // console.log(e.target);
        }
    });
}

function onObjectMoving(canvas, e) {
    if (action !== '') {
        isDown = false;
    }
    var obj = e.target;
    if (obj.currentHeight > obj.canvas.height || obj.currentWidth > obj.canvas.width) {
        return;
    }
    obj.setCoords();
    // top-left corner
    if (obj.getBoundingRect().top < 0 || obj.getBoundingRect().left < 0) {
        obj.top = Math.max(obj.top, obj.top - obj.getBoundingRect().top);
        obj.left = Math.max(obj.left, obj.left - obj.getBoundingRect().left);
    }
    // bot-right corner
    if (obj.getBoundingRect().top + obj.getBoundingRect().height > obj.canvas.height || obj.getBoundingRect().left + obj.getBoundingRect().width > obj.canvas.width) {
        obj.top = Math.min(obj.top, obj.canvas.height - obj.getBoundingRect().height + obj.top - obj.getBoundingRect().top);
        obj.left = Math.min(obj.left, obj.canvas.width - obj.getBoundingRect().width + obj.left - obj.getBoundingRect().left);
    }
    canvas.remove(objectAnnot);
    canvas.requestRenderAll();
}

function onMouseMove(canvas, e) {
    const pointer = canvas.getPointer(e.e);
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
                objectAnnot.set({left: Math.abs(pointer.x)});
            }
            if (origY > pointer.y) {
                objectAnnot.set({top: Math.abs(pointer.y)});
            }
            objectAnnot.set({width: Math.abs(origX - pointer.x)});
            objectAnnot.set({height: Math.abs(origY - pointer.y)});
            break;
    }
    canvas.requestRenderAll();
}

function onMouseUp(canvas, e) {
    console.log(objectAnnot);
    // if (isEditAnnots) {
    //     annotsStorage.editAnnot(docInfo.docId, e.target.get('uuid'), e.target);
    // } else {
    //     if (e.target) {
    //
    //     }
    //     annotsStorage.addAnnot(docInfo.docId, e.target);
    // }
    if (objectAnnot && (objectAnnot.width === 0 || objectAnnot.height === 0)) {
        canvas.remove(objectAnnot);
    }
    objectAnnot = undefined;
    isDown = false;
    canvas.requestRenderAll();

    isEditAnnots = false;
}

function onMouseDown(canvas, e) {
    isDown = true;
    const pointer = canvas.getPointer(e.e);
    origX = pointer.x;
    origY = pointer.y;
    canvas.isDrawingMode = false;
    switch (action) {
        case 'free-draw':
            canvas.isDrawingMode = !canvas.isDrawingMode;
            canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
            canvas.freeDrawingBrush.color = '#f00';
            canvas.freeDrawingBrush.width = 1;
            canvas.freeDrawingBrush.limitedToCanvasSize = true;
            // canvas.freeDrawingBrush.shadow = new fabric.Shadow({
            //     blur: parseInt(2, 10) || 0,
            //     offsetX: 0,
            //     offsetY: 0,
            //     affectStroke: true,
            //     color: '#ff0',
            // });
            objectAnnot = canvas.freeDrawingBrush;
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
            objectAnnot.setControlsVisibility({
                mtr: true
            });
            canvas.add(objectAnnot);
            break;
        default:
            return null;
    }
//     if (!['free-draw'].includes(action)) {
    objectAnnot['uuid'] = util.uuid();
    objectAnnot['page'] = canvas.page;
    objectAnnot['class'] = 'Annotation';
    objectAnnot['createdAt'] = util.getCreatedAt(true);
    objectAnnot['createdBy'] = 'Anonymous';
    objectAnnot['state'] = action;
    objectAnnot['isBurned'] = false;
    objectAnnot['initialWidth'] = canvas.getWidth();
}

function updateDisplayName(name) {
    const docName = $(`#doc-name`);
    if (docName) {
        docName.innerHTML = name;
    }
}

function destroyWorker() {
    if (loadingTask) {
        loadingTask.destroy();
    }
}
