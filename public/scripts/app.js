function checkDirectory(location) {
    return new Promise((resolve, reject) => {
        $.post('/checkDirectory', { location }, data => {
            if (data) {
                console.log(data);
                console.log(data.directoryExists === 1)
                resolve(data.directoryExists === 1);
            } else {
                reject(new Error('Error checking directory'));
            }
        });
    });
}

function validateDirectory() {
    console.log("validateDirectory");
    const location = $('#location').val();
    console.log(location);

    checkDirectory(location)
        .then(isValid => {
            console.log(isValid);
            $('#analyseButton').prop('disabled', !isValid);
        })
        .catch(error => {
            console.error(error);
        });
}