function getAllAnnot(documentId) {
    return JSON.parse(localStorage.getItem(`${documentId}/annots`));
}

function initKey(documentId) {
    localStorage.setItem(`${documentId}/annots`, '[]');
}

function getOneAnnot(documentId, annotId) {

}

function addAnnot(documentId, objectAnnot) {
    let objs = getAllAnnot(documentId);
    if (objs === null || objs === undefined) {
        initKey(documentId);
        objs = getAllAnnot(documentId);
    }
    objs.push(objectAnnot);
    console.log(objectAnnot)
    localStorage.setItem(`${documentId}/annots`, JSON.stringify(objs));
}

function editAnnot(documentId, annotId, objectAnnot) {
    const objs = getAllAnnot(documentId);
    const objsNew = [];
    objs.forEach(obj => {
        if (obj.uuid === annotId) {
            obj = objectAnnot;
        }
        objsNew.push(obj);
    })
    localStorage.setItem(`${documentId}/annots`, objsNew);
}

function deleteAnnot(documentId, annotId) {
    const objs = getAllAnnot(documentId);
    const objsNew = [];
    objs.forEach(obj => {
        if (obj.uuid !== annotId) {
            objsNew.push(obj);
        }
    })
    localStorage.setItem(`${documentId}/annots`, objsNew);
}

function deleteAllAnnot(documentId) {
    localStorage.setItem(`${documentId}/annots`, '[]');
}

function deleteDocStorage(documentId) {

}

function updateAnnotInLocalStorage(documentId) {

}

function isEmptyAnnots(documentId) {
    return getAllAnnot(documentId).length;
}

export {
    addAnnot,
    deleteAnnot,
    editAnnot,
    getAllAnnot,
    getOneAnnot,
    updateAnnotInLocalStorage,
    initKey,
    isEmptyAnnots,
    deleteAllAnnot
};
