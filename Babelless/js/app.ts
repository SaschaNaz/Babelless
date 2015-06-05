declare var filePicker: HTMLInputElement;
declare var filePickerButton: HTMLButtonElement;

declare var transcodeCheckBox: HTMLInputElement;
declare var inputEncodingSelect: HTMLSelectElement;
declare var outputEncodingSelect: HTMLSelectElement;
declare var transliterateCheckBox: HTMLInputElement;
declare var warnCheckBox: HTMLInputElement;

declare var kanjiCheckBox: HTMLInputElement;
declare var kyuToShinRadioButton: HTMLInputElement;
declare var shinToKyuRadioButton: HTMLInputElement;

import FileOpenPicker = Windows.Storage.Pickers.FileOpenPicker;
import MessageDialog = Windows.UI.Popups.MessageDialog;
import UICommand = Windows.UI.Popups.UICommand;
import BasicProperties = Windows.Storage.FileProperties.BasicProperties;
import StorageFile = Windows.Storage.StorageFile;
import IVectorView = Windows.Foundation.Collections.IVectorView;
import FileAccessMode = Windows.Storage.FileAccessMode;
import DataReader = Windows.Storage.Streams.DataReader;
import DataWriter = Windows.Storage.Streams.DataWriter;
import IRandomAccessStream = Windows.Storage.Streams.IRandomAccessStream;

interface IconvOptionBag {
    /** Text encoding method in input file */
    from: string;
    /** Text encoding method to be used in output file */
    to: string;
    translit?: boolean;
    ignore?: boolean;
}

interface BabellessSettingBag {
    transcode: boolean;
    transcodeSubSettings: {
        from: string;
        to: string;
        transliterate: boolean;
        warn: boolean;
    };
    kanji: boolean;
    kanjiSubSettings: {
        kyuToShin: boolean;
    }
}


document.addEventListener("DOMContentLoaded", () => {
    for (let select of [inputEncodingSelect, outputEncodingSelect]) {
        for (let encodingGroup in libiconvEncodings) {
            let optgroup = document.createElement("optgroup");
            optgroup.label = encodingGroup;
            for (let encoding of libiconvEncodings[encodingGroup]) {
                let option = document.createElement("option");
                option.textContent = option.value = encoding;
                optgroup.appendChild(option);
            }
            select.appendChild(optgroup);
        }
    }

    getStoredSettings().then(applySettingsToUI)

    filePickerButton.addEventListener("click", () => {
        let picker = new FileOpenPicker();
        picker.fileTypeFilter.push("*");
        let files: IVectorView<StorageFile>;

        Promise.resolve(picker.pickMultipleFilesAsync())
            .then((_files) => {
                files = _files;

                if (!files.length)
                    return;

                return startConversionUserTaskWhenConfirmed(files, getIconvOptionBagFromUI());
            })
    })
});

function getStoredSettings() {
    // TODO: store settings and get it back
    return Promise.resolve<BabellessSettingBag>({
        transcode: true,
        transcodeSubSettings: {
            from: "EUC-KR",
            to: "UTF-8",
            transliterate: false,
            warn: true
        },
        kanji: false,
        kanjiSubSettings: {
            kyuToShin: true
        }
    });
}

function applySettingsToUI(storedSettings: BabellessSettingBag) {
    if (storedSettings.transcode) {
        transcodeCheckBox.checked = true;
    }
    selectByValue(inputEncodingSelect, storedSettings.transcodeSubSettings.from);
    selectByValue(outputEncodingSelect, storedSettings.transcodeSubSettings.to);
    if (storedSettings.transcodeSubSettings.transliterate) {
        transliterateCheckBox.checked = true;
    }
    if (storedSettings.transcodeSubSettings.warn) {
        warnCheckBox.checked = true;
    }

    if (storedSettings.kanji) {
        kanjiCheckBox.checked = true;
    }
    if (storedSettings.kanjiSubSettings.kyuToShin) {
        kyuToShinRadioButton.checked = true;
    }
    else {
        shinToKyuRadioButton.checked = true;
    }
}

function getSettingsFromUI() {
    let settings: BabellessSettingBag = {
        transcode: transcodeCheckBox.checked,
        transcodeSubSettings: {
            from: getSelectedText(inputEncodingSelect),
            to: getSelectedText(outputEncodingSelect),
            transliterate: transliterateCheckBox.checked,
            warn: warnCheckBox.checked
        },
        kanji: kanjiCheckBox.checked,
        kanjiSubSettings: {
            kyuToShin: kyuToShinRadioButton.checked
        }
    };
}

