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
}