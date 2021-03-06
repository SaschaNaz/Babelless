﻿import FileOpenPicker = Windows.Storage.Pickers.FileOpenPicker;
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
    baseEncoding: string;
    transcode: boolean;
    transcodeSubSettings: {
        destinationEncoding: string;
        transliterate: boolean;
        warn: boolean;
    };
    kanji: boolean;
    kanjiSubSettings: {
        kyuToShin: boolean;
    }
}


function getStoredSettings() {
    // TODO: store settings and get it back
    return Promise.resolve<BabellessSettingBag>({
        baseEncoding: "EUC-KR",
        transcode: true,
        transcodeSubSettings: {
            destinationEncoding: "UTF-8",
            transliterate: false,
            warn: true
        },
        kanji: false,
        kanjiSubSettings: {
            kyuToShin: true
        }
    });
}

function startMainTaskWithFiles(files: IVectorView<StorageFile>) {
    return getUserConfirmationAboutFiles(files)
        .then(() => {
            // TODO: if kanji selected: inputEncoding to Unicode to outputEncoding
            // TODO: New FileHandle is here, now this should be easier to be implemented
            let settings = UI.getSettingsFromUI();
            if (settings.kanji) {
            }
            // (Fixed) Input encoding MUST always be specified to read files
        });
}

function getIconvOptionBagFromAppSettingBag(settings: BabellessSettingBag) {
    return <IconvOptionBag>{
        from: settings.baseEncoding,
        to: settings.transcodeSubSettings.destinationEncoding,
        translit: settings.transcodeSubSettings.transliterate,
        ignore: !settings.transcodeSubSettings.warn
    };
}

function startConversionUserTaskWhenConfirmed(files: IVectorView<StorageFile>, options: IconvOptionBag) {
    return getUserConfirmationAboutFiles(files)
        .then((userAccepted) => {
            if (!userAccepted)
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

            // Warn if EILSEQ occured with warning option turned on and retry when user says ok.
            return Promise.resolve(util.showYesNoDialog("Conversion failed because of some illegal characters. Do you want to ignore them and retry?"))
                .then((userAccepted) => {
                    if (!userAccepted)
                        return;
                    // Copy and assign
                    options = Object.assign({}, options, { ignore: true });
                    return startConversionUserTask(files, options);
                });
        });
}


/**
Check files and get user confirmation.

@param files Input files
@return User confirmed or not
*/
function getUserConfirmationAboutFiles(files: IVectorView<StorageFile>) {
    return Promise.all<BasicProperties>(files.map((file) => file.getBasicPropertiesAsync()))
        .then((propertiesArray) => {
            // 4 MiB check
            let containsBigFile = !!propertiesArray.filter((properties) => properties.size > 4194304).length;
            let dialog: MessageDialog;
            if (containsBigFile)
                return util.showYesNoDialog("Warning: One of the file is bigger than 4 MiB, which may be a non-text file. Will you continue?");
            else
                return util.showYesNoDialog("Conversion will start immediately. Will you continue?");
        });
}



/**
Read text from input and write transcoded text to output.

@param input Input file
@param output Output file
@param options Options for encoding conversion
*/
function iconvWrite(input: StorageFile, output: StorageFile, options: IconvOptionBag) {
    let singleFile = input === output;

    let inputHandle: util.FileHandle;
    let outputHandle: util.FileHandle;
    if (singleFile) {
        inputHandle = outputHandle = new util.FileHandle(input, FileAccessMode.readWrite);
    }
    else {
        inputHandle = new util.FileHandle(input, FileAccessMode.read);
        outputHandle = new util.FileHandle(output, FileAccessMode.readWrite);
    }

    let done = () => {
        inputHandle.deactivate();
        outputHandle.deactivate();
    }
    
    return inputHandle.readAsArray().then((bytes) => {
        bytes = libiconv.convert(bytes, options.from, getIconvOutputCodeString(options));
        return outputHandle.overwrite(bytes);
    }).then(done, (err) => {
        done();
        throw err;
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
