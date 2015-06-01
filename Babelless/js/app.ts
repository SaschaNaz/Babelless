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

                        return Promise.all(files.map((file) => file.openAsync(FileAccessMode.readWrite)
                            .then((stream) => {
                                let reader = new DataReader(stream);
                                let writer = new DataWriter(stream);
                                let bytes = new Array<number>(stream.size);
                                return reader.loadAsync(stream.size).then(() => {
                                    reader.readBytes(bytes);
                                    bytes = libiconv.convert(bytes, "euc-kr", "utf-16");
                                    stream.seek(0);
                                    stream.size = bytes.length;
                                    // Potential TODO: insert BOM when we don't use libiconv
                                    writer.writeBytes(bytes);
                                    return writer.storeAsync();
                                }).then(() => stream.close());
                            })))
                            .then(() => new MessageDialog(`Completed the conversion of ${files.length} file(s).`).showAsync())
                            .catch((err) => {
                                if ((<libiconv.IconvError>err).code === "EILSEQ" && true) {
                                    // TODO: Warn if EILSEQ occured and warning option is turned on.
                                }
                                new MessageDialog(`Error occurred: ${err.message || err}`).showAsync();
                            });
                    });
            })
    })
});