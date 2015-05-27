var FileOpenPicker = Windows.Storage.Pickers.FileOpenPicker;
var MessageDialog = Windows.UI.Popups.MessageDialog;
var UICommand = Windows.UI.Popups.UICommand;
var BasicProperties = Windows.Storage.FileProperties.BasicProperties;
var StorageFile = Windows.Storage.StorageFile;
var FileAccessMode = Windows.Storage.FileAccessMode;
var DataReader = Windows.Storage.Streams.DataReader;
var DataWriter = Windows.Storage.Streams.DataWriter;
document.addEventListener("DOMContentLoaded", function () {
    filePickerButton.addEventListener("click", function () {
        var picker = new FileOpenPicker();
        picker.fileTypeFilter.push("*");
        var files;
        Promise.resolve(picker.pickMultipleFilesAsync())
            .then(function (_files) {
            files = _files;
            if (!files.length)
                return;
            return Promise.all(files.map(function (file) { return file.getBasicPropertiesAsync(); }))
                .then(function (propertiesArray) {
                // 4 MiB check
                var containsBigFile = !!propertiesArray.filter(function (properties) { return properties.size > 4194304; }).length;
                var dialog;
                if (containsBigFile)
                    dialog = new MessageDialog("WARNING!!!\r\n\r\nOne of the file is bigger than 4MB. There is a possibility that there is the file which is not a text. Will you continue?");
                else
                    dialog = new MessageDialog("Conversion will be start immediately. Will you continue?");
                dialog.commands.push(new UICommand("Yes"));
                dialog.commands.push(new UICommand("No", null, "no"));
                return dialog.showAsync();
            })
                .then(function (result) {
                if (result.id === "no")
                    return;
                return Promise.all(files.map(function (file) { return file.openAsync(FileAccessMode.readWrite).then(function (stream) {
                    var reader = new DataReader(stream);
                    var writer = new DataWriter(stream);
                    var converted;
                    return reader.loadAsync(stream.size).then(function () {
                        converted = EncodingNETBridge.Bridge.convert("euc-kr", "utf-16", reader.readBytes());
                        reader.dispose();
                        stream.seek(0);
                        // TODO: insert BOM
                        writer.writeBytes(converted);
                        return writer.storeAsync();
                    }).then(function () { return stream.close(); });
                }); })).then(function () { return new MessageDialog("Completed the conversion of " + files.length + " file(s)."); });
            });
        });
    });
});
//# sourceMappingURL=app.js.map