function getIconvOptionBagFromUI() {
    return <IconvOptionBag>{ from: getSelectedText(inputEncodingSelect), to: getSelectedText(outputEncodingSelect), ignore: false };
}

function getSelectedText(select: HTMLSelectElement) {
    return Array.from(select.getElementsByTagName("option")).filter((option) => option.selected)[0].value
}

function selectByValue(select: HTMLSelectElement, value: string) {
    for (let option of Array.from(select.getElementsByTagName("option"))) {
        if (option.value === value) {
            option.selected = true;
            break;
        }
    }
}

function startConversionUserTaskWhenConfirmed(files: IVectorView<StorageFile>, options: IconvOptionBag) {
    return Promise.all<BasicProperties>(files.map((file) => file.getBasicPropertiesAsync()))
        .then(getUserConfirmation)
        .then((response) => {
            if (response.id === "no")
                return;

            startConversionUserTask(files, options);
        });
}

function startConversionUserTask(files: IVectorView<StorageFile>, options: IconvOptionBag): Promise<void> {
    return Promise.all(files.map((file) => iconvWrite(file, file, options)))
        .then(() => new MessageDialog(`Completed the conversion of ${files.length} file(s).`).showAsync())
        .catch((err) => {
            if ((<libiconv.IconvError>err).code !== "EILSEQ" || options.ignore) {
                new MessageDialog(`Error occurred: ${err.message || err}`).showAsync();
            }

            // TODO: Warn if EILSEQ occured with warning option turned on and retry when user says ok.
            let retryDialog = new MessageDialog("Conversion failed because of some illegal characters. Do you want to ignore them and retry?");
            retryDialog.commands.push(new UICommand("Yes"));
            retryDialog.commands.push(new UICommand("No", null, "no"));
            return Promise.resolve(retryDialog.showAsync()).then((retryResponse) => {
                if (retryResponse.id == "no")
                    return;
                // Copy and assign
                options = Object.assign({}, options, { ignore: true });
                return startConversionUserTask(files, options);
            });
        });
}


/**
Check files and get user confirmation. Command ID will be 'no' if user rejected. 

@param propertiesArray Array of BasicProperties objects from files
*/
function getUserConfirmation(propertiesArray: BasicProperties[]) {
    // 4 MiB check
    let containsBigFile = !!propertiesArray.filter((properties) => properties.size > 4194304).length;
    let dialog: MessageDialog;
    if (containsBigFile)
        dialog = new MessageDialog("Warning: One of the file is bigger than 4 MiB, which may be a non-text file. Will you continue?");
    else
        dialog = new MessageDialog("Conversion will start immediately. Will you continue?");
    dialog.commands.push(new UICommand("Yes"));
    dialog.commands.push(new UICommand("No", null, "no"));
    return dialog.showAsync();
}



/**
Read text from input and write transcoded text to output.

@param input Input file
@param output Output file
@param options Options for encoding conversion
*/
function iconvWrite(input: StorageFile, output: StorageFile, options: IconvOptionBag) {
    let singleFile = input === output;

    let openFile = singleFile
        ? [ input.openAsync(FileAccessMode.readWrite) ]
        : [ input.openAsync(FileAccessMode.read), output.openAsync(FileAccessMode.readWrite) ];
    
    return Promise.all(openFile)
        .then((streams) => {
            let inputStream: IRandomAccessStream;
            let outputStream: IRandomAccessStream;
            if (singleFile) {
                inputStream = outputStream = streams[0];
            }
            else {
                [inputStream, outputStream] = streams;
            }

            let done = () => {
                inputStream.close();
                outputStream.close();
            }

            let reader = new DataReader(inputStream);
            let writer = new DataWriter(outputStream);
            let bytes = new Array<number>(inputStream.size);
            return reader.loadAsync(inputStream.size).then(() => {
                reader.readBytes(bytes);
                bytes = libiconv.convert(bytes, options.from, getIconvOutputCodeString(options));
                outputStream.seek(0);
                outputStream.size = bytes.length;
                // Potential TODO: insert BOM when we don't use libiconv
                writer.writeBytes(bytes);
                return writer.storeAsync();
            }).then(done, (err) => {
                done();
                throw err;
            });
        });
}

function getIconvOutputCodeString(options: IconvOptionBag) {
    let result = options.to;
    if (options.translit)
        result += "//TRANSLIT";
    if (options.ignore)
        result += "//IGNORE";
    return result;
}