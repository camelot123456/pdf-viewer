'use strict';
import {data} from './static/data-sample/data-docs.js';
import * as util from './utils/util.js';
import {ICON} from './utils/constants.js';
import * as annotsStorage from './utils/localStorageManagement.js'

if (!pdfjsLib.getDocument || !pdfjsViewer.PDFPageView) {
    alert('Please build the pdfjs-dist library using\n  `gulp dist-install`');
}
pdfjsLib.GlobalWorkerOptions.workerSrc = './static/pdf-lib/pdf.worker.js';
const CMAP_URL = './static/pdf-lib/cmaps/';
const CMAP_PACKED = true;
let scaleDefault = 1.0;
let rotationDefault = 0;
const ENABLE_XFA = true;

// declare var
let isDown = false;
let isEditAnnots = false;
let origX;
let origY;
let action;
let objectAnnot;
let canvasArr = [];
let pdfPageViewArr = [];
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
let pdfDocuments = [];
let testRotate = 0;
// declare var

// start init
init();

function initOnEvent() {
    const pdfTool = document.querySelector('#pdf-tool').childNodes;
    const pdfAction = document.querySelector('#pdf-annots').childNodes;
    pdfTool.forEach(tool => {
        tool.addEventListener('click', e => {
            choosePdfTool(tool.id);
        })
    });
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
    annotsStorage.deleteAnnot(docInfo.docId, target.get('uuid'));
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
    const listDocs = document.querySelector('#list-docs');
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
    const canvasWrappers = document.querySelectorAll('#pageContainer .page');
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
                console.log(cs.toJSON());
                console.log(cs.getObjects());
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
                annotsStorage.deleteAllAnnot(docInfo.docId);
            }
            break;
    }
}

async function choosePdfTool(_toolName) {
    switch (_toolName) {
        case 'reset':
            pdfPageViewArr.forEach(lt => console.log(lt));
            // pdfPageViewArr.forEach(pdfPageView => {
            //     pdfPageView.reset({keepZoomLayer: true, keepAnnotationLayer: true, keepXfaLayer: true});
            // });
            break;
        case 'zoom-in':
            // pdfPageViewArr.forEach(pdfPageView => {
            //     pdfPageView.update({scale: scaleDefault});
            // });
            scaleDefault = scaleDefault / 1.1;
            if (scaleDefault < 0.3) {
                return;
            }
            await renderPdf(docInfo.src, scaleDefault, rotationDefault);
            canvasArr.forEach(canvas => {
                if (canvas.getZoom() > 15)
                    return;
                canvas.zoomToPoint(new fabric.Point(canvas.width / 2, canvas.height / 2), canvas.getZoom() * 1.1);
            });
            break;
        case 'zoom-out':
            scaleDefault = scaleDefault / 1.1;
            if (scaleDefault < 0.3) {
                return;
            }
            await renderPdf(docInfo.src, scaleDefault, rotationDefault);
            canvasArr.forEach(canvas => {
                if (canvas.getZoom() < 0.3)
                    return;
                canvas.zoomToPoint(new fabric.Point(canvas.width / 2, canvas.height / 2), canvas.getZoom() / 1.1);
            });
            break;
    }
}

async function changeDocument(src, docId) {


    // pageContainer.innerHTML = '';
    // if (pageContainer)
    //     pageContainer.remove();
    // pageContainer = document.createElement('div');
    // pageContainer.id = 'pageContainer';
    // const container = document.querySelector('.container');
    // container.appendChild(pageContainer);

    docInfo.docId = docId;
    docInfo.docName = docId;
    docInfo.src = src;
    annotsStorage.initKey(docInfo.docId);
    await renderPdf(src, scaleDefault, rotationDefault);
}

// end init

