declare var filePicker: HTMLInputElement;
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
                    .then((propertiesArray) => {
                        // 4 MiB check
                        let containsBigFile = !!propertiesArray.filter((properties) => properties.size > 4194304).length;
                        let dialog: MessageDialog;
                        if (containsBigFile)
                            dialog = new MessageDialog("WARNING!!!\r\n\r\nOne of the file is bigger than 4MB. There is a possibility that there is the file which is not a text. Will you continue?");
                        else
                            dialog = new MessageDialog("Conversion will be start immediately. Will you continue?");
                        dialog.commands.push(new UICommand("Yes"));
                        dialog.commands.push(new UICommand("No", null, "no"));
                        return dialog.showAsync();
                    })
                    .then((result) => {
                        if (result.id === "no")
                            return;

                        return Promise.all(files.map((file) => iconvWrite(file, file, "euc-kr", "utf-16")))
                            .then(() => new MessageDialog(`Completed the conversion of ${files.length} file(s).`).showAsync())
                            .catch((err) => {
                                if ((<libiconv.IconvError>err).code === "EILSEQ" && false) {
                                    // TODO: Warn if EILSEQ occured and warning option is turned on.
                                }
                                new MessageDialog(`Error occurred: ${err.message || err}`).showAsync();
                            });
                    });
            })
    })
});

/**
Read text from input and write transcoded text to output.

@param input Input file
@param output Output file
@param fromCode Text encoding method in input file
@param toCode Text encoding method to be used in output file
*/
function iconvWrite(input: StorageFile, output: StorageFile, fromCode: string, toCode: string) {
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

            let reader = new DataReader(inputStream);
            let writer = new DataWriter(outputStream);
            let bytes = new Array<number>(inputStream.size);
            return reader.loadAsync(inputStream.size).then(() => {
                reader.readBytes(bytes);
                bytes = libiconv.convert(bytes, "euc-kr", "utf-16");
                outputStream.seek(0);
                outputStream.size = bytes.length;
                // Potential TODO: insert BOM when we don't use libiconv
                writer.writeBytes(bytes);
                return writer.storeAsync();
            }).then(() => {
                inputStream.close();
                outputStream.close();
            });
        });
}