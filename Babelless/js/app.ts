﻿declare var filePicker: HTMLInputElement;
declare var filePickerButton: HTMLButtonElement;

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
    from: string;
    to: string;
    translit?: boolean;
    ignore?: boolean;
}

document.addEventListener("DOMContentLoaded", () => {
    filePickerButton.addEventListener("click", () => {
        let picker = new FileOpenPicker();
        picker.fileTypeFilter.push("*");
        let files: IVectorView<StorageFile>;

        Promise.resolve(picker.pickMultipleFilesAsync())
            .then((_files) => {
                files = _files;

                if (!files.length)
                    return;

                return Promise.all<BasicProperties>(files.map((file) => file.getBasicPropertiesAsync()))
                    .then(getUserConfirmation)
                    .then((response) => {
                        if (response.id === "no")
                            return;

                        let warn = true;

                        let convertTask: () => Promise<void> = () => Promise.all(files.map((file) => iconvWrite(file, file, { from: "utf-8", to: "ascii", ignore: !warn })))
                            .then(() => new MessageDialog(`Completed the conversion of ${files.length} file(s).`).showAsync())
                            .catch((err) => {
                                if ((<libiconv.IconvError>err).code === "EILSEQ" && warn) {
                                    // TODO: Warn if EILSEQ occured and warning option is turned on, and retry when user says ok.
                                    let retryDialog = new MessageDialog("Conversion failed because of some illegal characters. Do you want to ignore them and retry?");
                                    retryDialog.commands.push(new UICommand("Yes"));
                                    retryDialog.commands.push(new UICommand("No", null, "no"));
                                    return Promise.resolve(retryDialog.showAsync()).then((retryResponse) => {
                                        if (retryResponse.id == "no")
                                            return;
                                        warn = false;
                                        return convertTask();
                                    });
                                }
                                new MessageDialog(`Error occurred: ${err.message || err}`).showAsync();
                            });

                        convertTask();
                    });
            })
    })
});


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
@param fromCode Text encoding method in input file
@param toCode Text encoding method to be used in output file
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