async function renderPdf(src, scale, rotate) {
    // cleanPage();
    destroyWorker();
    // destroyPdfPageView();

    let pageContainer = document.querySelector('#pageContainer');
    pageContainer.innerHTML = '';
    // pageContainer.remove();
    // pageContainer = document.createElement('div');
    // pageContainer.id = 'pageContainer';
    // const container = document.querySelector('.container');
    // container.appendChild(pageContainer);
    canvasArr = [];

    createWorker().then(async () => {
        await loadingTask.promise
            .then(async pdfDocument => {
                const numPages = pdfDocument.numPages;
                docInfo.pages = numPages;
                docInfo.pdfDocument = pdfDocument;
                for (let pageNumber = 1; pageNumber <= numPages; pageNumber++) {
                    await renderPage(pdfDocument, pageNumber, scale, rotate);
                }
            }).catch(err => {
                console.log(err);
            });
        // const pdfDocument = await loadingTask.promise;
    });

}

async function renderPage(pdfDocument, pageNumber, _scale, _rotate) {
    // Document loaded, retrieving the page.

    const pdfPage = await pdfDocument.getPage(pageNumber);
    // Creating the page view with default parameters.
    const pdfPageView = new pdfjsViewer.PDFPageView({
        container: document.getElementById('pageContainer'),
        id: pageNumber,
        scale: _scale,
        defaultViewport: pdfPage.getViewport({scale: _scale, rotation: _rotate}),
        eventBus: new pdfjsViewer.EventBus(),
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
    pdfDocument.getOptionalContentConfig().then(a => {
        console.log(a)
    })
    // Associate the actual page with the view, and draw it.
    settingPdfPageView(pageNumber, pdfPage, pdfPageView, _scale, _rotate);
    document.querySelector('#test0').addEventListener('click', e => {
        // testRotate = (testRotate + 90) % 360
        settingPdfPageView(pageNumber, pdfPage, pdfPageView, _scale, 0);
    })
    document.querySelector('#test90').addEventListener('click', e => {
        // testRotate = (testRotate + 90) % 360
        settingPdfPageView(pageNumber, pdfPage, pdfPageView, _scale, 90);
    })
    document.querySelector('#test180').addEventListener('click', e => {
        // testRotate = (testRotate + 90) % 360
        settingPdfPageView(pageNumber, pdfPage, pdfPageView, _scale, 180);
    })
    document.querySelector('#test270').addEventListener('click', e => {
        // testRotate = (testRotate + 90) % 360
        settingPdfPageView(pageNumber, pdfPage, pdfPageView, _scale, 270);
    })
}

function settingPdfPageView(pageNumber, pdfPage, pdfPageView, _scale, _rotate) {
    // pdfPageView.rotation = _rotate;
    // pdfPageView.scale = _scale;
    pdfPageView.update({scale: _scale, rotation: _rotate});
    pdfPageView.setPdfPage(pdfPage);
    return pdfPageView.draw().then(() => {
        pdfPageView.textLayer.enhanceTextSelection = true;
        const pageItem = document.getElementsByClassName('page')[pageNumber - 1];
        pageItem.setAttribute('id', `pageContainer${pageNumber}`);
        pageItem.style.margin = '10px 10px';
        return pageItem;
    }).then(page => {
        const canvasWrapper = page.querySelector('.canvasWrapper canvas');
        canvasWrapper.setAttribute('id', `pageContainer-canvas-${pageNumber}`);
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
        canvas.page = pageNumber;

        initOnEvent();
        settingFabricCanvas();
        handleEventCanvas(canvas, pageNumber);
        util.randomAnnots(canvas);
        canvasArr.push(canvas);
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
    const docName = document.querySelector(`#doc-name`);
    if (docName) {
        docName.innerHTML = name;
    }
}


async function createWorker() {
    console.log('create worker')
    // Loading document.
    loadingTask = pdfjsLib.getDocument({
        url: docInfo.src,
        cMapUrl: CMAP_URL,
        cMapPacked: CMAP_PACKED,
        enableXfa: ENABLE_XFA,
        enableScripting: true,
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

}

async function destroyPdfPageView() {
    console.log(pdfPageViewArr);
    pdfPageViewArr.forEach(pdf => {
        pdf.destroy();
    });
    pdfPageViewArr = [];
}

function destroyWorker() {
    if (loadingTask) {
        loadingTask.destroy();
    }
    loadingTask = null;
}
