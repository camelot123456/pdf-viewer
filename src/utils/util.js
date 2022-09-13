function randomAnnots(canvas) {
    // add random objects
    for (var i = 15; i--;) {
        var dim = fabric.util.getRandomInt(30, 60);
        var klass = ['Rect', 'Triangle', 'Circle'][fabric.util.getRandomInt(0, 2)];
        var options = {
            top: fabric.util.getRandomInt(0, 600),
            left: fabric.util.getRandomInt(0, 600),
            fill: 'green'
        };
        if (klass === 'Circle') {
            options.radius = dim;
        } else {
            options.width = dim;
            options.height = dim;
        }
        canvas.add(new fabric[klass](options));
    }
}

function randomAnnots1(canvas) {
    const red = new fabric.Rect({
        top: 100, left: 0, width: 80, height: 50, fill: 'red' });
    const blue = new fabric.Rect({
        top: 200, left: 200, width: 50, height: 70, fill: 'blue' });
    const green = new fabric.Rect({
        top: 350, left: 250, width: 60, height: 60, fill: 'green' });
    canvas.add(red, blue, green);
}

function uuid() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

function getCreatedAt(isFormatDate) {
    const date = new Date();
    const day = date.getDate() < 10 ? '0' + date.getDate() : date.getDate();
    const month = date.getMonth() + 1 < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1;
    const hours = date.getHours() < 10 ? '0' + date.getHours() : date.getHours();
    const minutes = date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes();
    const seconds = date.getSeconds() < 10 ? '0' + date.getSeconds() : date.getSeconds();
    if (isFormatDate) {
        return day + '/' + month + '/' + date.getFullYear() + ' ' + hours + ':' + minutes + ':' + seconds;
    } else {
        return month + '/' + day + '/' + date.getFullYear() + ' ' + hours + ':' + minutes + ':' + seconds;
    }
}

export {randomAnnots, randomAnnots1, uuid, getCreatedAt};
