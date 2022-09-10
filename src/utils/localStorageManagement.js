

function getAllAnnot(documentId) {
    const dt = [{a: 1, b: 'hello', c: true, d: {d1: true}, e: [1, 3, 4, 5]}, {f: 'Kakaka'}];
    localStorage.setItem('test', JSON.stringify(dt));
    console.log(JSON.parse(localStorage.getItem('test')));
}

function initKey(documentId) {
    localStorage.setItem(`${documentId}:annots`, '[]');
}

function getOneAnnot(documentId, annotId) {

}

function addAnnot(documentId) {
    localStorage.setItem(`${documentId}:annots`, '[]');
}

function editAnnot(documentId, annotId) {

}

function deleteAnnot(documentId, annotId) {

}

function deleteAnnot(documentId) {

}

function updateAnnotInLocalStorage(documentId) {

}

function isEmptyAnnots(documentId) {

}

export {addAnnot, deleteAnnot, editAnnot, getAllAnnot, getOneAnnot, updateAnnotInLocalStorage};
