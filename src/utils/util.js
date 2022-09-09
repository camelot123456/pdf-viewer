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

function uuidv4() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

export {randomAnnots, uuidv4};
