namespace util {
    export function getSelectedText(select: HTMLSelectElement) {
        return Array.from(select.getElementsByTagName("option")).filter((option) => option.selected)[0].value
    }

    export function selectByValue(select: HTMLSelectElement, value: string) {
        for (let option of Array.from(select.getElementsByTagName("option"))) {
            if (option.value === value) {
                option.selected = true;
                break;
            }
        }
    }
    
    export function showYesNoDialog(content: string) {
        let dialog = new MessageDialog(content);
        dialog.commands.push(new UICommand("Yes"));
        dialog.commands.push(new UICommand("No", null, "no"));
        return dialog.showAsync().then((response) => response.id !== "no");
    }

    export class FileHandle {
        private _stream: IRandomAccessStream;
        private _reader: DataReader;
        private _writer: DataWriter;
        constructor(public file: StorageFile, public mode: FileAccessMode) {
        }

        getStream() {
            if (this._stream)
                return Promise.resolve(this._stream);

            return Promise.resolve(this.file.openAsync(this.mode))
                .then((stream) => this._stream = stream);
        }
        
        private _getReader() {
            if (this._reader)
                return this._reader;
            return this._reader = new DataReader(this._stream);
        }
        private _getWriter() {
            if (this._writer)
                return this._writer;
            return this._writer = new DataWriter(this._stream);
        }

        readAsArray() {
            let array: number[]
            return this.getStream()
                .then((stream) => {
                    stream.seek(0);
                    array = new Array<number>(stream.size);
                    return this._getReader().loadAsync(stream.size)
                })
                .then(() => {
                    this._reader.readBytes(array);
                    return array;
                });
        }

        overwrite(array: number[]|Uint8Array) {
            if (this.mode === FileAccessMode.read) {
                throw new Error("File cannot be overwritten in read mode."); 
            }
            return this.getStream().then(() => {
                this._stream.seek(0);
                this._stream.size = array.length;
                this._getWriter().writeBytes(<number[]>array);
                return this._writer.storeAsync();
            });
        }

        close() {
            if (this._stream) {
                this._stream.close();
                this._reader.close();
                if (this.mode === FileAccessMode.readWrite) {
                    this._writer.close();
                }
                this._stream = this._reader = this._writer = null;
            }
        }

        deactivate() {
            this.close();
            this.file = null;
        }
    }
}