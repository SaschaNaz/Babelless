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

    transcodeCheckBox.addEventListener("change", UI.disableConvertButtonWhenAllFeaturesUnchecked);
    kanjiCheckBox.addEventListener("change", UI.disableConvertButtonWhenAllFeaturesUnchecked);

    getStoredSettings().then(UI.applySettingsToUI)

    filePickerButton.addEventListener("click", () => {
        let picker = new FileOpenPicker();
        picker.fileTypeFilter.push("*");
        let files: IVectorView<StorageFile>;

        Promise.resolve(picker.pickMultipleFilesAsync())
            .then((_files) => {
                files = _files;

                if (!files.length)
                    return;

                let settings = UI.getSettingsFromUI();
                
                return startConversionUserTaskWhenConfirmed(files, getIconvOptionBagFromAppSettingBag(settings));
            })
    })
});

namespace UI {
    export function applySettingsToUI(storedSettings: BabellessSettingBag) {
        if (storedSettings.transcode) {
            transcodeCheckBox.checked = true;
        }
        util.selectByValue(inputEncodingSelect, storedSettings.transcodeSubSettings.from);
        util.selectByValue(outputEncodingSelect, storedSettings.transcodeSubSettings.to);
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

    export function getSettingsFromUI(): BabellessSettingBag {
        return {
            transcode: transcodeCheckBox.checked,
            transcodeSubSettings: {
                from: util.getSelectedText(inputEncodingSelect),
                to: util.getSelectedText(outputEncodingSelect),
                transliterate: transliterateCheckBox.checked,
                warn: warnCheckBox.checked
            },
            kanji: kanjiCheckBox.checked,
            kanjiSubSettings: {
                kyuToShin: kyuToShinRadioButton.checked
            }
        };
    }

    export function isAllFeaturesUnchecked() {
        return !transcodeCheckBox.checked && !kanjiCheckBox.checked;
    }
    export function disableConvertButtonWhenAllFeaturesUnchecked() {
        filePickerButton.disabled = isAllFeaturesUnchecked();
    }
}